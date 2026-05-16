"""
routers/kundli.py
-----------------
POST /api/kundli
Generates or fetches a user's Vedic birth chart (kundli).
Tries Prokerala first; falls back to local calculation on error.
"""

import logging
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from prokerala import prokerala_client
from supabase_client import get_supabase

logger = logging.getLogger(__name__)
router = APIRouter()


class KundliRequest(BaseModel):
    user_id: str = Field(..., description="Supabase user UUID")
    name: str
    gender: str = "Not specified"
    dob: str = Field(..., description="Date of birth YYYY-MM-DD")
    tob: str = Field(..., description="Time of birth HH:MM")
    lat: float = Field(..., description="Birth place latitude")
    lng: float = Field(..., description="Birth place longitude")
    place: str = Field(..., description="Human-readable place name")
    language: str = "English"
    voice_persona: str = "Guru Ji"
    save: bool = True


@router.post("/kundli")
async def create_kundli(req: KundliRequest) -> dict[str, Any]:
    """
    Compute a Vedic birth chart and optionally persist it to Supabase.

    Returns the chart data along with the source ('prokerala' or 'fallback').
    """
    # 1. Try Prokerala; fall back gracefully
    chart_data: dict[str, Any]
    try:
        if not prokerala_client._token and (
            not __import__("config").settings.PROKERALA_CLIENT_ID
        ):
            raise ValueError("Prokerala credentials not configured – using fallback.")
        chart_data = await prokerala_client.get_kundli(
            lat=req.lat,
            lng=req.lng,
            dob=req.dob,
            tob=req.tob,
        )
    except Exception as exc:
        logger.warning("Prokerala API failed (%s); using fallback.", exc)
        chart_data = prokerala_client.fallback_kundli(
            lat=req.lat,
            lng=req.lng,
            dob=req.dob,
            tob=req.tob,
        )

    # 2. Persist to Supabase if requested
    if req.save:
        try:
            supabase = get_supabase()
            upsert_payload = {
                "user_id": req.user_id,
                "name": req.name,
                "gender": req.gender,
                "dob": req.dob,
                "tob": req.tob,
                "lat": req.lat,
                "lng": req.lng,
                "place": req.place,
                "language": req.language,
                "voice_persona": req.voice_persona,
                "chart_data": chart_data,
            }
            supabase.table("kundlis").upsert(upsert_payload, on_conflict="user_id").execute()
        except Exception as db_exc:
            # Non-fatal – return chart even if DB write fails
            logger.error("Failed to save kundli to Supabase: %s", db_exc)

    return {
        "success": True,
        "chart": chart_data,
        "message": "Kundli generated successfully.",
    }
