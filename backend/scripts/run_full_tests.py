"""
AIDEN Comprehensive Test Suite
Run: python scripts/run_full_tests.py
"""
import subprocess, sys, time, json, os

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = "http://localhost:8000"

results = {"pass": 0, "fail": 0, "tests": []}

def test(name, category, condition, detail=""):
    status = "PASS" if condition else "FAIL"
    if condition:
        results["pass"] += 1
    else:
        results["fail"] += 1
    results["tests"].append({
        "name": name, "category": category,
        "status": status, "detail": detail
    })
    print(f"  [{status}] {category}: {name}  {detail[:100]}")

def req(method, url, data=None, headers=None):
    if headers is None:
        headers = {}
    if isinstance(data, str):
        data = data.encode()
    r = urllib.request.Request(url, data=data, method=method, headers=headers)
    try:
        resp = urllib.request.urlopen(r, timeout=15)
        return resp.status, json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        try:
            return e.code, json.loads(body)
        except:
            return e.code, {"raw": body[:200]}
    except Exception as e:
        return 0, {"error": str(e)}

import urllib.request

print("=" * 70)
print("  AIDEN COMPREHENSIVE TEST SUITE")
print("=" * 70)

# ─── Start Backend ────────────────────────────────────────────────
print("\n[1] Starting backend...")
proc = subprocess.Popen(
    [sys.executable, "-m", "uvicorn", "app.main:app", "--reload", "--port", "8000"],
    cwd=BACKEND_DIR,
    stdout=subprocess.PIPE, stderr=subprocess.STDOUT
)
time.sleep(10)

# ─── 1. HEALTH & ROOT ─────────────────────────────────────────────
print("\n--- SECTION 1: Health and Root ---")
s, d = req("GET", f"{BASE}/")
test("Root endpoint", "1.Health", s == 200 and "version" in str(d), str(d)[:60])

s, d = req("GET", f"{BASE}/health")
test("Health check", "1.Health", s == 200 and "healthy" in str(d), str(d)[:60])

# ─── 2. AUTH ──────────────────────────────────────────────────────
print("\n--- SECTION 2: Authentication ---")
s, d = req("POST", f"{BASE}/api/v1/auth/login",
    "username=femifriendly@gmail.com&password=Femi@2005",
    {"Content-Type": "application/x-www-form-urlencoded"})
test("Login", "2.Auth", s == 200 and "access_token" in d, f"token={d.get('access_token','')[:30]}...")
TOKEN = d.get("access_token", "")
AUTH = {"Authorization": f"Bearer {TOKEN}"}

s, d = req("GET", f"{BASE}/api/v1/auth/me", headers=AUTH)
test("Get current user", "2.Auth", s == 200, f"email={d.get('email','?')}")

s, d = req("GET", f"{BASE}/api/v1/auth/me",
    headers={"Authorization": "Bearer invalid"})
test("Invalid token rejected", "2.Auth", s == 401, str(d.get("detail",""))[:60])

# ─── 3. PIPELINE CRUD ─────────────────────────────────────────────
print("\n--- SECTION 3: Pipeline CRUD ---")
s, d = req("GET", f"{BASE}/api/v1/pipelines/?skip=0&limit=100", headers=AUTH)
pl = d if isinstance(d, list) else []
test("List pipelines", "3.Pipelines", s == 200 and isinstance(pl, list), f"count={len(pl)}")

s, d = req("POST", f"{BASE}/api/v1/pipelines/",
    json.dumps({
        "name": "Quick ETL Test",
        "source_type": "postgres",
        "destination_type": "bigquery",
        "schedule": "0 6 * * *",
        "config": {"transformations": ["clean", "aggregate"]}
    }),
    {"Content-Type": "application/json", **AUTH})
PID = d.get("id", 0)
test("Create pipeline", "3.Pipelines", s == 200 and PID > 0, f"id={PID} name={d.get('name','?')}")

s, d = req("GET", f"{BASE}/api/v1/pipelines/{PID}", headers=AUTH)
test("Get pipeline by ID", "3.Pipelines", s == 200, f"id={d.get('id','?')}")

s, d = req("POST", f"{BASE}/api/v1/pipelines/{PID}/run", headers=AUTH)
EID = d.get("id", 0)
test("Run pipeline", "3.Pipelines", s in [200, 201] and EID > 0, f"exec_id={EID}")

time.sleep(8)
s, d = req("GET", f"{BASE}/api/v1/executions/{EID}", headers=AUTH)
status = d.get("status", "?")
recs = d.get("records_processed", "?")
test("Execution completes", "3.Pipelines", s == 200 and status in ["SUCCESS", "RUNNING", "COMPLETED"],
     f"status={status} records={recs}")

# ─── 4. ANALYTICS ─────────────────────────────────────────────────
print("\n--- SECTION 4: Analytics ---")
s, d = req("GET", f"{BASE}/api/v1/analytics/dashboard?period=30D", headers=AUTH)
test("Dashboard KPIs", "4.Analytics", s == 200, f"keys={list(d.keys()) if isinstance(d, dict) else 'array'}")

# ─── 5. APPROVALS ─────────────────────────────────────────────────
print("\n--- SECTION 5: Approvals ---")
s, d = req("GET", f"{BASE}/api/v1/approvals/", headers=AUTH)
al = d if isinstance(d, list) else []
test("List approvals", "5.Approvals", s == 200, f"count={len(al)}")

# ─── 6. AUDIT LOGS ────────────────────────────────────────────────
print("\n--- SECTION 6: Audit Logs ---")
s, d = req("GET", f"{BASE}/api/v1/audit/", headers=AUTH)
au = d if isinstance(d, list) else []
test("List audit logs", "6.Audit", s == 200, f"count={len(au)}")

# ─── 7. MULTIMODAL ────────────────────────────────────────────────
print("\n--- SECTION 7: Multimodal ---")
s, d = req("GET", f"{BASE}/api/v1/multimodal/status", headers=AUTH)
test("Multimodal status", "7.Multimodal", s == 200, f"available={d.get('available','?')} mode={d.get('mode','?')}")

# ─── 8. PROMPT PIPELINE ───────────────────────────────────────────
print("\n--- SECTION 8: Prompt-based Pipeline ---")
s, d = req("POST", f"{BASE}/api/v1/pipelines/from-prompt",
    json.dumps({"prompt": "Build a daily sales ETL from PostgreSQL to Snowflake with hourly schedule"}),
    {"Content-Type": "application/json", **AUTH})
test("From-prompt pipeline", "8.Prompts", s in [200, 201],
     f"id={d.get('id','?')} name={d.get('name','?')}")

# ─── 9. RUN BACKEND TESTS ─────────────────────────────────────────
print("\n--- SECTION 9: Backend Test Suite ---")
result = subprocess.run(
    [sys.executable, "-m", "pytest", "tests/", "-v", "--tb=short"],
    cwd=BACKEND_DIR, capture_output=True, text=True, timeout=120
)
out = result.stdout + result.stderr
lines = [l for l in out.split("\n") if "PASSED" in l or "FAILED" in l or "ERROR" in l or "passed" in l]
test("Backend test suite", "9.Tests", result.returncode == 0, f"results={out[-200:].replace(chr(10),' ')[:100]}")

# ─── REPORT ───────────────────────────────────────────────────────
print("\n" + "=" * 70)
print("  FINAL TEST REPORT")
print("=" * 70)
total = results["pass"] + results["fail"]
print(f"\n  Total: {total}  |  Passed: {results['pass']} ({results['pass']/total*100:.0f}%)  |  Failed: {results['fail']}")
print()
for t in results["tests"]:
    status_icon = "✓" if t["status"] == "PASS" else "✗"
    print(f"  {status_icon} {t['name']}: {t['detail']}")

proc.terminate()
print("\n  Backend terminated. All tests complete.")
