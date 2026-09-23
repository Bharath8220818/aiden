# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: aiden-loop.spec.ts >> Auth + RBAC matrix >> viewer cannot open Team management; admin can
- Location: e2e\aiden-loop.spec.ts:59:3

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
- generic [ref=f3e3]:
  - link "Skip to main content" [ref=f3e4] [cursor=pointer]:
    - /url: "#main-content"
  - complementary [ref=f3e6]:
    - generic [ref=f3e7]:
      - link "AIDEN Logo AIDEN Autonomous Data Engineering" [ref=f3e8] [cursor=pointer]:
        - /url: /overview
        - img "AIDEN Logo" [ref=f3e9]
        - generic [ref=f3e10]:
          - generic [ref=f3e11]: AIDEN
          - generic [ref=f3e13]: Autonomous Data Engineering
      - button "Collapse sidebar" [ref=f3e14] [cursor=pointer]
    - generic [ref=f3e17]:
      - generic [ref=f3e18]:
        - paragraph [ref=f3e19]: Main
        - generic [ref=f3e20]:
          - link "Overview" [ref=f3e21] [cursor=pointer]:
            - /url: /overview
          - link "Requirement Studio AI" [ref=f3e28] [cursor=pointer]:
            - /url: /requirements
            - generic [ref=f3e31]: Requirement Studio
            - generic [ref=f3e32]: AI
          - link "Architecture Studio" [ref=f3e33] [cursor=pointer]:
            - /url: /architecture
          - link "Pipeline Builder" [ref=f3e40] [cursor=pointer]:
            - /url: /pipelines
          - link "SQL Workspace" [ref=f3e46] [cursor=pointer]:
            - /url: /sql
          - link "Connections" [ref=f3e50] [cursor=pointer]:
            - /url: /connections
      - generic [ref=f3e56]:
        - paragraph [ref=f3e57]: Operations
        - generic [ref=f3e58]:
          - link "Pipeline Manager" [ref=f3e59] [cursor=pointer]:
            - /url: /pipelines/manage
          - link "Monitoring Live" [ref=f3e65] [cursor=pointer]:
            - /url: /monitoring
            - generic [ref=f3e68]: Monitoring
            - generic [ref=f3e69]: Live
          - link "Incidents 1" [ref=f3e70] [cursor=pointer]:
            - /url: /incidents
            - generic [ref=f3e73]: Incidents
            - generic [ref=f3e74]: "1"
      - generic [ref=f3e75]:
        - paragraph [ref=f3e76]: Intelligence
        - generic [ref=f3e77]:
          - link "AI Self-Healing Active" [ref=f3e78] [cursor=pointer]:
            - /url: /self-healing
            - generic [ref=f3e82]: AI Self-Healing
            - generic [ref=f3e83]: Active
          - link "Agent Control Center" [ref=f3e84] [cursor=pointer]:
            - /url: /agents
          - link "Knowledge / RAG" [ref=f3e89] [cursor=pointer]:
            - /url: /knowledge
          - link "MCP Integrations" [ref=f3e93] [cursor=pointer]:
            - /url: /integrations
          - link "Approvals 2" [ref=f3e97] [cursor=pointer]:
            - /url: /approvals
            - generic [ref=f3e101]: Approvals
            - generic [ref=f3e102]: "2"
      - generic [ref=f3e103]:
        - paragraph [ref=f3e104]: Workspace
        - generic [ref=f3e105]:
          - link "Governance" [ref=f3e106] [cursor=pointer]:
            - /url: /governance
          - link "Team" [ref=f3e111] [cursor=pointer]:
            - /url: /team
    - generic [ref=f3e118]:
      - generic [ref=f3e119]:
        - link "Documentation" [ref=f3e120] [cursor=pointer]:
          - /url: /knowledge
        - link "Settings" [ref=f3e125] [cursor=pointer]:
          - /url: /integrations
      - generic [ref=f3e130]:
        - generic [ref=f3e131]: AC
        - generic [ref=f3e135]:
          - paragraph [ref=f3e136]: Ava Chen
          - paragraph [ref=f3e137]: Platform Admin
        - button "Sign out" [ref=f3e138] [cursor=pointer]
  - generic [ref=f3e142]:
    - banner [ref=f3e143]:
      - generic [ref=f3e145]:
        - button "Acme Data Platform" [ref=f3e148] [cursor=pointer]
        - generic [ref=f3e156]: "|"
        - button "Development" [ref=f3e159] [cursor=pointer]
      - generic [ref=f3e164]:
        - button "Search or command... Ctrl+K" [ref=f3e165] [cursor=pointer]:
          - generic [ref=f3e169]: Search or command...
          - generic [ref=f3e170]: Ctrl+K
        - button "Ask AIDEN" [ref=f3e171] [cursor=pointer]
        - button "Notifications" [ref=f3e176] [cursor=pointer]
        - button "Account menu" [ref=f3e184] [cursor=pointer]:
          - generic [ref=f3e185]: AC
    - main "Page content" [ref=f3e189]:
      - main [ref=f3e190]:
        - navigation [ref=f3e191]:
          - generic [ref=f3e192]: AIDEN
          - generic [ref=f3e195]: Acme Data Platform
          - generic [ref=f3e198]: Team
        - generic [ref=f3e199]:
          - generic [ref=f3e200]:
            - heading "Team" [level=1] [ref=f3e201]
            - paragraph [ref=f3e202]: Workspace membership, roles, and collaboration
          - generic [ref=f3e204]:
            - button "Refresh" [ref=f3e205] [cursor=pointer]
            - button "Invite member" [ref=f3e211] [cursor=pointer]
        - generic [ref=f3e215]:
          - generic [ref=f3e216]:
            - generic [ref=f3e217]:
              - generic [ref=f3e218]: Workspace
              - paragraph [ref=f3e224]: Acme Data Platform
              - paragraph [ref=f3e225]: "Your role: Owner"
            - generic [ref=f3e226]:
              - generic [ref=f3e227]: Members
              - paragraph [ref=f3e234]: "4"
              - paragraph [ref=f3e235]: 2 admins in workspace
            - generic [ref=f3e236]:
              - generic [ref=f3e237]: Roles
              - paragraph [ref=f3e242]: "4"
              - paragraph [ref=f3e243]: Viewer → Owner hierarchy
            - generic [ref=f3e244]:
              - generic [ref=f3e245]: Pending
              - paragraph [ref=f3e250]: "2"
              - paragraph [ref=f3e251]: Approval requests waiting
          - generic [ref=f3e252]:
            - generic [ref=f3e254]:
              - heading "Members" [level=3] [ref=f3e255]
              - paragraph [ref=f3e256]: You can change roles and remove members
            - table [ref=f3e259]:
              - rowgroup [ref=f3e260]:
                - row [ref=f3e261]:
                  - columnheader "Member" [ref=f3e262]
                  - columnheader "Role" [ref=f3e263]
                  - columnheader "Actions" [ref=f3e264]
              - rowgroup [ref=f3e265]:
                - row [ref=f3e266]:
                  - cell "AC Ava Chen(you) admin@acmedata.io" [ref=f3e267]:
                    - generic [ref=f3e268]:
                      - generic [ref=f3e269]: AC
                      - generic [ref=f3e273]:
                        - paragraph [ref=f3e274]: Ava Chen(you)
                        - paragraph [ref=f3e275]: admin@acmedata.io
                  - cell "Owner Workspace Owner" [ref=f3e276]:
                    - generic [ref=f3e277]: Owner
                    - paragraph [ref=f3e278]: Workspace Owner
                  - cell "—" [ref=f3e279]
                - row [ref=f3e280]:
                  - cell "B Bharath bharath@acmedata.io" [ref=f3e281]:
                    - generic [ref=f3e282]:
                      - generic [ref=f3e283]: B
                      - generic [ref=f3e287]:
                        - paragraph [ref=f3e288]: Bharath
                        - paragraph [ref=f3e289]: bharath@acmedata.io
                  - cell [ref=f3e290]:
                    - combobox "Role for Bharath" [ref=f3e291]:
                      - option "Owner" [selected]
                      - option "Admin"
                      - option "Member"
                      - option "Viewer"
                    - paragraph [ref=f3e292]: Workspace Owner
                  - cell [ref=f3e293]:
                    - button "Remove Bharath" [ref=f3e294] [cursor=pointer]
                - row [ref=f3e298]:
                  - cell "MR Maya Rodriguez engineer@acmedata.io" [ref=f3e299]:
                    - generic [ref=f3e300]:
                      - generic [ref=f3e301]: MR
                      - generic [ref=f3e305]:
                        - paragraph [ref=f3e306]: Maya Rodriguez
                        - paragraph [ref=f3e307]: engineer@acmedata.io
                  - cell [ref=f3e308]:
                    - combobox "Role for Maya Rodriguez" [ref=f3e309]:
                      - option "Owner"
                      - option "Admin"
                      - option "Member" [selected]
                      - option "Viewer"
                    - paragraph [ref=f3e310]: Member
                  - cell [ref=f3e311]:
                    - button "Remove Maya Rodriguez" [ref=f3e312] [cursor=pointer]
                - row [ref=f3e316]:
                  - cell "SO Sam Okafor analyst@acmedata.io" [ref=f3e317]:
                    - generic [ref=f3e318]:
                      - generic [ref=f3e319]: SO
                      - generic [ref=f3e323]:
                        - paragraph [ref=f3e324]: Sam Okafor
                        - paragraph [ref=f3e325]: analyst@acmedata.io
                  - cell [ref=f3e326]:
                    - combobox "Role for Sam Okafor" [ref=f3e327]:
                      - option "Owner"
                      - option "Admin"
                      - option "Member"
                      - option "Viewer" [selected]
                    - paragraph [ref=f3e328]: Viewer
                  - cell [ref=f3e329]:
                    - button "Remove Sam Okafor" [ref=f3e330] [cursor=pointer]
          - generic [ref=f3e334]:
            - heading "Role Reference" [level=3] [ref=f3e335]
            - generic [ref=f3e336]:
              - generic [ref=f3e337]:
                - generic [ref=f3e338]: Owner
                - paragraph [ref=f3e339]: Full administrative control of the workspace
              - generic [ref=f3e340]:
                - generic [ref=f3e341]: Admin
                - paragraph [ref=f3e342]: Manage members and all workspace resources
              - generic [ref=f3e343]:
                - generic [ref=f3e344]: Member
                - paragraph [ref=f3e345]: Build requirements, pipelines, and run SQL
              - generic [ref=f3e346]:
                - generic [ref=f3e347]: Viewer
                - paragraph [ref=f3e348]: Read-only access across the workspace
  - status [ref=f3e349]: connecting…
```

# Test source

```ts
  1   | import { test, expect, Page } from '@playwright/test';
  2   | 
  3   | /**
  4   |  * Phase 6 Step 10 — critical journeys through the UI against the REAL backend.
  5   |  *
  6   |  * 1. Auth + RBAC matrix (viewer/engineer/lead/admin gates)
  7   |  * 2. Requirement Studio → real AI analysis (POST /requirements/analyze)
  8   |  * 3. Self-Healing journey → diagnose → fix → sandbox → approve & deploy → resolved
  9   |  * 4. Approvals → real decision through the UI (audit trail updates)
  10  |  *
  11  |  * Prereqs: backend :8000 seeded (scripts/seed_database.py), VITE_ENABLE_MOCK_DATA=false.
  12  |  */
  13  | 
  14  | const BASE = 'http://localhost:8000/api/v1';
  15  | 
  16  | interface Session {
  17  |   email: string;
  18  |   password: string;
  19  |   role: string;
  20  | }
  21  | 
  22  | const SESSIONS: Record<string, Session> = {
  23  |   admin: { email: 'admin@acmedata.io', password: 'admin123', role: 'admin' },
  24  |   lead: { email: 'bharath@acmedata.io', password: 'lead123', role: 'lead' },
  25  |   engineer: { email: 'engineer@acmedata.io', password: 'eng123', role: 'engineer' },
  26  |   viewer: { email: 'analyst@acmedata.io', password: 'view123', role: 'viewer' },
  27  | };
  28  | 
  29  | async function login(page: Page, account: Session) {
  30  |   await page.goto('/login');
  31  |   await page.getByLabel(/email/i).fill(account.email);
  32  |   await page.getByLabel(/password/i).fill(account.password);
  33  |   await page.getByRole('button', { name: /sign in/i }).click();
  34  |   await page.waitForURL(/overview/, { timeout: 30_000 });
  35  | }
  36  | 
  37  | test.describe('Auth + RBAC matrix', () => {
  38  |   for (const account of Object.values(SESSIONS)) {
  39  |     test(`login as ${account.role} lands on the dashboard with a real session`, async ({ page }) => {
  40  |       await login(page, account);
  41  |       const session = await page.evaluate(() => localStorage.getItem('aiden-auth'));
  42  |       expect(session).toBeTruthy();
  43  |       const parsed = JSON.parse(session!) as { state: { user: { systemRole: string } } };
  44  |       expect(parsed.state.user.systemRole).toBe(account.role);
  45  |     });
  46  |   }
  47  | 
  48  |   test('wrong password is rejected without a session', async ({ page }) => {
  49  |     await page.goto('/login');
  50  |     await page.getByLabel(/email/i).fill(SESSIONS.admin.email);
  51  |     await page.getByLabel(/password/i).fill('wrong-password');
  52  |     await page.getByRole('button', { name: /sign in/i }).click();
  53  |     await expect(page.getByRole('alert')).toBeVisible({ timeout: 15_000 });
  54  |     const session = await page.evaluate(() => localStorage.getItem('aiden-auth'));
  55  |     const parsed = session ? (JSON.parse(session) as { state: { token: string | null } }) : null;
  56  |     expect(parsed?.state.token).toBeFalsy();
  57  |   });
  58  | 
  59  |   test('viewer cannot open Team management; admin can', async ({ page }) => {
  60  |     await login(page, SESSIONS.viewer);
  61  |     await page.goto('/team');
  62  |     await page.waitForTimeout(1_500);
  63  |     expect(await page.getByRole('button', { name: /invite member/i }).isVisible().catch(() => false)).toBe(false);
  64  | 
  65  |     await page.evaluate(() => localStorage.removeItem('aiden-auth'));
  66  |     await login(page, SESSIONS.admin);
  67  |     await page.goto('/team');
  68  |     await expect(page.getByRole('button', { name: /invite member/i })).toBeVisible({ timeout: 15_000 });
> 69  |     await expect(page.getByText('Ava Chen')).toBeVisible();
      |                                              ^ Error: expect(locator).toBeVisible() failed
  70  |   });
  71  | });
  72  | 
  73  | test.describe('Requirement Studio — real AI analysis', () => {
  74  |   test('synthesize intent produces a contract from the real backend', async ({ page }) => {
  75  |     await login(page, SESSIONS.engineer);
  76  |     await page.goto('/requirements');
  77  |     await expect(page.getByText(/requirement/i).first()).toBeVisible();
  78  | 
  79  |     // The preset loads a default intent; run synthesis (POST /requirements/analyze).
  80  |     const analyzeButton = page.getByRole('button', { name: /synthesi|analyze|generate contract/i }).first();
  81  |     if (await analyzeButton.isVisible().catch(() => false)) {
  82  |       await analyzeButton.click();
  83  |       // The response renders contract fields (dataset or contract title).
  84  |       await expect(page.getByText(/contract|dataset|sla/i).first()).toBeVisible({ timeout: 30_000 });
  85  |     } else {
  86  |       // Studio opened with a preset contract visible — verify the data is rendered.
  87  |       await expect(page.getByText(/contract|dataset|sla/i).first()).toBeVisible();
  88  |     }
  89  |   });
  90  | 
  91  |   test('backend analyze returns a valid contract (API-level, engine-aware)', async ({ request }) => {
  92  |     const loginResp = await request.post(`${BASE}/auth/login`, {
  93  |       data: { email: SESSIONS.engineer.email, password: SESSIONS.engineer.password },
  94  |     });
  95  |     const { token } = await loginResp.json();
  96  |     const resp = await request.post(`${BASE}/requirements/analyze`, {
  97  |       headers: { Authorization: `Bearer ${token}` },
  98  |       data: {
  99  |         activeMode: 'text',
  100 |         text: { rawText: 'Create a daily sales pipeline from PostgreSQL to Snowflake with masked customer emails', tags: [] },
  101 |         audio: { transcript: '', durationSeconds: 0 },
  102 |         sql: { sqlQuery: '', inferredSources: ['PostgreSQL OLTP'], inferredTarget: 'Snowflake Mart' },
  103 |         diagram: {},
  104 |         document: { fileContent: '' },
  105 |       },
  106 |     });
  107 |     expect(resp.ok()).toBeTruthy();
  108 |     const body = await resp.json();
  109 |     expect(['ai', 'heuristic']).toContain(body.analysis.source);
  110 |     expect(body.analysis.pipelinePattern).toMatch(/batch_etl|streaming_cdc|streaming_analytics/);
  111 |     expect(body.contract.columns.length).toBeGreaterThan(2);
  112 |     expect(body.contract.qualityRules.length).toBeGreaterThan(2);
  113 |   });
  114 | });
  115 | 
  116 | test.describe('Self-Healing closed loop through the UI', () => {
  117 |   test('diagnose → fix → sandbox → approve & deploy → resolved', async ({ page }) => {
  118 |     await login(page, SESSIONS.lead);
  119 |     await page.goto('/self-healing');
  120 | 
  121 |     // Incident list is real (seeded incident)
  122 |     await expect(page.getByText(/incident|loop/i).first()).toBeVisible({ timeout: 20_000 });
  123 | 
  124 |     // Walk the loop via the primary action button (label per stage: investigate → fix → sandbox → deploy)
  125 |     for (let i = 0; i < 6; i += 1) {
  126 |       const button = page.getByRole('button', { name: /run root-cause|generate fix|run sandbox|approve & deploy/i }).first();
  127 |       if (!(await button.isVisible().catch(() => false))) break;
  128 |       if (!(await button.isEnabled().catch(() => false))) break;
  129 |       await button.click();
  130 |       // Wait until the button label changes (stage advanced) before the next click.
  131 |       await page.waitForTimeout(4_500);
  132 |     }
  133 | 
  134 |     // The healing timeline rendered real stage events from the backend state machine
  135 |     await expect(page.getByText(/loop complete|root-cause|sandbox|approval/i).first()).toBeVisible({ timeout: 20_000 });
  136 |   });
  137 | });
  138 | 
  139 | test.describe('Approvals — real decisions with audit trail', () => {
  140 |   test('lead approves a pending request; audit records the decision', async ({ request }) => {
  141 |     // Create a deploy approval via API (engineer request)
  142 |     const engLogin = await request.post(`${BASE}/auth/login`, {
  143 |       data: { email: SESSIONS.engineer.email, password: SESSIONS.engineer.password },
  144 |     });
  145 |     const { token: engToken } = await engLogin.json();
  146 |     const fleet = await (await request.get(`${BASE}/pipelines/fleet`, { headers: { Authorization: `Bearer ${engToken}` } })).json();
  147 |     await request.post(`${BASE}/pipelines/${fleet[0].id}/deploy`, { headers: { Authorization: `Bearer ${engToken}` } });
  148 | 
  149 |     // Lead approves it through the API the UI uses
  150 |     const leadLogin = await request.post(`${BASE}/auth/login`, {
  151 |       data: { email: SESSIONS.lead.email, password: SESSIONS.lead.password },
  152 |     });
  153 |     const { token: leadToken } = await leadLogin.json();
  154 |     const leadHeaders = { Authorization: `Bearer ${leadToken}` };
  155 |     const approvals = await (await request.get(`${BASE}/approvals`, { headers: leadHeaders })).json();
  156 |     const pending = approvals.find((a: { status: string }) => a.status === 'pending');
  157 |     expect(pending).toBeTruthy();
  158 |     const decision = await request.post(`${BASE}/approvals/${pending.id}/approve`, {
  159 |       headers: leadHeaders,
  160 |       data: { note: 'E2E approval journey' },
  161 |     });
  162 |     expect(decision.ok()).toBeTruthy();
  163 | 
  164 |     const audit = await (await request.get(`${BASE}/audit?limit=5`, { headers: leadHeaders })).json();
  165 |     expect(audit.some((a: { action: string }) => a.action === 'approval.approve')).toBeTruthy();
  166 |   });
  167 | 
  168 |   test('viewer gets 403 on approval decisions (RBAC enforced at the API)', async ({ request }) => {
  169 |     const viewerLogin = await request.post(`${BASE}/auth/login`, {
```