'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { fetchKundli } from '@/lib/api'

const LANGUAGES = ['English', 'Hindi', 'Tamil', 'Telugu', 'Kannada', 'Bengali', 'Marathi']
const PERSONAS = [
  { id: 'guru_ji', label: 'Guru Ji', desc: 'Wise elder — calm, traditional, Sanskrit-infused' },
  { id: 'devi', label: 'Devi', desc: 'Divine feminine — warm, nurturing, intuitive' },
  { id: 'cosmic_oracle', label: 'Cosmic Oracle', desc: 'Mystical guide — ethereal, poetic, expansive' },
]

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.75rem 1rem',
  borderRadius: '8px',
  border: '1px solid #c9a84c44',
  backgroundColor: '#0d0d22',
  color: '#f0eee4',
  fontSize: '1rem',
  outline: 'none',
  boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: '0.5rem',
  color: '#c9a84c',
  fontSize: '0.9rem',
  fontFamily: 'var(--font-cinzel)',
}

export default function OnboardingPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    name: '',
    dob: '',
    tob: '',
    tobUnknown: false,
    place: '',
    gender: 'Male',
    language: 'English',
    voice_persona: 'guru_ji',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function set(key: string, value: string | boolean) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.dob || !form.place) {
      setError('Please fill in Name, Date of Birth, and Place of Birth.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const result = await fetchKundli({
        name: form.name,
        date_of_birth: form.dob,
        time_of_birth: form.tobUnknown ? undefined : form.tob,
        place_of_birth: form.place,
        gender: form.gender.toLowerCase() as 'male' | 'female' | 'other',
        preferred_language: form.language,
        voice_persona: form.voice_persona as 'guru_ji' | 'devi' | 'cosmic_oracle',
      })
      localStorage.setItem('jyotish_user_id', result.user_id)
      localStorage.setItem('jyotish_user_name', form.name)
      localStorage.setItem('jyotish_kundli', JSON.stringify(result))
      router.push('/dashboard')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ backgroundColor: '#0a0a1a', minHeight: '100vh', color: '#f0eee4' }}>
      <Navbar />
      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '6rem 1.5rem 4rem' }}>
        <h1 style={{ fontFamily: 'var(--font-cinzel)', color: '#c9a84c', fontSize: '2rem', textAlign: 'center', marginBottom: '0.5rem' }}>
          Your Cosmic Journey Begins
        </h1>
        <p style={{ textAlign: 'center', color: '#f0eee4aa', marginBottom: '3rem' }}>
          Enter your birth details to generate your personalised Kundli.
        </p>

        <form onSubmit={handleSubmit}
          style={{ backgroundColor: '#0d0d22', border: '1px solid #c9a84c33', borderRadius: '16px', padding: '2.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* Full Name */}
          <div>
            <label style={labelStyle}>Full Name *</label>
            <input style={inputStyle} type="text" placeholder="e.g. Arjun Sharma"
              value={form.name} onChange={e => set('name', e.target.value)} required />
          </div>

          {/* Date of Birth */}
          <div>
            <label style={labelStyle}>Date of Birth *</label>
            <input style={inputStyle} type="date"
              value={form.dob} onChange={e => set('dob', e.target.value)} required />
          </div>

          {/* Time of Birth */}
          <div>
            <label style={labelStyle}>Time of Birth</label>
            <input style={{ ...inputStyle, opacity: form.tobUnknown ? 0.4 : 1 }}
              type="time" value={form.tob} onChange={e => set('tob', e.target.value)}
              disabled={form.tobUnknown} />
            <label style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: '#f0eee4aa', fontSize: '0.85rem' }}>
              <input type="checkbox" checked={form.tobUnknown}
                onChange={e => set('tobUnknown', e.target.checked)} />
              I don&apos;t know my exact birth time
            </label>
          </div>

          {/* Place of Birth */}
          <div>
            <label style={labelStyle}>Place of Birth *</label>
            <input style={inputStyle} type="text" placeholder="e.g. Mumbai, Maharashtra, India"
              value={form.place} onChange={e => set('place', e.target.value)} required />
            <p style={{ fontSize: '0.75rem', color: '#f0eee4aa', marginTop: '0.3rem' }}>
              Enter city and country for accurate calculations.
            </p>
          </div>

          {/* Gender */}
          <div>
            <label style={labelStyle}>Gender</label>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              {['Male', 'Female', 'Other'].map(g => (
                <label key={g} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: form.gender === g ? '#c9a84c' : '#f0eee4aa' }}>
                  <input type="radio" name="gender" value={g}
                    checked={form.gender === g} onChange={e => set('gender', e.target.value)} />
                  {g}
                </label>
              ))}
            </div>
          </div>

          {/* Language */}
          <div>
            <label style={labelStyle}>Preferred Language</label>
            <select style={inputStyle} value={form.language} onChange={e => set('language', e.target.value)}>
              {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>

          {/* Voice Persona */}
          <div>
            <label style={labelStyle}>AI Voice Persona</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {PERSONAS.map(p => (
                <label key={p.id}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer',
                    padding: '1rem', borderRadius: '8px', border: `1px solid ${form.voice_persona === p.id ? '#c9a84c' : '#c9a84c33'}`,
                    backgroundColor: form.voice_persona === p.id ? '#c9a84c11' : 'transparent',
                    transition: 'all 0.2s',
                  }}>
                  <input type="radio" name="persona" value={p.id}
                    checked={form.voice_persona === p.id} onChange={e => set('voice_persona', e.target.value)}
                    style={{ marginTop: '2px' }} />
                  <div>
                    <div style={{ color: '#c9a84c', fontFamily: 'var(--font-cinzel)', marginBottom: '0.2rem' }}>{p.label}</div>
                    <div style={{ color: '#f0eee4aa', fontSize: '0.85rem' }}>{p.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {error && (
            <div style={{ padding: '0.75rem 1rem', borderRadius: '8px', backgroundColor: '#ff444422', border: '1px solid #ff4444aa', color: '#ff8888', fontSize: '0.9rem' }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading}
            style={{
              padding: '1rem', borderRadius: '8px', border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
              background: loading ? '#c9a84c66' : 'linear-gradient(135deg, #c9a84c, #a07830)',
              color: '#0a0a1a', fontWeight: 700, fontSize: '1.1rem', fontFamily: 'var(--font-cinzel)',
              transition: 'opacity 0.2s',
            }}>
            {loading ? '⟳ Calculating Your Kundli...' : 'Generate My Kundli ✦'}
          </button>
        </form>
      </div>
    </div>
  )
}
