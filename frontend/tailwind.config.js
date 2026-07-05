/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Semantic tokens (dark-first)
        bg: '#0B1220',
        surface: { DEFAULT: '#151E30', hover: '#1C2942', input: '#0E1626' },
        line: 'rgba(148,163,184,0.12)',
        ink: { DEFAULT: '#E6EDF7', muted: '#94A3B8', subtle: '#64748B' },
        accent: { DEFAULT: '#2DD4BF', hover: '#14B8A6', ink: '#042C27' },
        // Legacy names remapped so untouched screens inherit the new look
        pulse: {
          black: '#0B1220',
          dark: '#151E30',
          blue: '#22D3EE',
          green: '#2DD4BF',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      borderRadius: { xl: '0.875rem', '2xl': '1.125rem' },
      boxShadow: {
        card: '0 1px 2px rgba(0,0,0,0.28), 0 12px 28px -16px rgba(0,0,0,0.55)',
        pop: '0 12px 40px -12px rgba(0,0,0,0.6)',
        glow: '0 0 0 1px rgba(45,212,191,0.35), 0 8px 30px -8px rgba(45,212,191,0.25)',
      },
      keyframes: {
        'fade-in': { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        'fade-up': { '0%': { opacity: '0', transform: 'translateY(6px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
      },
      animation: {
        'fade-in': 'fade-in 0.18s ease-out both',
        'fade-up': 'fade-up 0.28s ease-out both',
      },
    },
  },
  plugins: [],
}
