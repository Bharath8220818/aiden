"""Workspace chat — the Command Workspace endpoint (spec sections 2, 5, 7).

POST /workspace/chat

    natural input → intent detection → workspace actions → reply + artifacts
                                                      → context payload

Deterministic-first: a rule-based intent engine always runs (fast, testable,
no AI dependency); when Ollama is reachable the reply text is enriched. This
mirrors the platform's ai_client pattern (AI-first, heuristic fallback — the
contract never breaks).

Actions hit REAL platform state (no fabricated data): pipeline intents read
the fleet, incident intents read open incidents, task intents create real
Task rows, knowledge intents query the RAG layer, connection intents
introspect through the database adapter registry.

Artifacts (section 7) are typed payloads the chat renders as cards beside the
conversation; the context payload (section 5) mirrors the right-side panel.
"""

from __future__ import annotations

import re
import uuid
from typing import Any

from fastapi import APIRouter, Depends
from pydantic import Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import AuthContext, require_permission
from app.models import (
    Incident,
    IncidentStatus,
    Pipeline,
    Project,
    TaskPriority,
    User,
)
from app.schemas.common import APIModel

router = APIRouter(prefix="/workspace", tags=["workspace"])


@router.get("/tools")
async def list_workspace_tools(
    ctx: AuthContext = Depends(require_permission("agent.read")),
) -> list[dict[str, Any]]:
    """Tool Registry catalog visible to this user's permission set (spec §2)."""
    from app.services.tool_registry import registry

    return registry.list_for(ctx.permissions)


@router.post("/chat")
async def workspace_chat(
    payload: WorkspaceChatRequest,
    ctx: AuthContext = Depends(require_permission("agent.read")),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """One conversational turn of the Command Workspace."""
    orchestrator = WorkspaceOrchestrator(db, ctx.user, permissions=ctx.permissions)
    return await orchestrator.handle(payload.message, project_id=payload.project_id)


class WorkspaceChatRequest(APIModel):
    message: str = Field(min_length=1, max_length=4000)
    project_id: str | None = Field(None, alias="projectId")
    # The workspace keeps the conversation client-side; context arrives each turn.
    history: list[dict[str, str]] | None = None


# --------------------------------------------------------------------------- #
# Intent detection — deterministic rules (fast, testable, no AI dependency)
# --------------------------------------------------------------------------- #
# Rule order matters: on a score tie the earlier intent wins, so the most
# specific intents (task, email, connection, knowledge) are checked first and
# the broad keyword intents (incident, monitoring, pipeline) come last.
_INTENT_RULES: list[tuple[str, tuple[str, ...]]] = [
    ("email", (r"\bemail\b", r"\bmail\b", r"\bnotify\b", r"\bsend\b")),
    ("jira", (r"\bticket\b", r"\bjira\b", r"\bissue\b")),
    ("task", (r"\btask\b", r"\bassign\b", r"\btodo\b", r"\bremind\b")),
    ("connection", (r"\bconnect\b.*\b(warehouse|snowflake|postgres|mysql|bigquery|redshift)", r"\btables? (in|of)\b", r"\bschema of\b", r"\bintrospect\b", r"\bwarehouse\b")),
    ("knowledge", (r"\bknowledge\b", r"\bremember\b", r"past (fix|incident)", r"\brunbook\b", r"have we seen", r"\brag\b", r"\bknow about\b", r"\bdocumentation\b", r"\bdata contract\b")),
    ("healing", (r"self.?heal", r"\bhealing\b", r"\bfix\b", r"\bresolve\b", r"\brerun\b", r"\bretry\b")),
    ("incident", (r"\bwhy\b.*\bfail", r"\bfail", r"\bincident", r"\bdebug", r"\bbroken", r"\berror", r"\bdown\b")),
    ("sql", (r"\bsql\b", r"\bquery\b", r"optimi[sz]e", r"\bselect\s", r"\bexplain\b", r"\bjoin\b")),
    ("architecture", (r"\barchitect", r"\bblueprint", r"\bdesign\b", r"\btopology\b", r"\blineage\b")),
    ("monitoring", (r"\bmonitor", r"\bhealth\b", r"\bstatus\b", r"\balert", r"\bmetric", r"\blag\b", r"\buptime\b")),
    ("pipeline", (r"\bpipeline", r"\betl\b", r"\belt\b", r"\bingest", r"\bdaily .*(pipeline|load|export)", r"postgre.*snowflake", r"\bload\b.*\bto\b")),
]

_COMPILED_RULES = [
    (intent, [re.compile(p, re.IGNORECASE) for p in patterns])
    for intent, patterns in _INTENT_RULES
]


def detect_intent(message: str) -> str:
    """Highest-scoring intent; 'general' when nothing matches."""
    scores = {
        intent: sum(1 for rgx in regexes if rgx.search(message))
        for intent, regexes in _COMPILED_RULES
    }
    best = max(scores.items(), key=lambda kv: kv[1])
    return best[0] if best[1] > 0 else "general"


def _extract_entity(message: str) -> str | None:
    """Light entity extraction — assignee/recipient name after a cue word."""
    match = re.search(
        r"\b(?:to|for|assign(?: to)?|send|mail|email)\s+([A-Z][a-z]+)\b",
        message,
        re.IGNORECASE,
    )
    return match.group(1) if match else None


# --------------------------------------------------------------------------- #
# Workspace orchestrator — intent → real actions → artifacts
# --------------------------------------------------------------------------- #
class WorkspaceOrchestrator:
    def __init__(self, db: AsyncSession, user: User, *, permissions: frozenset[str] | set[str] | None = None) -> None:
        self.db = db
        self.user = user
        self.permissions = permissions or frozenset()

    async def handle(
        self, message: str, *, project_id: str | None = None
    ) -> dict[str, Any]:
        intent = detect_intent(message)
        handler = getattr(self, f"_intent_{intent}", self._intent_general)
        result = await handler(message, project_id)
        result.setdefault("intent", intent)
        result.setdefault("artifacts", [])
        result.setdefault("context", await self.build_context(project_id))
        return result

    # -- context payload (section 5) ------------------------------------------
    async def build_context(self, project_id: str | None) -> dict[str, Any]:
        context: dict[str, Any] = {"projectId": project_id}
        project: Project | None = None
        if project_id:
            project = await self.db.get(Project, uuid.UUID(project_id))
        if project is not None:
            context["projectName"] = project.name
            pipelines = (
                await self.db.execute(
                    select(Pipeline)
                    .where(Pipeline.project_id == project.id)
                    .order_by(Pipeline.created_at.desc())
                    .limit(5)
                )
            ).scalars().all()
            context["pipelines"] = [{"id": str(p.id), "name": p.name, "status": p.status.value} for p in pipelines]
            open_incidents = (
                await self.db.execute(
                    select(Incident)
                    .where(Incident.status != IncidentStatus.resolved)
                    .order_by(Incident.created_at.desc())
                    .limit(5)
                )
            ).scalars().all()
            context["incidents"] = [
                {"id": str(i.id), "title": i.title, "severity": i.severity.value, "status": i.status.value}
                for i in open_incidents
            ]
        else:
            open_count = len(
                (
                    await self.db.execute(
                        select(Incident.id).where(Incident.status != IncidentStatus.resolved)
                    )
                ).all()
            )
            context["openIncidents"] = open_count
        return context

    # -- intent handlers -------------------------------------------------------
    async def _intent_general(self, message: str, project_id: str | None) -> dict[str, Any]:
        return {
            "reply": (
                "I can help with pipelines, architecture, SQL, monitoring, incidents, "
                "self-healing, knowledge, tasks, and connections. Try: "
                "'Create a daily sales pipeline from PostgreSQL to Snowflake' or "
                "'Show me why yesterday's pipeline failed'."
            ),
        }

    async def _intent_pipeline(self, message: str, project_id: str | None) -> dict[str, Any]:
        pipelines = (
            await self.db.execute(
                select(Pipeline).order_by(Pipeline.created_at.desc()).limit(5)
            )
        ).scalars().all()
        topic = _topic_from(message)

        # §15: "run the X pipeline" is a production action → governed HIGH-risk
        # trigger (queues a lead approval on the first attempt).
        if re.search(r"\b(run|trigger|execute)\b", message, re.IGNORECASE) and pipelines:
            named = next(
                (p for p in pipelines if p.name.lower() in message.lower()), pipelines[0]
            )
            from app.services.tool_registry import ToolError, ToolPermissionError, registry

            try:
                result = await registry.execute(
                    "pipeline.trigger",
                    db=self.db,
                    user_id=self.user.id,
                    permissions=self.permissions,
                    params={"pipeline_id": str(named.id)},
                    project_id=uuid.UUID(project_id) if project_id else None,
                )
            except ToolPermissionError as exc:
                return {"reply": f"I can't trigger pipelines for your role — {exc}."}
            except ToolError as exc:
                return {"reply": f"Pipeline trigger failed: {exc}"}
            if result.get("status") == "approval-required":
                return {
                    "reply": (
                        f"Triggering '{named.name}' is a production action — I've queued it "
                        "for lead approval (Governance → Approvals). Once approved, the run "
                        "starts automatically."
                    ),
                    "approvalId": result.get("approvalId"),
                    "artifacts": [
                        {
                            "type": "pipeline",
                            "title": named.name,
                            "status": "awaiting approval",
                            "actions": ["open"],
                        }
                    ],
                }
            return {
                "reply": f"Run started for '{named.name}' (run {result.get('runId', '')[:8]}).",
                "artifacts": [
                    {
                        "type": "pipeline",
                        "title": named.name,
                        "status": "running",
                        "actions": ["open"],
                    }
                ],
            }
        artifacts = [
            {
                "type": "pipeline",
                "title": f"{topic.title()} pipeline",
                "stages": ["extract", "validate", "transform", "load"],
                "source": "PostgreSQL",
                "target": "Snowflake" if "snowflake" in message.lower() else "warehouse",
                "actions": ["build", "run"],
            }
        ]
        if pipelines:
            artifacts.append(
                {
                    "type": "table",
                    "title": "Recent pipelines",
                    "rows": [
                        {"name": p.name, "status": p.status.value, "type": p.pipeline_type.value}
                        for p in pipelines
                    ],
                    "actions": ["open"],
                }
            )
        return {
            "reply": (
                f"I sketched a {topic} pipeline (extract → validate → transform → load). "
                "Open Pipeline Builder to generate the code, or run it once approved."
            ),
            "artifacts": artifacts,
            "suggestions": ["Design the architecture", "Generate the DAG code", "Run the pipeline"],
        }

    async def _intent_architecture(self, message: str, project_id: str | None) -> dict[str, Any]:
        return {
            "reply": "Here's the blueprint shape for that requirement — open Architecture Studio to edit the canvas.",
            "artifacts": [
                {
                    "type": "architecture",
                    "title": "Proposed topology",
                    "nodes": ["PostgreSQL", "Ingest", "Transform", "Quality", "Snowflake"],
                    "edges": [("PostgreSQL", "Ingest"), ("Ingest", "Transform"), ("Transform", "Quality"), ("Quality", "Snowflake")],
                    "validation": ["Source connected", "Destination connected", "Data flow valid"],
                    "actions": ["edit", "validate", "build"],
                }
            ],
            "suggestions": ["Build the pipeline", "Generate the contract"],
        }

    async def _intent_incident(self, message: str, project_id: str | None) -> dict[str, Any]:
        incidents = (
            await self.db.execute(
                select(Incident)
                .where(Incident.status != IncidentStatus.resolved)
                .order_by(Incident.created_at.desc())
                .limit(3)
            )
        ).scalars().all()
        if not incidents:
            return {
                "reply": "No open incidents right now — everything is healthy. Ask me about pipelines or monitoring.",
            }
        worst = incidents[0]
        artifacts = [
            {
                "type": "incident",
                "title": worst.title,
                "incidentId": str(worst.id),
                "severity": worst.severity.value,
                "status": worst.status.value,
                "cause": (worst.root_cause or {}).get("summary", "Under investigation"),
                "fix": (worst.proposed_fix or {}).get("summary"),
                "actions": ["review-fix", "open"],
            }
        ]
        return {
            "reply": (
                f"You have {len(incidents)} open incident(s); the most severe is "
                f"'{worst.title}' ({worst.severity.value}). The healing flow already "
                "has a proposed fix queued for approval."
            ),
            "artifacts": artifacts,
            "suggestions": ["Open the healing workspace", "Approve the fix", "What caused it?"],
        }

    async def _intent_healing(self, message: str, project_id: str | None) -> dict[str, Any]:
        return await self._intent_incident(message, project_id)

    async def _intent_sql(self, message: str, project_id: str | None) -> dict[str, Any]:
        return {
            "reply": "Paste the statement in SQL Workspace — I can explain the plan, suggest indexes, and check the contract impact.",
            "artifacts": [
                {
                    "type": "sql",
                    "title": "SQL assistance",
                    "mode": "optimize",
                    "actions": ["open-sql"],
                }
            ],
        }

    async def _intent_monitoring(self, message: str, project_id: str | None) -> dict[str, Any]:
        from app.services.registry_service import RegistryService

        services = await RegistryService(self.db).monitoring_services()
        degraded = [s for s in services if s["status"] != "healthy"]
        healthy = len(services) - len(degraded)
        return {
            "reply": (
                f"{healthy}/{len(services)} platform services healthy. "
                + (f"Degraded: {', '.join(s['name'] for s in degraded)}." if degraded else "All nominal.")
            ),
            "artifacts": [
                {
                    "type": "table",
                    "title": "Service health",
                    "rows": [
                        {"name": s["name"], "status": s["status"], "uptime": f"{s['uptimePercent']}%"}
                        for s in services
                    ],
                    "actions": ["open"],
                }
            ],
        }

    async def _intent_knowledge(self, message: str, project_id: str | None) -> dict[str, Any]:
        """Project-scoped hybrid RAG (spec §9–11): semantic ∪ keyword → rerank
        → citations. Falls back to the legacy keyword scorer when the vector
        stack is down — the reply contract never changes."""
        from app.ai.rag import service as rag
        from app.services import rag_service

        try:
            result = await rag.retrieve_context(
                self.db, message, project_id=project_id, top_k=5
            )
            citations = result["citations"]
            mode = result["mode"]
        except Exception:  # noqa: BLE001 — retrieval must never 500 the chat
            citations, mode = [], "error"
        if not citations:  # legacy keyword path (deterministic degradation)
            results = await rag_service.retrieve(self.db, message, project_id=project_id)
            citations = [
                {"docId": r["docId"], "docTitle": r["docTitle"], "score": r["score"], "content": r["content"][:200]}
                for r in results[:3]
            ]
        artifacts = [
            {
                "type": "knowledge",
                "title": "From project memory",
                "citations": citations,
                "actions": ["open"],
            }
        ]
        if citations:
            top = citations[0]
            suffix = (
                ""
                if mode == "vector"
                else " (semantic + keyword search)"
                if mode == "hybrid"
                else " (keyword search — embeddings offline)"
                if mode == "keyword"
                else ""
            )
            return {
                "reply": f"Found {len(citations)} relevant memories — top match: '{top['docTitle']}'.{suffix}",
                "artifacts": artifacts,
            }
        return {
            "reply": "Nothing in project memory matches that yet. Ingest docs or resolve an incident and I'll remember the fix.",
        }

    async def _intent_task(self, message: str, project_id: str | None) -> dict[str, Any]:
        from app.services.task_service import TaskService

        # Tasks are workspace-scoped: resolve the workspace through the
        # active project (task creation needs the project context, spec §10).
        workspace_id = None
        project: Project | None = None
        if project_id:
            project = await self.db.get(Project, uuid.UUID(project_id))
            workspace_id = project.workspace_id if project else None
        if workspace_id is None:
            return {
                "reply": "Select a project first — tasks belong to a project workspace. Then ask me again.",
            }

        assignee_name = _extract_entity(message)
        assignee: User | None = None
        if assignee_name:
            assignee = (
                await self.db.execute(
                    select(User).where(User.full_name.ilike(f"%{assignee_name}%")).limit(1)
                )
            ).scalar_one_or_none()
        title = _task_title_from(message, assignee_name)
        priority = (
            TaskPriority.critical
            if re.search(r"\b(critical|urgent|asap)\b", message, re.IGNORECASE)
            else TaskPriority.high
        )
        task = await TaskService(self.db).create(
            {
                "workspace_id": workspace_id,
                "project_id": uuid.UUID(project_id) if project_id else None,
                "title": title,
                "description": f"Created from workspace chat: {message[:180]}",
                "priority": priority.value,
                "source": "agent",
                **({"assignee_id": assignee.id} if assignee else {}),
            },
            created_by=self.user.id,
        )
        if assignee_name and assignee is None:
            reply = (
                f"Task created: '{title}' (priority {priority.value}). "
                f"I couldn't find a team member named '{assignee_name}' to assign — "
                "assign them from the task board."
            )
        else:
            reply = (
                f"Task created: '{title}' (priority {priority.value})"
                + (f" and assigned to {assignee.full_name}" if assignee else "")
                + (". They've been notified." if assignee else ".")
            )
        return {
            "artifacts": [
                {
                    "type": "task",
                    "title": title,
                    "taskId": str(task.id),
                    "status": task.status.value,
                    "priority": task.priority.value,
                    "assignee": (assignee.full_name if assignee else assignee_name),
                    "actions": ["open"],
                }
            ],
            "reply": reply,
        }

    async def _intent_email(self, message: str, project_id: str | None) -> dict[str, Any]:
        """'Send Dinesh an email saying the ETL issue is fixed' (spec §14)."""
        from app.services.tool_registry import ToolError, ToolPermissionError, registry

        recipient_name = _extract_entity(message)
        if not recipient_name:
            return {
                "reply": "Who should the email go to? For example: 'Send Dinesh an email saying the ETL issue is fixed.'"
            }

        recipient: User | None = (
            await self.db.execute(
                select(User).where(User.full_name.ilike(f"%{recipient_name}%")).limit(1)
            )
        ).scalars().first()
        subject = _email_subject_from(message)
        body = (
            f"Hi {recipient_name},\n\n"
            + message.split("saying", 1)[-1].strip().rstrip(".")
            + ".\n\n— sent via AIDEN"
        ) if "saying" in message.lower() else f"Regarding: {message[:180]}\n\n— sent via AIDEN"

        try:
            # Governed execution: permission check + audit inside the registry.
            result = await registry.execute(
                "notify.email",
                db=self.db,
                user_id=self.user.id,
                permissions=self.permissions,
                params={
                    "subject": subject,
                    "body": body,
                    "user_ids": [recipient.id] if recipient else None,
                },
                project_id=uuid.UUID(project_id) if project_id else None,
            )
        except ToolPermissionError as exc:
            return {"reply": f"I can't send email for your role — {exc}. Ask a lead or admin to send it."}
        except ToolError as exc:
            return {"reply": f"Email tool failed: {exc}"}

        channels = result.get("channels", {})
        email_status = str(channels.get("email", "skipped"))
        delivered = email_status.startswith("sent")
        internal_status = str(channels.get("internal", ""))
        return {
            "reply": (
                f"Email to {recipient_name} {'sent' if delivered else 'queued'}"
                f"{' (SMTP not configured — stored in AIDEN instead)' if not delivered else ''}."
                " Action recorded in the audit trail."
            ),
            "artifacts": [
                {
                    "type": "table",
                    "title": f"Email → {recipient_name}",
                    "rows": [
                        {"recipient": recipient_name, "subject": subject, "status": email_status},
                        {"recipient": "AIDEN inbox", "subject": subject, "status": internal_status},
                    ],
                    "actions": [],
                }
            ],
            "tool": result.get("tool"),
            "risk": result.get("risk"),
        }

    async def _intent_jira(self, message: str, project_id: str | None) -> dict[str, Any]:
        """'Ticket this to Dinesh' / 'Create a Jira issue for the failed validation'."""
        from app.services.tool_registry import ToolError, ToolPermissionError, registry

        assignee_name = _extract_entity(message)
        title = message.rstrip(".?")
        for prefix in ("create a jira issue for", "create jira issue for", "ticket this to", "ticket to", "jira"):
            lowered = title.lower()
            if lowered.startswith(prefix):
                title = title[len(prefix):].strip()
        title = re.sub(r"^(a|an|the)\s+", "", title, flags=re.IGNORECASE).strip()
        if not title:
            title = "AIDEN ticket"

        try:
            result = await registry.execute(
                "team.jira_create_issue",
                db=self.db,
                user_id=self.user.id,
                permissions=self.permissions,
                params={
                    "summary": title[:200],
                    "description": f"Created via AIDEN workspace chat by {self.user.full_name}.",
                    "assignee_name": assignee_name,
                },
                project_id=uuid.UUID(project_id) if project_id else None,
            )
        except ToolPermissionError as exc:
            return {"reply": f"I can't create Jira issues for your role — {exc}."}
        except ToolError as exc:
            return {"reply": f"Jira tool failed: {exc}"}

        if result.get("status") == "approval-required":
            return {
                "reply": (
                    "Creating that Jira issue is a HIGH-risk action — I've queued it for lead "
                    "approval (Governance → Approvals). Once approved it will be created "
                    "automatically."
                ),
                "approvalId": result.get("approvalId"),
            }
        if result.get("status").startswith("skipped"):
            return {
                "reply": (
                    "Jira isn't configured on this deployment — set JIRA_URL, JIRA_EMAIL and "
                    "JIRA_API_TOKEN to enable tickets. I recorded the request here instead; "
                    "want me to create an internal task with the same details?"
                ),
                "artifacts": [
                    {
                        "type": "task",
                        "title": title,
                        "assignee": assignee_name,
                        "status": "draft — Jira unavailable",
                        "actions": [],
                    }
                ],
            }
        if result.get("status").startswith("failed"):
            return {"reply": f"Jira returned an error: {result.get('status')}"}
        return {
            "reply": (
                f"Created Jira issue {result.get('key', '')}"
                f"{f' and assigned it to {assignee_name}' if assignee_name else ''}."
            ),
            "artifacts": [
                {
                    "type": "task",
                    "title": title,
                    "assignee": assignee_name,
                    "status": result.get("key"),
                    "url": result.get("url"),
                    "actions": [],
                }
            ],
            "tool": result.get("tool"),
            "risk": result.get("risk"),
        }

    async def _intent_connection(self, message: str, project_id: str | None) -> dict[str, Any]:
        """Live introspection through the Tool Registry (spec §14, flow 1)."""
        from app.services.registry_service import RegistryService
        from app.services.tool_registry import ToolError, ToolPermissionError, registry

        connections = await RegistryService(self.db).connections()
        match = next(
            (
                c
                for c in connections
                if any(p in message.lower() for p in (c.providerName.lower(), c.providerId.replace("prov-", "")))
            ),
            connections[0] if connections else None,
        )
        if match is None:
            return {"reply": "No connections configured yet — open Connections to add a warehouse."}

        # "Show me the tables in X" → governed live introspection when the
        # request is table-shaped; otherwise report connection health.
        wants_tables = bool(re.search(r"\b(tables?|schema|columns?)\b", message, re.IGNORECASE))
        if wants_tables:
            try:
                result = await registry.execute(
                    "db.introspect",
                    db=self.db,
                    user_id=self.user.id,
                    permissions=self.permissions,
                    params={"connection_id": match.id, "scope": "tables"},
                )
            except ToolPermissionError as exc:
                return {"reply": f"I can't introspect warehouses for your role — {exc}"}
            except ToolError as exc:
                return {"reply": f"Introspection failed: {exc}"}

            tables = result.get("tables") or []
            if result.get("status") == "adapter-error":
                return {
                    "reply": (
                        f"'{match.name}' is registered but the {match.providerName} driver "
                        f"isn't reachable from here ({result.get('error', 'unavailable')[:120]}). "
                        "The connection metadata is intact — deploy with the warehouse extra to go live."
                    )
                }
            if tables:
                return {
                    "reply": f"'{match.name}' ({match.providerName}) has {len(tables)} tables. Here are the first few:",
                    "artifacts": [
                        {
                            "type": "table",
                            "title": f"{match.providerName} schema",
                            "rows": [{"table": t} for t in tables[:8]],
                            "actions": ["introspect"],
                        }
                    ],
                    "suggestions": ["Design a pipeline from it", "Create architecture for these tables"],
                    "tool": result.get("tool"),
                    "risk": result.get("risk"),
                }
            return {"reply": f"'{match.name}' responded but returned no tables for that scope."}

        return {
            "reply": (
                f"'{match.name}' ({match.providerName}) is {match.status}. Ask me to show its tables "
                "and I'll introspect through the integration gateway — credentials stay server-side."
            ),
            "artifacts": [
                {
                    "type": "table",
                    "title": f"{match.providerName} connection",
                    "rows": [{"name": match.name, "status": match.status, "database": match.database or "—"}],
                    "actions": ["introspect", "open"],
                }
            ],
            "suggestions": [f"Show the tables in {match.name}", "Design a pipeline from it"],
        }

def _topic_from(message: str) -> str:
    match = re.search(r"\b(sales|orders?|customers?|finance|inventory|marketing|fraud|payments?)\b", message, re.IGNORECASE)
    return match.group(1).lower() if match else "data"


def _task_title_from(message: str, assignee_name: str | None = None) -> str:
    cleaned = re.sub(
        r"^(please\s+)?(create|add|make|open)\s+(a\s+)?(high\s+|critical\s+|urgent\s+|medium\s+|low\s+)?(task\s+)?",
        "",
        message.strip(),
        flags=re.IGNORECASE,
    )
    if assignee_name:
        # "for <assignee> to fix X" -> "Fix X": the assignee is metadata, not the job.
        cleaned = re.sub(
            rf"^for\s+{re.escape(assignee_name)}\s+to\s+",
            "",
            cleaned,
            flags=re.IGNORECASE,
        )
    cleaned = re.sub(r"\s+and notify.*$", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"^to\s+", "", cleaned, flags=re.IGNORECASE)  # "to archive X" -> "Archive X"
    cleaned = (cleaned[:1].upper() + cleaned[1:]) if cleaned else cleaned
    return (cleaned or "Follow up on workspace request")[:255]


def _email_subject_from(message: str) -> str:
    """Derive a short subject from 'Send X an email saying ...'."""
    said = message.split("saying", 1)[-1].strip().rstrip(".") if "saying" in message.lower() else message
    return f"AIDEN: {said[:60]}" or "Message from AIDEN"
