# AIDEN Frontend

React 19 + TypeScript + Vite frontend for the AIDEN data pipeline platform.

## Setup

```bash
npm install
copy .env.example .env
npm run dev
```

The dev server runs at http://localhost:5173 and proxies API traffic to the backend configured by `VITE_API_URL`.

## Scripts

```bash
npm test -- --run
npm run build
npm run lint
npm run preview
```

## Environment

```env
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000
```

Do not commit `.env`. Commit `.env.example` only.

## Verified

- Vitest login UI suite: passing, 3 tests.
- Production build: passing.
- Lint: completes with warnings for existing hook dependencies and unused catch parameters.
