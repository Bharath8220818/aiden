import logging
from typing import Dict, Any
logger = logging.getLogger(__name__)
INTENT_KEYWORDS = {"pipeline_status": ["status","list","show","pipeline","dag"], "sql_query": ["table","schema","sql","query"], "investigation": ["slow","fail","error","debug","why"], "pipeline_create": ["create","build","generate","pipeline"], "architecture_create": ["create","architecture","diagram"]}
INTENT_AGENTS = {"pipeline_status": ["monitoring"], "sql_query": ["sql"], "investigation": ["monitoring","debug"], "pipeline_create": ["pipeline"], "architecture_create": ["architecture"]}
def classify_and_route(request):
    lower = request.lower()
    scores = {i: sum(1 for kw in kw_list if kw in lower) for i, kw_list in INTENT_KEYWORDS.items()}
    scores = {k:v for k,v in scores.items() if v > 0}
    if not scores: return {"type": "complex", "agents": ["monitoring","sql","debug"]}
    best = max(scores, key=scores.get)
    return {"type": best, "agents": INTENT_AGENTS.get(best, ["monitoring"])}
