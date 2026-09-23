import { defineConfig } from '@playwright/test';

/**
 * Playwright E2E — runs against the REAL stack:
 *   - FastAPI backend on :8000 (started separately, seeded via scripts/seed_database.py)
 *   - Vite dev server (auto-started here) with VITE_ENABLE_MOCK_DATA=false
 *
 * Run:  npx playwright test
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false, // the closed-loop journey mutates shared backend state
  workers: 1,
  retries: process.env.CI ? 2 : 1, // journeys share live backend state; timing flakes retry
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
