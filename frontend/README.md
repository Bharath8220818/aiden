# Frontend — AIDEN

This folder contains the React + Vite web application for AIDEN. The frontend consumes the FastAPI backend and provides the user interface for pipeline building, monitoring, analytics, and AI-assisted workflows.

---

## Prerequisites

- Node.js 18+ and npm
- A running backend API at `http://localhost:8000`

---

## Setup

```bash
cd frontend
npm install
```

Create a `.env` file in `frontend/` with at least:

```env
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000
```

If your backend runs on a different host or port, update these values accordingly.

---

## Development

```bash
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## Production build

```bash
npm run build
npm run preview
```

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite development server |
| `npm run build` | Run TypeScript build and bundle app |
| `npm run preview` | Preview the production build locally |
| `npm test` | Run Vitest tests |
| `npm run lint` | Run oxlint static analysis |

---

## Notes

- `frontend/` uses React 19, Vite, Tailwind CSS, Zustand, React Router, and React Flow.
- Keep `VITE_API_URL` aligned with the backend URL and `VITE_WS_URL` aligned with the WebSocket host.
