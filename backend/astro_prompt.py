"""
astro_prompt.py
---------------
Builds the system prompt for Jyotish AI by filling in all chart variables.
"""

from typing import Any


def _build_planet_table(planets: list[dict]) -> str:
    """
    Format planet positions into a readable text table.

    Expected dict keys per planet: name, sign, house, degree, retrograde (bool)
    Falls back gracefully for missing keys.
    """
    if not planets:
        return "Planet data not available."

    lines = ["Planet      | Sign        | House | Degree  | Status"]
    lines.append("-" * 58)
    for p in planets:
        name = str(p.get("name", "Unknown")).ljust(11)
        sign = str(p.get("sign", "—")).ljust(11)
        house = str(p.get("house", "—")).center(5)
        degree = f"{float(p.get('degree', 0)):.2f}°".ljust(7) if p.get("degree") is not None else "—".ljust(7)
        retro = "(R)" if p.get("retrograde") else "   "
        lines.append(f"{name} | {sign} | {house} | {degree} | {retro}")

    return "\n".join(lines)


def _build_gochar_summary(transits: list[dict]) -> str:
    """
    Format current transits (gochar) into a short readable paragraph.

    Expected dict keys: planet, from_sign, to_sign, aspect (optional)
    """
    if not transits:
        return "Transit data not available at this time."

    parts = []
    for t in transits:
        planet = t.get("planet", "Unknown")
        to_sign = t.get("to_sign") or t.get("sign", "Unknown")
        from_sign = t.get("from_sign", "")
        aspect = t.get("aspect", "")

        if from_sign:
            entry = f"{planet} has moved from {from_sign} to {to_sign}"
        else:
            entry = f"{planet} is currently in {to_sign}"

        if aspect:
            entry += f" ({aspect})"

        parts.append(entry + ".")

    return " ".join(parts)


SYSTEM_PROMPT_TEMPLATE = """You are Jyotish AI, an expert Vedic astrology assistant.
Speak warmly like a trusted family astrologer.

USER: {name}, {gender}
BORN: {dob} at {tob}, {place}
LANGUAGE: Respond in {language} only

KUNDLI DATA:
Lagna: {lagna} | Rashi: {rashi} | Nakshatra: {nakshatra} Pada {pada}
Current Dasha: {mahadasha} / {antardasha} (until {dasha_end})
Sade Sati: {sade_sati_status}
Mangal Dosha: {mangal_dosha}
Active Yogas: {yogas}

PLANET POSITIONS:
{planet_table}

CURRENT TRANSITS:
{gochar_summary}

RULES:
- Always address user by first name warmly
- Base every answer on the chart data above
- Keep answers to 4-6 sentences (voice-friendly)
- Use probabilistic language: "strongly suggests", "favours", "indicates" — never say "you WILL"
- No bullet points — flowing natural sentences only
- End with one gentle follow-up question
- Never give medical, legal or financial advice
- For off-topic questions, gently redirect to astrology
"""


def build_astro_prompt(user_data: dict[str, Any], chart_data: dict[str, Any]) -> str:
    """
    Build the complete Jyotish AI system prompt with all variables filled in.

    Parameters
    ----------
    user_data : dict
        Keys expected: name, gender, dob, tob, place, language, voice_persona
        Optional: language (defaults to "English")

    chart_data : dict
        Keys expected:
            lagna, rashi, nakshatra, pada
            mahadasha, antardasha, dasha_end
            sade_sati_status, mangal_dosha, yogas
            planets: list[dict]  → fed into _build_planet_table
            transits: list[dict] → fed into _build_gochar_summary

    Returns
    -------
    str
        The fully-rendered system prompt.
    """
    name = user_data.get("name", "Seeker")
    # Use only first name when addressing warmly
    first_name = name.strip().split()[0] if name.strip() else "Seeker"

    gender = user_data.get("gender", "Not specified")
    dob = user_data.get("dob", "Unknown")
    tob = user_data.get("tob", "Unknown")
    place = user_data.get("place", "Unknown")
    language = user_data.get("language", "English")

    lagna = chart_data.get("lagna", "Unknown")
    rashi = chart_data.get("rashi", "Unknown")
    nakshatra = chart_data.get("nakshatra", "Unknown")
    pada = chart_data.get("pada", "1")

    mahadasha = chart_data.get("mahadasha", "Unknown")
    antardasha = chart_data.get("antardasha", "Unknown")
    dasha_end = chart_data.get("dasha_end", "Unknown")

    sade_sati_status = chart_data.get("sade_sati_status", "Not active")
    mangal_dosha = chart_data.get("mangal_dosha", "Not present")
    yogas_raw = chart_data.get("yogas", [])
    if isinstance(yogas_raw, list):
        yogas = ", ".join(yogas_raw) if yogas_raw else "None detected"
    else:
        yogas = str(yogas_raw) if yogas_raw else "None detected"

    planets: list[dict] = chart_data.get("planets", [])
    transits: list[dict] = chart_data.get("transits", [])

    planet_table = _build_planet_table(planets)
    gochar_summary = _build_gochar_summary(transits)

    prompt = SYSTEM_PROMPT_TEMPLATE.format(
        name=first_name,
        gender=gender,
        dob=dob,
        tob=tob,
        place=place,
        language=language,
        lagna=lagna,
        rashi=rashi,
        nakshatra=nakshatra,
        pada=pada,
        mahadasha=mahadasha,
        antardasha=antardasha,
        dasha_end=dasha_end,
        sade_sati_status=sade_sati_status,
        mangal_dosha=mangal_dosha,
        yogas=yogas,
        planet_table=planet_table,
        gochar_summary=gochar_summary,
    )

    return prompt
