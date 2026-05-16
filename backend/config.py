import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    # Prokerala
    PROKERALA_CLIENT_ID: str = os.getenv("PROKERALA_CLIENT_ID", "")
    PROKERALA_CLIENT_SECRET: str = os.getenv("PROKERALA_CLIENT_SECRET", "")

    # AI providers
    ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")

    # ElevenLabs
    ELEVENLABS_API_KEY: str = os.getenv("ELEVENLABS_API_KEY", "")
    ELEVENLABS_VOICE_GURUJI: str = os.getenv("ELEVENLABS_VOICE_GURUJI", "")
    ELEVENLABS_VOICE_DEVI: str = os.getenv("ELEVENLABS_VOICE_DEVI", "")
    ELEVENLABS_VOICE_ORACLE: str = os.getenv("ELEVENLABS_VOICE_ORACLE", "")

    # Supabase
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_ANON_KEY: str = os.getenv("SUPABASE_ANON_KEY", "")

    # Razorpay
    RAZORPAY_KEY_ID: str = os.getenv("RAZORPAY_KEY_ID", "")
    RAZORPAY_KEY_SECRET: str = os.getenv("RAZORPAY_KEY_SECRET", "")

    # Google
    GOOGLE_PLACES_API_KEY: str = os.getenv("GOOGLE_PLACES_API_KEY", "")

    # Subscription plan amounts in paise
    PLAN_FREE_AMOUNT: int = 0
    PLAN_PREMIUM_AMOUNT: int = 19900   # ₹199/mo
    PLAN_ELITE_AMOUNT: int = 99900     # ₹999/mo

    PLAN_AMOUNTS: dict = {
        "free": 0,
        "premium": 19900,
        "elite": 99900,
    }

    # Claude model
    CLAUDE_MODEL: str = "claude-sonnet-4-6"


settings = Settings()
