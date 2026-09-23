"""agent_runs table — persisted orchestrator workflow executions

Revision ID: c3d4e5f6a7b8
Revises: a1f9c3d2e4b5
Create Date: 2026-09-16 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c3d4e5f6a7b8'
down_revision: Union[str, None] = 'a1f9c3d2e4b5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('agent_runs',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('workflow', sa.String(length=64), nullable=False),
    sa.Column('status', sa.Enum('running', 'success', 'failed', 'canceled', name='agentrunstatus', native_enum=False, length=20), nullable=False),
    sa.Column('prompt', sa.Text(), nullable=True),
    sa.Column('current_stage', sa.String(length=64), nullable=True),
    sa.Column('stage_index', sa.Integer(), nullable=False),
    sa.Column('stages', sa.JSON(), nullable=True),
    sa.Column('outputs', sa.JSON(), nullable=True),
    sa.Column('error', sa.Text(), nullable=True),
    sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('finished_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('created_by', sa.Uuid(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='SET NULL'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_agent_runs_workflow'), 'agent_runs', ['workflow'], unique=False)
    op.create_index(op.f('ix_agent_runs_status'), 'agent_runs', ['status'], unique=False)
    op.create_index(op.f('ix_agent_runs_created_by'), 'agent_runs', ['created_by'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_agent_runs_created_by'), table_name='agent_runs')
    op.drop_index(op.f('ix_agent_runs_status'), table_name='agent_runs')
    op.drop_index(op.f('ix_agent_runs_workflow'), table_name='agent_runs')
    op.drop_table('agent_runs')
