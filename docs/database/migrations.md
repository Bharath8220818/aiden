# Migrations (Alembic)

## Workflow

```bash
cd backend
# edit models first, then:
venv/Scripts/python.exe -m alembic revision --autogenerate -m "describe change"
# review the generated script (never trust autogenerate blindly — check
# server defaults, JSON columns, and index names)
venv/Scripts/python.exe -m alembic upgrade head
venv/Scripts/python.exe -m alembic history   # confirm single head
```

## State

- Head: `d6e7f8a9b0c1` (22 tables, 66 indexes, 35 FKs — matches Supabase).
- `env.py` reads `DATABASE_URL` from settings (async engine).
- `tests/test_migrations.py` guards head consistency; CI runs pytest with
  in-memory SQLite using `create_all` (schema parity is covered by the
  migration test, not by running Alembic in CI).

## Rules

1. **Never edit an applied migration** — add a new revision (even for
   typos); only unapplied/local scripts may be amended.
2. **One head.** Branch merges that both add revisions require a merge
   revision before deploy.
3. **Backwards-compatible steps.** Add columns nullable / with defaults;
   data backfills as separate revisions; destructive drops only after the
   code that used the column is gone (two-deploy rule).
4. **Render boots migrations**: the deploy runs `alembic upgrade head` before
   uvicorn — a failing migration fails the deploy visibly instead of serving
   schema drift.
5. **SQLite parity caveat**: local `aiden_dev.db` mirrors the schema for dev
   convenience; JSON-column and partial-index behavior can differ from
   Postgres — anything subtle gets exercised against Postgres (compose
   stack or Supabase) before merge.
