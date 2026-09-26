/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        // All tokens read the CSS variables in globals.css so every utility
        // (bg-surface, text-primary, border-border, …) flips with the theme.
        background: 'rgb(var(--bg) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        card: {
          DEFAULT: 'rgb(var(--card) / <alpha-value>)',
          hover: 'rgb(var(--card-hover) / <alpha-value>)',
          active: 'rgb(var(--card-active) / <alpha-value>)',
        },
        border: {
          DEFAULT: 'rgb(var(--border) / <alpha-value>)',
          subtle: 'rgb(var(--border-subtle) / <alpha-value>)',
          highlight: 'rgb(var(--border-strong) / <alpha-value>)',
        },
        text: {
          primary: 'rgb(var(--text-primary) / <alpha-value>)',
          secondary: 'rgb(var(--text-secondary) / <alpha-value>)',
          muted: 'rgb(var(--text-muted) / <alpha-value>)',
        },
        aiden: {
          success: 'rgb(var(--success) / <alpha-value>)',
          warning: 'rgb(var(--warning) / <alpha-value>)',
          error: 'rgb(var(--error) / <alpha-value>)',
          info: 'rgb(var(--info) / <alpha-value>)',
          accent: 'rgb(var(--accent) / <alpha-value>)',
        },
        /* Static indigo/purple/violet/fuchsia/cyan classes across the app
           (legacy AI-purple era) are aliased onto theme tokens so every one of
           them flips with light/dark instead of fighting the palette.
           Base -> accent (primary), 400/300 -> info (lighter telemetry tone),
           deep shades (700-950) -> border-strong (subtle dark rim). */
        indigo: {
          DEFAULT: 'rgb(var(--accent) / <alpha-value>)',
          50: 'rgb(var(--interactive-soft) / <alpha-value>)',
          100: 'rgb(var(--interactive-soft) / <alpha-value>)',
          200: 'rgb(var(--interactive-soft) / <alpha-value>)',
          300: 'rgb(var(--info) / <alpha-value>)',
          400: 'rgb(var(--info) / <alpha-value>)',
          500: 'rgb(var(--accent) / <alpha-value>)',
          600: 'rgb(var(--accent) / <alpha-value>)',
          700: 'rgb(var(--interactive-hover, var(--accent)) / <alpha-value>)',
          800: 'rgb(var(--interactive-hover, var(--accent)) / <alpha-value>)',
          900: 'rgb(var(--interactive-hover, var(--accent)) / <alpha-value>)',
          950: 'rgb(var(--interactive-soft) / <alpha-value>)',
        },
        purple: {
          DEFAULT: 'rgb(var(--accent) / <alpha-value>)',
          300: 'rgb(var(--info) / <alpha-value>)',
          400: 'rgb(var(--info) / <alpha-value>)',
          500: 'rgb(var(--accent) / <alpha-value>)',
          600: 'rgb(var(--accent) / <alpha-value>)',
          700: 'rgb(var(--interactive-hover, var(--accent)) / <alpha-value>)',
          950: 'rgb(var(--interactive-soft) / <alpha-value>)',
        },
        violet: {
          DEFAULT: 'rgb(var(--accent) / <alpha-value>)',
          300: 'rgb(var(--info) / <alpha-value>)',
          400: 'rgb(var(--info) / <alpha-value>)',
          500: 'rgb(var(--accent) / <alpha-value>)',
          600: 'rgb(var(--accent) / <alpha-value>)',
          700: 'rgb(var(--interactive-hover, var(--accent)) / <alpha-value>)',
        },
        fuchsia: {
          DEFAULT: 'rgb(var(--accent) / <alpha-value>)',
          400: 'rgb(var(--info) / <alpha-value>)',
          500: 'rgb(var(--accent) / <alpha-value>)',
          600: 'rgb(var(--accent) / <alpha-value>)',
        },
        cyan: {
          DEFAULT: 'rgb(var(--info) / <alpha-value>)',
          200: 'rgb(var(--interactive-soft) / <alpha-value>)',
          300: 'rgb(var(--info) / <alpha-value>)',
          400: 'rgb(var(--info) / <alpha-value>)',
          500: 'rgb(var(--info) / <alpha-value>)',
          600: 'rgb(var(--accent) / <alpha-value>)',
          700: 'rgb(var(--accent) / <alpha-value>)',
        },
      },
      borderRadius: {
        sm: '6px',
        md: '10px',
        lg: '14px',
        xl: '18px',
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'sans-serif',
        ],
        mono: [
          '"JetBrains Mono"',
          '"Fira Code"',
          'monospace',
        ],
      },
      boxShadow: {
        // Theme-aware elevation (light: soft gray, dark: deeper black).
        'card-glow': '0 1px 3px rgb(var(--scrim) / 0.06), 0 1px 2px rgb(var(--scrim) / 0.04)',
        'ai-glow': '0 0 0 1px rgb(var(--accent) / 0.25), 0 4px 16px -4px rgb(var(--accent) / 0.35)',
        'elevated': '0 10px 25px -5px rgb(var(--scrim) / 0.10), 0 8px 10px -6px rgb(var(--scrim) / 0.06)',
        'lift': '0 12px 28px -8px rgb(var(--scrim) / 0.14), 0 4px 10px -4px rgb(var(--scrim) / 0.06)',
        'glass': '0 8px 32px rgb(var(--scrim) / 0.12)',
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'flow-glow': 'flow-glow 4s ease infinite',
        'fade-in': 'fade-in 0.35s cubic-bezier(0.16, 1, 0.3, 1) both',
        'fade-up': 'fade-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) both',
        'pop-in': 'pop-in 0.28s cubic-bezier(0.34, 1.56, 0.64, 1) both',
        'slide-in-right': 'slide-in-right 0.3s cubic-bezier(0.16, 1, 0.3, 1) both',
      },
      keyframes: {
        'flow-glow': {
          '0%, 100%': { opacity: '0.55' },
          '50%': { opacity: '1' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pop-in': {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'slide-in-right': {
          '0%': { opacity: '0', transform: 'translateX(16px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      }
    },
  },
  plugins: [],
};
