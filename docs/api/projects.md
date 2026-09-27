# Projects

Tenancy boundary: `workspace → project → project_id` (every downstream
artifact carries `project_id`).

## Endpoints

| Method | Path | Permission | Purpose |
|---|---|---|---|
| GET | `/projects` | `project.read` | list (workspace-scoped) |
| POST | `/projects` | `project.create` | create `{workspace_id, name, ...}` |
| GET | `/projects/{project_id}` | `project.read` | detail + counts |
| PUT | `/projects/{project_id}` | `project.update` | full update |
| PATCH | `/projects/{project_id}` | `project.update` | partial update |
| DELETE | `/projects/{project_id}` | `project.delete` | delete (FK cascade) |
| POST | `/projects/{project_id}/import` | `knowledge.write` | import project context into knowledge base |

## Notes

- Role gates: engineer can create/update; only lead/admin can delete.
- `POST /projects/{id}/import` feeds `knowledge_documents` (RAG context for
  RCA/documentation agents).
- Overview aggregates (`GET /overview`) read across projects for the signed-in
  user's memberships.
