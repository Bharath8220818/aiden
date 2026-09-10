# AIDEN Stages 1–4 Completion Plan

> For agentic workers: REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

Goal: Finish and validate the missing AIDEN backend, frontend, AI, infrastructure, and connector capabilities described in the Stage 1–4 brief without overwriting existing user changes.

Architecture: Keep the current FastAPI + SQLAlchemy async backend, React/Vite frontend, and existing AIDEN v1/v2 agent split. Complete the new platform layer around stable domain models, authenticated routers, event/risk boundaries, connector adapters, and a typed operations UI. Prefer graceful local fallbacks for optional Redis, vector, LLM, and observability dependencies so the existing test suite remains runnable without production services.

Tech Stack: Python 3.10+, FastAPI, SQLAlchemy 2 async, Alembic, PostgreSQL/SQLite test database, Redis/Celery, Qdrant-compatible vector store, Prometheus/OpenTelemetry, React 19, TypeScript, Vite, Zustand, Tailwind, Vitest, Kubernetes, Helm, Terraform, GitHub Actions.

## Global Constraints

- Preserve unrelated user changes already present in the working tree.
- Use the repository's existing app.config, app.database, get_db, auth dependency, and model import conventions.
- New UUID relationships must not break existing integer-based users, pipelines, or pipeline_executions tables; use nullable foreign keys or explicit compatibility adapters where required.
- Optional services must fail closed or degrade to a documented local fallback; importing the backend must not require Redis, Qdrant, CUDA, Kafka, Airflow, or external LLM credentials.
- Every new API route must have a response schema, authentication/authorization behavior, and at least one API test.
- Every frontend page added to routing must render deterministic mock/loading/empty states when its API is unavailable.
- Do not commit generated __pycache__, build output, credentials, or local .env files.

---

### Task 1: Baseline and compatibility audit

Files:
- Inspect backend/app/config.py, backend/app/database.py, backend/app/models/base.py, backend/app/models/user.py, backend/app/models/pipeline.py, backend/app/api/v1/deps.py
- Inspect frontend/src/App.tsx, frontend/src/api/index.ts, frontend/src/store/index.ts, frontend/package.json
- Test backend/tests/conftest.py and frontend/src/test/setup.ts

Interfaces:
- Produces a list of actual import/runtime failures and a compatibility matrix for new models, routes, services, and UI.

- [ ] Run backend import and compile checks:

~~~powershell
cd backend
python -m py_compile app/main.py app/models/__init__.py app/api/v1/projects.py app/api/v1/environments.py app/api/v1/connections.py app/api/v1/incidents.py app/api/v1/monitoring.py app/api/v1/webhooks.py app/api/v1/admin.py app/services/event_bus.py app/services/planner.py app/services/executor.py app/services/mcp_server.py
~~~

- [ ] Run existing backend tests and frontend type/build checks before editing:

~~~powershell
cd backend
pytest -q
cd ..\frontend
npm test -- --run
npm run build
~~~

- [ ] Record failures in implementation notes and fix only compatibility issues required by later tasks.

### Task 2: Make the Stage 1 domain model layer coherent

Files:
- Modify backend/app/models/organization.py, project.py, environment.py, connection.py, incident.py, alert.py, agent_run.py, tool_call.py, schema_history.py, data_quality_result.py, deployment.py, embedding.py
- Modify backend/app/models/__init__.py
- Inspect or modify backend/app/models/user.py, pipeline.py, execution.py
- Create or modify backend/alembic/versions/<timestamp>_stage1_platform_models.py
- Test backend/tests/test_models/test_stage1_models.py

Interfaces:
- Project.organization, environments, connections, incidents, and pipelines.
- Environment.project, Connection.project, Incident.project, Alert.incident, AgentRun.project, ToolCall.agent_run, SchemaHistory.project/connection, DataQualityResult.project/pipeline, and Deployment.pipeline/environment.
- UUID primary keys for new platform entities; nullable compatibility links for legacy integer entities.

- [ ] Write tests that import every model through app.models, create an organization → project → environment/connection/incident graph, and verify enum defaults/timestamps.
- [ ] Run cd backend; pytest tests/test_models/test_stage1_models.py -q and confirm tests fail only on missing/inconsistent relationships.
- [ ] Normalize model imports to from app.database import Base, use UUID(as_uuid=True), DateTime(timezone=True), JSON/JSONB-compatible fields, and explicit back_populates pairs.
- [ ] Add an Alembic migration that creates the new tables, indexes status/project foreign keys, and executes CREATE EXTENSION IF NOT EXISTS vector only on PostgreSQL.
- [ ] Keep the embedding model import-safe on SQLite by using the existing vector-service abstraction or a dialect-safe large-array fallback when pgvector is not installed.
- [ ] Run the focused model tests and the full backend suite.

### Task 3: Complete Redis, eventing, risk, notifications, and WebSocket boundaries

Files:
- Modify backend/app/core/redis_client.py, connection_manager.py, backend/app/services/event_bus.py, risk_engine.py, notification_router.py, backend/app/core/celery_app.py
- Modify backend/app/config.py and backend/requirements.txt
- Test backend/tests/test_services/test_platform_boundaries.py

Interfaces:
- RedisClient.get_client(), set_key(key, value, ex=None), get_key(key), publish(channel, message), and subscribe(channel).
- EventBus.publish(event_type, payload), subscribe(callback), and start_redis_listener().
- RiskEngine.evaluate(action, environment, user_role) -> RiskLevel.
- ConnectionManager.connect(websocket, project_id), disconnect(websocket, project_id), and broadcast(project_id, message).
- NotificationRouter.send(alert, channels).

- [ ] Add tests for risk scores, Redis-disabled fallback, event serialization, WebSocket fan-out, and notification channel dispatch.
- [ ] Ensure Redis is lazily initialized, never created at module import, and returns a clear fallback when REDIS_URL is absent or unreachable.
- [ ] Ensure Celery configuration is import-safe and uses the configured broker/backend without starting a worker.
- [ ] Run the focused service tests.

### Task 4: Finish authenticated Stage 1 API routes and schemas

Files:
- Modify backend/app/api/v1/projects.py, environments.py, connections.py, incidents.py, monitoring.py, webhooks.py, admin.py
- Modify or create backend/app/schemas/project.py, environment.py, connection.py, incident.py, webhook.py
- Modify backend/app/main.py
- Test backend/tests/test_api/test_platform_routes.py

Interfaces:
- CRUD routes for projects, environments, and connections.
- Incident listing/detail/status update and alert creation routes.
- Monitoring health/metrics summary routes.
- Webhook ingress with signature validation hook and event publication.
- Admin summary route protected by the existing admin role dependency.

- [ ] Write API tests for unauthenticated rejection, authenticated CRUD, project ownership scoping, incident status transition, webhook validation, and admin authorization.
- [ ] Run the focused API tests and confirm route prefixes match mounts in backend/app/main.py.
- [ ] Implement service-layer queries with AsyncSession, commit/refresh on writes, 404 for missing scoped resources, and Pydantic response models.
- [ ] Register missing routers exactly once; avoid duplicated /api/v1 prefixes.
- [ ] Run focused API tests and the full backend suite.

### Task 5: Complete AI agents, planner/executor, RAG, and LLMOps

Files:
- Modify backend/app/agents/intent_agent.py, security_agent.py, self_healing_agent_v2.py, registry.py
- Modify backend/app/services/planner.py, executor.py, model_registry.py, prompt_manager.py, cost_tracker.py
- Modify backend/app/rag/document_processor.py, vector_store.py, retriever.py, memory_manager.py
- Modify backend/app/core/aiden_orchestrator.py and backend/app/services/event_bus.py
- Test backend/tests/test_agents/test_stage2_agents.py, backend/tests/test_rag/test_retrieval_pipeline.py, backend/tests/test_services/test_llmops.py

Interfaces:
- IntentAgent.classify(user_input) -> IntentClassification.
- SecurityAgent.audit_action(user, action, resource) -> bool.
- AgentRegistry.register(name, agent_class), get(name), and list_agents().
- Planner.create_plan(user_input, project) -> list[dict].
- Executor.execute_plan(plan, context) -> list[AgentResult].
- VectorStore.upsert(points), search(vector, limit=5, filter=None), and Retriever.retrieve(query, project_id, limit=5).
- ModelRegistry.get_model_for_task(task_type), PromptManager.get_prompt(name, version="latest", **kwargs), and CostTracker.track(model, tokens, cost).

- [ ] Add tests with fake LLM/vector/event dependencies so no external API is required.
- [ ] Make agent registry initialization deterministic and preserve existing v2 AgentType and AgentResult types.
- [ ] Make planner output explicit ordered tasks with agent names, params, and risk metadata; make executor reject unknown agents and return structured failures instead of swallowing exceptions.
- [ ] Implement document chunking, embedding injection, vector upsert/search, retrieval metadata, and memory storage behind dependency-injectable adapters.
- [ ] Route high/critical risk actions through approvals; publish agent.run.started, agent.run.completed, incident.resolved, and failure events.
- [ ] Ensure model selection, prompt versions, and token/cost accounting are deterministic and covered by tests.
- [ ] Run focused AI/RAG/LLMOps tests and the full backend suite.

### Task 6: Complete Stage 3 observability and deployment assets

Files:
- Modify or create backend/app/monitoring/metrics.py, backend/app/api/v1/metrics.py, backend/app/main.py
- Create or modify deployment/kubernetes files, deployment/helm/aiden/Chart.yaml, values.yaml, and templates
- Create or modify infrastructure/terraform/main.tf, variables.tf, and outputs.tf
- Create or modify deployment/grafana/dashboards/*.json, deployment/observability/*, .github/workflows/test.yml, build.yml, and deploy.yml
- Test backend/tests/test_monitoring/test_metrics.py and scripts/validate_deployment.ps1

Interfaces:
- Prometheus counters/histograms/gauges for pipeline runs/duration, agent calls, LLM tokens/cost, and active agents.
- /metrics or the existing /api/v1/observability/metrics endpoint.
- Kubernetes deployments/services/ingress for backend/frontend with health checks and environment configuration.

- [ ] Test metric label names and increments without starting Prometheus.
- [ ] Expose metrics through an ASGI mount or JSON endpoint consistent with the current router and document both paths if both exist.
- [ ] Make Docker/Kubernetes probes use /health, and ensure secrets/config values are references rather than hardcoded credentials.
- [ ] Add Helm defaults for images, database/Redis URLs, replicas, ingress host, and resource limits.
- [ ] Add Terraform variables/outputs for database, cache, registry, and Kubernetes namespace without embedding credentials.
- [ ] Add CI workflows for backend tests, frontend tests/build, image builds, and rollout checks with explicit failure behavior.
- [ ] Add Grafana dashboards for pipeline health, agent performance, LLM usage/cost, and system resources, plus documented Jaeger/ELK wiring.
- [ ] Run deployment validation and all local test/build commands.

### Task 7: Finish connector registry, gateway, MCP, and plugin framework

Files:
- Create or modify backend/app/connectors/base_connector.py, registry.py, and database/orchestration/streaming connector modules
- Modify backend/app/services/mcp_server.py and risk_engine.py
- Create or modify backend/app/plugins/plugin_manager.py, backend/app/plugins/builtin/*.py, and backend/app/plugins/custom/example_plugin.py
- Modify backend/app/api/v1/mcp.py and tools.py
- Test backend/tests/test_connectors/test_registry_and_gateway.py and backend/tests/test_api/test_mcp_routes.py

Interfaces:
- AIDENConnector.connect, health_check, get_metadata, execute, get_logs, get_status, rollback, and disconnect.
- ConnectorRegistry.register, get, and list_connectors.
- ToolGateway.execute_tool(tool_name, user, action, params).
- MCPServer.register_tool, discover_tools(agent_type=None), and execute_tool(tool_name, params, context).
- PluginManager.register_plugin(plugin_path) and trigger(hook_name, *args, **kwargs).

- [ ] Add fake connector tests for lifecycle, health/status, command validation, rollback, and disconnect.
- [ ] Implement safe registry initialization for PostgreSQL, Airflow, Kafka, Spark, dbt, GitHub, Kubernetes, and Prometheus adapters; optional SDK imports must be lazy.
- [ ] Enforce permission checks before risk checks, require approval for high risk, block critical actions, and always disconnect connectors in finally blocks.
- [ ] Validate MCP tool definitions and expose list/execute routes with authenticated context.
- [ ] Load built-in alert plugins and isolate plugin exceptions so one plugin cannot stop event fan-out.
- [ ] Run focused connector/MCP tests and the full backend suite.

### Task 8: Complete frontend operations pages, stores, and integration UX

Files:
- Modify or create frontend/src/pages/DataQualityPage.tsx, DataLineagePage.tsx, DataSourcesPage.tsx, IncidentsPage.tsx, IntegrationsPage.tsx, CLITerminalPage.tsx, SecurityPage.tsx, ProjectMemoryPage.tsx
- Create or modify frontend/src/components/dashboard, workspace, pipelines, monitoring, incidents, integrations, cli-terminal, and settings folders
- Create or modify frontend/src/api/ops.ts, related API modules, frontend/src/store files, and frontend/src/types files
- Modify frontend/src/App.tsx, frontend/src/components/layout/AppShell.tsx
- Test frontend page/component/store test files

Interfaces:
- Typed API clients for projects, environments, connections, incidents, monitoring, data quality, lineage, memory, security, and integrations.
- Zustand stores expose loading/error/data actions and deterministic reset behavior.
- Pages support loading, empty, success, and API-error states.

- [ ] Add component tests for stats cards, quality tables, incident status controls, connection cards, add-connection modal validation, CLI command history, and security findings.
- [ ] Ensure every routed page has a default export compatible with React.lazy and does not call browser-only APIs during module import.
- [ ] Add missing component folders using existing components/ui primitives and styling tokens; keep API calls behind typed modules.
- [ ] Implement Integration Hub cards for PostgreSQL, Airflow, Kafka, Spark, dbt, GitHub, Kubernetes, and Prometheus with test connection, status, and add/edit flows.
- [ ] Wire frontend routes and sidebar labels without duplicate navigation entries.
- [ ] Run cd frontend; npm test -- --run; npm run build.

### Task 9: End-to-end verification and documentation

Files:
- Modify README.md, backend/README.md, frontend/README.md, infrastructure/README.md, deployment/kubernetes/README.md
- Create or modify backend/tests/test_smoke/test_stage1_to_4_smoke.py and scripts/validate_stage1_to_4.ps1

Interfaces:
- A local smoke path that imports the app, verifies health, exercises authenticated project/connection/incident flows, invokes a fake agent plan, and lists/executes a fake MCP tool.

- [ ] Add a smoke test using SQLite and fake Redis/LLM/vector/connector dependencies.
- [ ] Run backend compile, focused tests, full tests, frontend tests/build, and deployment validation.
- [ ] Verify git diff --check and confirm no generated artifacts or secrets are included.
- [ ] Update docs with setup commands, optional-service behavior, environment variables, endpoint groups, and deployment prerequisites.
- [ ] Review all changed files for compatibility with existing uncommitted work before handoff.

## Coverage Review

- Stage 1 models, pgvector, Redis, API routes, frontend pages, core services, and WebSocket manager are covered by Tasks 2–4 and 8.
- Stage 2 agents, registry, planner/executor, RAG, memory, risk, and event integration are covered by Task 5.
- Stage 3 Kubernetes, Helm, Terraform, CI/CD, Prometheus, Grafana, ELK, Jaeger, model registry, prompt versioning, and cost tracking are covered by Task 6.
- Stage 4 connector interface/registry, core adapters, MCP, plugins, permissions/risk, Integration Hub UI, add connection, and connection testing are covered by Task 7 and Task 8.
- The plan intentionally treats existing uncommitted files as implementation candidates and adds tests before replacing behavior.
