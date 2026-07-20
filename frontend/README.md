# AIDEN — AI Data Engineering Platform

**Build production-ready data pipelines with natural language.** AIDEN is a full-stack AI data engineering platform with a React + TypeScript frontend and a FastAPI backend. It turns natural language descriptions into executable data pipelines.

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🤖 **AI-Powered** | Natural language → pipeline creation with intent parsing |
| 🎨 **Visual Canvas** | Drag-and-drop React Flow pipeline builder with custom nodes |
| 🔌 **Multi-Source** | PostgreSQL, Snowflake, Kafka, S3, and more |
| 📊 **Real-Time Monitoring** | WebSocket live updates with execution timeline |
| 🔔 **Smart Alerts** | Pipeline health, failure detection, and data quality checks |
| 🌙 **Dark Mode** | Full dark mode support across all pages |
| 📱 **Mobile-First** | Responsive design with touch-friendly interactions |
| 🎭 **Animations** | Framer Motion page transitions, counter animations, micro-interactions |

---

## 🏗️ Architecture

```
frontend/                  # React 19 + TypeScript + Vite
├── src/
│   ├── api/               # API client (axios)
│   ├── components/        # UI component library
│   │   ├── auth/          # Login, Signup, ProtectedRoute
│   │   ├── builder/       # PipelineCanvas, PipelineNode, CanvasControls
│   │   ├── chat/          # ChatInterface, MessageList, MessageInput
│   │   ├── common/        # Header, AmbientFlow, ErrorBoundary
│   │   ├── dashboard/     # StatCard, quick actions
│   │   ├── layout/        # AppLayout, MobileNav, Sidebar
│   │   └── ui/            # Button, Card, Input, Modal, Toast, etc.
│   ├── hooks/             # useWebSocket, useCounter, useRipple
│   ├── pages/             # Dashboard, Pipelines, Builder, Monitoring
│   ├── store/             # Zustand stores (auth, pipeline, notification)
│   ├── types/             # TypeScript types
│   └── utils/             # cn() tailwind-merge helper
├── tailwind.config.js
└── vite.config.ts

backend/                   # FastAPI + SQLAlchemy + PostgreSQL
├── app/
│   ├── api/v1/            # Auth, Pipelines, WebSocket endpoints
│   ├── core/              # Intent parser, security, agent orchestrator
│   ├── models/            # SQLAlchemy models (User, Pipeline)
│   ├── schemas/           # Pydantic schemas
│   └── services/          # HuggingFace, database services
├── alembic/               # Database migrations
└── requirements.txt
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** v18+ and npm
- **Python** 3.11+ (for backend)
- **PostgreSQL** (or use SQLite for local dev)

### Frontend

```bash
cd frontend
npm install
cp .env.example .env   # Edit with your API URL
npm run dev             # http://localhost:5173
```

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate    # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

---

## 📦 Scripts

### Frontend

```bash
npm run dev          # Start dev server (localhost:5173)
npm run build        # TypeScript check + production build
npm run preview      # Preview production build
npm test             # Run Vitest test suite
npm run lint         # Run oxlint
```

### Backend

```bash
uvicorn app.main:app --reload     # Dev server
alembic upgrade head               # Run database migrations
python test_db_connection.py       # Test PostgreSQL connection
```

---

## 🧩 UI Components

The `src/components/ui/` directory contains a comprehensive library of reusable components:

| Component | File | Description |
|-----------|------|-------------|
| **Button** | `Button.tsx` | 5 variants (primary, secondary, outline, ghost, danger), 3 sizes, loading state |
| **Card** | `Card.tsx` | Card with Header, Title, Body, Footer sub-components, hoverable, glass variant |
| **Input** | `Input.tsx` | Label, error/validation states, icon support, animated indicators |
| **Modal** | `Modal.tsx` | 5 sizes, backdrop blur, ESC close, body scroll lock, spring animations |
| **Toast** | `Toast.tsx` | 4 types (success, error, warning, info), auto-dismiss, action buttons |
| **Skeleton** | `Skeleton.tsx` | 4 variants (text, rect, circle, card), preset skeletons for pages |
| **EmptyState** | `EmptyState.tsx` | Animated empty states with icon, action button, 3 sizes |
| **Dropdown** | `Dropdown.tsx` | Click outside close, ESC close, danger items, icons, dividers |
| **Tooltip** | `Tooltip.tsx` | 4 positions, configurable delay, arrow indicator, dark mode |
| **Progress** | `Progress.tsx` | 5 colors (including gradient), 3 sizes, optional label, animated |
| **Toggle** | `Toggle.tsx` | 2 sizes, labels, description text, dark mode, spring animation |
| **BottomSheet** | `BottomSheet.tsx` | Mobile bottom sheet, drag handle, spring animations |
| **PageTransition** | `PageTransition.tsx` | Framer Motion page transitions (opacity + slide) |

---

## 🌐 Environment Variables

```env
# Frontend (.env)
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Backend (.env)
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/aiden
HF_TOKEN=your_huggingface_token
SECRET_KEY=your_jwt_secret
```

---

## 📄 Pages

| Route | Page | Description | Auth Required |
|-------|------|-------------|:---:|
| `/login` | LoginPage | Sign in with credentials | ❌ |
| `/signup` | SignupPage | Create new account | ❌ |
| `/` | DashboardPage | Overview stats, quick actions, pipeline prompt | ✅ |
| `/pipelines` | PipelinesPage | Filter, search, paginate pipelines | ✅ |
| `/pipelines/:id` | PipelineDetailsPage | Pipeline details and config | ✅ |
| `/builder` | PipelineBuilderPage | Visual canvas + AI chat | ✅ |
| `/monitoring` | MonitoringPage | Real-time health, alerts, timeline | ✅ |
| `/about` | AboutPage | Platform information | ❌ |
| `*` | NotFoundPage | 404 page with gradient animated 404 | ❌ |

---

## 🎨 Design System

- **Primary**: Blue (`#2563EB`) — actions, links, primary UI
- **Flow**: Cyan (`#06B6D4`) — data flow accents, ambient particles
- **Process**: Amber (`#F59E0B`) — processing states, AI activity
- **Typography**: Inter (body), JetBrains Mono (code/data)
- **Animations**: Framer Motion spring physics, CSS keyframe gallery
- **Dark Mode**: Full `.dark` class support via Tailwind

---

## 🧪 Testing

```bash
cd frontend
npm test -- --run          # Run all tests once
npx vitest --ui            # Vitest UI mode
npm run build              # TypeScript check + build
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit changes: `git commit -m 'Add my feature'`
4. Push: `git push origin feature/my-feature`
5. Open a Pull Request

---

## 📝 License

MIT License — see LICENSE for details.
