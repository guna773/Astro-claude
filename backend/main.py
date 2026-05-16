"""
main.py
-------
Jyotish AI – FastAPI application entry point.
Registers all routers and configures CORS.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import kundli, chat, horoscope, panchang, subscriptions

app = FastAPI(
    title="Jyotish AI API",
    description="Vedic astrology backend — kundli, voice chat, horoscopes, panchang & subscriptions.",
    version="1.0.0",
)

# ---------------------------------------------------------------------------
# CORS – allow all origins in development; tighten in production
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
app.include_router(kundli.router, prefix="/api", tags=["Kundli"])
app.include_router(chat.router, prefix="/api", tags=["Chat"])
app.include_router(horoscope.router, prefix="/api", tags=["Horoscope"])
app.include_router(panchang.router, prefix="/api", tags=["Panchang"])
app.include_router(subscriptions.router, prefix="/api", tags=["Subscriptions"])


@app.get("/", tags=["Health"])
async def root():
    return {"status": "ok", "service": "Jyotish AI API"}


@app.get("/health", tags=["Health"])
async def health():
    return {"status": "healthy"}
