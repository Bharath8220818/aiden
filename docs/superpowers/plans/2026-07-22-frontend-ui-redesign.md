# AIDEN Frontend UI/UX Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the AIDEN frontend UI/UX with glassmorphism, updated layout system (AppLayout), improved Sidebar/Header/MobileNav, enhanced theme store, new design tokens, and fresh component styling — all without changing any backend functionality.

**Architecture:** Update the frontend shell (App.tsx routing, AppLayout integration, Sidebar, Header, MobileNav, ThemeToggle, ThemeStore, ToastProvider) and refresh the global CSS design system. All API calls, stores, page logic, types, and utilities remain untouched.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS 3.4, Zustand 5, Framer Motion, Lucide React, React Router 7

---

## File Structure

### Files to MODIFY (existing):

| File | Purpose |
|------|---------|
| `src/App.tsx` | Update routing to use `<AppLayout>` wrapper for protected routes |
| `src/index.css` | New design tokens, updated glass/button/input/badge classes, dark mode vars |
| `src/components/Sidebar.tsx` → move to `src/components/common/Sidebar.tsx` | New nav items, collapsible, logout, mobile overlay |
| `src/components/common/Header.tsx` | Mobile menu toggle, ThemeToggle integration, user avatar |
| `src/components/layout/MobileNav.tsx` | Update nav items to match Sidebar |
| `src/components/common/ThemeToggle.tsx` | Use lucide-react icons (Sun/Moon/Monitor) instead of emojis |
| `src/store/themeStore.ts` | Add 'system' theme option, effectiveTheme getter, system preference listener |
| `src/store/index.ts` | Add themeStore and analyticsStore exports |
| `src/components/auth/ProtectedRoute.tsx` | Minor: remove `getCurrentUser` call (handled by AppShell) |
| `src/components/ui/Toast.tsx` | Remove fixed positioning (handled by ToastProvider) |
| `src/components/providers/ToastProvider.tsx` | Add AnimatePresence wrapper |
| `tailwind.config.js` | Add primary/secondary color scales, font-mono, glow shadows, animations |
| `package.json` | No changes needed — all dependencies already present |

### Files to CREATE:

| File | Purpose |
|------|---------|
| `src/components/common/Sidebar.tsx` | Moved + rewritten (see above) |

### Files UNTOUCHED (explicitly preserved):

- All backend files (`backend/`)
- `src/api/*` — all API calls
- `src/store/authStore.ts`, `pipelineStore.ts`, `agentStore.ts`, `notificationStore.ts`, `analyticsStore.ts` — logic unchanged
- `src/types/*`, `src/types.ts`
- `src/utils/*`
- `src/hooks/*`
- All pages (`src/pages/*`) — only import paths may change
- All UI components (`src/components/ui/*`) except Toast.tsx
- All builder/agents/analytics/dashboard components

---

### Task 1: Update Tailwind Configuration

**Files:**
- Modify: `D:\aiden\frontend\tailwind.config.js`

**Purpose:** Add the new color scales (primary with rgba variants, secondary/cyan), custom font-mono, glow shadows, and extended animations from the design spec.

- [ ] **Step 1: Read existing tailwind.config.js**

```bash
cat D:\aiden\frontend\tailwind.config.js
```

- [ ] **Step 2: Rewrite tailwind.config.js**

Replace the `theme.extend.colors` section to add proper `primary` and `secondary` scales matching the design spec. Keep existing `dark`, `flow`, `process`, `success`, `danger`, `warning`, `gray` scales. Add new entries:

```js
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        display: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        dark: {
          50: '#f8fafc', 100: '#f1f5f9', 200: '#e2e8f0', 300: '#cbd5e1',
          400: '#94a3b8', 500: '#64748b', 600: '#475569', 700: '#334155',
          800: '#1e293b', 850: '#151e2f', 900: '#0f172a', 950: '#050816',
        },
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
        flow: {
          50: '#ecfeff', 100: '#cffafe', 200: '#a5f3fc', 300: '#67e8f9',
          400: '#22d3ee', 500: '#06b6d4', 600: '#0891b2', 700: '#0e7490',
          800: '#155e75', 900: '#164e63',
        },
        process: {
          50: '#fffbeb', 100: '#fef3c7', 200: '#fde68a', 300: '#fcd34d',
          400: '#fbbf24', 500: '#f59e0b', 600: '#d97706', 700: '#b45309',
          800: '#92400e', 900: '#78350f',
        },
        success: {
          50: '#f0fdf4', 100: '#dcfce7', 200: '#bbf7d0', 300: '#86efac',
          400: '#4ade80', 500: '#22c55e', 600: '#16a34a', 700: '#15803d',
        },
        danger: {
          50: '#fef2f2', 100: '#fee2e2', 200: '#fecaca', 300: '#fca5a5',
          400: '#f87171', 500: '#ef4444', 600: '#dc2626', 700: '#b91c1c',
        },
        warning: {
          50: '#fffbeb', 100: '#fef3c7', 200: '#fde68a', 300: '#fcd34d',
          400: '#fbbf24', 500: '#f59e0b', 600: '#d97706', 700: '#b45309',
        },
        gray: {
          50: '#f8fafc', 100: '#f1f5f9', 200: '#e2e8f0', 300: '#cbd5e1',
          400: '#94a3b8', 500: '#64748b', 600: '#475569', 700: '#334155',
          800: '#1e293b', 850: '#151e2f', 900: '#0f172a', 950: '#050816',
        },
      },
      borderRadius: {
        '2xl': '1rem', '3xl': '1.5rem', '4xl': '2rem',
      },
      boxShadow: {
        'glass': '0 8px 32px rgba(0, 0, 0, 0.3)',
        'glass-lg': '0 16px 48px rgba(0, 0, 0, 0.4)',
        'glow-purple': '0 0 40px rgba(124, 58, 237, 0.15)',
        'glow-cyan': '0 0 40px rgba(6, 182, 212, 0.10)',
        'glow-purple-lg': '0 0 60px rgba(124, 58, 237, 0.25)',
        'inner-glow': 'inset 0 1px 0 rgba(255, 255, 255, 0.05)',
      },
      animation: {
        'flow-particle': 'flowParticle 8s ease-in-out infinite',
        'flow-particle-delayed': 'flowParticle 8s ease-in-out 2s infinite',
        'pulse-soft': 'pulseSoft 3s ease-in-out infinite',
        'slide-up-fade': 'slideUpFade 0.5s ease-out both',
        'drift': 'drift 20s ease-in-out infinite',
        'fade-in': 'fadeIn 0.4s ease-out both',
        'slide-up': 'slideUp 0.4s ease-out both',
        'slide-down': 'slideDown 0.3s ease-out both',
        'scale-in': 'scaleIn 0.3s ease-out both',
        'bounce-in': 'bounceIn 0.5s ease-out both',
        'spin-slow': 'spin 3s linear infinite',
        'ping-slow': 'ping 3s cubic-bezier(0, 0, 0.2, 1) infinite',
        'gradient-x': 'gradientX 3s ease infinite',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
        'shimmer': 'shimmer 2s infinite',
        'slide-in-right': 'slideInRight 0.3s ease forwards',
        'slide-in-left': 'slideInLeft 0.3s ease forwards',
      },
      dropShadow: {
        'glow-purple': '0 0 40px rgba(124, 58, 237, 0.15)',
        'glow-cyan': '0 0 40px rgba(6, 182, 212, 0.10)',
        'glow-purple-lg': '0 0 60px rgba(124, 58, 237, 0.25)',
      },
      keyframes: {
        flowParticle: {
          '0%, 100%': { transform: 'translateX(0) translateY(0)', opacity: '0' },
          '25%': { opacity: '0.8' },
          '50%': { opacity: '0.4' },
          '75%': { opacity: '0.8' },
          '100%': { transform: 'translateX(100px) translateY(-20px)', opacity: '0' },
        },
        pulseSoft: { '0%, 100%': { opacity: '0.4' }, '50%': { opacity: '0.8' } },
        slideUpFade: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        drift: {
          '0%, 100%': { transform: 'translate(0, 0)' },
          '25%': { transform: 'translate(10px, -10px)' },
          '50%': { transform: 'translate(-5px, 5px)' },
          '75%': { transform: 'translate(8px, -5px)' },
        },
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.9)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        bounceIn: {
          '0%': { opacity: '0', transform: 'scale(0.3)' },
          '50%': { opacity: '1', transform: 'scale(1.05)' },
          '70%': { transform: 'scale(0.9)' },
          '100%': { transform: 'scale(1)' },
        },
        gradientX: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        glowPulse: { '0%, 100%': { opacity: '0.4' }, '50%': { opacity: '0.8' } },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        slideInRight: {
          from: { transform: 'translateX(100%)', opacity: '0' },
          to: { transform: 'translateX(0)', opacity: '1' },
        },
        slideInLeft: {
          from: { transform: 'translateX(-100%)', opacity: '0' },
          to: { transform: 'translateX(0)', opacity: '1' },
        },
      },
      backgroundSize: { '300%': '300% 100%' },
    },
  },
  plugins: [],
}
```

- [ ] **Step 3: Verify build still works**

Run: `npm run build` in `D:\aiden\frontend`
Expected: Build succeeds (no new errors from tailwind changes)

---

### Task 2: Update Global CSS (index.css)

**Files:**
- Modify: `D:\aiden\frontend\src\index.css`

**Purpose:** Add new design tokens, enhanced glassmorphism classes, new button variants, light mode support, scrollbar utilities, touch targets, and animation delay utilities.

- [ ] **Step 1: Read current index.css**

Already done in analysis — it's 545 lines.

- [ ] **Step 2: Rewrite index.css with full design system**

Replace the entire file with:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* ── Design Tokens ───────────────────────────────────────────────────── */
@layer base {
  :root {
    color-scheme: dark;

    --font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    --font-mono: 'JetBrains Mono', 'Fira Code', monospace;

    --color-background: #050816;
    --color-card: #111827;
    --color-card-hover: #1E293B;
    --color-card-border: rgba(255, 255, 255, 0.05);

    --color-primary: #7C3AED;
    --color-primary-light: #A855F7;
    --color-primary-dark: #6D28D9;
    --color-primary-glow: rgba(124, 58, 237, 0.25);
    --color-primary-50: rgba(124, 58, 237, 0.1);

    --color-secondary: #06B6D4;
    --color-secondary-light: #22D3EE;
    --color-secondary-dark: #0891B2;
    --color-secondary-glow: rgba(6, 182, 212, 0.20);

    --color-success: #22C55E;
    --color-success-dark: #16A34A;
    --color-success-50: rgba(34, 197, 94, 0.1);
    --color-warning: #F59E0B;
    --color-warning-dark: #D97706;
    --color-warning-50: rgba(245, 158, 11, 0.1);
    --color-danger: #EF4444;
    --color-danger-dark: #DC2626;
    --color-danger-50: rgba(239, 68, 68, 0.1);
    --color-info: #6366F1;
    --color-info-50: rgba(99, 102, 241, 0.1);

    --color-text: #F8FAFC;
    --color-text-secondary: #94A3B8;
    --color-text-muted: #64748B;
    --color-border: rgba(255, 255, 255, 0.08);
    --color-border-hover: rgba(255, 255, 255, 0.15);
    --color-border-accent: rgba(124, 58, 237, 0.2);

    --gradient-primary: linear-gradient(135deg, #7C3AED, #06B6D4);
    --gradient-success: linear-gradient(135deg, #22C55E, #06B6D4);
    --gradient-warning: linear-gradient(135deg, #F59E0B, #EF4444);
    --gradient-glass: linear-gradient(135deg, rgba(124, 58, 237, 0.1), rgba(6, 182, 212, 0.05));
    --gradient-hero: linear-gradient(135deg, #050816 0%, #1a0533 30%, #050816 60%, #001a2e 100%);
    --gradient-card: linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0) 100%);

    --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.3);
    --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.4);
    --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.5);
    --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.6);
    --shadow-2xl: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
    --shadow-glow-primary: 0 0 40px rgba(124, 58, 237, 0.15);
    --shadow-glow-secondary: 0 0 40px rgba(6, 182, 212, 0.10);
  }

  .light {
    --color-background: #FFFFFF;
    --color-card: #FFFFFF;
    --color-card-hover: #F8FAFC;
    --color-card-border: rgba(0, 0, 0, 0.08);
    --color-text: #0F172A;
    --color-text-secondary: #475569;
    --color-text-muted: #94A3B8;
    --color-border: rgba(0, 0, 0, 0.08);
    --color-border-hover: rgba(0, 0, 0, 0.15);
    --color-border-accent: rgba(124, 58, 237, 0.15);
    --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
    --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
    --shadow-glow-primary: 0 0 40px rgba(124, 58, 237, 0.1);
    --shadow-glow-secondary: 0 0 40px rgba(6, 182, 212, 0.06);
  }

  html { @apply scroll-smooth; }

  body {
    @apply min-h-screen antialiased;
    font-family: var(--font-family);
    background-color: var(--color-background);
    color: var(--color-text);
    overflow-x: hidden;
  }

  * { border-color: var(--color-border); }

  ::selection { @apply bg-purple-500/30 text-white; }

  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { @apply rounded-full bg-gray-800; }
  ::-webkit-scrollbar-thumb:hover { @apply bg-gray-700; }

  * { scrollbar-width: thin; scrollbar-color: #334155 transparent; }
}

/* ── Glassmorphism ────────────────────────────────────────────────────── */
@layer components {
  .glass {
    @apply bg-[#0D1A2A]/60 backdrop-blur-[20px] border border-white/5;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  }

  .glass-hover:hover {
    @apply bg-[#0D1A2A]/80 border-primary/20;
    box-shadow: var(--shadow-glow-primary);
  }

  .glass-inset {
    @apply bg-[#050816] border border-[#1E293B]/40;
  }

  .glass-card {
    @apply rounded-2xl border;
    background: var(--gradient-card);
    border-color: var(--color-card-border);
    box-shadow: var(--shadow-sm);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .glass-card:hover {
    @apply border-primary/20;
    box-shadow: var(--shadow-glow-primary);
    transform: translateY(-2px);
  }

  .glass-card-active {
    @apply border-primary/30;
    box-shadow: var(--shadow-glow-primary) !important;
  }

  .glass-card-dark {
    @apply bg-[#050816]/70 backdrop-blur-[20px] border border-white/5 rounded-2xl shadow-lg;
  }

  .gradient-border {
    position: relative;
    background: var(--color-card);
    border-radius: 1.25rem;
  }
  .gradient-border::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    padding: 1px;
    background: linear-gradient(135deg, rgba(124, 58, 237, 0.3), rgba(6, 182, 212, 0.2), rgba(124, 58, 237, 0.1));
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    pointer-events: none;
  }
}

/* ── Buttons ──────────────────────────────────────────────────────────── */
@layer components {
  .btn {
    @apply inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200
           focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#050816];
  }

  .btn-primary {
    @apply btn text-white shadow-lg;
    background: linear-gradient(135deg, #7C3AED, #6D28D9);
    box-shadow: 0 4px 15px rgba(124, 58, 237, 0.3);
  }
  .btn-primary:hover {
    background: linear-gradient(135deg, #8B5CF6, #7C3AED);
    box-shadow: 0 6px 20px rgba(124, 58, 237, 0.4);
    transform: translateY(-1px);
  }
  .btn-primary:active { transform: translateY(0); }

  .btn-primary-gradient {
    @apply btn text-white shadow-lg;
    background: linear-gradient(135deg, #7C3AED, #06B6D4);
    box-shadow: 0 4px 15px rgba(124, 58, 237, 0.3);
  }
  .btn-primary-gradient:hover {
    box-shadow: 0 6px 25px rgba(124, 58, 237, 0.4);
    transform: translateY(-1px);
  }

  .btn-secondary {
    @apply btn;
    background: rgba(30, 41, 59, 0.8);
    border: 1px solid rgba(255, 255, 255, 0.08);
    color: var(--color-text);
  }
  .btn-secondary:hover {
    background: rgba(30, 41, 59, 1);
    border-color: rgba(255, 255, 255, 0.15);
  }

  .btn-ghost {
    @apply btn bg-transparent;
    color: var(--color-text-secondary);
  }
  .btn-ghost:hover {
    background: rgba(255, 255, 255, 0.05);
    color: var(--color-text);
  }

  .btn-danger {
    @apply btn text-white shadow-lg;
    background: linear-gradient(135deg, #EF4444, #DC2626);
  }
  .btn-danger:hover {
    box-shadow: 0 4px 15px rgba(239, 68, 68, 0.4);
    transform: translateY(-1px);
  }

  .btn-ghost-danger {
    @apply btn bg-transparent text-red-400;
  }
  .btn-ghost-danger:hover { background: rgba(239, 68, 68, 0.1); }

  .btn-icon {
    @apply flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-200;
    background: rgba(30, 41, 59, 0.5);
    border: 1px solid rgba(255, 255, 255, 0.06);
    color: var(--color-text-secondary);
  }
  .btn-icon:hover {
    background: rgba(30, 41, 59, 0.8);
    border-color: rgba(255, 255, 255, 0.12);
    color: var(--color-text);
  }

  .btn-sm { @apply px-3 py-1.5 text-xs rounded-lg; }
  .btn-lg { @apply px-6 py-3 text-base rounded-xl; }
}

/* ── Cards ────────────────────────────────────────────────────────────── */
@layer components {
  .card { @apply glass-card p-5; }
  .card-hover { @apply glass-card p-5 cursor-pointer; }
  .card-wrapper { @apply glass-card; }
}

/* ── Inputs ───────────────────────────────────────────────────────────── */
@layer components {
  .input {
    @apply w-full rounded-xl border px-4 py-3 text-sm shadow-sm transition-all duration-200
           focus:outline-none focus:ring-2 focus:ring-purple-500/20;
    background: rgba(15, 23, 42, 0.6);
    color: var(--color-text);
    border-color: rgba(255, 255, 255, 0.08);
  }
  .input::placeholder { color: var(--color-text-muted); }
  .input:hover { border-color: rgba(255, 255, 255, 0.15); }
  .input:focus { border-color: rgba(124, 58, 237, 0.4); }

  .input-glass {
    @apply input;
    background: rgba(17, 24, 39, 0.8);
    backdrop-filter: blur(12px);
  }

  .input-label { @apply block text-sm font-medium text-gray-400 mb-1.5; }
  .input-error { @apply border-red-500 focus:border-red-500 focus:ring-red-500/20; }
  .input-success { @apply border-green-500 focus:border-green-500 focus:ring-green-500/20; }
}

/* ── Badges ───────────────────────────────────────────────────────────── */
@layer components {
  .badge { @apply inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold; }

  .badge-success {
    @apply badge text-green-400;
    background: rgba(34, 197, 94, 0.1);
    border: 1px solid rgba(34, 197, 94, 0.2);
  }
  .badge-warning {
    @apply badge text-amber-400;
    background: rgba(245, 158, 11, 0.1);
    border: 1px solid rgba(245, 158, 11, 0.2);
  }
  .badge-error {
    @apply badge text-red-400;
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.2);
  }
  .badge-info {
    @apply badge text-purple-400;
    background: rgba(124, 58, 237, 0.1);
    border: 1px solid rgba(124, 58, 237, 0.2);
  }
  .badge-cyan {
    @apply badge text-cyan-400;
    background: rgba(6, 182, 212, 0.1);
    border: 1px solid rgba(6, 182, 212, 0.2);
  }
  .badge-gray {
    @apply badge text-gray-400;
    background: rgba(148, 163, 184, 0.1);
    border: 1px solid rgba(148, 163, 184, 0.15);
  }
}

/* ── Section Titles ───────────────────────────────────────────────────── */
@layer components {
  .section-title { @apply text-lg font-bold; color: var(--color-text); }
  .section-subtitle { @apply text-sm; color: var(--color-text-secondary); }
}

/* ── Status Dots ──────────────────────────────────────────────────────── */
@layer components {
  .status-dot { @apply w-2 h-2 rounded-full inline-block; }
  .status-dot-running { @apply status-dot bg-green-500 animate-pulse; box-shadow: 0 0 8px rgba(34, 197, 94, 0.5); }
  .status-dot-idle { @apply status-dot bg-gray-500; }
  .status-dot-error { @apply status-dot bg-red-500; box-shadow: 0 0 8px rgba(239, 68, 68, 0.5); }
  .status-dot-warning { @apply status-dot bg-yellow-500; box-shadow: 0 0 8px rgba(245, 158, 11, 0.5); }
}

/* ── Skeleton ─────────────────────────────────────────────────────────── */
@layer components {
  .skeleton {
    background: linear-gradient(90deg, rgba(30, 41, 59, 0.5) 25%, rgba(51, 65, 85, 0.5) 50%, rgba(30, 41, 59, 0.5) 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
    border-radius: 1rem;
  }
}

/* ── Mobile Touch Targets ────────────────────────────────────────────── */
@layer utilities {
  .touch-target { min-height: 44px; min-width: 44px; }

  .scrollbar-thin::-webkit-scrollbar { width: 4px; height: 4px; }
  .scrollbar-thin::-webkit-scrollbar-track { background: var(--color-background); }
  .scrollbar-thin::-webkit-scrollbar-thumb { background: var(--color-border); border-radius: 9999px; }
  .scrollbar-thin::-webkit-scrollbar-thumb:hover { background: var(--color-text-muted); }
}

/* ── Animations ───────────────────────────────────────────────────────── */
@layer utilities {
  .animate-fade-in { animation: fadeIn 0.4s ease-out both; }
  .animate-slide-up { animation: slideUp 0.4s ease-out both; }
  .animate-slide-down { animation: slideDown 0.3s ease-out both; }
  .animate-scale-in { animation: scaleIn 0.3s ease-out both; }
  .animate-bounce-in { animation: bounceIn 0.5s ease-out both; }
  .animate-shimmer {
    background: linear-gradient(90deg, transparent 25%, rgba(255,255,255,0.05) 50%, transparent 75%);
    background-size: 200% 100%;
    animation: shimmer 2s infinite;
  }
  .animate-pulse-border {
    animation: gradientX 3s linear infinite;
    background-size: 200% 100%;
  }

  .animation-delay-100 { animation-delay: 100ms; }
  .animation-delay-200 { animation-delay: 200ms; }
  .animation-delay-300 { animation-delay: 300ms; }
  .animation-delay-400 { animation-delay: 400ms; }
  .animation-delay-500 { animation-delay: 500ms; }
  .animation-delay-700 { animation-delay: 700ms; }
  .animation-delay-1000 { animation-delay: 1000ms; }

  .stagger-item {
    opacity: 0;
    animation: staggerFadeIn 0.4s ease-out forwards;
  }
  .stagger-item:nth-child(1) { animation-delay: 0ms; }
  .stagger-item:nth-child(2) { animation-delay: 60ms; }
  .stagger-item:nth-child(3) { animation-delay: 120ms; }
  .stagger-item:nth-child(4) { animation-delay: 180ms; }
  .stagger-item:nth-child(5) { animation-delay: 240ms; }
  .stagger-item:nth-child(6) { animation-delay: 300ms; }
  .stagger-item:nth-child(7) { animation-delay: 360ms; }
  .stagger-item:nth-child(8) { animation-delay: 420ms; }
}

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes slideDown {
  from { opacity: 0; transform: translateY(-20px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.9); }
  to { opacity: 1; transform: scale(1); }
}

@keyframes bounceIn {
  0% { opacity: 0; transform: scale(0.3); }
  50% { opacity: 1; transform: scale(1.05); }
  70% { transform: scale(0.9); }
  100% { transform: scale(1); }
}

@keyframes staggerFadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes gradientX {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}

/* ── Gradient Text ────────────────────────────────────────────────────── */
@layer utilities {
  .text-gradient {
    @apply bg-clip-text text-transparent;
    background-image: linear-gradient(135deg, #A855F7, #22D3EE);
  }
  .text-gradient-purple {
    @apply bg-clip-text text-transparent;
    background-image: linear-gradient(135deg, #A855F7, #7C3AED);
  }
  .text-gradient-cyan {
    @apply bg-clip-text text-transparent;
    background-image: linear-gradient(135deg, #22D3EE, #06B6D4);
  }

  .bg-gradient-animate {
    background: linear-gradient(-45deg, #050816, #1a0533, #050816, #001a2e);
    background-size: 400% 400%;
    animation: gradientShift 15s ease infinite;
  }

  .bg-grid {
    background-image:
      linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
    background-size: 32px 32px;
  }

  .glow-purple { box-shadow: 0 0 30px rgba(124, 58, 237, 0.15); }
  .glow-cyan { box-shadow: 0 0 30px rgba(6, 182, 212, 0.1); }

  .divider {
    @apply w-full h-px;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent);
  }
}

@keyframes gradientShift {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

/* ── Mobile Safe Area ─────────────────────────────────────────────────── */
@media (max-width: 640px) {
  button, a, input, select, textarea {
    min-height: 44px;
    min-width: 44px;
  }
  .card { @apply p-4; }
}
```

- [ ] **Step 3: Verify build**

Run: `npm run build` in `D:\aiden\frontend`
Expected: Build succeeds

---

### Task 3: Update Theme Store (add system theme)

**Files:**
- Modify: `D:\aiden\frontend\src\store\themeStore.ts`

**Purpose:** Extend ThemeState to support 'system' theme option, add `getEffectiveTheme()`, and listen for system preference changes.

- [ ] **Step 1: Rewrite themeStore.ts**

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark' | 'system';

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  getEffectiveTheme: () => 'light' | 'dark';
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      setTheme: (theme) => {
        set({ theme });
        if (typeof window !== 'undefined') {
          const effective = theme === 'system'
            ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
            : theme;
          document.documentElement.classList.toggle('dark', effective === 'dark');
          document.documentElement.classList.toggle('light', effective === 'light');
        }
      },
      toggleTheme: () => {
        const current = get().theme;
        const next: Theme = current === 'light' ? 'dark' : current === 'dark' ? 'system' : 'light';
        get().setTheme(next);
      },
      getEffectiveTheme: () => {
        const { theme } = get();
        if (typeof window === 'undefined') return 'dark';
        if (theme === 'system') {
          return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        return theme;
      },
    }),
    {
      name: 'theme-storage',
    }
  )
);

// Listen to system preference changes
if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const { theme, setTheme } = useThemeStore.getState();
    if (theme === 'system') {
      setTheme('system');
    }
  });
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build` in `D:\aiden\frontend`
Expected: Build succeeds

---

### Task 4: Update Store Index Exports

**Files:**
- Modify: `D:\aiden\frontend\src\store\index.ts`

**Purpose:** Export themeStore and analyticsStore alongside existing exports.

- [ ] **Step 1: Rewrite store/index.ts**

```typescript
export { useAuthStore } from './authStore';
export { usePipelineStore } from './pipelineStore';
export { useNotificationStore } from './notificationStore';
export { useAgentStore } from './agentStore';
export { useThemeStore } from './themeStore';
export { useAnalyticsStore } from './analyticsStore';
```

- [ ] **Step 2: Verify build**

Run: `npm run build` in `D:\aiden\frontend`
Expected: Build succeeds

---

### Task 5: Update ThemeToggle Component

**Files:**
- Modify: `D:\aiden\frontend\src\components\common\ThemeToggle.tsx`

**Purpose:** Replace emoji icons with lucide-react Sun/Moon/Monitor icons. Use the updated themeStore directly instead of the useTheme hook.

- [ ] **Step 1: Rewrite ThemeToggle.tsx**

```tsx
import React from 'react';
import { useThemeStore } from '../../store/themeStore';
import { Sun, Moon, Monitor } from 'lucide-react';

export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useThemeStore();

  const getIcon = () => {
    if (theme === 'light') return <Sun size={18} />;
    if (theme === 'dark') return <Moon size={18} />;
    return <Monitor size={18} />;
  };

  const getLabel = () => {
    if (theme === 'light') return 'Light mode';
    if (theme === 'dark') return 'Dark mode';
    return 'System preference';
  };

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg hover:bg-[#1E293B] transition-colors text-gray-400 hover:text-white"
      aria-label={getLabel()}
      title={getLabel()}
    >
      {getIcon()}
    </button>
  );
};

ThemeToggle.displayName = 'ThemeToggle';

export default ThemeToggle;
```

- [ ] **Step 2: Verify build**

Run: `npm run build` in `D:\aiden\frontend`
Expected: Build succeeds

---

### Task 6: Move and Rewrite Sidebar

**Files:**
- Create: `D:\aiden\frontend\src\components\common\Sidebar.tsx` (new location)
- Delete: `D:\aiden\frontend\src\components\Sidebar.tsx` (old location)

**Purpose:** New sidebar with updated nav items (Dashboard, AI Workspace, Pipelines, Monitoring, AI Agents, Analytics, Approvals, Settings), collapsible state, mobile overlay, logout button, and settings link.

- [ ] **Step 1: Create new Sidebar at common/Sidebar.tsx**

```tsx
import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Bot,
  GitBranch,
  Cpu,
  Activity,
  BarChart3,
  BookOpen,
  CheckCircle,
  Settings,
  LogOut,
  Search,
  Sparkles,
  Menu,
  X,
  Home,
  FileText,
  Shield,
  Bell,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: Sparkles, label: 'AI Workspace', path: '/builder' },
  { icon: GitBranch, label: 'Pipelines', path: '/pipelines' },
  { icon: Activity, label: 'Monitoring', path: '/monitoring' },
  { icon: Cpu, label: 'AI Agents', path: '/agents' },
  { icon: BarChart3, label: 'Analytics', path: '/analytics' },
  { icon: BookOpen, label: 'Knowledge Base', path: '/knowledge' },
  { icon: CheckCircle, label: 'Approvals', path: '/approvals' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

const Sidebar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    navigate('/login');
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Mobile toggle button - visible only on mobile */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-[#0D1A2A] border border-[#1E293B] text-gray-400 hover:text-white transition-colors"
      >
        {isMobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      <aside
        className={`
          fixed md:sticky top-0 left-0 z-50 h-screen
          transition-all duration-300 ease-in-out
          bg-[#0D1A2A] border-r border-[#1E293B]
          flex flex-col
          w-64
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 h-16 border-b border-[#1E293B] shrink-0">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-cyan-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
              A
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-lg font-bold text-white">AIDEN</span>
              <span className="text-[9px] font-medium uppercase tracking-widest text-gray-500">Enterprise AI OS</span>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {navItems.map((item) => {
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileOpen(false)}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200
                  ${active
                    ? 'bg-purple-600/20 text-purple-400 border border-purple-500/20'
                    : 'text-gray-400 hover:text-white hover:bg-[#1E293B] border border-transparent'
                  }
                `}
              >
                <item.icon size={18} className="flex-shrink-0" />
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="border-t border-[#1E293B] p-3 space-y-2 shrink-0">
          <button
            onClick={() => { navigate('/settings'); setIsMobileOpen(false); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-400 hover:text-white hover:bg-[#1E293B] transition-all duration-200"
          >
            <Settings size={18} />
            <span className="text-sm font-medium">Settings</span>
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all duration-200"
          >
            <LogOut size={18} />
            <span className="text-sm font-medium">Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
```

- [ ] **Step 2: Delete old Sidebar.tsx**

Run: `rm D:\aiden\frontend\src\components\Sidebar.tsx`

- [ ] **Step 3: Update App.tsx import**

In `D:\aiden\frontend\src\App.tsx`, change:
```typescript
import Sidebar from './components/Sidebar';
```
to:
```typescript
import Sidebar from './components/common/Sidebar';
```

- [ ] **Step 4: Verify build**

Run: `npm run build` in `D:\aiden\frontend`
Expected: Build succeeds (old Sidebar.tsx deleted, new one imported correctly)

---

### Task 7: Update Header Component

**Files:**
- Modify: `D:\aiden\frontend\src\components\common\Header.tsx`

**Purpose:** Add mobile menu toggle (hidden since Sidebar handles it now), use ThemeToggle component, keep all existing functionality.

- [ ] **Step 1: Rewrite Header.tsx**

```tsx
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useNotificationStore } from '../../store/notificationStore';
import { ThemeToggle } from './ThemeToggle';
import { Search, Bell, Sparkles } from 'lucide-react';

export const Header: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated } = useAuthStore();
  const { unreadCount } = useNotificationStore();

  const pageTitle = location.pathname === '/'
    ? 'Dashboard'
    : location.pathname === '/builder'
      ? 'AI Workspace'
      : location.pathname.split('/')[1]?.charAt(0).toUpperCase() + location.pathname.split('/')[1]?.slice(1) || '';

  return (
    <header className="sticky top-0 z-40 bg-[#0D1A2A]/80 backdrop-blur-[20px] border-b border-[#1E293B] h-16 shrink-0">
      <div className="flex h-full items-center justify-between px-4 md:px-6">
        {/* Left: Page title */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-400 hidden sm:inline">
            {pageTitle}
          </span>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {isAuthenticated && (
            <button
              onClick={() => navigate('/search')}
              className="p-2 rounded-lg hover:bg-[#1E293B] transition-colors text-gray-400 hover:text-white"
              aria-label="Search"
            >
              <Search size={18} />
            </button>
          )}

          {isAuthenticated && (
            <button
              onClick={() => navigate('/notifications')}
              className="p-2 rounded-lg hover:bg-[#1E293B] transition-colors text-gray-400 hover:text-white relative"
              aria-label="Notifications"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-[#0D1A2A]" />
              )}
            </button>
          )}

          <ThemeToggle />

          {isAuthenticated && (
            <button
              onClick={() => navigate('/builder')}
              className="hidden md:flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-xl text-white text-sm font-medium hover:scale-[1.02] transition-all shadow-lg shadow-purple-600/25"
            >
              <Sparkles size={16} />
              Deploy
            </button>
          )}

          {isAuthenticated && (
            <button
              onClick={() => navigate('/settings')}
              className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-cyan-600 flex items-center justify-center text-white text-xs font-bold shadow-sm"
            >
              {user?.full_name?.[0] || user?.username?.[0] || 'U'}
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

Header.displayName = 'Header';
```

- [ ] **Step 2: Verify build**

Run: `npm run build` in `D:\aiden\frontend`
Expected: Build succeeds

---

### Task 8: Update MobileNav Component

**Files:**
- Modify: `D:\aiden\frontend\src\components\layout\MobileNav.tsx`

**Purpose:** Update nav items to match the new Sidebar nav items. Keep mobile-only visibility and active state logic.

- [ ] **Step 1: Rewrite MobileNav.tsx**

```tsx
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Home, Sparkles, GitBranch, Activity, Settings } from 'lucide-react';

const navItems = [
  { icon: Home, label: 'Home', path: '/' },
  { icon: Sparkles, label: 'Builder', path: '/builder' },
  { icon: GitBranch, label: 'Pipelines', path: '/pipelines' },
  { icon: Activity, label: 'Monitor', path: '/monitoring' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

export const MobileNav: React.FC = () => {
  const location = useLocation();
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated || ['/login', '/signup'].includes(location.pathname)) {
    return null;
  }

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0D1A2A]/90 backdrop-blur-[20px] border-t border-[#1E293B] px-2 py-1 flex justify-around items-center">
      {navItems.map((item) => {
        const active = isActive(item.path);
        return (
          <Link
            key={item.path}
            to={item.path}
            className={`
              flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200 min-w-0
              ${active ? 'text-purple-400' : 'text-gray-500 hover:text-gray-300'}
            `}
          >
            <item.icon size={20} className={active ? 'text-purple-400' : ''} />
            <span className={`text-[9px] font-medium ${active ? 'text-purple-400' : 'text-gray-500'}`}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
};

MobileNav.displayName = 'MobileNav';
```

- [ ] **Step 2: Verify build**

Run: `npm run build` in `D:\aiden\frontend`
Expected: Build succeeds

---

### Task 9: Update ProtectedRoute Component

**Files:**
- Modify: `D:\aiden\frontend\src\components\auth\ProtectedRoute.tsx`

**Purpose:** Simplify ProtectedRoute — remove the `getCurrentUser` call (the AppShell in App.tsx will handle initial auth state). Keep the redirect and loading behavior.

- [ ] **Step 1: Rewrite ProtectedRoute.tsx**

```tsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import LoadingSpinner from '../common/LoadingSpinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuthStore();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
```

- [ ] **Step 2: Verify build**

Run: `npm run build` in `D:\aiden\frontend`
Expected: Build succeeds

---

### Task 10: Update ToastProvider with AnimatePresence

**Files:**
- Modify: `D:\aiden\frontend\src\components\providers\ToastProvider.tsx`

**Purpose:** Add `AnimatePresence` from framer-motion for smooth toast enter/exit animations. Keep existing notification store integration.

- [ ] **Step 1: Rewrite ToastProvider.tsx**

```tsx
import React, { useEffect } from 'react';
import { useNotificationStore } from '../../store/notificationStore';
import { Toast } from '../ui/Toast';
import { AnimatePresence } from 'framer-motion';

export const ToastProvider: React.FC = () => {
  const { notifications, removeNotification } = useNotificationStore();

  useEffect(() => {
    const timers = notifications.map((n) => {
      if (n.duration && n.duration > 0) {
        return setTimeout(() => removeNotification(n.id), n.duration);
      }
      return null;
    });

    return () => timers.forEach((t) => t && clearTimeout(t));
  }, [notifications, removeNotification]);

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm w-full pointer-events-none">
      <AnimatePresence mode="popLayout">
        {notifications.map((n) => (
          <Toast
            key={n.id}
            type={n.type}
            title={n.title || (n.type === 'success' ? 'Success' : n.type === 'error' ? 'Error' : n.type === 'warning' ? 'Warning' : 'Info')}
            message={n.message}
            duration={n.duration || 5000}
            onClose={() => removeNotification(n.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};

ToastProvider.displayName = 'ToastProvider';
```

- [ ] **Step 2: Verify build**

Run: `npm run build` in `D:\aiden\frontend`
Expected: Build succeeds

---

### Task 11: Update App.tsx Routing

**Files:**
- Modify: `D:\aiden\frontend\src\App.tsx`

**Purpose:** Restructure routing to use the `AppLayout` component as a wrapper for protected routes (matching the design spec). The Sidebar is now inside AppLayout. Add the `useEffect` for theme class toggling. Update the import path for Sidebar.

- [ ] **Step 1: Rewrite App.tsx**

```tsx
import { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { HelmetProvider } from 'react-helmet-async';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import ProtectedRoute from './components/auth/ProtectedRoute';
import ErrorBoundary from './components/common/ErrorBoundary';
import { PageTransition } from './components/ui/PageTransition';
import { PageSkeleton } from './components/ui/Skeleton';
import { ToastProvider } from './components/providers/ToastProvider';
import { useThemeStore } from './store/themeStore';
import AppLayout from './components/layout/AppLayout';

// Lazy loaded pages
const LoginPage = lazy(() => import('./pages/LoginPage'));
const SignupPage = lazy(() => import('./pages/SignupPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const PipelinesPage = lazy(() => import('./pages/PipelinesPage'));
const PipelineBuilderPage = lazy(() => import('./pages/PipelineBuilderPage'));
const PipelineDetailsPage = lazy(() => import('./pages/PipelineDetailsPage'));
const MonitoringPage = lazy(() => import('./pages/MonitoringPage'));
const AgentsPage = lazy(() => import('./pages/AgentsPage'));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const ApprovalsPage = lazy(() => import('./pages/ApprovalsPage'));
const AuditLogsPage = lazy(() => import('./pages/AuditLogsPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const ChangelogPage = lazy(() => import('./pages/ChangelogPage'));
const TermsPage = lazy(() => import('./pages/TermsPage'));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const GettingStartedPage = lazy(() => import('./pages/GettingStartedPage'));
const TemplatesPage = lazy(() => import('./pages/TemplatesPage'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30000,
    },
  },
});

function AppShell() {
  const theme = useThemeStore((state) => state.theme);
  const setTheme = useThemeStore((state) => state.setTheme);

  useEffect(() => {
    // Apply initial theme
    setTheme(theme);
  }, []);

  return (
    <div className="app-shell flex h-screen w-full bg-[#050816] text-white overflow-hidden">
      <ErrorBoundary>
        <Suspense fallback={<PageSkeleton />}>
          <AnimatePresence mode="wait">
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/changelog" element={<ChangelogPage />} />

              {/* Protected Routes — wrapped in AppLayout */}
              <Route element={<ProtectedRoute />}>
                <Route element={<AppLayout />}>
                  <Route path="/" element={<PageTransition><DashboardPage /></PageTransition>} />
                  <Route path="/pipelines" element={<PageTransition><PipelinesPage /></PageTransition>} />
                  <Route path="/pipelines/:id" element={<PageTransition><PipelineDetailsPage /></PageTransition>} />
                  <Route path="/builder" element={<PageTransition><PipelineBuilderPage /></PageTransition>} />
                  <Route path="/monitoring" element={<PageTransition><MonitoringPage /></PageTransition>} />
                  <Route path="/agents" element={<PageTransition><AgentsPage /></PageTransition>} />
                  <Route path="/analytics" element={<PageTransition><AnalyticsPage /></PageTransition>} />
                  <Route path="/notifications" element={<PageTransition><NotificationsPage /></PageTransition>} />
                  <Route path="/approvals" element={<PageTransition><ApprovalsPage /></PageTransition>} />
                  <Route path="/audit-logs" element={<PageTransition><AuditLogsPage /></PageTransition>} />
                  <Route path="/settings" element={<PageTransition><SettingsPage /></PageTransition>} />
                  <Route path="/getting-started" element={<PageTransition><GettingStartedPage /></PageTransition>} />
                  <Route path="/templates" element={<PageTransition><TemplatesPage /></PageTransition>} />
                </Route>
              </Route>

              {/* Catch-all */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </AnimatePresence>
        </Suspense>
      </ErrorBoundary>

      {/* Toast Notifications */}
      <ToastProvider />
    </div>
  );
}

function App() {
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AppShell />
        </BrowserRouter>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

export default App;
```

- [ ] **Step 2: Verify build**

Run: `npm run build` in `D:\aiden\frontend`
Expected: Build succeeds

---

### Task 12: Update Toast Component (remove fixed positioning)

**Files:**
- Modify: `D:\aiden\frontend\src\components\ui\Toast.tsx`

**Purpose:** Remove the `fixed top-4 right-4 z-50` positioning from the Toast component itself since ToastProvider now handles positioning. The Toast should just be a `pointer-events-auto` container.

- [ ] **Step 1: Edit Toast.tsx**

Change the className in the motion.div from:
```
'pointer-events-auto fixed top-4 right-4 z-50 max-w-sm w-full',
```
to:
```
'pointer-events-auto max-w-sm w-full',
```

- [ ] **Step 2: Verify build**

Run: `npm run build` in `D:\aiden\frontend`
Expected: Build succeeds

---

### Task 13: Full Build Verification

**Files:**
- None (verification only)

**Purpose:** Run a complete build to ensure no TypeScript or import errors remain.

- [ ] **Step 1: Run full build**

Run: `cd D:\aiden\frontend && npm run build`
Expected: Build completes successfully with no errors

- [ ] **Step 2: Run lint**

Run: `cd D:\aiden\frontend && npm run lint`
Expected: No lint errors (warnings acceptable)

- [ ] **Step 3: Run tests**

Run: `cd D:\aiden\frontend && npm run test`
Expected: All existing tests pass

---

## Summary of Changes

| Area | Files Changed | What Changed |
|------|---------------|--------------|
| **Config** | `tailwind.config.js` | Added primary/secondary color scales, animations, shadows |
| **Styles** | `src/index.css` | Full design token system, glassmorphism, light mode support |
| **Store** | `src/store/themeStore.ts` | Added 'system' theme, effectiveTheme, system listener |
| **Store** | `src/store/index.ts` | Added themeStore + analyticsStore exports |
| **Component** | `src/components/common/Sidebar.tsx` | New location, new nav items, mobile overlay, logout |
| **Component** | `src/components/common/Header.tsx` | ThemeToggle integration, cleaner layout |
| **Component** | `src/components/common/ThemeToggle.tsx` | Lucide icons, direct themeStore usage |
| **Component** | `src/components/layout/MobileNav.tsx` | Updated nav items |
| **Component** | `src/components/auth/ProtectedRoute.tsx` | Simplified (no getCurrentUser call) |
| **Component** | `src/components/providers/ToastProvider.tsx` | AnimatePresence wrapper |
| **Component** | `src/components/ui/Toast.tsx` | Removed fixed positioning |
| **App** | `src/App.tsx` | AppLayout routing, theme init |

## What Stays UNTOUCHED

- All backend files
- All API files (`src/api/*`)
- All stores except themeStore (`authStore`, `pipelineStore`, `agentStore`, `notificationStore`, `analyticsStore`)
- All types (`src/types/*`)
- All pages (`src/pages/*`)
- All hooks (`src/hooks/*`)
- All UI components except Toast (`src/components/ui/*`)
- Builder, agents, analytics, dashboard sub-components
- `package.json` dependencies
