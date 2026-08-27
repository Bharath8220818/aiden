import asyncio, logging
from typing import List, Any, Awaitable
logger = logging.getLogger(__name__)
async def run_parallel(tasks, labels=None):
    if labels is None: labels = ["task_"+str(i) for i in range(len(tasks))]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    output = []
    for label, result in zip(labels, results):
        if isinstance(result, Exception):
            output.append({"label": label, "success": False, "error": str(result)})
        else:
            output.append({"label": label, "success": True, "result": result})
    return output
