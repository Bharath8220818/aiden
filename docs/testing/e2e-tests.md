# E2E Tests (Playwright)

Location: `frontend/e2e/` (`playwright.config.ts` at `frontend/`).

## Journeys

| Spec | Journey |
|---|---|
| auth flows | login → session → RBAC-gated navigation (viewer restrictions visible) |
| closed loop | requirement (text mode) → analyze → architecture canvas → pipeline create → run → monitoring |
| healing journey | incident → diagnose → patch → sandbox → approval gate |

## Running locally

```bash
cd frontend
npm run build               # e2e runs against the built SPA
npx playwright install
npx playwright test         # headed: --headed; single spec: npx playwright test e2e/auth.spec.ts
```

The suite expects the backend on `:8000` (or `VITE_API_URL` override) with
seeded demo accounts.

## Relationship to the smoke harness

Two complementary live checks:

- **Playwright E2E** — user journeys through the real UI (needs built frontend + backend).
- **`scripts/phase_a/smoke.py`** — API-level 14 gates, runs in CI
  (`deploy-verify.yml`) against any base URL, no browser needed:
  `python -m scripts.phase_a.smoke --base-url <url>`.

Rule of thumb: Playwright proves the *product* works; smoke proves the
*deployment* works.
