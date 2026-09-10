# Frontend — AIDEN

React + Vite web application for AIDEN: dashboard, pipeline builder/studio, Architecture Studio (ReactFlow), Tool Gateway, operations & monitoring, incidents, data lineage & quality, AI workspace, governance, and auth pages.

---

## Prerequisites

- Node.js 18+ and npm
- A running backend API (default `http://127.0.0.1:8000`)

---

## Setup

```bash
cd frontend
npm install
```

Create `.env` in `frontend/`:

```env
VITE_API_URL=http://127.0.0.1:8000
VITE_WS_URL=ws://127.0.0.1:8000
# Optional — Supabase OAuth:
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-key
```

> Use `127.0.0.1` instead of `localhost` to avoid IPv6 `::1` connection issues. Both `VITE_SUPABASE_ANON_KEY` and `VITE_SUPABASE_PUBLISHABLE_KEY` are accepted by the client.

---

## Development

```bash
npm run dev
```

Open `http://localhost:5173`.

---

## Production build

```bash
npm run build     # tsc -b + vite build
npm run preview
```

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | TypeScript build + bundle |
| `npm run preview` | Preview production build |
| `npm test` | Vitest |
| `npm run lint` | oxlint static analysis |

---

## Pages (40)

| Group | Pages |
|-------|-------|
| Core | Dashboard, Pipelines, Pipeline Builder, Pipeline Studio, Pipeline Designer, Pipeline Details |
| Architecture | Architecture Studio (ReactFlow canvas, AI Copilot, live-infra mode) |
| AI & Agents | AI Workspace, Agents, Agent Activity, Multimodal |
| Operations | Monitoring, Tool Gateway, Incidents, Integrations, Data Sources, Notifications |
| Data | Data Lineage, Data Quality, Schema Designer |
| Memory & Learning | Project Memory, Knowledge Base, Learning, Coding |
| Governance | Approvals, Audit Logs, Team, Security, Admin Dashboard, Settings |
| CLI | CLI Terminal |
| Auth | Landing, Login, Signup |
| Info | About, Terms, Privacy, Changelog, Getting Started, Templates, Analytics, 404 |

All pages are code-split with `React.lazy()`.

---

## Notes

- Stack: React 19, TypeScript 7, Vite 8, Tailwind CSS 3, Zustand 5, React Router 7, ReactFlow 11, Framer Motion 12, Recharts 3, Monaco Editor, Supabase JS.
- Keep `VITE_API_URL` aligned with the backend URL and `VITE_WS_URL` aligned with the WebSocket host.
- Dark/light theme toggle and mobile bottom nav are built in.
