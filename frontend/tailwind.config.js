/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        pulse: {
          black: '#0a0a0a',
          dark: '#121212', 
          blue: '#3b82f6',
          green: '#22c55e',
        }
      }
    },
  },
  plugins: [],
}
