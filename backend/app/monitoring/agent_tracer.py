import time
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field
class AgentTrace:
    def __init__(self, run_id, agent_name, task_id):
        self.run_id = run_id; self.agent_name = agent_name; self.task_id = task_id
        self.start_time = time.monotonic(); self.end_time = 0.0
        self.tools_called = []; self.tokens_used = 0; self.cost_usd = 0.0
        self.status = "running"; self.error = None
class AgentTracer:
    def __init__(self): self._traces = []; self._active = {}
    def start_trace(self, run_id, agent_name, task_id):
        t = AgentTrace(run_id, agent_name, task_id); self._active[run_id] = t; return t
    def end_trace(self, run_id, status="success", error=None):
        t = self._active.pop(run_id, None)
        if t: t.end_time = time.monotonic(); t.status = status; t.error = error; self._traces.append(t)
    def record_tool_call(self, run_id, tool, action, duration_ms, success):
        t = self._active.get(run_id)
        if t: t.tools_called.append({"tool": tool, "action": action, "ms": duration_ms, "ok": success})
    def get_recent(self, limit=50):
        return [{"run_id": t.run_id, "agent": t.agent_name, "status": t.status, "ms": (t.end_time-t.start_time)*1000 if t.end_time else 0, "tools": len(t.tools_called)} for t in self._traces[-limit:]]
agent_tracer = AgentTracer()
