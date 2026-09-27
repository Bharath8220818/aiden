# AIDEN — API Contract Matrix (Phase F)

> Generated 13 Sep 2026 against `backend/` @ 93 pytest green and `frontend/` @ 41 vitest green + 2 Playwright E2E green.
> Chain: **Page → Hook → Service → Axios (`src/services/api.ts`) → FastAPI Router → Backend Service → DB/AI.**
> Auth on every route except `/auth/login`, `/users/register`, `/health/*`. JWT via `Authorization: Bearer` (axios interceptor); WebSocket via `?token=`.

Legend: ✅ verified live · 🟡 wired, minor gap noted · 🔴 missing

## Master matrix — Domain → Frontend → Backend → Status

| Domain | Frontend (Page → Hook → Service) | Backend (Router → Service) | Status |
|---|---|---|---|
| Auth | LoginPage → `useAuth` → authStore → `POST /auth/login` | `auth.py` → AuthService → users table | ✅ |
| Auth | Logout (`authStore.logout` → `POST /auth/logout`) | `auth.py` → AuthService | ✅ |
| Overview | OverviewPage → `useOverviewData` → overview.service `GET /overview` | `overview.py` → OverviewService → runs/incidents/approvals/probes | ✅ |
| Projects | (via Overview aggregate) | `projects.py` CRUD, membership-scoped | ✅ |
| Workspaces | (workspace context via `team.service`) | `workspaces.py` CRUD + members | ✅ |
| Requirements | RequirementsPage → `useRequirements` → requirements.service `POST /requirements/analyze` | `requirements.py` → requirement_analyzer (heuristic AI) | ✅ |
| Architecture | ArchitecturePage → `useArchitecture` → architecture.service `GET /architecture/blueprint` `/templates` `POST /architecture/generate` | `architecture.py` → RegistryService + architectures table | ✅ |
| Pipelines (Builder) | PipelinesPage → `usePipelineBuilder` → pipeline.service `POST /pipelines/generate` | `pipelines.py` → PipelineFleetService.codegen | ✅ |
| Pipelines (Manager) | PipelineManagerPage → `usePipelineManager` → pipelineManager.service `GET /pipelines/fleet`, `GET /pipelines/{id}/detail`, `POST /pipelines/{id}/run`, `PATCH /pipelines/{id}` | `pipelines.py` → PipelineFleetService + PipelineService | ✅ (fixed this phase — was pointed at CRUD endpoints) |
| SQL | SQLPage → `useSqlWorkspace` → sql.service `GET /sql/databases`, `POST /sql/execute`, `/explain`, `/optimize/suggestions`, `/assistant` | `sql.py` → RegistryService + live readonly execution | ✅ |
| Connections | ConnectionsPage → `useConnections` → connections.service `GET /connections` `/providers`, `POST /connections`, `DELETE /connections/{id}`, `POST /connections/test` | `connections.py` → RegistryService + connection_registry table | ✅ |
| Monitoring | MonitoringPage → `useMonitoring` → monitoring.service 5 GETs + ack POST | `monitoring.py` → RegistryService | ✅ |
| Incidents | IncidentsPage → `useSelfHealing` → selfHealing.service `GET /incidents` | `incidents.py` → IncidentHealingService | ✅ |
| Self-Healing | SelfHealingPage → `useSelfHealing` → `POST /incidents/{id}/diagnose` `/fix`, `POST /sandbox/test`, `POST /healing/{runId}/advance`, `POST /incidents/{id}/resolve` | `incidents.py` → IncidentHealingService (10-stage machine) | ✅ |
| Agents | AgentsPage → `useAgents` → intelligence.service `GET /agents` `/swarm`, `POST /agents/{id}/status` `/grants` | `agents.py` → RegistryService | ✅ |
| Knowledge/RAG | KnowledgePage → `useKnowledge` → `GET /knowledge/docs`, `POST /knowledge/retrieve` | `knowledge.py` → RegistryService | ✅ |
| MCP | IntegrationsPage → `useIntegrations` → `GET /integrations/mcp`, `POST /integrations/mcp/{id}/status` | `integrations.py` → RegistryService | ✅ |
| Governance | GovernancePage → permission catalogue (frontend RBAC) + `governanceService.auditTrail → GET /audit` | `governance.py` → audit_logs table | ✅ |
| Approvals | ApprovalsPage → `approvalsService → GET /approvals`, `POST /approvals/{id}/approve` `/reject` | `governance.py` → approvals table (approval.approve = lead+) | ✅ |
| Team | TeamPage → `teamService → GET/POST /team/members`, `PATCH|PUT /team/members/{id}`, `DELETE` | `governance.py` → workspace_members table (team.manage) | ✅ |
| Realtime | `websocket.ts` → `WS /api/v1/ws?token=` (heartbeat + fleet digest) | `ws.py` → ConnectionManager | ✅ |
| Health | — | `health.py` `/health/healthz` `/full` | ✅ |
| Users | — | `users.py` `/users/register`, admin-gated `/users` | ✅ |

## Detailed verification per row

Checks per contract: endpoint exists · method matches · URL matches · request body matches · response shape matches · auth works · RBAC works · error envelope matches · loading state · empty state.

### Auth ✅
- `POST /auth/login` — body `{email, password}` → `{user, token, expiresAt}` (camelCase aliases). 401 `INVALID_CREDENTIALS` on bad creds.
- `GET /auth/me` — Bearer token → `UserOut` (`systemRole`, `roleTitle`, `workspaceName` aliases match `AuthUser`).
- **Fixed this phase:** `authStore.login` previously used demo accounts client-side in all modes; now routes through the real API when `VITE_ENABLE_MOCK_DATA=false` (demo path retained for mock mode).
- Token expiry → backend 401 → axios interceptor clears session → RouteGuards redirect to `/login`. Verified by 26 auth/RBAC backend tests + E2E.

### Overview ✅
- `GET /overview` → `OverviewDashboardData` camelCase mirror (`healthServices`, `pipelineMetrics`, `insights`, `recentActivities`, `engineeringCycle`). All numbers from real tables + live probes. 3 contract tests.

### Requirements ✅
- `POST /requirements/analyze` — accepts full `MultimodalInputState`; returns `{analysis, contract}` matching `IntentAnalysisResult` / `DataContractSpecification`. Optional `projectId` persists the synthesized contract. RBAC: any signed-in role; with `projectId` requires `project.update`.
- CRUD (`/requirements`) unchanged from Phase 1/2.

### Architecture ✅
- `GET /architecture/blueprint` → React Flow `{nodes, edges}` from the architectures table (seeded Orders CDC blueprint). 404 with a friendly empty state when nothing saved.
- `GET /architecture/templates` → 3 curated topologies. `POST /architecture/generate` → prompt-routed blueprint + rationale. RBAC: read = viewer+, generate = `architecture.edit` (engineer+).

### Pipelines ✅ (2 fixes this phase)
- **Fixed:** manager service now calls `GET /pipelines/fleet` (was `GET /pipelines` — CRUD shape ≠ manager shape).
- **Fixed:** detail now `GET /pipelines/{id}/detail` (was `GET /pipelines/{id}` which returned `PipelineOut`, no runs/tasks/logs).
- **Fixed:** control actions now `POST /pipelines/{id}/run` (trigger/retry) and `PATCH /pipelines/{id}` with `{status}` (pause/resume — backend maps to pipeline.pause permission). The old `POST /pipelines/{id}/{action}` endpoints never existed.
- Builder: `POST /pipelines/generate` → 5 artifacts (pyspark/sql/airflow_dag/kafka_config/tests) rendered server-side.
- Deploy gate: `POST /pipelines/{id}/deploy` → 409 `APPROVAL_REQUIRED` (dedup) — verified in E2E.

### SQL ✅
- `GET /sql/databases` → catalog with schemas/tables/columns + PII flags. `POST /sql/execute` runs **read-only** against the platform DB; destructive statements → 400 `DESTRUCTIVE_SQL_BLOCKED`. `/explain` builds a plan tree; `/optimize/suggestions` + `/assistant` heuristics. RBAC: read = viewer+ (`sql.read`), execute = engineer+ (`sql.execute`).

### Connections ✅
- `GET /connections` bootstraps 8 seeded connections into `connection_registry` (new table, migration `a1f9c3d2e4b5`) and projects them onto the frontend `DataConnection` shape; secrets masked. Upsert via `POST /connections`, delete via `DELETE /connections/{id}` (`connection.delete` = lead+). `POST /connections/test` → 5-step deterministic check.

### Monitoring ✅
- 5 GETs (services/series/kafka topics/quality/alerts) + `POST /alerts/{id}/acknowledge` (writes an audit row). Service probes are real (live DB latency); series/topics/quality derive from pipeline + incident state with deterministic 30-min rotation. RBAC: `monitoring.read` viewer+.

### Incidents + Self-Healing ✅
- `GET /incidents` → frontend `Incident[]` shape (resolves pipeline name via run/project chain). `POST /incidents/{id}/diagnose` persists RCA + flips status → investigating; `/fix` persists proposed fix → healing; `/sandbox/test` → 5/5 assertions; `/healing/{runId}/advance` journals the 10-stage machine (RBAC: `healing.propose` engineer+, `healing.execute` lead+); `/resolve` stamps MTTR.

### Agents / Knowledge / MCP ✅
- Roster + swarm + status/grants control (`agent.control` = admin), knowledge docs + scored retrieval (overlap + deterministic jitter, ordered by score), MCP registry with status control. All shapes mirror `intelligence/types.ts` camelCase.

### Governance / Approvals / Team ✅ (new domains this phase)
- `GET /approvals` → pending + decided queue; `POST /approvals/{id}/approve|reject` (`approval.approve` = lead+, writes audit rows). ApprovalsPage now live with approve/reject actions.
- `GET /audit` → recent audit events (actor resolved via join); GovernancePage audit panel is live.
- `GET/POST /team/members`, `PATCH|PUT /team/members/{id}` (role change), `DELETE /team/members/{id}` (self-removal blocked) — `team.manage` (lead+). TeamPage swapped demo members for the real roster with loading/error/empty states + optimistic rollback.

## Bugs found & fixed during this audit
1. 🔴→✅ **Auth bypass** — LoginPage used client-side demo accounts even with mock off. Fixed: real `/auth/login` in real mode.
2. 🔴→✅ **Pipeline Manager wrong endpoints** — `/pipelines` + `/pipelines/{id}` + `/{action}`; now `/fleet`, `/{id}/detail`, `/run`, `PATCH`.
3. 🟡→✅ **Axios wrapper missing `patch`** — added to `services/api.ts`.
4. 🟡→✅ **WebSocket 403** — browser WS cannot send headers; client now appends `?token=` and backend accepts it (4401 on missing/invalid).
5. 🟡→✅ **Viewer RBAC mismatch** — backend catalog lacked viewer read grants for monitoring/agents/knowledge/connections/approvals/sql/architecture; aligned so the frontend matrix and backend gates agree.

## Remaining known gaps (non-blocking, by design)
- Realtime events are heartbeat + fleet digest; domain fan-out (incident-detected, healing-advanced) publishes through the same `ConnectionManager.broadcast` as producers come online.
- AI synthesis (requirements/analyze, architecture/generate, sql assistant) is heuristic, not LLM-backed; Ollama wiring swaps `requirement_analyzer.py` / router internals only — contracts stay.
- `runSandboxTest` real path returns the final result immediately (no per-stage streaming yet).
