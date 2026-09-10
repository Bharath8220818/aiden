from sqlalchemy import Column, String, Text, Integer, ForeignKey, JSON, DateTime, Float, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base


class DataQualityResult(Base):
    """Outcome of a data quality rule evaluated against a pipeline or dataset."""

    __tablename__ = "data_quality_results"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True, index=True)
    pipeline_id = Column(Integer, ForeignKey("pipelines.id"), nullable=True, index=True)
    execution_id = Column(Integer, ForeignKey("pipeline_executions.id"), nullable=True, index=True)

    dataset_name = Column(String(255), nullable=True, index=True)
    rule_name = Column(String(255), nullable=False)
    # passed | warning | failed
    status = Column(String(50), default="passed", nullable=False, index=True)
    severity = Column(String(50), default="warning", nullable=False)  # when failed
    # Metric observed vs expected, e.g. {"observed": 0.98, "expected": 0.99}
    metrics = Column(JSON, default=dict, nullable=True)
    details = Column(Text, nullable=True)
    pass_rate = Column(Float, default=1.0, nullable=False)
    evaluated_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    project = relationship("Project", back_populates="quality_results")
    pipeline = relationship("Pipeline")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "project_id": self.project_id,
            "pipeline_id": self.pipeline_id,
            "execution_id": self.execution_id,
            "dataset_name": self.dataset_name,
            "rule_name": self.rule_name,
            "status": self.status,
            "severity": self.severity,
            "metrics": self.metrics or {},
            "details": self.details,
            "pass_rate": self.pass_rate,
            "evaluated_at": self.evaluated_at.isoformat() if self.evaluated_at else None,
        }
