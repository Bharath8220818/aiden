"""Measure import time of agent_orchestrator module."""
import time
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

t0 = time.time()
from app.core.agent_orchestrator import AgentOrchestrator, CodeGeneratorTool
print(f"Import took: {time.time()-t0:.2f}s")

t0 = time.time()
orch = AgentOrchestrator()
print(f"Init took: {time.time()-t0:.2f}s")
print(f"Enabled: {orch.is_enabled()}")

t0 = time.time()
gen = CodeGeneratorTool()
code = gen.forward(
    '{"name":"test","source_type":"postgres","destination_type":"snowflake"}',
    "dag"
)
print(f"CodeGen: {len(code)} chars in {time.time()-t0:.2f}s")
print("Code preview:", code[:200])
