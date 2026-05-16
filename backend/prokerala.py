"""
prokerala.py
------------
ProkeralaClient wraps the Prokerala Astrology API (OAuth2 client credentials).
If the API is unavailable, fallback_kundli() returns a plausible chart built
from lightweight pure-Python ephemeris calculations (no C extensions needed).
"""

import math
import time
import logging
from datetime import datetime, date, timezone
from typing import Any

import httpx

from config import settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Vedic sign / nakshatra tables
# ---------------------------------------------------------------------------
RASHI_NAMES = [
    "Aries", "Taurus", "Gemini", "Cancer",
    "Leo", "Virgo", "Libra", "Scorpio",
    "Sagittarius", "Capricorn", "Aquarius", "Pisces",
]

NAKSHATRA_NAMES = [
    "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira",
    "Ardra", "Punarvasu", "Pushya", "Ashlesha", "Magha",
    "Purva Phalguni", "Uttara Phalguni", "Hasta", "Chitra", "Swati",
    "Vishakha", "Anuradha", "Jyeshtha", "Mula", "Purva Ashadha",
    "Uttara Ashadha", "Shravana", "Dhanishtha", "Shatabhisha",
    "Purva Bhadrapada", "Uttara Bhadrapada", "Revati",
]

DASHA_LORDS = ["Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"]
DASHA_YEARS = [7, 20, 6, 10, 7, 18, 16, 19, 17]  # total = 120 years

PLANET_NAMES = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Rahu", "Ketu"]

# Mean orbital periods in days (tropical)
_MEAN_MOTION = {
    "Sun":     365.2422,
    "Moon":    27.3217,
    "Mercury": 87.9691,
    "Venus":   224.701,
    "Mars":    686.971,
    "Jupiter": 4332.589,
    "Saturn":  10759.22,
}

# Ayanamsa (Lahiri) degrees to subtract from tropical longitude
_LAHIRI_AYANAMSA_2000 = 23.853  # degrees at J2000.0
_AYANAMSA_RATE = 50.3 / 3600.0   # degrees per year

# ---------------------------------------------------------------------------
# Minimal solar/lunar longitude helpers (no external deps)
# ---------------------------------------------------------------------------

def _jd(dt: datetime) -> float:
    """Julian Day Number for a UTC datetime."""
    a = (14 - dt.month) // 12
    y = dt.year + 4800 - a
    m = dt.month + 12 * a - 3
    jdn = dt.day + (153 * m + 2) // 5 + 365 * y + y // 4 - y // 100 + y // 400 - 32045
    return jdn + (dt.hour - 12) / 24.0 + dt.minute / 1440.0 + dt.second / 86400.0


def _solar_longitude(jd: float) -> float:
    """Approximate tropical solar longitude (degrees, 0-360)."""
    n = jd - 2451545.0          # days since J2000.0
    L = (280.460 + 0.9856474 * n) % 360
    g = math.radians((357.528 + 0.9856003 * n) % 360)
    lam = L + 1.915 * math.sin(g) + 0.020 * math.sin(2 * g)
    return lam % 360


def _lunar_longitude(jd: float) -> float:
    """Approximate tropical lunar longitude (degrees, 0-360)."""
    n = jd - 2451545.0
    L0 = (218.316 + 13.176396 * n) % 360
    M  = math.radians((134.963 + 13.064993 * n) % 360)
    F  = math.radians((93.272  + 13.229350 * n) % 360)
    lam = L0 + 6.289 * math.sin(M) - 1.274 * math.sin(2 * F - M) \
              + 0.658 * math.sin(2 * F) - 0.186 * math.sin(M) \
              - 0.059 * math.sin(2 * F - 2 * M) - 0.057 * math.sin(2 * F - M)
    return lam % 360


def _planet_longitude(name: str, jd: float, sun_lon: float) -> float:
    """
    Very rough planet longitudes based on mean motion from J2000.
    For inner planets we use elongation offset from the Sun.
    For outer planets we use mean motion. Rahu/Ketu use mean node formula.
    """
    n = jd - 2451545.0
    if name == "Sun":
        return sun_lon
    if name == "Moon":
        return _lunar_longitude(jd)
    if name == "Rahu":
        # Mean ascending node
        lon = (125.044555 - 0.0529539 * n) % 360
        return lon if lon >= 0 else lon + 360
    if name == "Ketu":
        rahu = _planet_longitude("Rahu", jd, sun_lon)
        return (rahu + 180) % 360

    # Outer / inner planets – simple mean motion from J2000 epoch positions
    epoch_lons = {
        "Mercury": 252.251,
        "Venus":   181.979,
        "Mars":    355.433,
        "Jupiter": 34.351,
        "Saturn":  50.077,
    }
    daily_motion = 360.0 / _MEAN_MOTION[name]
    lon = (epoch_lons[name] + daily_motion * n) % 360
    return lon if lon >= 0 else lon + 360


def _tropical_to_sidereal(lon: float, year: float) -> float:
    """Subtract Lahiri ayanamsa to convert tropical → sidereal longitude."""
    ayanamsa = _LAHIRI_AYANAMSA_2000 + _AYANAMSA_RATE * (year - 2000.0)
    sid = (lon - ayanamsa) % 360
    return sid if sid >= 0 else sid + 360


def _sign_from_lon(lon: float) -> str:
    return RASHI_NAMES[int(lon / 30) % 12]


def _nakshatra_pada(lon: float) -> tuple[str, int]:
    """Returns (nakshatra_name, pada 1-4)."""
    idx = int(lon / (360 / 27)) % 27
    pada = int((lon % (360 / 27)) / (360 / 27 / 4)) + 1
    return NAKSHATRA_NAMES[idx], min(pada, 4)


def _lagna(jd: float, lat: float, lon_geo: float, sid_sun: float) -> str:
    """
    Approximate Lagna (Ascendant sign) using local sidereal time.
    Very simplified — accurate enough for fallback / demo purposes.
    """
    # Local Sidereal Time in degrees
    gmst = (280.46061837 + 360.98564736629 * (jd - 2451545.0)) % 360
    lst = (gmst + lon_geo) % 360
    # Rough Lagna = LST adjusted for ayanamsa
    n = jd - 2451545.0
    year = 2000.0 + n / 365.25
    ayanamsa = _LAHIRI_AYANAMSA_2000 + _AYANAMSA_RATE * (year - 2000.0)
    lagna_lon = (lst - ayanamsa) % 360
    return _sign_from_lon(lagna_lon)


def _vimshottari_dasha(birth_moon_lon: float, dob: date) -> dict:
    """Calculate current Mahadasha and Antardasha from birth Moon nakshatra."""
    nak_idx = int(birth_moon_lon / (360 / 27)) % 27
    lord_idx = nak_idx % 9
    # Fraction through the birth nakshatra
    fraction_in_nak = (birth_moon_lon % (360 / 27)) / (360 / 27)

    # Build dasha timeline starting from birth
    years_elapsed_at_birth = DASHA_YEARS[lord_idx] * fraction_in_nak
    today = date.today()
    age_years = (today - dob).days / 365.25

    elapsed = age_years + years_elapsed_at_birth
    total = sum(DASHA_YEARS)  # 120

    while elapsed >= total:
        elapsed -= total

    # Find current Mahadasha
    cumulative = 0.0
    maha_lord = None
    maha_remaining = 0.0
    maha_start_elapsed = 0.0
    for i, lord in enumerate(DASHA_LORDS):
        dur = DASHA_YEARS[i]
        if cumulative + dur > elapsed:
            maha_lord = lord
            maha_start_elapsed = cumulative
            maha_remaining = (cumulative + dur) - elapsed
            maha_duration = dur
            break
        cumulative += dur

    # Find current Antardasha within Mahadasha
    elapsed_in_maha = elapsed - maha_start_elapsed
    maha_duration_val = DASHA_YEARS[DASHA_LORDS.index(maha_lord)]
    antar_cumulative = 0.0
    antar_lord = None
    antar_remaining = 0.0
    start_idx = DASHA_LORDS.index(maha_lord)
    for i in range(9):
        antar_idx = (start_idx + i) % 9
        sub_lord = DASHA_LORDS[antar_idx]
        sub_dur = (DASHA_YEARS[antar_idx] / 120.0) * maha_duration_val
        if antar_cumulative + sub_dur > elapsed_in_maha:
            antar_lord = sub_lord
            antar_remaining = (antar_cumulative + sub_dur) - elapsed_in_maha
            break
        antar_cumulative += sub_dur
    if antar_lord is None:
        antar_lord = DASHA_LORDS[start_idx]
        antar_remaining = 0.5

    dasha_end_year = today.year + int(antar_remaining)
    dasha_end_month = today.month + int((antar_remaining % 1) * 12)
    if dasha_end_month > 12:
        dasha_end_month -= 12
        dasha_end_year += 1

    return {
        "mahadasha": maha_lord,
        "antardasha": antar_lord,
        "dasha_end": f"{dasha_end_year}-{dasha_end_month:02d}",
    }


def _check_sade_sati(moon_sign: str) -> str:
    """Check Sade Sati using approximate current Saturn transit."""
    today_jd = _jd(datetime.utcnow())
    sun_lon = _solar_longitude(today_jd)
    n = today_jd - 2451545.0
    year_now = 2000.0 + n / 365.25
    sat_trop = _planet_longitude("Saturn", today_jd, sun_lon)
    sat_sid = _tropical_to_sidereal(sat_trop, year_now)
    saturn_sign = _sign_from_lon(sat_sid)

    moon_idx = RASHI_NAMES.index(moon_sign) if moon_sign in RASHI_NAMES else 0
    sat_idx = RASHI_NAMES.index(saturn_sign) if saturn_sign in RASHI_NAMES else 0

    diff = (sat_idx - moon_idx) % 12
    if diff in (11, 0, 1):
        if diff == 0:
            return f"Active – peak phase (Saturn in {saturn_sign})"
        elif diff == 11:
            return f"Active – rising phase (Saturn in {saturn_sign})"
        else:
            return f"Active – setting phase (Saturn in {saturn_sign})"
    return f"Not active (Saturn in {saturn_sign})"


def _check_mangal_dosha(planets: list[dict]) -> str:
    """Mangal Dosha: Mars in 1st, 2nd, 4th, 7th, 8th, or 12th house."""
    for p in planets:
        if p.get("name") == "Mars":
            house = int(p.get("house", 0))
            if house in (1, 2, 4, 7, 8, 12):
                return f"Present (Mars in house {house})"
            return "Not present"
    return "Unable to determine"


def _detect_yogas(planets: list[dict], lagna_sign: str) -> list[str]:
    """Detect a handful of common Vedic yogas from planet positions."""
    yogas = []
    sign_map = {p["name"]: p.get("sign") for p in planets}
    house_map = {p["name"]: int(p.get("house", 0)) for p in planets}

    # Gajakesari Yoga: Jupiter in kendra (1,4,7,10) from Moon
    moon_house = house_map.get("Moon", 0)
    jup_house = house_map.get("Jupiter", 0)
    if moon_house and jup_house:
        diff = (jup_house - moon_house) % 12
        if diff in (0, 3, 6, 9):
            yogas.append("Gajakesari Yoga")

    # Budhaditya Yoga: Sun and Mercury in same sign
    if sign_map.get("Sun") and sign_map.get("Sun") == sign_map.get("Mercury"):
        yogas.append("Budhaditya Yoga")

    # Chandra-Mangala Yoga: Moon and Mars conjunct or 7th from each other
    mars_house = house_map.get("Mars", 0)
    if moon_house and mars_house:
        diff = abs(jup_house - moon_house) % 12
        if diff in (0, 6):
            yogas.append("Chandra-Mangala Yoga")

    # Pancha Mahapurusha – any of 5 strong planets in own/exaltation sign & kendra
    exaltation = {
        "Mars": "Capricorn", "Mercury": "Virgo", "Jupiter": "Cancer",
        "Venus": "Pisces", "Saturn": "Libra",
    }
    own_signs = {
        "Mars": ["Aries", "Scorpio"], "Mercury": ["Gemini", "Virgo"],
        "Jupiter": ["Sagittarius", "Pisces"], "Venus": ["Taurus", "Libra"],
        "Saturn": ["Capricorn", "Aquarius"],
    }
    yoga_names = {
        "Mars": "Ruchaka Yoga", "Mercury": "Bhadra Yoga",
        "Jupiter": "Hamsa Yoga", "Venus": "Malavya Yoga", "Saturn": "Shasha Yoga",
    }
    for planet, house in house_map.items():
        if planet in exaltation and house in (1, 4, 7, 10):
            sign = sign_map.get(planet, "")
            if sign == exaltation[planet] or sign in own_signs.get(planet, []):
                yogas.append(yoga_names[planet])

    return yogas if yogas else []


# ---------------------------------------------------------------------------
# ProkeralaClient
# ---------------------------------------------------------------------------

class ProkeralaClient:
    """Async client for the Prokerala Astrology API."""

    TOKEN_URL = "https://api.prokerala.com/token"
    API_BASE = "https://api.prokerala.com/v2/astrology"

    def __init__(self):
        self._token: str | None = None
        self._token_expiry: float = 0.0

    async def get_token(self) -> str:
        """Fetch (or return cached) OAuth2 bearer token."""
        if self._token and time.time() < self._token_expiry:
            return self._token

        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                self.TOKEN_URL,
                data={
                    "grant_type": "client_credentials",
                    "client_id": settings.PROKERALA_CLIENT_ID,
                    "client_secret": settings.PROKERALA_CLIENT_SECRET,
                },
            )
            resp.raise_for_status()
            data = resp.json()

        self._token = data["access_token"]
        expires_in = data.get("expires_in", 3600)
        self._token_expiry = time.time() + expires_in - 60  # refresh 60s early
        return self._token

    async def get_kundli(
        self,
        lat: float,
        lng: float,
        dob: str,   # "YYYY-MM-DD"
        tob: str,   # "HH:MM"
    ) -> dict[str, Any]:
        """
        Fetch birth chart data from Prokerala API.
        Returns normalised chart dict (same schema as fallback_kundli).
        """
        token = await self.get_token()
        datetime_str = f"{dob}T{tob}:00+05:30"  # assume IST if no tz given

        headers = {"Authorization": f"Bearer {token}"}
        params = {
            "ayanamsa": 1,            # Lahiri
            "coordinates": f"{lat},{lng}",
            "datetime": datetime_str,
        }

        async with httpx.AsyncClient(timeout=20) as client:
            # Fetch birth chart
            chart_resp = await client.get(
                f"{self.API_BASE}/birth-details",
                headers=headers,
                params=params,
            )
            chart_resp.raise_for_status()
            chart_data = chart_resp.json()

            # Fetch planet positions
            planet_resp = await client.get(
                f"{self.API_BASE}/planet-position",
                headers=headers,
                params=params,
            )
            planet_resp.raise_for_status()
            planet_data = planet_resp.json()

            # Fetch dasha
            dasha_resp = await client.get(
                f"{self.API_BASE}/dasha-periods",
                headers=headers,
                params=params,
            )
            dasha_resp.raise_for_status()
            dasha_data = dasha_resp.json()

        return self._normalise_prokerala(chart_data, planet_data, dasha_data)

    def _normalise_prokerala(
        self,
        chart: dict,
        planets: dict,
        dasha: dict,
    ) -> dict[str, Any]:
        """Map Prokerala API response to our internal schema."""
        data = chart.get("data", {})
        birth_details = data.get("birth_details", data)

        # Planets
        planet_list = []
        for p in planets.get("data", {}).get("planet_position", []):
            planet_list.append({
                "name": p.get("name", ""),
                "sign": p.get("rasi", {}).get("name", ""),
                "house": p.get("house", 0),
                "degree": p.get("degree", 0.0),
                "retrograde": p.get("is_retrograde", False),
            })

        # Dasha
        current_dasha = {}
        for period in dasha.get("data", {}).get("dasha_periods", []):
            if period.get("is_current"):
                current_dasha = period
                break

        # Nakshatra / pada
        moon_info = birth_details.get("moon_sign", {}) or {}
        nakshatra_info = birth_details.get("nakshatra", {}) or {}

        lagna = birth_details.get("ascendant", {})
        if isinstance(lagna, dict):
            lagna = lagna.get("name", "Unknown")

        rashi = moon_info.get("name", "Unknown") if isinstance(moon_info, dict) else str(moon_info)
        nakshatra = nakshatra_info.get("name", "Unknown") if isinstance(nakshatra_info, dict) else str(nakshatra_info)
        pada = nakshatra_info.get("pada", 1) if isinstance(nakshatra_info, dict) else 1

        maha = current_dasha.get("dasha_lord", {})
        antar = current_dasha.get("antar_dasha", [{}])[0] if current_dasha.get("antar_dasha") else {}

        return {
            "lagna": lagna,
            "rashi": rashi,
            "nakshatra": nakshatra,
            "pada": pada,
            "mahadasha": maha.get("name", "Unknown") if isinstance(maha, dict) else str(maha),
            "antardasha": antar.get("dasha_lord", {}).get("name", "Unknown") if isinstance(antar, dict) else "Unknown",
            "dasha_end": current_dasha.get("end_date", "Unknown"),
            "sade_sati_status": "Data from Prokerala",
            "mangal_dosha": _check_mangal_dosha(planet_list),
            "yogas": _detect_yogas(planet_list, lagna),
            "planets": planet_list,
            "transits": [],
            "source": "prokerala",
        }

    # ------------------------------------------------------------------
    # Fallback – pure Python ephemeris
    # ------------------------------------------------------------------

    def fallback_kundli(
        self,
        lat: float,
        lng: float,
        dob: str,
        tob: str,
    ) -> dict[str, Any]:
        """
        Compute an approximate Vedic birth chart using lightweight Python math.
        No C extensions required.  Accuracy is sufficient for demo / testing.

        Parameters
        ----------
        lat, lng : float   – birth place coordinates
        dob : str          – "YYYY-MM-DD"
        tob : str          – "HH:MM"  (treated as local time; we approximate UTC)
        """
        try:
            dt_naive = datetime.strptime(f"{dob} {tob}", "%Y-%m-%d %H:%M")
        except ValueError:
            dt_naive = datetime.strptime(dob, "%Y-%m-%d")

        # Rough UTC conversion: subtract lng/15 hours
        utc_offset_hours = lng / 15.0
        dt_utc = dt_naive.replace(tzinfo=timezone.utc)

        jd = _jd(dt_utc)
        dob_date = datetime.strptime(dob, "%Y-%m-%d").date()
        year_frac = 2000.0 + (jd - 2451545.0) / 365.25

        # Tropical → sidereal longitudes for all planets
        planet_lons: dict[str, float] = {}
        sun_trop = _solar_longitude(jd)
        for name in PLANET_NAMES:
            trop = _planet_longitude(name, jd, sun_trop)
            planet_lons[name] = _tropical_to_sidereal(trop, year_frac)

        moon_lon = planet_lons["Moon"]
        sun_lon = planet_lons["Sun"]

        # Signs
        moon_sign = _sign_from_lon(moon_lon)
        sun_sign = _sign_from_lon(sun_lon)
        lagna_sign = _lagna(jd, lat, lng, sun_lon)

        # Nakshatra
        nak_name, pada = _nakshatra_pada(moon_lon)

        # Houses (equal house from Lagna)
        lagna_idx = RASHI_NAMES.index(lagna_sign)
        planet_list = []
        for name in PLANET_NAMES:
            lon = planet_lons[name]
            sign = _sign_from_lon(lon)
            sign_idx = RASHI_NAMES.index(sign)
            house = ((sign_idx - lagna_idx) % 12) + 1
            degree = lon % 30
            retrograde = name in ("Saturn", "Rahu", "Ketu")  # simplification
            planet_list.append({
                "name": name,
                "sign": sign,
                "house": house,
                "degree": round(degree, 2),
                "retrograde": retrograde,
            })

        # Dasha
        dasha_info = _vimshottari_dasha(moon_lon, dob_date)

        # Transits (current planet positions)
        today_jd = _jd(datetime.utcnow())
        today_sun_trop = _solar_longitude(today_jd)
        transit_year = 2000.0 + (today_jd - 2451545.0) / 365.25
        transits = []
        for name in ["Saturn", "Jupiter", "Rahu", "Mars"]:
            trop = _planet_longitude(name, today_jd, today_sun_trop)
            sid = _tropical_to_sidereal(trop, transit_year)
            sign = _sign_from_lon(sid)
            transits.append({"planet": name, "sign": sign, "to_sign": sign})

        sade_sati = _check_sade_sati(moon_sign)
        mangal_dosha = _check_mangal_dosha(planet_list)
        yogas = _detect_yogas(planet_list, lagna_sign)

        return {
            "lagna": lagna_sign,
            "rashi": moon_sign,
            "nakshatra": nak_name,
            "pada": pada,
            "mahadasha": dasha_info["mahadasha"],
            "antardasha": dasha_info["antardasha"],
            "dasha_end": dasha_info["dasha_end"],
            "sade_sati_status": sade_sati,
            "mangal_dosha": mangal_dosha,
            "yogas": yogas,
            "planets": planet_list,
            "transits": transits,
            "source": "fallback",
        }


# Module-level singleton
prokerala_client = ProkeralaClient()
