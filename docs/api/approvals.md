# Approvals, Governance & Team

## Approvals

| Method | Path | Permission | Purpose |
|---|---|---|---|
| GET | `/approvals` | `approval.read` | pending/history list |
| POST | `/approvals/{id}/approve` | `approval.approve` | approve → downstream action proceeds (deploy / patch apply) |
| POST | `/approvals/{id}/reject` | `approval.approve` | reject → action cancelled, incident notes updated |

Approvals are created by high-risk governed operations (pipeline deploy,
self-healing apply, destructive SQL). `approval.approve` is lead/admin only —
engineers see the queue but cannot act.

## Audit

| Method | Path | Permission | Purpose |
|---|---|---|---|
| GET | `/audit` | `approval.read` | audit trail (actor, action, target, request_id) |

Every ToolRegistry execution and governance decision writes an `audit_logs`
row — the governance UI reads this.

## Team members (workspace-scoped)

| Method | Path | Permission | Purpose |
|---|---|---|---|
| GET | `/team/members` | `team.manage` or read role | list members + roles |
| POST | `/team/members` | `team.manage` | invite/add member |
| PATCH/PUT | `/team/members/{user_id}` | `team.manage` | change role |
| DELETE | `/team/members/{user_id}` | `team.manage` | remove member |

Single source of truth: `workspace_members` — no parallel stores
(`docs/architecture/system-architecture.md`).
