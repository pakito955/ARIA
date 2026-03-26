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
        purple: 'var(--purple)',
        'text-1': 'var(--text-1)',
        'text-2': 'var(--text-2)',
        'text-3': 'var(--text-3)',
        'bg-base': 'var(--bg-base)',
        'bg-surface': 'var(--bg-surface)',
        'bg-card': 'var(--bg-card)',
        'bg-hover': 'var(--bg-hover)',
        'bg-input': 'var(--bg-input)',
      },
      boxShadow: {
        // Brand glow shadows — use on accent elements & active states
        'glow-accent':    '0 0 20px rgba(242, 78, 30, 0.30), 0 0 40px rgba(242, 78, 30, 0.12)',
        'glow-accent-sm': '0 0 10px rgba(242, 78, 30, 0.22)',
        'glow-accent-lg': '0 0 40px rgba(242, 78, 30, 0.40), 0 0 80px rgba(242, 78, 30, 0.15)',
        'glow-purple':    '0 0 20px rgba(124, 92, 255, 0.30), 0 0 40px rgba(124, 92, 255, 0.12)',
        'glow-purple-sm': '0 0 10px rgba(124, 92, 255, 0.20)',
        // Combined dual-color glow — use on hero elements
        'glow-dual':      '0 0 32px rgba(242, 78, 30, 0.20), 0 0 64px rgba(124, 92, 255, 0.12)',
        // Card elevation with subtle inner light
        'card-cinema':    '0 8px 32px rgba(0,0,0,0.42), 0 1px 0 rgba(255,255,255,0.05) inset',
        'card-active':    '0 0 0 1px rgba(242, 78, 30, 0.22), 0 4px 24px rgba(242, 78, 30, 0.14)',
        // Glassmorphism panel
        'glass-panel':    '0 8px 32px rgba(0,0,0,0.36), inset 0 1px 0 rgba(255,255,255,0.06)',
      },
      backgroundImage: {
        // Ambient scene lighting — apply to fixed overlay divs
        'ambient-orange': 'radial-gradient(ellipse 70% 55% at 0% 0%, rgba(242, 78, 30, 0.07) 0%, transparent 65%)',
        'ambient-purple': 'radial-gradient(ellipse 60% 55% at 100% 100%, rgba(124, 92, 255, 0.07) 0%, transparent 65%)',
        'ambient-both':   'radial-gradient(ellipse 70% 55% at 0% 0%, rgba(242, 78, 30, 0.07) 0%, transparent 65%), radial-gradient(ellipse 60% 55% at 100% 100%, rgba(124, 92, 255, 0.07) 0%, transparent 65%)',
        // AI processing shimmer gradient
        'shimmer-ai':     'linear-gradient(90deg, transparent 0%, rgba(242, 78, 30, 0.14) 30%, rgba(124, 92, 255, 0.14) 60%, transparent 100%)',
        // Text gradients
        'gradient-brand': 'linear-gradient(135deg, #F24E1E 0%, #7C5CFF 100%)',
        'gradient-orange':'linear-gradient(135deg, #F24E1E 0%, #FF8A5B 100%)',
        'gradient-purple':'linear-gradient(135deg, #7C5CFF 0%, #A78BFA 100%)',
      },
      animation: {
        'fade-in-up':    'fade-in-up 0.4s ease both',
        'spin-slow':     'spin 2s linear infinite',
        // Cinematic page / card entrance
        'cinema-in':     'cinema-in 0.50s cubic-bezier(0.22, 1, 0.36, 1) both',
        // AI processing skeleton shimmer
        'ai-shimmer':    'ai-shimmer 2.2s ease-in-out infinite',
        // Active glow pulse on accent elements
        'glow-pulse':    'glow-pulse 2.8s ease-in-out infinite',
        // Stagger entrance (override delay via style)
        'stagger-in':    'stagger-in 0.40s cubic-bezier(0.22, 1, 0.36, 1) both',
      },
      keyframes: {
        'cinema-in': {
          '0%':   { opacity: '0', transform: 'translateY(12px) scale(0.99)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'ai-shimmer': {
          '0%':   { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
        'glow-pulse': {
          '0%, 100%': { opacity: '1',  boxShadow: '0 0 20px rgba(242, 78, 30, 0.28)' },
          '50%':      { opacity: '0.8', boxShadow: '0 0 40px rgba(242, 78, 30, 0.50)' },
        },
        'stagger-in': {
          '0%':   { opacity: '0', transform: 'translateY(14px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      transitionTimingFunction: {
        'cinema': 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      screens: {
        xs: '390px',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
