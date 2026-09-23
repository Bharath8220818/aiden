# AIDEN — Autonomous Data Engineering (Frontend)

Enterprise AI-powered autonomous data engineering frontend built with React 18, TypeScript, Vite, Tailwind CSS, React Router, Zustand, and TanStack Query.

## Phase 11 — Production Polish

### Authentication (`/login`)
- **Session-based auth** with a persisted Zustand store (`aiden-auth` in localStorage) and 8-hour expiry; unauthenticated or expired access to any route redirects to `/login` with return-path state.
- **Demo account directory** — one click fills credentials for each role: Platform Admin (`admin@acmedata.io`), Lead Data Engineer (`bharath@acmedata.io`), Data Engineer (`engineer@acmedata.io`), Analyst read-only (`analyst@acmedata.io`).
- **Sign out** from the topbar account menu or the sidebar user pill.

### RBAC (role-based access control)
- **24-permission catalogue** across 7 domains (Requirements, Architecture, Pipelines, SQL, Connections, Operations, Intelligence, Governance) mapped over a strict role hierarchy: `viewer ⊂ engineer ⊂ lead ⊂ admin`.
- **Route guards** — every route declares a minimum permission; unauthorized deep links render a 403 page naming the role and the missing permission.
- **Action gating** — New Connection (lead+), pipeline Pause/Resume/Retry/Trigger (lead+), agent pause & tool grants (admin) are hidden with explanatory hints for under-privileged roles; sidebar and mobile nav items filter by permission.

### WebSockets / Realtime
- **Live event bus** (`Subject`-based) bridging the WebSocket client when a backend is present, or an in-browser event simulation in mock mode; auto-reconnect with exponential backoff.
- **Toast stack** — spring-animated stack with typed severity icons, auto-dismiss progress bars, deep links, and buffering while modal overlays are open; events mirror into the persistent notification center.
- **Transport status pill** — `live · realtime` / `connecting…` indicator wired through the TanStack Query cache.

### Error containment & accessibility
- **Global ErrorBoundary** with error details, Try again / Reload recovery actions (verified live — it caught a real hooks-order crash during development).
- **Skip-to-content** link, `:focus-visible` focus rings app-wide, `role="main"` landmark, labeled form fields, aria-labels on icon buttons, `role="alert"`/`aria-live` on toasts and errors.
- **`prefers-reduced-motion`** support disables decorative animation globally.

### Testing
- **Vitest + React Testing Library + jsdom** wired via `npm test` / `npm run test:watch`.
- **29 tests across 5 suites**: RBAC matrix (hierarchy, role checks), auth store (login/logout/expiry/error), live event bus (multicast, unsubscribe, error isolation, mock interval), login page (fields, quick-fill, sign-in, invalid credentials), permission gates (children/fallback/403 rendering).

## Phase 10 — Intelligence

### Agent Control Center (`/agents`)
- **Agent roster** — the 8-agent AIDEN fleet (Requirements, Architect, Builder, QA Contract, Healer, Governance, Optimizer, Orchestrator) with live status badges, model, task counts, success rates, and per-agent token-budget bars; 20s polling.
- **Detail inspector** — current task banner, stats grid (tasks, success, avg duration, tokens), daily token-budget meter, **memory buffer** with episodic / semantic / procedural entries, and a full **ReAct execution trajectory** (thought → action → tool → observation with token costs).
- **Tool permissions (MCP)** — per-agent grant toggles (read / write / admin scopes per MCP server) with optimistic updates and an audit-trail note.
- **Agent Swarm feed** — live inter-agent traffic (handoffs, questions, approval requests, results) across the closed loop.
- **Pause / Resume** any agent from the inspector.

### Knowledge / RAG (`/knowledge`)
- **Corpus browser** — 6 indexed document classes (data contracts, postmortems, runbooks, schema docs, metric definitions, lineage snapshots, incident patterns) with chunk counts, tags, and retrieval popularity.
- **Corpus stats strip** — documents, chunks, tokens, retrievals, last-indexed time.
- **Retrieval playground** — semantic search over the corpus (text-embedding-3-large) with suggested queries, ranked chunks, cosine-similarity score bars, and color-graded match percentages — the same retrieval pipeline agents use for grounding.

### MCP Integrations (`/integrations`)
- **MCP server registry** — 6 Model Context Protocol servers (Airflow, CloudOps, Slack, Kafka, Snowflake, GitHub) with transport (stdio / SSE / HTTP), auth mode, and connection status; 30s polling.
- **Tool registry per server** — each tool with description, scopes (read / write / admin), 24h call volume, and average latency.
- **Connect / Disconnect** controls with live status badges and hub stats (servers, connected, degraded, tools, calls/24h).
- **Governance guardrails** — role-scoped visibility, per-invocation scope enforcement, and immutable argument audit trail.

## Phase 9 — Incidents + AI Self-Healing

The flagship closed loop: `Failure → Detect → Investigate → Root Cause → Generate Fix → Sandbox Test → Approval → Deploy → Rerun → Monitor → Learn ↺`

### Incidents & Alerting (`/incidents`)
- **Triage board** with open/resolved/all + severity filters (critical, high, medium).
- **MTTR analytics** — average resolution time with period-over-period trend.
- **Detection-source attribution** — anomaly detector, quality gate, task failure, schema drift watcher.
- **Blast-radius preview** — affected downstream consumers rendered per incident card.
- **One-click handoff** — `Heal with AIDEN` marks the incident investigating, stores the focus id in the Zustand handoff store, and deep-links into the healing engine.

### AI Self-Healing Engine (`/self-healing`)
- **Incident rail** — severity/status-sorted triage list with MTTR and occurrence counts.
- **Closed-loop track** — 10-stage animated progression (Detect → … → Learn) with actor attribution (AIDEN vs engineer) and a live event feed.
- **Agent investigation** — 4 specialist agents (Detection, Forensics, Dependency, Root-Cause) with per-step findings, timings, and cited evidence (logs, WAL, schema registry).
- **Root cause card** — confidence-scored RCA with category classification and blast radius (downstream pipelines, dashboards, staleness minutes).
- **Fix synthesis** — real before/after code diffs (idempotency key + window dedup guard, or schema-evolution patch for drift) with risk level, fix-time estimate, and backfill plan.
- **Sandbox verification** — 3-stage run (clone prod snapshot → replay 1.2M events → regression suite) with 5 assertions and a log tail.
- **Gated approval** — risk-summarized engineer sign-off card; unlock only after sandbox passes; reject path included.
- **Deploy → Rerun → Monitor → Learn** — scripted healing-run state machine updates the timeline, resolves the incident with an MTTR value, and records the pattern into the knowledge base.
- **Guided progression** — a single context-aware action button walks the engineer through each loop stage.

## Phase 7 — Pipeline Manager

- **Fleet Dashboard**: 6-stat fleet strip (total / running / healthy / degraded / paused / failed) with 30s background polling.
- **Pipeline List**: Search (name, target, tags) + status filter chips over the deployed pipeline fleet, with per-pipeline success rate, cadence, and SLA.
- **Master–Detail Layout**: Selecting a pipeline streams its detail (15s polling) — stats strip, run history, task graph, and log stream.
- **Run History**: Trigger type (schedule / manual / backfill / retry / event), duration, rows, cost per run, attempt counts, warehouse.
- **Task Graph**: Per-run task DAG (extract → mask → transform → quality gate → merge → notify) with statuses, retries, durations, and inline quality-gate failure errors.
- **Log Stream**: Timestamped, level-colored, task-attributed logs including CDC LSN snapshots and PagerDuty callback entries.
- **Control Actions**: Pause / Resume (fleet header), Retry and Trigger (detail header) with optimistic state updates.
- **Dedicated Route**: `/pipelines/manage` — keeps the Phase 4 builder at `/pipelines` while the sidebar "Pipeline Manager" links here.

## Phase 8 — Monitoring Center

- **Health Banner**: Overall system status derived from 6 services with a live 15s polling indicator.
- **Summary Cards**: Services healthy, degraded, critical alerts, and failing quality checks at a glance.
- **Infrastructure Tab**: Service cards (Airflow, PostgreSQL, Kafka, Spark, Snowflake, Redis) with version, region, uptime, key metrics, and good/bad directional trends.
- **Telemetry Tab**: 4 Recharts time series (throughput, latency, error rate, warehouse credits) with SLA threshold reference lines and period deltas.
- **Kafka & Streams Tab**: Topic throughput (in/out msg/s), partition counts, retention, and per-consumer-group lag bars with threshold percentage coloring (green/amber/red).
- **Data Quality Tab**: Assertion-level checks per dataset with pass-rate bars, severity badges, and passing / failing / flaky states.
- **Alerts Rail**: Severity-ranked feed (critical / warning / info) with acknowledge actions and deep links into Incidents, Self-Healing, and Pipeline Manager.

## Phase 3 — Architecture Studio

- **Interactive React Flow Canvas**: Drag/zoom DAG canvas with dotted dark background, minimap, zoom controls, and smoothstep connection lines.
- **Custom Node System**: 7 node kinds (source, ingestion, processing, storage, quality, sink, orchestration) with color-coded borders, health-status dots, live metric chips, and bound data-contract summaries.
- **Component Palette**: Click-to-place node library (PostgreSQL, Debezium, Spark, Kafka, Great Expectations, Snowflake, Airflow) with technology metadata.
- **Node Inspector**: Edit label, technology, description, health status, metrics, and ODCS contract bindings for the selected node.
- **Topology Validation Engine**: 8 rules — source/sink presence, orphan detection, invalid source-inbound / sink-outbound edges, DFS cycle detection, contract coverage %, health advisories — with severity-classified issue list and topology stats.
- **Auto-Layout**: Kahn longest-path layered DAG arrangement in one click.
- **AI Blueprint Generation**: Prompt-based topology synthesis by the Architect Agent with generation rationale panel and quick-start patterns.
- **Template Gallery**: Curated blueprints (Orders CDC, Fraud Velocity Stream) loadable onto the canvas.
- **Export**: Blueprint download as JSON or YAML.
- **Closed-loop Handoff**: `Publish to Pipeline Builder` pushes the graph (with validation status) into Phase 4 via the Zustand handoff store.

## Phase 4 — Pipeline Builder

- **Architecture Handoff Banner**: Receives the published blueprint (nodes, edges, sources→sinks, quality-gate presence, validation status) or falls back to the built-in Orders CDC spec.
- **Pipeline Configuration**: Execution mode (streaming / micro-batch / scheduled batch), write strategy (append / merge-upsert / full-refresh / SCD2), schedule, retry policy (count, backoff, timeout), governance toggles (quality gate, PII masking), alerting channel, and freshness-SLA slider.
- **Autonomous Code Generation**: AIDEN Codegen Agent produces 5 artifacts from the config + spec — PySpark job (JDBC ingest, PII SHA-256 masking, Great Expectations gate, MERGE write), Snowflake SQL MERGE with QA assertions, Airflow DAG with retry/backoff callbacks, Kafka consumer YAML, and a pytest suite (schema, masking, idempotency).
- **Generated Code Viewer**: Tabbed artifact browser with line numbers, copy, and per-file download.
- **Static Analysis & Governance Report**: 6 checks across Syntax / Reliability / Governance / Performance with cost-per-month and runtime estimates.
- **Deployment Orchestration**: 5-stage gated pipeline (compile → tests → provision → deploy → verify) with live step progress and deployed-version badge; deployment blocked until validation passes.
- **Closed-loop Completion**: Post-deploy panel links to the Monitoring Center where self-healing agents take over.

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

All frontend code lives in the `frontend/` directory:

```bash
cd frontend

# Install dependencies
npm install

# Start Vite dev server
npm run dev

# Production build & TypeScript check
npm run build

# Run test suite (vitest + RTL)
npm test
```
