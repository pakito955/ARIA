/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        outfit: ['var(--font-outfit)', 'system-ui', 'sans-serif'],
        inter: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'Consolas', 'monospace'],
        // Backwards compatibility aliases
        cormorant: ['var(--font-outfit)', 'system-ui', 'sans-serif'],
        space: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      colors: {
        border: 'rgba(255,255,255,0.055)',
        gold: '#e8c97a',
        teal: '#4fd1c5',
        rose: '#f4a0b5',
        muted: '#8888aa',
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.4s ease both',
        'spin-slow': 'spin 2s linear infinite',
      },
      screens: {
        xs: '390px',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
