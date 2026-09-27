# production

Production does **not** run this compose stack today — the deployed
environment is Render (API) + Vercel (frontend) + Supabase (Postgres), see
`docs/deployment/production.md`.

This directory is reserved for a self-hosted production variant: overrides
would pin image versions, set `ENVIRONMENT=production`, real secrets via
environment (never committed), and published-ports topology.
