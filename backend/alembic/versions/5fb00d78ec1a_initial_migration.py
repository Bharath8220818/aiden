"""Initial migration

Revision ID: 5fb00d78ec1a
Revises: 
Create Date: 2026-07-18 18:07:48.045189

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5fb00d78ec1a'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create all tables from scratch for the initial migration."""
    # --- users table ---
    op.create_table('users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('username', sa.String(length=50), nullable=False),
        sa.Column('email', sa.String(length=100), nullable=False),
        sa.Column('full_name', sa.String(length=100), nullable=False),
        sa.Column('hashed_password', sa.String(length=255), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('is_superuser', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_users_id'), 'users', ['id'], unique=False)
    op.create_index(op.f('ix_users_username'), 'users', ['username'], unique=True)
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)

    # --- pipelines table ---
    op.create_table('pipelines',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('status', sa.Enum('DRAFT', 'PENDING', 'RUNNING', 'SUCCESS', 'FAILED', 'PAUSED', name='pipelinestatus'), nullable=True),
        sa.Column('schedule', sa.String(length=100), nullable=True),
        sa.Column('config', sa.JSON(), nullable=True),
        sa.Column('source_type', sa.String(length=50), nullable=False),
        sa.Column('destination_type', sa.String(length=50), nullable=False),
        sa.Column('created_by', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('last_run_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('code', sa.Text(), nullable=True),
        sa.Column('dbt_code', sa.Text(), nullable=True),
        sa.Column('tests', sa.JSON(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_pipelines_id'), 'pipelines', ['id'], unique=False)
    op.create_index(op.f('ix_pipelines_name'), 'pipelines', ['name'], unique=False)
    op.create_index(op.f('ix_pipelines_is_active'), 'pipelines', ['is_active'], unique=False)
    op.create_index(op.f('ix_pipelines_user_id'), 'pipelines', ['user_id'], unique=False)

    # --- pipeline_executions table ---
    op.create_table('pipeline_executions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('pipeline_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('status', sa.Enum('PENDING', 'RUNNING', 'SUCCESS', 'FAILED', 'CANCELLED', name='executionstatus'), nullable=True),
        sa.Column('triggered_by', sa.String(length=50), nullable=True),
        sa.Column('started_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('duration_seconds', sa.Integer(), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('logs', sa.JSON(), nullable=True),
        sa.Column('records_processed', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['pipeline_id'], ['pipelines.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_pipeline_executions_id'), 'pipeline_executions', ['id'], unique=False)
    op.create_index(op.f('ix_pipeline_executions_pipeline_id'), 'pipeline_executions', ['pipeline_id'], unique=False)
    op.create_index(op.f('ix_pipeline_executions_user_id'), 'pipeline_executions', ['user_id'], unique=False)


def downgrade() -> None:
    """Drop all tables."""
    op.drop_table('pipeline_executions')
    op.drop_table('pipelines')
    # Drop enum types for SQLite (no-op, clean up if using PostgreSQL)
    op.execute('DROP TABLE IF EXISTS alembic_versions')
    op.drop_table('users')
