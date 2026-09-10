from sqlalchemy import Column, String, Text, Integer, ForeignKey, JSON, DateTime, Float
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base


class AgentRun(Base):
    """A persisted record of an agent (or orchestrator) execution.

    The orchestrator broadcasts runs via WebSocket in real time; this table
    provides the durable history so runs survive restarts and can be audited.
    """

    __tablename__ = "agent_runs"

    id = Column(Integer, primary_key=True, index=True)
    # Public run identifier, e.g. run_a1b2c3d4
    run_id = Column(String(64), unique=True, nullable=False, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)

    agent_name = Column(String(100), nullable=False, index=True)  # orchestrator, sql_agent, debug_agent...
    objective = Column(Text, nullable=False)
    intent = Column(String(100), nullable=True)
    status = Column(String(50), default="running", nullable=False, index=True)  # running | success | failure | partial

    # Full structured payload: plan, steps, results
    result = Column(JSON, default=dict, nullable=True)
    agents_used = Column(JSON, default=list, nullable=True)
    tools_used = Column(JSON, default=list, nullable=True)
    confidence = Column(Float, default=0.0, nullable=False)
    execution_time_ms = Column(Float, default=0.0, nullable=False)
    # LLM usage tracking for cost dashboards
    tokens_used = Column(Integer, default=0, nullable=False)
    source = Column(String(50), default="api", nullable=True)  # api | websocket | cli

    started_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    project = relationship("Project", back_populates="agent_runs")
    user = relationship("User")
    tool_calls = relationship("ToolCall", back_populates="agent_run", cascade="all, delete-orphan")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "run_id": self.run_id,
            "project_id": self.project_id,
            "user_id": self.user_id,
            "agent_name": self.agent_name,
            "objective": self.objective,
            "intent": self.intent,
            "status": self.status,
            "result": self.result or {},
            "agents_used": self.agents_used or [],
            "tools_used": self.tools_used or [],
            "confidence": self.confidence,
            "execution_time_ms": self.execution_time_ms,
            "tokens_used": self.tokens_used,
            "source": self.source,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
        }
