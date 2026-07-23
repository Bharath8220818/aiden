/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        primary: {
          50: 'rgba(124, 58, 237, 0.1)',
          100: 'rgba(124, 58, 237, 0.2)',
          200: '#8B5CF6',
          300: '#7C3AED',
          400: '#6D28D9',
          500: '#5B21B6',
          600: '#4C1D95',
          700: '#3B0764',
        },
        secondary: {
          50: 'rgba(6, 182, 212, 0.1)',
          100: 'rgba(6, 182, 212, 0.2)',
          200: '#22D3EE',
          300: '#06B6D4',
          400: '#0891B2',
          500: '#0E7490',
          600: '#155E75',
          700: '#164E63',
        },
      },
      boxShadow: {
        'glow-primary': '0 0 40px rgba(124, 58, 237, 0.15)',
        'glow-secondary': '0 0 40px rgba(6, 182, 212, 0.10)',
      },
    },
  },
  plugins: [],
};
