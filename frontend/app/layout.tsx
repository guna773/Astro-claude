import type { Metadata } from 'next'
import { Cinzel, Inter } from 'next/font/google'
import './globals.css'

const cinzel = Cinzel({
  subsets: ['latin'],
  weight: ['400', '600', '700', '900'],
  variable: '--font-cinzel',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Jyotish AI — Talk to the Stars in Your Language',
  description:
    'Ancient Vedic wisdom meets modern AI. Get personalized Kundli readings, daily horoscopes, and voice-powered astrology guidance in your language.',
  keywords: [
    'Vedic astrology',
    'Jyotish',
    'Kundli',
    'horoscope',
    'AI astrology',
    'voice astrology',
    'Indian astrology',
  ],
  authors: [{ name: 'Jyotish AI' }],
  openGraph: {
    title: 'Jyotish AI — Talk to the Stars in Your Language',
    description:
      'Ancient Vedic wisdom meets modern AI. Personalized Kundli readings in your language.',
    type: 'website',
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
  },
  themeColor: '#0a0a1a',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      className={`${cinzel.variable} ${inter.variable}`}
      suppressHydrationWarning
    >
      <body
        className="font-inter bg-navy text-cream min-h-screen antialiased"
        style={{ backgroundColor: '#0a0a1a', color: '#f0eee4' }}
      >
        {/* Global page transition wrapper */}
        <div className="page-enter">
          {children}
        </div>
      </body>
    </html>
  )
}
