"""agent_stage_runs, schema_snapshots, agent_runs.project_id

Integration milestone: per-stage orchestrator persistence (agent_stage_runs),
schema snapshots for drift detection (schema_snapshots), and project context
on agent runs (agent_runs.project_id — the RAG scoping boundary, spec §4).

Revision ID: b7c8d9e0f1a2
Revises: e5f6a7b8c9d0
Create Date: 2026-09-17 09:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b7c8d9e0f1a2'
down_revision: Union[str, None] = 'e5f6a7b8c9d0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ------------------------------------------------------------------ #
    # agent_runs.project_id — project context for orchestrated runs
    # ------------------------------------------------------------------ #
    op.add_column(
        'agent_runs',
        sa.Column('project_id', sa.Uuid(), nullable=True),
    )
    op.create_index(
        op.f('ix_agent_runs_project_id'), 'agent_runs', ['project_id'], unique=False
    )
    # Batch mode: works identically on PostgreSQL and the SQLite test harness.
    with op.batch_alter_table('agent_runs') as batch_op:
        batch_op.create_foreign_key(
            'fk_agent_runs_project_id_projects',
            'projects',
            ['project_id'],
            ['id'],
            ondelete='SET NULL',
        )

    # ------------------------------------------------------------------ #
    # agent_stage_runs — per-stage execution rows
    # ------------------------------------------------------------------ #
    op.create_table('agent_stage_runs',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('run_id', sa.Uuid(), nullable=False),
    sa.Column('stage_no', sa.Integer(), nullable=False),
    sa.Column('stage_id', sa.String(length=64), nullable=False),
    sa.Column('label', sa.String(length=255), nullable=True),
    sa.Column('agent', sa.String(length=64), nullable=True),
    sa.Column('status', sa.Enum('pending', 'running', 'done', 'failed', 'skipped', name='stagestatus', native_enum=False, length=20), nullable=False),
    sa.Column('input', sa.JSON(), nullable=True),
    sa.Column('output', sa.JSON(), nullable=True),
    sa.Column('error', sa.Text(), nullable=True),
    sa.Column('duration_ms', sa.Integer(), nullable=True),
    sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('finished_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.ForeignKeyConstraint(['run_id'], ['agent_runs.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_agent_stage_runs_run_id'), 'agent_stage_runs', ['run_id'], unique=False)
    op.create_index(op.f('ix_agent_stage_runs_status'), 'agent_stage_runs', ['status'], unique=False)
    op.create_index(
        'ix_agent_stage_runs_run_no', 'agent_stage_runs', ['run_id', 'stage_no'], unique=True
    )

    # ------------------------------------------------------------------ #
    # schema_snapshots — profiler output for drift detection
    # ------------------------------------------------------------------ #
    op.create_table('schema_snapshots',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('pipeline_id', sa.Uuid(), nullable=False),
    sa.Column('table_name', sa.String(length=255), nullable=False),
    sa.Column('columns', sa.JSON(), nullable=True),
    sa.Column('row_count', sa.Integer(), nullable=True),
    sa.Column('schema_hash', sa.String(length=64), nullable=False),
    sa.Column('columns_changed', sa.Integer(), nullable=False),
    sa.Column('change_summary', sa.Text(), nullable=True),
    sa.Column('captured_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.ForeignKeyConstraint(['pipeline_id'], ['pipelines.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_schema_snapshots_pipeline_id'), 'schema_snapshots', ['pipeline_id'], unique=False)
    op.create_index(op.f('ix_schema_snapshots_table_name'), 'schema_snapshots', ['table_name'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_schema_snapshots_table_name'), table_name='schema_snapshots')
    op.drop_index(op.f('ix_schema_snapshots_pipeline_id'), table_name='schema_snapshots')
    op.drop_table('schema_snapshots')
    op.drop_index('ix_agent_stage_runs_run_no', table_name='agent_stage_runs')
    op.drop_index(op.f('ix_agent_stage_runs_status'), table_name='agent_stage_runs')
    op.drop_index(op.f('ix_agent_stage_runs_run_id'), table_name='agent_stage_runs')
    op.drop_table('agent_stage_runs')
    with op.batch_alter_table('agent_runs') as batch_op:
        batch_op.drop_constraint('fk_agent_runs_project_id_projects', type_='foreignkey')
    op.drop_index(op.f('ix_agent_runs_project_id'), table_name='agent_runs')
    op.drop_column('agent_runs', 'project_id')
