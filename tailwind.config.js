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
        cormorant: ['var(--font-cormorant)', 'Georgia', 'serif'],
        space: ['var(--font-space)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'Consolas', 'monospace'],
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
    },
  },
  plugins: [require('tailwindcss-animate')],
}
