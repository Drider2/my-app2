import plugin from 'tailwindcss/plugin';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: 'var(--color-bg)',
        surface: {
          DEFAULT: 'var(--color-surface)',
          subtle: 'var(--color-surface-subtle)',
        },
        border: 'var(--color-border)',
        accent: {
          DEFAULT: 'var(--color-accent)',
          secondary: 'var(--color-accent-secondary)',
          subtle: 'var(--color-accent-subtle)',
          contrast: 'var(--color-accent-contrast)',
        },
        cyan: {
          DEFAULT: 'var(--color-cyan)',
        },
        lime: {
          DEFAULT: 'var(--color-lime)',
        },
        text: {
          primary: 'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          muted: 'var(--color-text-muted)',
        },
        status: {
          success: 'var(--color-success)',
          warning: 'var(--color-warning)',
          danger: 'var(--color-danger)',
        },
      },
      backgroundImage: {
        'brand-gradient': 'var(--gradient-brand)',
        'hero-card': 'var(--card-hero-bg)',
      },
      fontFamily: {
        sans: [
          'Inter',
          'Noto Sans Arabic',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
        arabic: ['Noto Sans Arabic', 'Inter', 'sans-serif'],
      },
      fontSize: {
        // Strict 4-tier scale (no text under 12px)
        'caption': ['12px', { lineHeight: '16px', letterSpacing: 'normal' }],
        'body': ['15px', { lineHeight: '22px', letterSpacing: 'normal' }],
        'heading': ['18px', { lineHeight: '26px', letterSpacing: '-0.01em', fontWeight: '600' }],
        'title': ['24px', { lineHeight: '32px', letterSpacing: '-0.02em', fontWeight: '600' }],
        // Key metric display figures
        'metric': ['32px', { lineHeight: '38px', letterSpacing: '-0.02em', fontWeight: '600' }],
        'metric-sm': ['28px', { lineHeight: '34px', letterSpacing: '-0.02em', fontWeight: '600' }],
      },
      borderRadius: {
        'control': '12px',
        'card': '16px',
        'xl': '12px',
        '2xl': '16px',
        '3xl': '20px',
      },
    },
  },
  plugins: [
    plugin(function({ addVariant }) {
      addVariant('phone', ['html[data-layout="phone"] &', 'html[data-layout="phone"]&']);
      addVariant('wide', ['html[data-layout="wide"] &', 'html[data-layout="wide"]&']);
      addVariant('tablet', ['html[data-layout="tablet"] &', 'html[data-layout="tablet"]&']);
    }),
  ],
};
