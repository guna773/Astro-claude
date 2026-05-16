# Jyotish AI — Vedic Astrology Web App

A full-stack AI-powered Vedic astrology platform with voice chat, Kundli generation, and personalized horoscopes.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| Backend | Python FastAPI |
| Database | Supabase (PostgreSQL + Auth) |
| AI | Anthropic Claude (claude-sonnet-4-6) |
| Voice Input | OpenAI Whisper |
| Voice Output | ElevenLabs |
| Astrology Data | Prokerala API |
| Payments | Razorpay |

---

## Project Structure

```
jyotish-ai/
├── frontend/          # Next.js 14 app
│   ├── app/
│   │   ├── page.tsx           # Landing page
│   │   ├── onboarding/        # Birth details form
│   │   ├── dashboard/         # Kundli + horoscope
│   │   ├── chat/              # Voice + text AI chat
│   │   └── pricing/           # Plans page
│   ├── components/
│   │   ├── KundliChart.tsx    # North Indian SVG chart
│   │   └── Navbar.tsx
│   └── lib/
│       ├── supabase.ts
│       └── api.ts
├── backend/           # FastAPI app
│   ├── main.py
│   ├── config.py
│   ├── astro_prompt.py
│   ├── prokerala.py
│   └── routers/
│       ├── kundli.py
│       ├── chat.py
│       ├── horoscope.py
│       ├── panchang.py
│       └── subscriptions.py
├── supabase_schema.sql
└── README.md
```

---

## Getting API Keys

### 1. Supabase
1. Go to [supabase.com](https://supabase.com) → New Project
2. Project Settings → API → copy `URL` and `anon public` key
3. Run `supabase_schema.sql` in SQL Editor
4. Authentication → Providers → enable Google OAuth and Email (Magic Link)

### 2. Anthropic (Claude)
1. Go to [console.anthropic.com](https://console.anthropic.com)
2. API Keys → Create Key

### 3. OpenAI (Whisper)
1. Go to [platform.openai.com](https://platform.openai.com)
2. API Keys → Create new secret key

### 4. ElevenLabs (Text-to-Speech)
1. Go to [elevenlabs.io](https://elevenlabs.io) → Sign up
2. Profile → API Key
3. Voice Library → find voices for Guru Ji, Devi, Oracle → copy Voice IDs

### 5. Prokerala (Astrology API)
1. Go to [api.prokerala.com](https://api.prokerala.com)
2. Register → Dashboard → copy Client ID and Client Secret

### 6. Google Places API
1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Enable "Places API" → Credentials → Create API Key

### 7. Razorpay
1. Go to [razorpay.com](https://razorpay.com) → Sign up
2. Settings → API Keys → Generate Key

---

## Local Setup

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Copy and fill env vars
cp .env.example .env
# Edit .env with your API keys

# Run dev server
uvicorn main:app --reload --port 8000
```

Backend runs at: http://localhost:8000  
API docs: http://localhost:8000/docs

### Frontend

```bash
cd frontend
npm install

# Copy and fill env vars
cp .env.local.example .env.local
# Edit .env.local with your keys

# Run dev server
npm run dev
```

Frontend runs at: http://localhost:3000

---

## Deployment

### Backend → Render

1. Push code to GitHub
2. Go to [render.com](https://render.com) → New Web Service
3. Connect your repo, select `backend/` as root
4. Build command: `pip install -r requirements.txt`
5. Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
6. Add all environment variables in Render dashboard

### Frontend → Vercel

1. Go to [vercel.com](https://vercel.com) → New Project
2. Import your GitHub repo
3. Set Root Directory to `frontend/`
4. Add environment variables:
   - `NEXT_PUBLIC_BACKEND_URL` = your Render backend URL
   - All other `NEXT_PUBLIC_*` vars
5. Deploy

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/kundli` | Generate birth chart |
| POST | `/api/voice-chat` | Voice Q&A with AI |
| POST | `/api/text-chat` | Text Q&A with AI |
| GET | `/api/daily-horoscope/{user_id}` | Today's horoscope |
| GET | `/api/panchang` | Daily panchang data |
| POST | `/api/create-subscription` | Razorpay subscription |

---

## Pricing Plans

| Plan | Price | Features |
|------|-------|---------|
| Free | ₹0/mo | 3 voice questions/day, basic Kundli |
| Premium | ₹199/mo | Unlimited voice, full reports, all languages |
| Elite | ₹999/mo | Everything + priority AI responses |

---

## Disclaimer

*Jyotish AI readings are for guidance and entertainment purposes only.*
