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
        background: '#0B0D10',
        surface: '#0F1115',
        card: {
          DEFAULT: '#14171C',
          hover: '#1A1E25',
          active: '#1F242C',
        },
        border: {
          DEFAULT: '#242831',
          subtle: '#1A1D24',
          highlight: '#383F4D',
        },
        text: {
          primary: '#F5F7FA',
          secondary: '#9CA3AF',
          muted: '#6B7280',
        },
        aiden: {
          success: '#22C55E',
          warning: '#F59E0B',
          error: '#EF4444',
          info: '#3B82F6',
          accent: '#6366F1',
          purple: '#8B5CF6',
          cyan: '#06B6D4',
        }
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
        'card-glow': '0 0 20px -5px rgba(99, 102, 241, 0.15)',
        'ai-glow': '0 0 25px -4px rgba(99, 102, 241, 0.35)',
        'elevated': '0 10px 25px -5px rgba(0, 0, 0, 0.6), 0 8px 10px -6px rgba(0, 0, 0, 0.4)',
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'flow-glow': 'flow-glow 4s ease infinite',
      },
      keyframes: {
        'flow-glow': {
          '0%, 100%': { opacity: '0.4', filter: 'drop-shadow(0 0 4px rgba(99, 102, 241, 0.4))' },
          '50%': { opacity: '0.9', filter: 'drop-shadow(0 0 12px rgba(99, 102, 241, 0.8))' },
        },
      }
    },
  },
  plugins: [],
};
