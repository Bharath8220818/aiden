# Authentication & Users

## Endpoints

| Method | Path | Permission | Purpose |
|---|---|---|---|
| POST | `/auth/login` | public | `{email, password}` → `{user, token, expiresAt}` |
| POST | `/auth/register` | public | open self-registration → user + token (Phase: unblocked; real-API + demo-mode paths in frontend) |
| POST | `/auth/logout` | authenticated | invalidate server-side session record |
| GET | `/auth/me` | authenticated | current user profile + workspace context |
| GET | `/users/me` | authenticated | alias for client bootstrapping |
| POST | `/users` | `user.create` (admin) | create user |
| GET | `/users` | `user.read` (admin) | list users |
| POST | `/users/register` | public | platform registration variant |

## Session shape

```json
{
  "user": {
    "id": "a0000000-...", "name": "Ava Chen", "email": "admin@acmedata.io",
    "systemRole": "admin", "roleTitle": "Platform Admin",
    "status": "offline", "workspaceName": "Acme Data Platform"
  },
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "expiresAt": "2026-09-27T12:20:02Z"
}
```

`systemRole` ∈ `admin | lead | engineer | viewer` (drive permissions; see
`docs/architecture/security-architecture.md`).

## Error behavior (pinned by smoke)

- bad password → 401 `UNAUTHORIZED`
- missing/invalid token → 401 on protected routes
- `429` after 60 req/min per IP (`RATE_LIMIT_PER_MINUTE`)

## Demo accounts (seeded)

| Email | Password | Role |
|---|---|---|
| admin@acmedata.io | admin123 | admin (Ava Chen) |
| bharath@acmedata.io | lead123 | lead (Bharath) |
| engineer@acmedata.io | eng123 | engineer (Maya Rodriguez) |
| analyst@acmedata.io | view123 | viewer (Sam Okafor) |
| demo@aiden.dev | Demo@12345 | demo |
