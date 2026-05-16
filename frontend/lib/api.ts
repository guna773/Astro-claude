const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface KundliFormData {
  name: string
  date_of_birth: string   // ISO date: YYYY-MM-DD
  time_of_birth?: string  // HH:MM (24h), optional if unknown
  place_of_birth: string
  gender: 'male' | 'female' | 'other'
  preferred_language: string
  voice_persona: 'guru_ji' | 'devi' | 'cosmic_oracle'
}

export interface KundliResponse {
  user_id: string
  lagna: string
  rashi: string
  nakshatra: string
  current_dasha: string
  sade_sati: boolean
  mangal_dosha: boolean
  planets: Planet[]
  chart_data?: Record<string, unknown>
}

export interface Planet {
  name: string
  house: number
  sign: string
  degree: number
}

export interface VoiceChatResponse {
  transcript: string
  response_text: string
  audio_base64?: string
  language: string
}

export interface TextChatResponse {
  response_text: string
  audio_base64?: string
  language: string
}

export interface DailyHoroscopeResponse {
  date: string
  horoscope: string
  lucky_number?: number
  lucky_color?: string
  favorable_time?: string
}

export interface PanchangResponse {
  date: string
  tithi: string
  nakshatra: string
  yoga: string
  karana: string
  vara: string
  sunrise?: string
  sunset?: string
  rahu_kaal?: string
  auspicious_times?: string[]
}

export interface SubscriptionResponse {
  subscription_id: string
  payment_url?: string
  razorpay_order_id?: string
}

// ─── API Helpers ──────────────────────────────────────────────────────────────

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = `HTTP ${res.status}`
    try {
      const errJson = await res.json()
      message = errJson.detail || errJson.message || message
    } catch {
      // ignore JSON parse errors
    }
    throw new Error(message)
  }
  return res.json() as Promise<T>
}

// ─── Kundli ───────────────────────────────────────────────────────────────────

export async function fetchKundli(formData: KundliFormData): Promise<KundliResponse> {
  const res = await fetch(`${BACKEND_URL}/api/kundli`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData),
  })
  return handleResponse<KundliResponse>(res)
}

// ─── Voice Chat ───────────────────────────────────────────────────────────────

export async function fetchVoiceChat(
  audioBlob: Blob,
  userId: string,
  language: string
): Promise<VoiceChatResponse> {
  const formData = new FormData()
  formData.append('audio', audioBlob, 'recording.webm')
  formData.append('user_id', userId)
  formData.append('language', language)

  const res = await fetch(`${BACKEND_URL}/api/voice-chat`, {
    method: 'POST',
    body: formData,
  })
  return handleResponse<VoiceChatResponse>(res)
}

// ─── Text Chat ────────────────────────────────────────────────────────────────

export async function fetchTextChat(
  message: string,
  userId: string,
  language: string
): Promise<TextChatResponse> {
  const res = await fetch(`${BACKEND_URL}/api/text-chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, user_id: userId, language }),
  })
  return handleResponse<TextChatResponse>(res)
}

// ─── Daily Horoscope ──────────────────────────────────────────────────────────

export async function fetchDailyHoroscope(userId: string): Promise<DailyHoroscopeResponse> {
  const res = await fetch(`${BACKEND_URL}/api/daily-horoscope/${userId}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  })
  return handleResponse<DailyHoroscopeResponse>(res)
}

// ─── Panchang ─────────────────────────────────────────────────────────────────

export async function fetchPanchang(
  date: string,
  lat: number,
  lng: number
): Promise<PanchangResponse> {
  const params = new URLSearchParams({
    date,
    lat: lat.toString(),
    lng: lng.toString(),
  })
  const res = await fetch(`${BACKEND_URL}/api/panchang?${params.toString()}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  })
  return handleResponse<PanchangResponse>(res)
}

// ─── Subscription ─────────────────────────────────────────────────────────────

export async function createSubscription(
  userId: string,
  plan: 'free' | 'premium' | 'elite'
): Promise<SubscriptionResponse> {
  const res = await fetch(`${BACKEND_URL}/api/create-subscription`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, plan }),
  })
  return handleResponse<SubscriptionResponse>(res)
}
