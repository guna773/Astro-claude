'use client'

import { useState } from 'react'
import Navbar from '@/components/Navbar'
import { createSubscription } from '@/lib/api'

const plans = [
  {
    id: 'free',
    name: 'Free',
    price: '₹0',
    period: '/month',
    tagline: 'Try Jyotish AI at no cost',
    features: [
      '3 voice questions per day',
      'Basic North Indian Kundli chart',
      'Daily horoscope',
      'Panchang access',
      'English & Hindi support',
    ],
    cta: 'Start Free',
    highlight: false,
    color: '#c9a84c33',
  },
  {
    id: 'premium',
    name: 'Premium',
    price: '₹199',
    period: '/month',
    tagline: 'Unlimited cosmic guidance',
    features: [
      'Unlimited voice questions',
      'Full detailed Kundli reports',
      'All 7 regional languages',
      'Career, love & finance analysis',
      'Priority AI responses',
      'Dasha timeline explorer',
    ],
    cta: 'Go Premium',
    highlight: true,
    color: '#c9a84c',
  },
  {
    id: 'elite',
    name: 'Elite',
    price: '₹999',
    period: '/month',
    tagline: 'The complete Jyotish experience',
    features: [
      'Everything in Premium',
      'Personal monthly PDF reports',
      'Muhurta (auspicious timing) selection',
      'Gemstone & remedy recommendations',
      'Transit alerts via email',
      'Dedicated priority queue',
    ],
    cta: 'Go Elite',
    highlight: false,
    color: '#c9a84c33',
  },
]

export default function PricingPage() {
  const [loading, setLoading] = useState<string | null>(null)
  const [message, setMessage] = useState('')

  async function handleSelect(planId: string) {
    const userId = typeof window !== 'undefined' ? localStorage.getItem('jyotish_user_id') : null
    if (!userId) {
      setMessage('Please create your Kundli first. Redirecting to onboarding...')
      setTimeout(() => { window.location.href = '/onboarding' }, 1500)
      return
    }
    setLoading(planId)
    setMessage('')
    try {
      const result = await createSubscription(userId, planId as 'free' | 'premium' | 'elite')
      if (result.payment_url) {
        window.location.href = result.payment_url
      } else {
        setMessage('Subscription activated! Redirecting to dashboard...')
        setTimeout(() => { window.location.href = '/dashboard' }, 1500)
      }
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : 'Payment failed. Please try again.')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div style={{ backgroundColor: '#0a0a1a', minHeight: '100vh', color: '#f0eee4' }}>
      <Navbar />
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '6rem 1.5rem 4rem' }}>
        <h1 style={{ fontFamily: 'var(--font-cinzel)', color: '#c9a84c', fontSize: '2.5rem', textAlign: 'center', marginBottom: '0.75rem' }}>
          Choose Your Path
        </h1>
        <p style={{ textAlign: 'center', color: '#f0eee4aa', marginBottom: '3.5rem', fontSize: '1.1rem' }}>
          Begin free, upgrade when ready. No hidden fees.
        </p>

        {message && (
          <div style={{ textAlign: 'center', padding: '1rem', marginBottom: '2rem', borderRadius: '8px', backgroundColor: '#c9a84c22', border: '1px solid #c9a84c55', color: '#c9a84c' }}>
            {message}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: '1.5rem' }}>
          {plans.map(plan => (
            <div key={plan.id}
              style={{
                padding: '2.5rem', borderRadius: '16px',
                border: `2px solid ${plan.highlight ? '#c9a84c' : '#c9a84c33'}`,
                backgroundColor: plan.highlight ? '#111128' : '#0d0d1e',
                boxShadow: plan.highlight ? '0 0 50px rgba(201,168,76,0.15)' : 'none',
                position: 'relative', display: 'flex', flexDirection: 'column',
              }}>
              {plan.highlight && (
                <div style={{
                  position: 'absolute', top: -1, left: '50%', transform: 'translateX(-50%)',
                  backgroundColor: '#c9a84c', color: '#0a0a1a', padding: '0.3rem 1.2rem',
                  borderRadius: '0 0 10px 10px', fontSize: '0.75rem', fontWeight: 700,
                  fontFamily: 'var(--font-cinzel)', letterSpacing: '0.05em',
                }}>
                  MOST POPULAR
                </div>
              )}

              <h2 style={{ fontFamily: 'var(--font-cinzel)', color: '#c9a84c', fontSize: '1.6rem', marginBottom: '0.3rem' }}>
                {plan.name}
              </h2>
              <p style={{ color: '#f0eee4aa', fontSize: '0.9rem', marginBottom: '1.5rem' }}>{plan.tagline}</p>

              <div style={{ marginBottom: '1.5rem' }}>
                <span style={{ fontSize: '2.8rem', fontWeight: 700, color: '#f0eee4' }}>{plan.price}</span>
                <span style={{ color: '#f0eee4aa', fontSize: '1rem' }}>{plan.period}</span>
              </div>

              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 2rem', flex: 1 }}>
                {plan.features.map(f => (
                  <li key={f} style={{ padding: '0.5rem 0', color: '#f0eee4cc', fontSize: '0.95rem', borderBottom: '1px solid #ffffff08', display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
                    <span style={{ color: '#c9a84c', flexShrink: 0, marginTop: '1px' }}>✦</span>
                    {f}
                  </li>
                ))}
              </ul>

              <button onClick={() => handleSelect(plan.id)} disabled={loading === plan.id}
                style={{
                  padding: '0.9rem', borderRadius: '8px', cursor: loading === plan.id ? 'not-allowed' : 'pointer',
                  border: plan.highlight ? 'none' : '1px solid #c9a84c',
                  background: plan.highlight ? 'linear-gradient(135deg, #c9a84c, #a07830)' : 'transparent',
                  color: plan.highlight ? '#0a0a1a' : '#c9a84c',
                  fontWeight: 700, fontSize: '1rem', fontFamily: 'var(--font-cinzel)',
                  opacity: loading === plan.id ? 0.6 : 1, transition: 'opacity 0.2s',
                }}>
                {loading === plan.id ? '⟳ Processing...' : plan.cta}
              </button>
            </div>
          ))}
        </div>

        <p style={{ textAlign: 'center', color: '#f0eee4aa', fontSize: '0.85rem', marginTop: '3rem' }}>
          Jyotish AI readings are for guidance and entertainment purposes only. Payments processed securely via Razorpay.
        </p>
      </div>
    </div>
  )
}
