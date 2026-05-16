"""
routers/horoscope.py
--------------------
GET /api/daily-horoscope/{user_id}

Returns a daily horoscope. Checks Supabase cache first; generates with Claude
if not found and caches the result.

Horoscopes table schema (expected in Supabase):
    id              uuid (PK, default gen_random_uuid())
    user_id         text
    date            date
    horoscope_text  text
    lucky_color     text
    lucky_number    int
    tip_of_day      text
    created_at      timestamptz (default now())
"""

import logging
import random
from datetime import date, datetime, timezone
from typing import Any

from fastapi import APIRouter, HTTPException

import anthropic

from astro_prompt import build_astro_prompt
from config import settings
from supabase_client import get_supabase

logger = logging.getLogger(__name__)
router = APIRouter()

LUCKY_COLORS = [
    "Red", "Orange", "Yellow", "Green", "Blue", "Indigo",
    "Violet", "White", "Gold", "Silver", "Pink", "Teal",
]


async def _fetch_user_profile(user_id: str) -> dict[str, Any]:
    try:
        sb = get_supabase()
        result = sb.table("kundlis").select("*").eq("user_id", user_id).single().execute()
        return result.data or {}
    except Exception as exc:
        logger.warning("Could not fetch profile for %s: %s", user_id, exc)
        return {}


async def _generate_horoscope(user_data: dict, chart_data: dict) -> dict[str, Any]:
    """Ask Claude to produce a daily horoscope JSON object."""
    if not settings.ANTHROPIC_API_KEY:
        raise RuntimeError("ANTHROPIC_API_KEY not set.")

    system_prompt = build_astro_prompt(user_data, chart_data)

    today_str = date.today().isoformat()
    user_message = (
        f"Today is {today_str}. Please give me a daily horoscope reading for today. "
        "Respond ONLY with a JSON object (no markdown fences) with exactly these keys: "
        '"horoscope_text" (4-6 warm sentences), '
        '"lucky_color" (single color name), '
        '"lucky_number" (integer 1-108), '
        '"tip_of_day" (one actionable sentence). '
        "No other keys, no extra text."
    )

    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    message = client.messages.create(
        model=settings.CLAUDE_MODEL,
        max_tokens=600,
        system=system_prompt,
        messages=[{"role": "user", "content": user_message}],
    )
    raw = message.content[0].text.strip()

    # Parse JSON response
    import json
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        # Try to extract JSON substring
        import re
        match = re.search(r"\{.*\}", raw, re.DOTALL)
        if match:
            parsed = json.loads(match.group())
        else:
            # Fallback structure if Claude didn't return valid JSON
            parsed = {
                "horoscope_text": raw,
                "lucky_color": random.choice(LUCKY_COLORS),
                "lucky_number": random.randint(1, 108),
                "tip_of_day": "Trust the cosmic flow and stay centred today.",
            }

    # Ensure all keys exist
    parsed.setdefault("lucky_color", random.choice(LUCKY_COLORS))
    parsed.setdefault("lucky_number", random.randint(1, 108))
    parsed.setdefault("tip_of_day", "Be present and mindful in all interactions today.")

    return parsed


@router.get("/daily-horoscope/{user_id}")
async def daily_horoscope(user_id: str) -> dict[str, Any]:
    """
    Return today's horoscope for the given user.
    Caches in Supabase horoscopes table keyed by (user_id, date).
    """
    today = date.today().isoformat()

    # 1. Check cache
    cached = None
    try:
        sb = get_supabase()
        result = (
            sb.table("horoscopes")
            .select("*")
            .eq("user_id", user_id)
            .eq("date", today)
            .limit(1)
            .execute()
        )
        if result.data:
            cached = result.data[0]
    except Exception as exc:
        logger.warning("Cache lookup failed: %s", exc)

    if cached:
        return {
            "success": True,
            "cached": True,
            "date": today,
            "horoscope_text": cached.get("horoscope_text", ""),
            "lucky_color": cached.get("lucky_color", ""),
            "lucky_number": cached.get("lucky_number", 0),
            "tip_of_day": cached.get("tip_of_day", ""),
        }

    # 2. Generate fresh horoscope
    profile = await _fetch_user_profile(user_id)
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

    try:
        horoscope = await _generate_horoscope(user_data, chart_data)
    except Exception as exc:
        logger.error("Horoscope generation failed: %s", exc)
        raise HTTPException(
            status_code=502,
            detail=f"Could not generate horoscope at this time: {exc}",
        )

    # 3. Cache in Supabase
    try:
        sb = get_supabase()
        sb.table("horoscopes").insert({
            "user_id": user_id,
            "date": today,
            "horoscope_text": horoscope.get("horoscope_text", ""),
            "lucky_color": horoscope.get("lucky_color", ""),
            "lucky_number": horoscope.get("lucky_number", 1),
            "tip_of_day": horoscope.get("tip_of_day", ""),
            "created_at": datetime.now(timezone.utc).isoformat(),
        }).execute()
    except Exception as exc:
        logger.warning("Failed to cache horoscope: %s", exc)

    return {
        "success": True,
        "cached": False,
        "date": today,
        **horoscope,
    }
