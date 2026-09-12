# AIDEN — Autonomous Data Engineering (Frontend)

Enterprise AI-powered autonomous data engineering frontend built with React 18, TypeScript, Vite, Tailwind CSS, React Router, Zustand, and TanStack Query.

## Phase 1 — Frontend Foundation

### Key Features Completed:
- **Design System & Dark Theme**: Custom dark enterprise tokens (`#0B0D10` background, `#0F1115` surface/sidebar, `#14171C` cards, `#242831` borders).
- **Responsive AppShell**: Desktop full sidebar, tablet collapsed icon sidebar, mobile sliding drawer and bottom quick-bar.
- **Top Navigation**:
  - Workspace selector (`Acme Data Platform`, etc.)
  - Environment selector (`Development`, `Staging`, `Production`)
  - Global Search / Command Palette (`Ctrl+K` shortcut)
  - **Ask AIDEN** autonomous prompt modal (`Ctrl+J` shortcut)
  - Live notification drawer with badge counters
  - User status indicator
- **Overview Dashboard**:
  - Personalized engineer greeting
  - **System Health**: 5 operational infrastructure cards (Airflow, PostgreSQL, Kafka, Spark, AI Agents)
  - **Pipeline Metrics**: 4 real-time performance indicators with trends
  - **AI Insights**: Autonomous drift detection, cost/query optimizations, consumer lag warnings with direct action hooks
  - **Closed-Loop Engineering Visualization**: Interactive animated 12-stage cycle:
    `UNDERSTAND` → `PLAN` → `DESIGN` → `BUILD` → `VALIDATE` → `DEPLOY` → `MONITOR` → `DETECT` → `DIAGNOSE` → `REPAIR` → `TEST` → `LEARN` ↺
  - **Recent Activity**: Execution logs with autonomous healing & schema sync markers
- **Mock Data & API Service Architecture**:
  - Feature-sliced modular architecture (`features/overview`)
  - Hook -> Service -> Axios -> Backend pattern ready for FastAPI backend connection
  - TanStack Query background caching and sync

## Running Locally

```bash
# Install dependencies
npm install

# Start Vite dev server
npm run dev

# Production build & TypeScript check
npm run build
```
