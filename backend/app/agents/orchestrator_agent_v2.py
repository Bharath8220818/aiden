import asyncio, logging
from typing import Dict, Any, List
from app.agents.base_agent_v2 import BaseAIDENAgent
from app.schemas.agent_communication import AgentTask, AgentResult, AgentType, TaskStatus, RiskLevel, ExecutionPlan, ExecutionStep
logger = logging.getLogger(__name__)
INTENT_RULES = {"pipeline_status": ["status","list","show","pipeline","dag"], "sql_query": ["table","schema","sql","query"], "investigation": ["slow","fail","error","debug","why"], "pipeline_create": ["create","build","generate","pipeline"], "architecture_create": ["create","architecture","diagram"]}
AGENT_MAP = {"pipeline_status": ["monitoring"], "sql_query": ["sql"], "investigation": ["monitoring","debug"], "pipeline_create": ["pipeline"], "architecture_create": ["architecture"]}
AGENT_TOOLS = {"sql": ["postgres.list_tables","postgres.execute_readonly_sql"], "pipeline": ["airflow.list_dags","airflow.trigger_dag"], "architecture": [], "monitoring": ["airflow.get_dag_status","kafka.get_consumer_lag"], "debug": ["airflow.get_dag_logs","postgres.execute_readonly_sql"]}
class OrchestratorAgentV2(BaseAIDENAgent):
    name = "orchestrator"
    agent_type = AgentType.ORCHESTRATOR
    description = "Master orchestrator"
    system_prompt = "You are AIDEN Master Orchestrator."
    permissions = []
    def __init__(self):
        super().__init__(); self._agents = {}
    def register_agent(self, name, agent): self._agents[name] = agent
    def classify_intent(self, request):
        lower = request.lower()
        scores = {i: sum(1 for kw in kw_list if kw in lower) for i, kw_list in INTENT_RULES.items()}
        scores = {k:v for k,v in scores.items() if v > 0}
        if not scores: return {"type": "complex", "agents": ["monitoring","sql","debug"]}
        best = max(scores, key=scores.get)
        return {"type": best, "agents": AGENT_MAP.get(best, ["monitoring"])}
    def create_plan(self, objective, agent_names):
        steps = [ExecutionStep(agent_name=n, description=n+" agent: "+objective, tools_required=AGENT_TOOLS.get(n,[]), risk_level=RiskLevel.LOW) for n in agent_names]
        pg = [[s.step_id for s in steps[:-1]]] if len(steps) > 1 else []
        return ExecutionPlan(objective=objective, steps=steps, parallel_groups=pg, risk_assessment=RiskLevel.LOW)
    async def execute_plan(self, plan, context):
        results = {}
        for group in plan.parallel_groups:
            tasks, sids = [], []
            for sid in group:
                step = next((s for s in plan.steps if s.step_id == sid), None)
                if not step: continue
                agent = self._agents.get(step.agent_name)
                if agent:
                    t = AgentTask(task_id=sid, project_id=context.get("project_id",""), user_id=context.get("user_id",0), objective=step.description, allowed_tools=step.tools_required, risk_level=step.risk_level)
                    tasks.append(agent.execute(t, context)); sids.append(sid)
            if tasks:
                gathered = await asyncio.gather(*tasks, return_exceptions=True)
                for sid, r in zip(sids, gathered):
                    results[sid] = r if not isinstance(r, Exception) else AgentResult(task_id=sid, agent_name="unknown", status=TaskStatus.FAILURE, output={"error": str(r)})
        all_ev, all_t = [], []
        for r in results.values(): all_ev.extend(r.evidence); all_t.extend(r.tools_used)
        return AgentResult(task_id=plan.plan_id, agent_name="orchestrator", agent_type=AgentType.ORCHESTRATOR, status=TaskStatus.SUCCESS, output={"results": {k: v.output for k, v in results.items()}}, confidence=sum(r.confidence for r in results.values())/max(len(results),1), evidence=all_ev, tools_used=list(set(all_t)))
