# Database Relationships

## FK graph (35 foreign keys, grouped)

```
users ──< workspace_members >── workspaces
                                   │
                                   └──< projects
             ┌───────────────────────────┼─────────────────────────────┐
             ▼                           ▼                             ▼
      requirements ──< data_contracts   architectures             knowledge_documents
             │                                                     │
             │ (project_id on all)                                 └──< knowledge_chunks
             │
      pipelines ──< pipeline_nodes
          │
          └──< pipeline_runs ──┐
                               │
      incidents ──< healing_runs
             │
      agent_runs ──< agent_stage_runs
             │
      approvals / audit_logs / connections / mcp_integrations / notifications / tasks
```

## Rules

1. **Project context boundary** — every domain table references
   `projects.id`; queries are project-scoped after workspace membership is
   verified. Cross-tenant access reads as 404 (not 403 — existence is not
   leaked).
2. **Membership** — `workspace_members (workspace_id, user_id, role)` is the
   only team store; workspace-role permission grants derive from it
   (`app/core/permissions.py::WORKSPACE_ROLE_PERMISSIONS`).
3. **Cascades** — parent deletes cascade (project → its pipelines/runs/
   incidents; workspace → projects). Verified live against Supabase during
   Phase A provisioning (CRUD + FK-cascade checks).
4. **Agent lineage** — `agent_runs.created_by → users.id` is the acting-user
   anchor for governed tool calls; `agent_stage_runs.run_id → agent_runs.id`
   keeps per-stage state for the timeline UI.
5. **Knowledge chunks** — `knowledge_chunks.document_id →
   knowledge_documents.id` with `(project_id, chunk_index)` supporting the
   hybrid retriever's filters.

## Legacy compatibility

`agent.agent`-era columns (e.g. stage `agent` labels like `agent-architect`)
are display strings from the registry roster — the model-layer mapping
(`agent_id ↔ base/adapter`) lives in code, not in FKs, and is kept in sync by
the ml contract tests.
