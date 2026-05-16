'use client'

import Link from 'next/link'
import { useEffect, useRef } from 'react'
import Navbar from '@/components/Navbar'

// ─── Star field ───────────────────────────────────────────────────────────────

function Starfield() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const COUNT = 120
    const fragment = document.createDocumentFragment()

    for (let i = 0; i < COUNT; i++) {
      const star = document.createElement('div')
      const size = Math.random() * 2.5 + 0.5
      star.className = 'star'
      star.style.cssText = `
        left: ${Math.random() * 100}%;
        top: ${Math.random() * 100}%;
        width: ${size}px;
        height: ${size}px;
        --duration: ${Math.random() * 4 + 2}s;
        --delay: ${Math.random() * 4}s;
      `
      fragment.appendChild(star)
    }
    container.appendChild(fragment)

    return () => {
      while (container.firstChild) container.removeChild(container.firstChild)
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden pointer-events-none"
      aria-hidden="true"
    />
  )
}

// ─── How It Works Step ────────────────────────────────────────────────────────

function Step({
  number,
  icon,
  title,
  desc,
}: {
  number: number
  icon: string
  title: string
  desc: string
}) {
  return (
    <div className="flex flex-col items-center text-center gap-4 p-6">
      <div
        className="relative w-20 h-20 rounded-full flex items-center justify-center text-3xl"
        style={{
          background: 'radial-gradient(circle, rgba(201,168,76,0.15) 0%, rgba(201,168,76,0.03) 100%)',
          border: '2px solid rgba(201,168,76,0.4)',
          boxShadow: '0 0 24px rgba(201,168,76,0.15)',
        }}
      >
        <span>{icon}</span>
        <span
          className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold font-cinzel"
          style={{ background: '#c9a84c', color: '#0a0a1a' }}
        >
          {number}
        </span>
      </div>
      <h3 className="text-lg font-cinzel font-semibold" style={{ color: '#c9a84c' }}>
        {title}
      </h3>
      <p className="text-sm leading-relaxed" style={{ color: 'rgba(240,238,228,0.7)' }}>
        {desc}
      </p>
    </div>
  )
}

// ─── Feature Card ─────────────────────────────────────────────────────────────

function FeatureCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div
      className="glass-card p-6 flex flex-col gap-3 transition-all duration-300 hover:-translate-y-1 group"
      style={{ cursor: 'default' }}
    >
      <div className="text-3xl">{icon}</div>
      <h3
        className="font-cinzel font-semibold text-base group-hover:text-gold transition-colors duration-300"
        style={{ color: '#c9a84c' }}
      >
        {title}
      </h3>
      <p className="text-sm leading-relaxed" style={{ color: 'rgba(240,238,228,0.65)' }}>
        {desc}
      </p>
    </div>
  )
}

// ─── Pricing Card ─────────────────────────────────────────────────────────────

function PricingCard({
  name,
  price,
  period,
  features,
  highlighted,
  cta,
}: {
  name: string
  price: string
  period: string
  features: string[]
  highlighted?: boolean
  cta: string
}) {
  return (
    <div
      className="relative flex flex-col gap-6 p-8 rounded-2xl transition-all duration-300 hover:-translate-y-1"
      style={{
        background: highlighted
          ? 'linear-gradient(135deg, rgba(201,168,76,0.12) 0%, rgba(26,26,46,0.95) 100%)'
          : 'rgba(26,26,46,0.7)',
        border: highlighted
          ? '2px solid rgba(201,168,76,0.6)'
          : '1px solid rgba(201,168,76,0.2)',
        boxShadow: highlighted ? '0 0 40px rgba(201,168,76,0.2)' : undefined,
      }}
    >
      {highlighted && (
        <div
          className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold font-cinzel tracking-wider"
          style={{ background: 'linear-gradient(135deg,#c9a84c,#f0d070)', color: '#0a0a1a' }}
        >
          MOST POPULAR
        </div>
      )}
      <div>
        <p className="text-sm font-cinzel tracking-widest uppercase mb-1" style={{ color: 'rgba(201,168,76,0.6)' }}>
          {name}
        </p>
        <div className="flex items-end gap-1">
          <span className="text-4xl font-cinzel font-bold" style={{ color: '#f0eee4' }}>
            {price}
          </span>
          <span className="text-sm mb-1" style={{ color: 'rgba(240,238,228,0.5)' }}>
            {period}
          </span>
        </div>
      </div>

      <ul className="flex flex-col gap-3">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm" style={{ color: 'rgba(240,238,228,0.75)' }}>
            <span className="mt-0.5 flex-shrink-0" style={{ color: '#c9a84c' }}>✦</span>
            {f}
          </li>
        ))}
      </ul>

      <Link
        href="/onboarding"
        className="block text-center py-3 rounded-xl font-cinzel font-bold text-sm tracking-wider transition-all duration-300"
        style={
          highlighted
            ? {
                background: 'linear-gradient(135deg,#c9a84c,#f0d070)',
                color: '#0a0a1a',
                boxShadow: '0 0 20px rgba(201,168,76,0.3)',
              }
            : {
                border: '1px solid rgba(201,168,76,0.4)',
                color: '#c9a84c',
              }
        }
      >
        {cta}
      </Link>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const features = [
    { icon: '🎙️', title: 'Voice AI', desc: 'Speak naturally and receive spoken Vedic insights—like consulting a real Jyotishi.' },
    { icon: '🌐', title: 'Regional Languages', desc: 'Get readings in Hindi, Tamil, Telugu, Kannada, Bengali, Marathi and more.' },
    { icon: '🔯', title: 'Vedic Accuracy', desc: 'Classical Parashari & Jaimini methods for your Kundli, Dasha and transit analysis.' },
    { icon: '🌙', title: '24/7 Available', desc: 'Your personal astrologer is awake even at 3 AM when you need guidance the most.' },
    { icon: '⏳', title: 'Personalized Dasha', desc: 'Precise Vimshottari Dasha timeline tailored to your birth chart and current period.' },
    { icon: '📅', title: 'Daily Panchang', desc: 'Today\'s Tithi, Nakshatra, Yoga, Karana, Rahu Kaal and auspicious muhurtas.' },
  ]

  const steps = [
    { number: 1, icon: '📝', title: 'Enter Birth Details', desc: 'Provide your name, date, time and place of birth to generate your personalized Kundli.' },
    { number: 2, icon: '🔮', title: 'Get Your Kundli', desc: 'Our AI calculates your North Indian birth chart with all 9 grahas in their precise positions.' },
    { number: 3, icon: '💬', title: 'Ask Anything', desc: 'Voice or type your questions in any language and receive personalized Vedic guidance.' },
  ]

  const languages = ['Hindi', 'Tamil', 'Telugu', 'Kannada', 'Bengali', 'Marathi', 'English', 'Gujarati', 'Punjabi', 'Malayalam']

  return (
    <div className="relative min-h-screen" style={{ background: '#0a0a1a' }}>
      <Navbar />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section
        className="relative min-h-screen flex flex-col items-center justify-center text-center px-4 pt-16 overflow-hidden"
        style={{
          background: 'radial-gradient(ellipse 80% 60% at 50% 30%, rgba(15,15,42,1) 0%, #0a0a1a 70%)',
        }}
      >
        <Starfield />

        {/* Decorative orbit rings */}
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 orbit-ring pointer-events-none"
          style={{
            width: 'min(700px, 180vw)',
            height: 'min(700px, 180vw)',
            border: '1px solid rgba(201,168,76,0.06)',
            borderRadius: '50%',
          }}
          aria-hidden="true"
        />
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 orbit-ring-reverse pointer-events-none"
          style={{
            width: 'min(500px, 130vw)',
            height: 'min(500px, 130vw)',
            border: '1px solid rgba(201,168,76,0.08)',
            borderRadius: '50%',
          }}
          aria-hidden="true"
        />

        <div className="relative z-10 max-w-4xl mx-auto flex flex-col items-center gap-8 animate-fade-in">
          {/* Eyebrow */}
          <span
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-inter tracking-widest uppercase"
            style={{
              background: 'rgba(201,168,76,0.08)',
              border: '1px solid rgba(201,168,76,0.3)',
              color: '#c9a84c',
            }}
          >
            ✦ Ancient Wisdom · Modern AI · Your Language
          </span>

          {/* Headline */}
          <h1 className="hero-title font-cinzel font-bold leading-tight">
            <span className="gold-shimmer">Talk to the Stars</span>
            <br />
            <span style={{ color: '#f0eee4' }}>in Your Language</span>
          </h1>

          {/* Subtitle */}
          <p
            className="max-w-xl text-lg leading-relaxed font-inter"
            style={{ color: 'rgba(240,238,228,0.7)' }}
          >
            Experience authentic Vedic astrology powered by AI. Get your personal Kundli,
            ask questions by voice, and receive guidance in Hindi, Tamil, Telugu and 9 more languages.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-4 mt-2">
            <Link
              href="/onboarding"
              className="btn-gold px-8 py-4 rounded-xl text-base font-cinzel font-bold tracking-wider shadow-gold transition-all duration-300"
              style={{
                background: 'linear-gradient(135deg, #c9a84c 0%, #f0d070 50%, #c9a84c 100%)',
                color: '#0a0a1a',
                minWidth: '220px',
              }}
            >
              Begin Your Journey ✦
            </Link>
            <Link
              href="/chat"
              className="px-8 py-4 rounded-xl text-base font-inter font-medium tracking-wide transition-all duration-300"
              style={{
                border: '1px solid rgba(201,168,76,0.4)',
                color: '#c9a84c',
                minWidth: '160px',
                textAlign: 'center',
              }}
            >
              Try Demo
            </Link>
          </div>

          {/* Trust badges */}
          <div
            className="flex flex-wrap items-center justify-center gap-6 text-xs font-inter mt-4"
            style={{ color: 'rgba(240,238,228,0.4)' }}
          >
            <span>✦ 50,000+ Kundlis Generated</span>
            <span>✦ 12+ Indian Languages</span>
            <span>✦ Classical Vedic Methods</span>
          </div>
        </div>

        {/* Scroll indicator */}
        <div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 animate-bounce"
          aria-hidden="true"
        >
          <div className="w-px h-8" style={{ background: 'linear-gradient(to bottom, transparent, rgba(201,168,76,0.4))' }} />
          <div
            className="w-1 h-1 rounded-full"
            style={{ background: '#c9a84c' }}
          />
        </div>
      </section>

      <div className="divider-gold mx-8" />

      {/* ── How It Works ─────────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 py-20">
        <div className="text-center mb-14">
          <p className="text-xs font-inter tracking-widest uppercase mb-3" style={{ color: 'rgba(201,168,76,0.6)' }}>
            Simple · Fast · Accurate
          </p>
          <h2 className="section-title font-cinzel font-bold" style={{ color: '#f0eee4' }}>
            How It <span style={{ color: '#c9a84c' }}>Works</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {steps.map((s, i) => (
            <div key={s.number} className="relative flex flex-col items-center">
              <Step {...s} />
              {i < steps.length - 1 && (
                <div
                  className="hidden md:block absolute right-0 top-10 w-8 text-center"
                  style={{ color: 'rgba(201,168,76,0.3)', fontSize: '1.5rem' }}
                  aria-hidden="true"
                >
                  →
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <div className="divider-gold mx-8" />

      {/* ── Features Grid ────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 py-20">
        <div className="text-center mb-14">
          <p className="text-xs font-inter tracking-widest uppercase mb-3" style={{ color: 'rgba(201,168,76,0.6)' }}>
            Everything You Need
          </p>
          <h2 className="section-title font-cinzel font-bold" style={{ color: '#f0eee4' }}>
            Cosmic <span style={{ color: '#c9a84c' }}>Features</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f) => (
            <FeatureCard key={f.title} {...f} />
          ))}
        </div>
      </section>

      <div className="divider-gold mx-8" />

      {/* ── Languages ────────────────────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-4 py-20 text-center">
        <p className="text-xs font-inter tracking-widest uppercase mb-3" style={{ color: 'rgba(201,168,76,0.6)' }}>
          Speak Your Heart
        </p>
        <h2 className="section-title font-cinzel font-bold mb-10" style={{ color: '#f0eee4' }}>
          Available in <span style={{ color: '#c9a84c' }}>12+ Languages</span>
        </h2>

        <div className="flex flex-wrap justify-center gap-3">
          {languages.map((lang) => (
            <span
              key={lang}
              className="px-5 py-2 rounded-full text-sm font-inter font-medium tracking-wide transition-all duration-300 hover:-translate-y-0.5"
              style={{
                background: 'rgba(201,168,76,0.08)',
                border: '1px solid rgba(201,168,76,0.3)',
                color: '#c9a84c',
              }}
            >
              {lang}
            </span>
          ))}
          <span
            className="px-5 py-2 rounded-full text-sm font-inter font-medium"
            style={{ color: 'rgba(240,238,228,0.4)', border: '1px dashed rgba(201,168,76,0.2)' }}
          >
            + more coming
          </span>
        </div>
      </section>

      <div className="divider-gold mx-8" />

      {/* ── Pricing ──────────────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 py-20" id="pricing">
        <div className="text-center mb-14">
          <p className="text-xs font-inter tracking-widest uppercase mb-3" style={{ color: 'rgba(201,168,76,0.6)' }}>
            Simple Pricing
          </p>
          <h2 className="section-title font-cinzel font-bold" style={{ color: '#f0eee4' }}>
            Choose Your <span style={{ color: '#c9a84c' }}>Path</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
          <PricingCard
            name="Free"
            price="₹0"
            period="/month"
            features={[
              '3 voice questions per day',
              'Basic Kundli generation',
              'Daily horoscope',
              'English only',
            ]}
            cta="Start Free"
          />
          <PricingCard
            name="Premium"
            price="₹199"
            period="/month"
            features={[
              'Unlimited voice questions',
              'Full Kundli report',
              'All 12+ languages',
              'Dasha & transit analysis',
              'Priority AI responses',
              'Daily Panchang',
            ]}
            highlighted
            cta="Go Premium"
          />
        </div>

        <p className="text-center mt-8 text-xs font-inter" style={{ color: 'rgba(240,238,228,0.35)' }}>
          No contracts · Cancel anytime · Secure payment via Razorpay
        </p>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer
        style={{
          borderTop: '1px solid rgba(201,168,76,0.15)',
          background: 'rgba(10,10,26,0.9)',
        }}
      >
        <div className="max-w-6xl mx-auto px-4 py-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <span
            className="text-xl font-cinzel font-bold tracking-wider"
            style={{ color: '#c9a84c' }}
          >
            ✦ Jyotish AI
          </span>

          <nav className="flex flex-wrap justify-center gap-6">
            {[
              { href: '/', label: 'Home' },
              { href: '/dashboard', label: 'Dashboard' },
              { href: '/chat', label: 'Chat' },
              { href: '/pricing', label: 'Pricing' },
              { href: '/onboarding', label: 'Get Started' },
            ].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-sm font-inter transition-colors duration-200 hover:text-gold"
                style={{ color: 'rgba(240,238,228,0.5)' }}
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <p className="text-xs font-inter" style={{ color: 'rgba(240,238,228,0.3)' }}>
            Jyotish AI © 2024
          </p>
        </div>

        <p
          className="text-center text-xs pb-4 font-inter"
          style={{ color: 'rgba(240,238,228,0.2)' }}
        >
          For guidance and entertainment purposes only.
        </p>
      </footer>
    </div>
  )
}
