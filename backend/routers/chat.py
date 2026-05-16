"""
routers/chat.py
---------------
POST /api/text-chat  – Text in → Claude → ElevenLabs TTS (optional) → text/audio out

Voice transcription is handled entirely in the browser via the Web Speech API,
so no OpenAI Whisper or audio upload is needed here.
"""

import base64
import logging
from datetime import datetime, timezone
from typing import Any

import httpx
import anthropic
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from astro_prompt import build_astro_prompt
from config import settings
from supabase_client import get_supabase

logger = logging.getLogger(__name__)
router = APIRouter()


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class TextChatRequest(BaseModel):
    user_id: str
    message: str
    language: str = "English"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get_voice_id(voice_persona: str) -> str:
    mapping = {
        "Guru Ji":      settings.ELEVENLABS_VOICE_GURUJI,
        "Devi":         settings.ELEVENLABS_VOICE_DEVI,
        "Cosmic Oracle": settings.ELEVENLABS_VOICE_ORACLE,
    }
    voice_id = mapping.get(voice_persona, settings.ELEVENLABS_VOICE_GURUJI)
    return voice_id or "21m00Tcm4TlvDq8ikWAM"  # Rachel fallback


async def _fetch_user_profile(user_id: str) -> dict[str, Any]:
    try:
        sb = get_supabase()
        result = sb.table("kundlis").select("*").eq("user_id", user_id).single().execute()
        return result.data or {}
    except Exception as exc:
        logger.warning("Could not fetch profile for %s: %s", user_id, exc)
        return {}


def _build_user_and_chart(profile: dict) -> tuple[dict, dict]:
    user_data = {
        "name":         profile.get("name", "Seeker"),
        "gender":       profile.get("gender", "Not specified"),
        "dob":          profile.get("dob", "Unknown"),
        "tob":          profile.get("tob", "Unknown"),
        "place":        profile.get("place", "Unknown"),
        "language":     profile.get("language", "English"),
        "voice_persona": profile.get("voice_persona", "Guru Ji"),
    }
    chart_data: dict = profile.get("chart_data") or {}
    return user_data, chart_data


async def _call_claude(system_prompt: str, user_message: str) -> str:
    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    msg = client.messages.create(
        model=settings.CLAUDE_MODEL,
        max_tokens=512,
        system=system_prompt,
        messages=[{"role": "user", "content": user_message}],
    )
    return msg.content[0].text


async def _text_to_speech(text: str, voice_id: str) -> bytes:
    """Convert text to speech via ElevenLabs. Returns MP3 bytes."""
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
    headers = {
        "xi-api-key": settings.ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
        "Accept": "audio/mpeg",
    }
    payload = {
        "text": text,
        "model_id": "eleven_multilingual_v2",
        "voice_settings": {"stability": 0.5, "similarity_boost": 0.75},
    }
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(url, json=payload, headers=headers)
        resp.raise_for_status()
        return resp.content


def _save_chat_history(user_id: str, message: str, response: str) -> None:
    try:
        sb = get_supabase()
        sb.table("chat_history").insert({
            "user_id": user_id,
            "mode": "text",
            "user_message": message,
            "assistant_response": response,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }).execute()
    except Exception as exc:
        logger.warning("Failed to save chat history: %s", exc)


# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------

@router.post("/text-chat")
async def text_chat(req: TextChatRequest) -> dict[str, Any]:
    """
    Accepts a text message (from typing OR browser speech-to-text),
    calls Claude with the user's full chart context, optionally converts
    the response to speech via ElevenLabs, and returns both.
    """
    if not req.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    if not settings.ANTHROPIC_API_KEY:
        raise HTTPException(status_code=503, detail="AI service not configured. Set ANTHROPIC_API_KEY.")

    profile = await _fetch_user_profile(req.user_id)
    user_data, chart_data = _build_user_and_chart(profile)
    user_data["language"] = req.language or user_data.get("language", "English")

    try:
        system_prompt = build_astro_prompt(user_data, chart_data)
        response_text = await _call_claude(system_prompt, req.message)
    except Exception as exc:
        logger.error("Claude call failed: %s", exc)
        raise HTTPException(status_code=502, detail=f"AI response failed: {exc}")

    # Optional: ElevenLabs TTS (skipped gracefully if key not set)
    audio_b64 = ""
    if settings.ELEVENLABS_API_KEY:
        voice_id = _get_voice_id(user_data.get("voice_persona", "Guru Ji"))
        try:
            tts_bytes = await _text_to_speech(response_text, voice_id)
            audio_b64 = base64.b64encode(tts_bytes).decode("utf-8")
        except Exception as exc:
            logger.warning("ElevenLabs TTS failed (text-only response): %s", exc)

    _save_chat_history(req.user_id, req.message, response_text)

    return {
        "success": True,
        "response_text": response_text,
        "audio_base64": audio_b64,   # empty string if ElevenLabs not configured
    }
