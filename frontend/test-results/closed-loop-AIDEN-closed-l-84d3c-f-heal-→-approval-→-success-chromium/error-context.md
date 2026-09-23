# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: closed-loop.spec.ts >> AIDEN closed loop >> login → dashboard → requirement → architecture → pipeline → deploy → monitor → incident → self-heal → approval → success
- Location: e2e\closed-loop.spec.ts:26:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('Ava Chen')
Expected: visible
Error: strict mode violation: getByText('Ava Chen') resolved to 2 elements:
    1) <p class="text-xs font-semibold text-[#F5F7FA] truncate">Ava Chen</p> aka getByText('Ava Chen', { exact: true })
    2) <p class="text-xs font-semibold text-[#F5F7FA]">…</p> aka getByText('Ava Chen(you)')

Call log:
  - Expect "toBeVisible" getByText('Ava Chen') with timeout 15000ms
  - waiting for getByText('Ava Chen')

```

# Page snapshot

```yaml
- generic [ref=f1e3]:
  - link "Skip to main content" [ref=f1e4] [cursor=pointer]:
    - /url: "#main-content"
  - complementary [ref=f1e6]:
    - generic [ref=f1e7]:
      - link "AIDEN Logo AIDEN Autonomous Data Engineering" [ref=f1e8] [cursor=pointer]:
        - /url: /overview
        - img "AIDEN Logo" [ref=f1e9]
        - generic [ref=f1e10]:
          - generic [ref=f1e11]: AIDEN
          - generic [ref=f1e13]: Autonomous Data Engineering
      - button "Collapse sidebar" [ref=f1e14] [cursor=pointer]
    - generic [ref=f1e17]:
      - generic [ref=f1e18]:
        - paragraph [ref=f1e19]: Main
        - generic [ref=f1e20]:
          - link "Overview" [ref=f1e21] [cursor=pointer]:
            - /url: /overview
          - link "Requirement Studio AI" [ref=f1e28] [cursor=pointer]:
            - /url: /requirements
            - generic [ref=f1e31]: Requirement Studio
            - generic [ref=f1e32]: AI
          - link "Architecture Studio" [ref=f1e33] [cursor=pointer]:
            - /url: /architecture
          - link "Pipeline Builder" [ref=f1e40] [cursor=pointer]:
            - /url: /pipelines
          - link "SQL Workspace" [ref=f1e46] [cursor=pointer]:
            - /url: /sql
          - link "Connections" [ref=f1e50] [cursor=pointer]:
            - /url: /connections
      - generic [ref=f1e56]:
        - paragraph [ref=f1e57]: Operations
        - generic [ref=f1e58]:
          - link "Pipeline Manager" [ref=f1e59] [cursor=pointer]:
            - /url: /pipelines/manage
          - link "Monitoring Live" [ref=f1e65] [cursor=pointer]:
            - /url: /monitoring
            - generic [ref=f1e68]: Monitoring
            - generic [ref=f1e69]: Live
          - link "Incidents 1" [ref=f1e70] [cursor=pointer]:
            - /url: /incidents
            - generic [ref=f1e73]: Incidents
            - generic [ref=f1e74]: "1"
      - generic [ref=f1e75]:
        - paragraph [ref=f1e76]: Intelligence
        - generic [ref=f1e77]:
          - link "AI Self-Healing Active" [ref=f1e78] [cursor=pointer]:
            - /url: /self-healing
            - generic [ref=f1e82]: AI Self-Healing
            - generic [ref=f1e83]: Active
          - link "Agent Control Center" [ref=f1e84] [cursor=pointer]:
            - /url: /agents
          - link "Knowledge / RAG" [ref=f1e89] [cursor=pointer]:
            - /url: /knowledge
          - link "MCP Integrations" [ref=f1e93] [cursor=pointer]:
            - /url: /integrations
          - link "Approvals 2" [ref=f1e97] [cursor=pointer]:
            - /url: /approvals
            - generic [ref=f1e101]: Approvals
            - generic [ref=f1e102]: "2"
      - generic [ref=f1e103]:
        - paragraph [ref=f1e104]: Workspace
        - generic [ref=f1e105]:
          - link "Governance" [ref=f1e106] [cursor=pointer]:
            - /url: /governance
          - link "Team" [ref=f1e111] [cursor=pointer]:
            - /url: /team
    - generic [ref=f1e118]:
      - generic [ref=f1e119]:
        - link "Documentation" [ref=f1e120] [cursor=pointer]:
          - /url: /knowledge
        - link "Settings" [ref=f1e125] [cursor=pointer]:
          - /url: /integrations
      - generic [ref=f1e130]:
        - generic [ref=f1e131]: AC
        - generic [ref=f1e135]:
          - paragraph [ref=f1e136]: Ava Chen
          - paragraph [ref=f1e137]: Platform Admin
        - button "Sign out" [ref=f1e138] [cursor=pointer]
  - generic [ref=f1e142]:
    - banner [ref=f1e143]:
      - generic [ref=f1e145]:
        - button "Acme Data Platform" [ref=f1e148] [cursor=pointer]
        - generic [ref=f1e156]: "|"
        - button "Development" [ref=f1e159] [cursor=pointer]
      - generic [ref=f1e164]:
        - button "Search or command... Ctrl+K" [ref=f1e165] [cursor=pointer]:
          - generic [ref=f1e169]: Search or command...
          - generic [ref=f1e170]: Ctrl+K
        - button "Ask AIDEN" [ref=f1e171] [cursor=pointer]
        - button "Notifications" [ref=f1e176] [cursor=pointer]
        - button "Account menu" [ref=f1e184] [cursor=pointer]:
          - generic [ref=f1e185]: AC
    - main "Page content" [ref=f1e189]:
      - main [ref=f1e190]:
        - navigation [ref=f1e191]:
          - generic [ref=f1e192]: AIDEN
          - generic [ref=f1e195]: Acme Data Platform
          - generic [ref=f1e198]: Team
        - generic [ref=f1e199]:
          - generic [ref=f1e200]:
            - heading "Team" [level=1] [ref=f1e201]
            - paragraph [ref=f1e202]: Workspace membership, roles, and collaboration
          - generic [ref=f1e204]:
            - button "Refresh" [ref=f1e205] [cursor=pointer]
            - button "Invite member" [ref=f1e211] [cursor=pointer]
        - generic [ref=f1e215]:
          - generic [ref=f1e216]:
            - generic [ref=f1e217]:
              - generic [ref=f1e218]: Workspace
              - paragraph [ref=f1e224]: Acme Data Platform
              - paragraph [ref=f1e225]: "Your role: Owner"
            - generic [ref=f1e226]:
              - generic [ref=f1e227]: Members
              - paragraph [ref=f1e234]: "4"
              - paragraph [ref=f1e235]: 2 admins in workspace
            - generic [ref=f1e236]:
              - generic [ref=f1e237]: Roles
              - paragraph [ref=f1e242]: "4"
              - paragraph [ref=f1e243]: Viewer → Owner hierarchy
            - generic [ref=f1e244]:
              - generic [ref=f1e245]: Pending
              - paragraph [ref=f1e250]: "1"
              - paragraph [ref=f1e251]: Approval requests waiting
          - generic [ref=f1e252]:
            - generic [ref=f1e254]:
              - heading "Members" [level=3] [ref=f1e255]
              - paragraph [ref=f1e256]: You can change roles and remove members
            - table [ref=f1e259]:
              - rowgroup [ref=f1e260]:
                - row [ref=f1e261]:
                  - columnheader "Member" [ref=f1e262]
                  - columnheader "Role" [ref=f1e263]
                  - columnheader "Actions" [ref=f1e264]
              - rowgroup [ref=f1e265]:
                - row [ref=f1e266]:
                  - cell "AC Ava Chen(you) admin@acmedata.io" [ref=f1e267]:
                    - generic [ref=f1e268]:
                      - generic [ref=f1e269]: AC
                      - generic [ref=f1e273]:
                        - paragraph [ref=f1e274]: Ava Chen(you)
                        - paragraph [ref=f1e275]: admin@acmedata.io
                  - cell "Owner Workspace Owner" [ref=f1e276]:
                    - generic [ref=f1e277]: Owner
                    - paragraph [ref=f1e278]: Workspace Owner
                  - cell "—" [ref=f1e279]
                - row [ref=f1e280]:
                  - cell "B Bharath bharath@acmedata.io" [ref=f1e281]:
                    - generic [ref=f1e282]:
                      - generic [ref=f1e283]: B
                      - generic [ref=f1e287]:
                        - paragraph [ref=f1e288]: Bharath
                        - paragraph [ref=f1e289]: bharath@acmedata.io
                  - cell [ref=f1e290]:
                    - combobox "Role for Bharath" [ref=f1e291]:
                      - option "Owner" [selected]
                      - option "Admin"
                      - option "Member"
                      - option "Viewer"
                    - paragraph [ref=f1e292]: Workspace Owner
                  - cell [ref=f1e293]:
                    - button "Remove Bharath" [ref=f1e294] [cursor=pointer]
                - row [ref=f1e298]:
                  - cell "MR Maya Rodriguez engineer@acmedata.io" [ref=f1e299]:
                    - generic [ref=f1e300]:
                      - generic [ref=f1e301]: MR
                      - generic [ref=f1e305]:
                        - paragraph [ref=f1e306]: Maya Rodriguez
                        - paragraph [ref=f1e307]: engineer@acmedata.io
                  - cell [ref=f1e308]:
                    - combobox "Role for Maya Rodriguez" [ref=f1e309]:
                      - option "Owner"
                      - option "Admin"
                      - option "Member" [selected]
                      - option "Viewer"
                    - paragraph [ref=f1e310]: Member
                  - cell [ref=f1e311]:
                    - button "Remove Maya Rodriguez" [ref=f1e312] [cursor=pointer]
                - row [ref=f1e316]:
                  - cell "SO Sam Okafor analyst@acmedata.io" [ref=f1e317]:
                    - generic [ref=f1e318]:
                      - generic [ref=f1e319]: SO
                      - generic [ref=f1e323]:
                        - paragraph [ref=f1e324]: Sam Okafor
                        - paragraph [ref=f1e325]: analyst@acmedata.io
                  - cell [ref=f1e326]:
                    - combobox "Role for Sam Okafor" [ref=f1e327]:
                      - option "Owner"
                      - option "Admin"
                      - option "Member"
                      - option "Viewer" [selected]
                    - paragraph [ref=f1e328]: Viewer
                  - cell [ref=f1e329]:
                    - button "Remove Sam Okafor" [ref=f1e330] [cursor=pointer]
          - generic [ref=f1e334]:
            - heading "Role Reference" [level=3] [ref=f1e335]
            - generic [ref=f1e336]:
              - generic [ref=f1e337]:
                - generic [ref=f1e338]: Owner
                - paragraph [ref=f1e339]: Full administrative control of the workspace
              - generic [ref=f1e340]:
                - generic [ref=f1e341]: Admin
                - paragraph [ref=f1e342]: Manage members and all workspace resources
              - generic [ref=f1e343]:
                - generic [ref=f1e344]: Member
                - paragraph [ref=f1e345]: Build requirements, pipelines, and run SQL
              - generic [ref=f1e346]:
                - generic [ref=f1e347]: Viewer
                - paragraph [ref=f1e348]: Read-only access across the workspace
  - status [ref=f1e349]: connecting…
```

# Test source

```ts
  1   | import { test, expect, Page } from '@playwright/test';
  2   | 
  3   | /**
  4   |  * AIDEN closed-loop E2E — the critical user journey.
  5   |  *
  6   |  * Login → Dashboard → Project → Requirement → AI Analysis → Architecture →
  7   |  * Pipeline → Validate → Deploy (approval gate) → Monitor → Failure →
  8   |  * Incident → Self-Healing → Approval → Deploy Fix → Monitor → Success.
  9   |  *
  10  |  * Runs against the real FastAPI backend (VITE_ENABLE_MOCK_DATA=false) seeded
  11  |  * by backend/scripts/seed_database.py (admin@acmedata.io / admin123).
  12  |  */
  13  | 
  14  | const DEMO_EMAIL = 'admin@acmedata.io';
  15  | const DEMO_PASSWORD = 'admin123';
  16  | 
  17  | async function login(page: Page) {
  18  |   await page.goto('/login');
  19  |   await page.getByLabel(/email/i).fill(DEMO_EMAIL);
  20  |   await page.getByLabel(/password/i).fill(DEMO_PASSWORD);
  21  |   await page.getByRole('button', { name: /sign in|log in|login/i }).click();
  22  |   await page.waitForURL(/overview|\/(?!login)/, { timeout: 20_000 });
  23  | }
  24  | 
  25  | test.describe('AIDEN closed loop', () => {
  26  |   test('login → dashboard → requirement → architecture → pipeline → deploy → monitor → incident → self-heal → approval → success', async ({ page }) => {
  27  |     test.setTimeout(240_000);
  28  | 
  29  |     // ------------------------------------------------------------------ //
  30  |     // 1. LOGIN — real POST /auth/login + JWT persisted
  31  |     // ------------------------------------------------------------------ //
  32  |     await login(page);
  33  |     await expect(page).toHaveURL(/overview/);
  34  |     // Real /auth/me identity rendered in the greeting (seeded admin)
  35  |     await expect(page.getByRole('heading', { name: /ava chen/i })).toBeVisible();
  36  |     await expect(page.getByRole('heading', { name: /system health/i })).toBeVisible();
  37  | 
  38  |     // Session token persisted for the axios interceptor
  39  |     const session = await page.evaluate(() => localStorage.getItem('aiden-auth'));
  40  |     expect(session).toBeTruthy();
  41  |     expect(session!).toContain('token');
  42  | 
  43  |     // ------------------------------------------------------------------ //
  44  |     // 2. DASHBOARD — real GET /overview data rendered
  45  |     // ------------------------------------------------------------------ //
  46  |     await expect(page.getByText(/pipeline metrics|running|successful/i).first()).toBeVisible();
  47  | 
  48  |     // ------------------------------------------------------------------ //
  49  |     // 3. TEAM — real member roster (backend Phase F domain)
  50  |     // ------------------------------------------------------------------ //
  51  |     await page.goto('/team');
  52  |     await expect(page.getByRole('heading', { name: /members/i })).toBeVisible();
> 53  |     await expect(page.getByText('Ava Chen')).toBeVisible(); // seeded admin
      |                                              ^ Error: expect(locator).toBeVisible() failed
  54  | 
  55  |     // ------------------------------------------------------------------ //
  56  |     // 4. GOVERNANCE — live audit trail from audit_logs table
  57  |     // ------------------------------------------------------------------ //
  58  |     await page.goto('/governance');
  59  |     await expect(page.getByRole('heading', { name: /permission matrix/i })).toBeVisible();
  60  |     await expect(page.getByRole('heading', { name: /audit log/i })).toBeVisible();
  61  | 
  62  |     // ------------------------------------------------------------------ //
  63  |     // 5. REQUIREMENT STUDIO — AI analysis (POST /requirements/analyze)
  64  |     // ------------------------------------------------------------------ //
  65  |     await page.goto('/requirements');
  66  |     await expect(page.getByText(/requirement/i).first()).toBeVisible();
  67  | 
  68  |     // ------------------------------------------------------------------ //
  69  |     // 6. ARCHITECTURE — canvas + templates from GET /architecture/templates
  70  |     // ------------------------------------------------------------------ //
  71  |     await page.goto('/architecture');
  72  |     await expect(page.getByText(/architecture/i).first()).toBeVisible();
  73  | 
  74  |     // ------------------------------------------------------------------ //
  75  |     // 7. PIPELINE MANAGER — fleet from GET /pipelines/fleet
  76  |     // ------------------------------------------------------------------ //
  77  |     await page.goto('/pipelines/manage');
  78  |     await expect(page.getByText(/orders_cdc_v1/i).first()).toBeVisible();
  79  | 
  80  |     // ------------------------------------------------------------------ //
  81  |     // 8. MONITORING — services/alerts from GET /monitoring/*
  82  |     // ------------------------------------------------------------------ //
  83  |     await page.goto('/monitoring');
  84  |     await expect(page.getByText(/postgres/i).first()).toBeVisible();
  85  | 
  86  |     // ------------------------------------------------------------------ //
  87  |     // 9. INCIDENTS — seeded incident from GET /incidents
  88  |     // ------------------------------------------------------------------ //
  89  |     await page.goto('/incidents');
  90  |     await expect(page.getByText(/quality gate/i).first()).toBeVisible();
  91  | 
  92  |     // ------------------------------------------------------------------ //
  93  |     // 10. SELF-HEALING — closed loop: diagnose → fix → sandbox → deploy
  94  |     // ------------------------------------------------------------------ //
  95  |     await page.goto('/self-healing');
  96  |     await expect(page.getByText(/incident|loop/i).first()).toBeVisible();
  97  | 
  98  |     // ------------------------------------------------------------------ //
  99  |     // 11. APPROVALS — queue + decision from the governance API
  100 |     // ------------------------------------------------------------------ //
  101 |     await page.goto('/approvals');
  102 |     await expect(page.getByText(/pending/i).first()).toBeVisible();
  103 | 
  104 |     // ------------------------------------------------------------------ //
  105 |     // 12. CONNECTIONS — registry from GET /connections
  106 |     // ------------------------------------------------------------------ //
  107 |     await page.goto('/connections');
  108 |     await expect(page.getByText(/postgresql/i).first()).toBeVisible();
  109 | 
  110 |     // ------------------------------------------------------------------ //
  111 |     // 13. SQL — catalog from GET /sql/databases
  112 |     // ------------------------------------------------------------------ //
  113 |     await page.goto('/sql');
  114 |     await expect(page.getByText(/schema|database/i).first()).toBeVisible();
  115 | 
  116 |     // ------------------------------------------------------------------ //
  117 |     // 14. AGENTS + KNOWLEDGE + MCP — intelligence domains
  118 |     // ------------------------------------------------------------------ //
  119 |     await page.goto('/agents');
  120 |     await expect(page.getByText(/architect agent/i).first()).toBeVisible();
  121 | 
  122 |     await page.goto('/knowledge');
  123 |     await expect(page.getByText(/data contract|runbook|postmortem/i).first()).toBeVisible();
  124 | 
  125 |     await page.goto('/integrations');
  126 |     await expect(page.getByText(/mcp/i).first()).toBeVisible();
  127 | 
  128 |     // ------------------------------------------------------------------ //
  129 |     // 15. RBAC — viewer cannot see management controls
  130 |     // ------------------------------------------------------------------ //
  131 |     await page.evaluate(() => localStorage.removeItem('aiden-auth'));
  132 |     await page.goto('/login');
  133 |     await page.getByLabel(/email/i).fill('analyst@acmedata.io');
  134 |     await page.getByLabel(/password/i).fill('view123');
  135 |     await page.getByRole('button', { name: /sign in|log in|login/i }).click();
  136 |     await page.waitForURL(/overview/, { timeout: 20_000 });
  137 | 
  138 |     await page.goto('/team');
  139 |     // Viewer is gated by team.manage — the guard page or no invite button
  140 |     await page.waitForTimeout(1500);
  141 |     const inviteVisible = await page.getByRole('button', { name: /invite member/i }).isVisible().catch(() => false);
  142 |     expect(inviteVisible).toBe(false);
  143 | 
  144 |     // Sign out viewer
  145 |     await page.evaluate(() => localStorage.removeItem('aiden-auth'));
  146 |   });
  147 | 
  148 |   test('RBAC: engineer deploy request routes to the approval queue (409 APPROVAL_REQUIRED)', async ({ request }) => {
  149 |     // Backend-level verification of the deploy gate that the UI surfaces.
  150 |     const login = await request.post('http://localhost:8000/api/v1/auth/login', {
  151 |       data: { email: 'engineer@acmedata.io', password: 'eng123' },
  152 |     });
  153 |     expect(login.ok()).toBeTruthy();
```