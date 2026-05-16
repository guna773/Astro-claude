"""
routers/chat.py
---------------
POST /api/voice-chat  – Audio in, audio out (via Whisper + Claude + ElevenLabs)
POST /api/text-chat   – Text in, text out (via Claude)
"""

import base64
import io
import logging
import tempfile
import os
from datetime import datetime, timezone
from typing import Any

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

import anthropic
import openai

from astro_prompt import build_astro_prompt
from config import settings
from supabase_client import get_supabase

logger = logging.getLogger(__name__)
router = APIRouter()

# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class VoiceChatRequest(BaseModel):
    user_id: str
    audio_base64: str           # base64-encoded audio bytes (webm / mp3 / wav)
    language: str = "English"
    audio_format: str = "webm"  # hint for Whisper


class TextChatRequest(BaseModel):
    user_id: str
    message: str
    language: str = "English"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get_voice_id(voice_persona: str) -> str:
    """Map persona name to ElevenLabs voice ID from env vars."""
    mapping = {
        "Guru Ji": settings.ELEVENLABS_VOICE_GURUJI,
        "Devi": settings.ELEVENLABS_VOICE_DEVI,
        "Cosmic Oracle": settings.ELEVENLABS_VOICE_ORACLE,
    }
    voice_id = mapping.get(voice_persona, settings.ELEVENLABS_VOICE_GURUJI)
    if not voice_id:
        # Return a known public ElevenLabs demo voice as last resort
        return "21m00Tcm4TlvDq8ikWAM"  # Rachel (ElevenLabs demo)
    return voice_id


async def _fetch_user_profile(user_id: str) -> dict[str, Any]:
    """Fetch user profile + chart from Supabase. Returns empty dict on error."""
    try:
        supabase = get_supabase()
        result = supabase.table("kundlis").select("*").eq("user_id", user_id).single().execute()
        return result.data or {}
    except Exception as exc:
        logger.warning("Could not fetch user profile for %s: %s", user_id, exc)
        return {}


def _build_user_and_chart(profile: dict) -> tuple[dict, dict]:
    """Split a kundli DB row into (user_data, chart_data) for build_astro_prompt."""
    user_data = {
        "name": profile.get("name", "Seeker"),
        "gender": profile.get("gender", "Not specified"),
        "dob": profile.get("dob", "Unknown"),
        "tob": profile.get("tob", "Unknown"),
        "place": profile.get("place", "Unknown"),
        "language": profile.get("language", "English"),
        "voice_persona": profile.get("voice_persona", "Guru Ji"),
    }
    chart_data: dict = profile.get("chart_data") or {}
    return user_data, chart_data


async def _call_claude(system_prompt: str, user_message: str) -> str:
    """Call Claude claude-sonnet-4-6 and return response text."""
    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    message = client.messages.create(
        model=settings.CLAUDE_MODEL,
        max_tokens=512,
        system=system_prompt,
        messages=[{"role": "user", "content": user_message}],
    )
    return message.content[0].text


async def _transcribe_audio(audio_bytes: bytes, audio_format: str) -> str:
    """Transcribe audio bytes using OpenAI Whisper API."""
    oai_client = openai.AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

    # Write to a temp file so the SDK can determine mime type
    suffix = f".{audio_format}"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(audio_bytes)
        tmp_path = tmp.name

    try:
        with open(tmp_path, "rb") as f:
            transcript = await oai_client.audio.transcriptions.create(
                model="whisper-1",
                file=f,
            )
        return transcript.text
    finally:
        os.unlink(tmp_path)


async def _text_to_speech(text: str, voice_id: str) -> bytes:
    """Convert text to speech via ElevenLabs REST API. Returns raw MP3 bytes."""
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
    headers = {
        "xi-api-key": settings.ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
        "Accept": "audio/mpeg",
    }
    payload = {
        "text": text,
        "model_id": "eleven_multilingual_v2",
        "voice_settings": {
            "stability": 0.5,
            "similarity_boost": 0.75,
        },
    }
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(url, json=payload, headers=headers)
        resp.raise_for_status()
        return resp.content


def _save_chat_history(
    user_id: str,
    transcript: str,
    response_text: str,
    mode: str = "voice",
) -> None:
    """Persist chat turn to Supabase chat_history table (non-blocking best-effort)."""
    try:
        supabase = get_supabase()
        supabase.table("chat_history").insert({
            "user_id": user_id,
            "mode": mode,
            "user_message": transcript,
            "assistant_response": response_text,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }).execute()
    except Exception as exc:
        logger.warning("Failed to save chat history: %s", exc)


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/voice-chat")
async def voice_chat(req: VoiceChatRequest) -> dict[str, Any]:
    """
    1. Decode base64 audio
    2. Transcribe with OpenAI Whisper
    3. Fetch user chart from Supabase
    4. Build astro prompt, call Claude
    5. Convert response to speech with ElevenLabs
    6. Save to chat_history
    7. Return { transcript, response_text, audio_base64 }
    """
    # Step 1 – decode audio
    try:
        audio_bytes = base64.b64decode(req.audio_base64)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid base64 audio data.")

    # Step 2 – transcribe
    if not settings.OPENAI_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="Speech transcription is not configured. Please set OPENAI_API_KEY.",
        )
    try:
        transcript = await _transcribe_audio(audio_bytes, req.audio_format)
    except Exception as exc:
        logger.error("Whisper transcription failed: %s", exc)
        raise HTTPException(status_code=502, detail=f"Transcription failed: {exc}")

    if not transcript.strip():
        raise HTTPException(status_code=400, detail="Could not detect speech in audio.")

    # Steps 3 & 4 – fetch chart and call Claude
    profile = await _fetch_user_profile(req.user_id)
    user_data, chart_data = _build_user_and_chart(profile)
    # Override language from request if provided
    user_data["language"] = req.language or user_data.get("language", "English")

    if not settings.ANTHROPIC_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="AI service not configured. Please set ANTHROPIC_API_KEY.",
        )
    try:
        system_prompt = build_astro_prompt(user_data, chart_data)
        response_text = await _call_claude(system_prompt, transcript)
    except Exception as exc:
        logger.error("Claude call failed: %s", exc)
        raise HTTPException(status_code=502, detail=f"AI response failed: {exc}")

    # Step 5 – text-to-speech
    audio_b64 = ""
    if settings.ELEVENLABS_API_KEY:
        voice_persona = user_data.get("voice_persona", "Guru Ji")
        voice_id = _get_voice_id(voice_persona)
        try:
            tts_bytes = await _text_to_speech(response_text, voice_id)
            audio_b64 = base64.b64encode(tts_bytes).decode("utf-8")
        except Exception as exc:
            logger.warning("ElevenLabs TTS failed (returning text only): %s", exc)

    # Step 6 – save to history
    _save_chat_history(req.user_id, transcript, response_text, mode="voice")

    # Step 7 – return
    return {
        "success": True,
        "transcript": transcript,
        "response_text": response_text,
        "audio_base64": audio_b64,
    }


@router.post("/text-chat")
async def text_chat(req: TextChatRequest) -> dict[str, Any]:
    """
    Text-based chat with Jyotish AI.
    Returns { response_text }.
    """
    if not req.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    if not settings.ANTHROPIC_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="AI service not configured. Please set ANTHROPIC_API_KEY.",
        )

    profile = await _fetch_user_profile(req.user_id)
    user_data, chart_data = _build_user_and_chart(profile)
    user_data["language"] = req.language or user_data.get("language", "English")

    try:
        system_prompt = build_astro_prompt(user_data, chart_data)
        response_text = await _call_claude(system_prompt, req.message)
    except Exception as exc:
        logger.error("Claude call failed: %s", exc)
        raise HTTPException(status_code=502, detail=f"AI response failed: {exc}")

    _save_chat_history(req.user_id, req.message, response_text, mode="text")

    return {
        "success": True,
        "response_text": response_text,
    }
