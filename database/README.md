# Database

**This folder intentionally contains no schema.** One source of truth:

| Concern | Where |
|---|---|
| Schema (tables, indexes, FKs) | `backend/app/models/` + Alembic revisions in `backend/migrations/versions/` (head `d6e7f8a9b0c1`) |
| Migration workflow | `docs/database/migrations.md` |
| Schema/relationship reference | `docs/database/schema.md`, `docs/database/relationships.md` |
| Demo dataset seeding | `backend/scripts/seed_database.py` (mirrored into Supabase during Phase A) |
| Production host | Supabase project (ap-southeast-1) via IPv4 session pooler |

If `schemas/*.sql` dumps are ever generated here (for review/ERD tooling),
they must be regenerated artifacts of the Alembic state — never hand-edited,
never applied directly. Application via `alembic upgrade head` only.
