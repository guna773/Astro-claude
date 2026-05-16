'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import KundliChart from '@/components/KundliChart'
import { fetchDailyHoroscope, fetchPanchang, type Planet, type DailyHoroscopeResponse, type PanchangResponse } from '@/lib/api'

interface KundliData {
  user_id: string
  lagna: string
  rashi: string
  nakshatra: string
  current_dasha: string
  sade_sati: boolean
  mangal_dosha: boolean
  planets: Planet[]
}

const cardStyle: React.CSSProperties = {
  padding: '1.25rem',
  borderRadius: '10px',
  border: '1px solid #c9a84c33',
  backgroundColor: '#0d0d22',
  textAlign: 'center',
}

const actionTopics = [
  { label: 'Career', q: 'How is my career looking this year based on my Kundli?' },
  { label: 'Love', q: 'What does my chart say about my love life and relationships?' },
  { label: 'Finance', q: 'Is this a good time for investments based on my chart?' },
  { label: 'Health', q: 'How is my health indicated this month in my Kundli?' },
]

export default function DashboardPage() {
  const router = useRouter()
  const [kundli, setKundli] = useState<KundliData | null>(null)
  const [userName, setUserName] = useState('')
  const [horoscope, setHoroscope] = useState<DailyHoroscopeResponse | null>(null)
  const [panchang, setPanchang] = useState<PanchangResponse | null>(null)
  const [loadingHoro, setLoadingHoro] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const userId = localStorage.getItem('jyotish_user_id')
    const name = localStorage.getItem('jyotish_user_name') || 'Friend'
    const stored = localStorage.getItem('jyotish_kundli')

    if (!userId || !stored) {
      router.push('/onboarding')
      return
    }

    setUserName(name)
    try { setKundli(JSON.parse(stored)) } catch { setError('Could not load Kundli data.') }

    // Fetch horoscope
    fetchDailyHoroscope(userId)
      .then(setHoroscope)
      .catch(() => setError('Could not load today\'s horoscope.'))
      .finally(() => setLoadingHoro(false))

    // Fetch panchang for today
    fetchPanchang(new Date().toISOString().split('T')[0], 28.6139, 77.209)
      .then(setPanchang)
      .catch(() => {}) // non-critical
  }, [router])

  if (!kundli) {
    return (
      <div style={{ backgroundColor: '#0a0a1a', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#c9a84c', fontFamily: 'var(--font-cinzel)', fontSize: '1.2rem' }}>
          {error || '✦ Loading your cosmic data...'}
        </div>
      </div>
    )
  }

  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <div style={{ backgroundColor: '#0a0a1a', minHeight: '100vh', color: '#f0eee4' }}>
      <Navbar />
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '5rem 1.5rem 4rem' }}>

        {/* Top bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-cinzel)', color: '#c9a84c', fontSize: '1.8rem', marginBottom: '0.3rem' }}>
              Namaste, {userName.split(' ')[0]} ✦
            </h1>
            <p style={{ color: '#f0eee4aa', fontSize: '0.95rem' }}>{today}</p>
          </div>
          {panchang && (
            <div style={{ ...cardStyle, textAlign: 'left', minWidth: '220px' }}>
              <div style={{ color: '#c9a84c', fontSize: '0.75rem', fontFamily: 'var(--font-cinzel)', marginBottom: '0.5rem' }}>TODAY&apos;S PANCHANG</div>
              <div style={{ fontSize: '0.85rem', color: '#f0eee4cc', lineHeight: 1.7 }}>
                <span style={{ color: '#f0eee4' }}>Tithi:</span> {panchang.tithi}<br />
                <span style={{ color: '#f0eee4' }}>Nakshatra:</span> {panchang.nakshatra}<br />
                <span style={{ color: '#f0eee4' }}>Vara:</span> {panchang.vara}<br />
                {panchang.rahu_kaal && <><span style={{ color: '#f0eee4' }}>Rahu Kaal:</span> {panchang.rahu_kaal}</>}
              </div>
            </div>
          )}
        </div>

        {/* Main grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>

          {/* Kundli Chart */}
          <div style={{ ...cardStyle, padding: '1.5rem' }}>
            <h2 style={{ fontFamily: 'var(--font-cinzel)', color: '#c9a84c', marginBottom: '1rem', fontSize: '1.1rem' }}>Birth Chart (Kundli)</h2>
            <KundliChart planets={kundli.planets} lagna={kundli.lagna} />
          </div>

          {/* Key info cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[
              { label: 'Lagna (Ascendant)', value: kundli.lagna },
              { label: 'Moon Sign (Rashi)', value: kundli.rashi },
              { label: 'Nakshatra', value: kundli.nakshatra },
              { label: 'Current Dasha', value: kundli.current_dasha },
              { label: 'Sade Sati', value: kundli.sade_sati ? '⚠ Active' : '✓ Not Active', warn: kundli.sade_sati },
              { label: 'Mangal Dosha', value: kundli.mangal_dosha ? '⚠ Present' : '✓ Absent', warn: kundli.mangal_dosha },
            ].map(item => (
              <div key={item.label} style={{ ...cardStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center', textAlign: 'left' }}>
                <span style={{ color: '#f0eee4aa', fontSize: '0.9rem' }}>{item.label}</span>
                <span style={{ color: item.warn ? '#ffaa44' : '#c9a84c', fontWeight: 600, fontFamily: 'var(--font-cinzel)', fontSize: '0.95rem' }}>
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Planet positions table */}
        {kundli.planets?.length > 0 && (
          <div style={{ ...cardStyle, textAlign: 'left', marginBottom: '2rem', overflowX: 'auto' }}>
            <h2 style={{ fontFamily: 'var(--font-cinzel)', color: '#c9a84c', marginBottom: '1rem', fontSize: '1.1rem' }}>Planet Positions</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr>
                  {['Planet', 'House', 'Sign', 'Degree'].map(h => (
                    <th key={h} style={{ padding: '0.6rem', borderBottom: '1px solid #c9a84c44', color: '#c9a84c', fontFamily: 'var(--font-cinzel)', fontWeight: 400, textAlign: 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {kundli.planets.map((p, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #ffffff08' }}>
                    <td style={{ padding: '0.6rem', color: '#f0eee4' }}>{p.name}</td>
                    <td style={{ padding: '0.6rem', color: '#f0eee4cc' }}>{p.house}</td>
                    <td style={{ padding: '0.6rem', color: '#f0eee4cc' }}>{p.sign}</td>
                    <td style={{ padding: '0.6rem', color: '#f0eee4cc' }}>{typeof p.degree === 'number' ? p.degree.toFixed(2) + '°' : p.degree}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Daily horoscope */}
        <div style={{ ...cardStyle, textAlign: 'left', marginBottom: '2rem' }}>
          <h2 style={{ fontFamily: 'var(--font-cinzel)', color: '#c9a84c', marginBottom: '1rem', fontSize: '1.1rem' }}>Today&apos;s Horoscope</h2>
          {loadingHoro ? (
            <p style={{ color: '#f0eee4aa' }}>✦ Consulting the stars...</p>
          ) : horoscope ? (
            <div>
              <p style={{ lineHeight: 1.8, color: '#f0eee4cc', marginBottom: '1rem' }}>{horoscope.horoscope}</p>
              <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                {horoscope.lucky_color && <span style={{ color: '#c9a84c', fontSize: '0.85rem' }}>✦ Lucky Color: <strong style={{ color: '#f0eee4' }}>{horoscope.lucky_color}</strong></span>}
                {horoscope.lucky_number && <span style={{ color: '#c9a84c', fontSize: '0.85rem' }}>✦ Lucky Number: <strong style={{ color: '#f0eee4' }}>{horoscope.lucky_number}</strong></span>}
              </div>
            </div>
          ) : (
            <p style={{ color: '#f0eee4aa' }}>{error || 'Could not load horoscope today.'}</p>
          )}
        </div>

        {/* Quick actions */}
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontFamily: 'var(--font-cinzel)', color: '#c9a84c', marginBottom: '1rem', fontSize: '1.1rem' }}>Ask About</h2>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {actionTopics.map(t => (
              <Link key={t.label}
                href={`/chat?q=${encodeURIComponent(t.q)}`}
                style={{
                  padding: '0.6rem 1.4rem', borderRadius: '50px',
                  border: '1px solid #c9a84c', color: '#c9a84c',
                  textDecoration: 'none', fontFamily: 'var(--font-cinzel)', fontSize: '0.9rem',
                  transition: 'background 0.2s, color 0.2s',
                }}
                onMouseOver={e => { (e.currentTarget as HTMLElement).style.backgroundColor = '#c9a84c'; (e.currentTarget as HTMLElement).style.color = '#0a0a1a' }}
                onMouseOut={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#c9a84c' }}
              >
                {t.label}
              </Link>
            ))}
            <Link href="/chat"
              style={{
                padding: '0.6rem 1.4rem', borderRadius: '50px',
                background: 'linear-gradient(135deg, #c9a84c, #a07830)',
                color: '#0a0a1a', textDecoration: 'none',
                fontFamily: 'var(--font-cinzel)', fontSize: '0.9rem', fontWeight: 700,
              }}>
              Ask Anything ✦
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
