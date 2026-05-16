"""
routers/panchang.py
-------------------
GET /api/panchang?date=YYYY-MM-DD&lat=...&lng=...

Returns Vedic Panchang (five limbs) for a given date and location.
Primary: Prokerala API  |  Fallback: local calculation
"""

import logging
import math
from datetime import date, datetime, timezone
from typing import Any

import httpx
from fastapi import APIRouter, HTTPException, Query

from config import settings
from prokerala import (
    prokerala_client,
    _jd, _solar_longitude, _lunar_longitude,
    _tropical_to_sidereal, _sign_from_lon,
    _nakshatra_pada, RASHI_NAMES, NAKSHATRA_NAMES,
)

logger = logging.getLogger(__name__)
router = APIRouter()

# ---------------------------------------------------------------------------
# Tithi table (30 lunar days)
# ---------------------------------------------------------------------------
TITHIS = [
    "Pratipada", "Dwitiya", "Tritiya", "Chaturthi", "Panchami",
    "Shashthi", "Saptami", "Ashtami", "Navami", "Dashami",
    "Ekadashi", "Dwadashi", "Trayodashi", "Chaturdashi", "Purnima",  # Shukla (1-15)
    "Pratipada", "Dwitiya", "Tritiya", "Chaturthi", "Panchami",
    "Shashthi", "Saptami", "Ashtami", "Navami", "Dashami",
    "Ekadashi", "Dwadashi", "Trayodashi", "Chaturdashi", "Amavasya",  # Krishna (16-30)
]

# Vara (weekday) – 0 = Sunday
VARAS = ["Ravivara", "Somavara", "Mangalavara", "Budhavara",
         "Guruvara", "Shukravara", "Shanivara"]

# Yoga (27 yogas based on sum of sun+moon longitudes)
YOGA_NAMES = [
    "Vishkambha", "Priti", "Ayushman", "Saubhagya", "Shobhana",
    "Atiganda", "Sukarma", "Dhriti", "Shula", "Ganda",
    "Vriddhi", "Dhruva", "Vyaghata", "Harshana", "Vajra",
    "Siddhi", "Vyatipata", "Variyana", "Parigha", "Shiva",
    "Siddha", "Sadhya", "Shubha", "Shukla", "Brahma",
    "Indra", "Vaidhriti",
]

# Karana (11 karanas, each half a tithi)
KARANA_NAMES = [
    "Bava", "Balava", "Kaulava", "Taitila", "Garija",
    "Vanija", "Vishti",   # 7 movable karanas (repeat)
    "Shakuni", "Chatushpada", "Naga", "Kimstughna",  # 4 fixed
]

# Auspicious muhurtas (simplified)
AUSPICIOUS_MUHURTAS = {
    0: "Siddha Muhurta (Sun's day – auspicious for new beginnings)",
    1: "Amrit Siddhi Muhurta (Moon's day – travel and deals favoured)",
    2: "Ravi Yoga (Mars's day – courage and strength)",
    3: "Sarvaartha Siddhi (Mercury's day – education and communication)",
    4: "Guru Pushya Yoga (Jupiter's day – highly auspicious)",
    5: "Shukra Pushya (Venus's day – arts and relationships)",
    6: "Shani Yoga (Saturn's day – discipline and long-term work)",
}

INAUSPICIOUS_PERIODS = {
    0: "Yamaghanta (08:00–09:00)",
    1: "Rahu Kalam (07:30–09:00)",
    2: "Yamaghanta (06:00–07:30)",
    3: "Rahu Kalam (12:00–13:30)",
    4: "Rahu Kalam (13:30–15:00)",
    5: "Rahu Kalam (10:30–12:00)",
    6: "Rahu Kalam (09:00–10:30)",
}


# ---------------------------------------------------------------------------
# Fallback panchang calculator
# ---------------------------------------------------------------------------

def _compute_panchang(target_date: date, lat: float, lng: float) -> dict[str, Any]:
    dt_utc = datetime(target_date.year, target_date.month, target_date.day, 6, 0, 0, tzinfo=timezone.utc)
    jd = _jd(dt_utc)
    year_frac = 2000.0 + (jd - 2451545.0) / 365.25

    # Sun & Moon tropical longitudes
    sun_trop = _solar_longitude(jd)
    moon_trop = _lunar_longitude(jd)

    # Convert to sidereal (Lahiri)
    sun_sid = _tropical_to_sidereal(sun_trop, year_frac)
    moon_sid = _tropical_to_sidereal(moon_trop, year_frac)

    # --- Tithi ---
    elongation = (moon_sid - sun_sid) % 360
    tithi_num = int(elongation / 12)           # 0-29
    tithi_name = TITHIS[tithi_num]
    paksha = "Shukla Paksha" if tithi_num < 15 else "Krishna Paksha"

    # --- Vara ---
    weekday = target_date.weekday()            # Mon=0; we need Sun=0
    vara_idx = (weekday + 1) % 7              # Sun=0, Mon=1, …
    vara = VARAS[vara_idx]

    # --- Nakshatra ---
    nak_name, pada = _nakshatra_pada(moon_sid)

    # --- Yoga ---
    yoga_lon = (sun_sid + moon_sid) % 360
    yoga_idx = int(yoga_lon / (360 / 27)) % 27
    yoga = YOGA_NAMES[yoga_idx]

    # --- Karana ---
    # Each tithi has 2 karanas; 7 movable repeat cyclically after fixed ones
    half_tithi = int(elongation / 6) % 60      # 0-59
    if half_tithi < 4:
        karana = KARANA_NAMES[7 + half_tithi]  # first 4 half-tithis = fixed
    else:
        karana = KARANA_NAMES[(half_tithi - 4) % 7]

    # --- Sun / Moon signs ---
    sun_rashi = _sign_from_lon(sun_sid)
    moon_rashi = _sign_from_lon(moon_sid)

    # --- Auspicious info ---
    auspicious = AUSPICIOUS_MUHURTAS.get(vara_idx, "Brahma Muhurta (04:30–06:00)")
    inauspicious = INAUSPICIOUS_PERIODS.get(vara_idx, "Rahu Kalam – check local time")

    return {
        "date": target_date.isoformat(),
        "tithi": f"{tithi_name} ({paksha})",
        "tithi_number": tithi_num + 1,
        "paksha": paksha,
        "vara": vara,
        "nakshatra": nak_name,
        "nakshatra_pada": pada,
        "yoga": yoga,
        "karana": karana,
        "sun_rashi": sun_rashi,
        "moon_rashi": moon_rashi,
        "sun_longitude": round(sun_sid, 2),
        "moon_longitude": round(moon_sid, 2),
        "auspicious_period": auspicious,
        "inauspicious_period": inauspicious,
        "source": "fallback",
    }


async def _fetch_prokerala_panchang(target_date: date, lat: float, lng: float) -> dict[str, Any]:
    """Try Prokerala panchang endpoint."""
    token = await prokerala_client.get_token()
    datetime_str = f"{target_date.isoformat()}T06:00:00+05:30"
    headers = {"Authorization": f"Bearer {token}"}
    params = {
        "ayanamsa": 1,
        "coordinates": f"{lat},{lng}",
        "datetime": datetime_str,
    }
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(
            f"{prokerala_client.API_BASE}/panchang",
            headers=headers,
            params=params,
        )
        resp.raise_for_status()
        data = resp.json().get("data", {})

    # Normalise Prokerala response to our schema
    tithi = data.get("tithi", {})
    nak = data.get("nakshatra", {})
    yoga = data.get("yoga", {})
    karana = data.get([k for k in data if "karan" in k.lower()][0], {}) if any("karan" in k.lower() for k in data) else {}

    return {
        "date": target_date.isoformat(),
        "tithi": tithi.get("name", "Unknown") if isinstance(tithi, dict) else str(tithi),
        "paksha": data.get("paksha", {}).get("name", "Unknown") if isinstance(data.get("paksha"), dict) else "Unknown",
        "vara": data.get("vara", {}).get("name", "Unknown") if isinstance(data.get("vara"), dict) else "Unknown",
        "nakshatra": nak.get("name", "Unknown") if isinstance(nak, dict) else str(nak),
        "nakshatra_pada": nak.get("pada", 1) if isinstance(nak, dict) else 1,
        "yoga": yoga.get("name", "Unknown") if isinstance(yoga, dict) else str(yoga),
        "karana": karana.get("name", "Unknown") if isinstance(karana, dict) else "Unknown",
        "sun_rashi": data.get("sun_sign", {}).get("name", "Unknown") if isinstance(data.get("sun_sign"), dict) else "Unknown",
        "moon_rashi": data.get("moon_sign", {}).get("name", "Unknown") if isinstance(data.get("moon_sign"), dict) else "Unknown",
        "source": "prokerala",
    }


# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------

@router.get("/panchang")
async def get_panchang(
    date: str = Query(default=None, description="Date YYYY-MM-DD; defaults to today"),
    lat: float = Query(default=28.6139, description="Latitude"),
    lng: float = Query(default=77.2090, description="Longitude"),
) -> dict[str, Any]:
    """Return Vedic Panchang for the given date and location."""
    if date:
        try:
            target_date = datetime.strptime(date, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")
    else:
        target_date = datetime.now(timezone.utc).date()

    # Try Prokerala first if credentials are available
    if settings.PROKERALA_CLIENT_ID and settings.PROKERALA_CLIENT_SECRET:
        try:
            result = await _fetch_prokerala_panchang(target_date, lat, lng)
            return {"success": True, **result}
        except Exception as exc:
            logger.warning("Prokerala panchang failed (%s); using fallback.", exc)

    panchang = _compute_panchang(target_date, lat, lng)
    return {"success": True, **panchang}
