'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navLinks = [
  { href: '/',          label: 'Home'      },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/chat',      label: 'Chat'      },
  { href: '/pricing',   label: 'Pricing'   },
]

export default function Navbar() {
  const [menuOpen,   setMenuOpen]   = useState(false)
  const [scrolled,   setScrolled]   = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Close menu on route change
  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 navbar-glass transition-all duration-300 ${
        scrolled ? 'shadow-card' : ''
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 group"
            aria-label="Jyotish AI Home"
          >
            <span
              className="text-xl sm:text-2xl font-cinzel font-bold tracking-wider text-gold transition-all duration-300 group-hover:text-gold-light"
              style={{
                color: '#c9a84c',
                textShadow: '0 0 20px rgba(201,168,76,0.4)',
              }}
            >
              ✦ Jyotish AI
            </span>
          </Link>

          {/* Desktop Navigation */}
          <ul className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.href
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={`px-4 py-2 rounded-lg font-inter text-sm font-medium tracking-wide transition-all duration-200 ${
                      isActive
                        ? 'text-gold bg-gold/10 border border-gold/30'
                        : 'text-cream/70 hover:text-cream hover:bg-white/5'
                    }`}
                    style={isActive ? { color: '#c9a84c' } : {}}
                  >
                    {link.label}
                  </Link>
                </li>
              )
            })}
            <li className="ml-3">
              <Link
                href="/onboarding"
                className="btn-gold px-5 py-2 rounded-lg text-sm transition-all duration-200"
                style={{
                  background: 'linear-gradient(135deg, #c9a84c, #f0d070)',
                  color: '#0a0a1a',
                  fontFamily: 'var(--font-cinzel), serif',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  letterSpacing: '0.05em',
                }}
              >
                Begin Journey
              </Link>
            </li>
          </ul>

          {/* Mobile Hamburger */}
          <button
            className="md:hidden p-2 rounded-lg text-cream/70 hover:text-cream hover:bg-white/5 transition-all duration-200"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
          >
            <div className="w-6 h-5 flex flex-col justify-between">
              <span
                className={`block h-0.5 bg-current rounded-full transition-all duration-300 origin-center ${
                  menuOpen ? 'rotate-45 translate-y-2' : ''
                }`}
              />
              <span
                className={`block h-0.5 bg-current rounded-full transition-all duration-300 ${
                  menuOpen ? 'opacity-0 scale-x-0' : ''
                }`}
              />
              <span
                className={`block h-0.5 bg-current rounded-full transition-all duration-300 origin-center ${
                  menuOpen ? '-rotate-45 -translate-y-2' : ''
                }`}
              />
            </div>
          </button>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      <div
        className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${
          menuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div
          className="px-4 pb-6 pt-2 space-y-1"
          style={{
            background: 'rgba(10,10,26,0.97)',
            borderTop: '1px solid rgba(201,168,76,0.1)',
          }}
        >
          {navLinks.map((link) => {
            const isActive = pathname === link.href
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`block px-4 py-3 rounded-lg font-inter text-sm font-medium tracking-wide transition-all duration-200 ${
                  isActive
                    ? 'text-gold bg-gold/10 border border-gold/30'
                    : 'text-cream/70 hover:text-cream hover:bg-white/5'
                }`}
                style={isActive ? { color: '#c9a84c' } : {}}
              >
                {link.label}
              </Link>
            )
          })}
          <div className="pt-3">
            <Link
              href="/onboarding"
              className="block text-center px-5 py-3 rounded-lg text-sm font-bold tracking-wider transition-all duration-200"
              style={{
                background: 'linear-gradient(135deg, #c9a84c, #f0d070)',
                color: '#0a0a1a',
                fontFamily: 'var(--font-cinzel), serif',
              }}
            >
              Begin Your Journey
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}
