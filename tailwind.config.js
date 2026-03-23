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
        border: 'var(--border)',
        accent: 'var(--accent)',
        'text-1': 'var(--text-1)',
        'text-2': 'var(--text-2)',
        'text-3': 'var(--text-3)',
        'bg-base': 'var(--bg-base)',
        'bg-surface': 'var(--bg-surface)',
        'bg-card': 'var(--bg-card)',
        'bg-hover': 'var(--bg-hover)',
        'bg-input': 'var(--bg-input)',
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
