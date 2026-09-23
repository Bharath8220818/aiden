"""tasks table — internal team-workflow system

Revision ID: c9d0e1f2a3b4
Revises: b7c8d9e0f1a2
Create Date: 2026-09-17 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c9d0e1f2a3b4'
down_revision: Union[str, None] = 'b7c8d9e0f1a2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('tasks',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('workspace_id', sa.Uuid(), nullable=False),
    sa.Column('project_id', sa.Uuid(), nullable=True),
    sa.Column('title', sa.String(length=255), nullable=False),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('status', sa.Enum('todo', 'in_progress', 'in_review', 'blocked', 'done', name='taskstatus', native_enum=False, length=20), nullable=False),
    sa.Column('priority', sa.Enum('low', 'medium', 'high', 'critical', name='taskpriority', native_enum=False, length=20), nullable=False),
    sa.Column('assignee_id', sa.Uuid(), nullable=True),
    sa.Column('created_by', sa.Uuid(), nullable=True),
    sa.Column('source', sa.String(length=20), nullable=False),
    sa.Column('related_incident_id', sa.Uuid(), nullable=True),
    sa.Column('related_pipeline_id', sa.Uuid(), nullable=True),
    sa.Column('due_date', sa.DateTime(timezone=True), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.ForeignKeyConstraint(['workspace_id'], ['workspaces.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['assignee_id'], ['users.id'], ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['related_incident_id'], ['incidents.id'], ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['related_pipeline_id'], ['pipelines.id'], ondelete='SET NULL'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_tasks_workspace_id'), 'tasks', ['workspace_id'], unique=False)
    op.create_index(op.f('ix_tasks_project_id'), 'tasks', ['project_id'], unique=False)
    op.create_index(op.f('ix_tasks_status'), 'tasks', ['status'], unique=False)
    op.create_index(op.f('ix_tasks_priority'), 'tasks', ['priority'], unique=False)
    op.create_index(op.f('ix_tasks_assignee_id'), 'tasks', ['assignee_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_tasks_assignee_id'), table_name='tasks')
    op.drop_index(op.f('ix_tasks_priority'), table_name='tasks')
    op.drop_index(op.f('ix_tasks_status'), table_name='tasks')
    op.drop_index(op.f('ix_tasks_project_id'), table_name='tasks')
    op.drop_index(op.f('ix_tasks_workspace_id'), table_name='tasks')
    op.drop_table('tasks')
