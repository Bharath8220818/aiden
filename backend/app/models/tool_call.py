from sqlalchemy import Column, String, Text, Integer, ForeignKey, JSON, DateTime, Float, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base


class ToolCall(Base):
    """A single tool (connector) invocation made during an AgentRun.

    Provides the audit trail: who asked which agent to call which tool
    with what parameters, and what the outcome was.
    """

    __tablename__ = "tool_calls"

    id = Column(Integer, primary_key=True, index=True)
    agent_run_id = Column(Integer, ForeignKey("agent_runs.id"), nullable=False, index=True)
    tool_name = Column(String(100), nullable=False, index=True)  # airflow, kafka, postgresql...
    action = Column(String(100), nullable=False)  # list_dags, execute_sql, trigger_dag...
    params = Column(JSON, default=dict, nullable=True)  # secrets must never be stored here
    # Success flag + structured result/error payload
    success = Column(Boolean, default=False, nullable=False)
    result = Column(JSON, default=dict, nullable=True)
    error = Column(Text, nullable=True)
    read_only = Column(Boolean, default=True, nullable=False)
    duration_ms = Column(Float, default=0.0, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    agent_run = relationship("AgentRun", back_populates="tool_calls")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "agent_run_id": self.agent_run_id,
            "tool_name": self.tool_name,
            "action": self.action,
            "params": self.params or {},
            "success": self.success,
            "error": self.error,
            "read_only": self.read_only,
            "duration_ms": self.duration_ms,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
