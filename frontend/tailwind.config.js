/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#0a0a1a',
          50:  '#1a1a2e',
          100: '#16213e',
          200: '#0f3460',
          300: '#0a0a1a',
        },
        gold: {
          DEFAULT: '#c9a84c',
          light: '#e2c97e',
          dark:  '#a07c2a',
          glow:  '#f0d070',
        },
        cream: {
          DEFAULT: '#f0eee4',
          dark:    '#d4d0c0',
          muted:   '#a09e94',
        },
      },
      fontFamily: {
        cinzel: ['Cinzel', 'Georgia', 'serif'],
        inter:  ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'gold-gradient':    'linear-gradient(135deg, #c9a84c 0%, #f0d070 50%, #c9a84c 100%)',
        'navy-gradient':    'linear-gradient(135deg, #0a0a1a 0%, #1a1a2e 50%, #0a0a1a 100%)',
        'mystic-gradient':  'linear-gradient(135deg, #0a0a1a 0%, #0f0f2a 40%, #1a1030 100%)',
        'card-gradient':    'linear-gradient(135deg, rgba(26,26,46,0.9) 0%, rgba(15,15,42,0.95) 100%)',
      },
      boxShadow: {
        'gold':      '0 0 20px rgba(201,168,76,0.3)',
        'gold-lg':   '0 0 40px rgba(201,168,76,0.5)',
        'gold-glow': '0 0 60px rgba(201,168,76,0.4), 0 0 120px rgba(201,168,76,0.2)',
        'card':      '0 8px 32px rgba(0,0,0,0.6)',
        'card-lg':   '0 16px 64px rgba(0,0,0,0.8)',
      },
      animation: {
        'pulse-slow':   'pulse 3s ease-in-out infinite',
        'spin-slow':    'spin 8s linear infinite',
        'float':        'float 6s ease-in-out infinite',
        'shimmer':      'shimmer 2s linear infinite',
        'sound-wave-1': 'soundWave 1.2s ease-in-out infinite',
        'sound-wave-2': 'soundWave 1.2s ease-in-out 0.2s infinite',
        'sound-wave-3': 'soundWave 1.2s ease-in-out 0.4s infinite',
        'sound-wave-4': 'soundWave 1.2s ease-in-out 0.6s infinite',
        'sound-wave-5': 'soundWave 1.2s ease-in-out 0.8s infinite',
        'fade-in':      'fadeIn 0.6s ease-out forwards',
        'slide-up':     'slideUp 0.6s ease-out forwards',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-20px)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        soundWave: {
          '0%, 100%': { transform: 'scaleY(0.3)', opacity: '0.5' },
          '50%':      { transform: 'scaleY(1)',   opacity: '1'   },
        },
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%':   { opacity: '0', transform: 'translateY(30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)'    },
        },
      },
    },
  },
  plugins: [],
}
