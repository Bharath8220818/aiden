"""pipeline_nodes, knowledge_documents, knowledge_chunks, mcp_integrations, notifications

Phase 2 schema completion — the remaining work-order entities. Chains on top
of c3d4e5f6a7b8 (agent_runs). Conventions match the existing domain schema:
UUID PKs, native_enum=False string enums, timezone-aware timestamps with
server defaults, CASCADE from parents, SET NULL for soft references.

Revision ID: e5f6a7b8c9d0
Revises: c3d4e5f6a7b8
Create Date: 2026-09-16 11:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e5f6a7b8c9d0'
down_revision: Union[str, None] = 'c3d4e5f6a7b8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ------------------------------------------------------------------ #
    # pipeline_nodes — Pipeline Builder graph (pipelines → nodes)
    # ------------------------------------------------------------------ #
    op.create_table('pipeline_nodes',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('pipeline_id', sa.Uuid(), nullable=False),
    sa.Column('node_key', sa.String(length=64), nullable=False),
    sa.Column('name', sa.String(length=255), nullable=False),
    sa.Column('kind', sa.Enum('source', 'transform', 'validate', 'load', 'notification', name='nodekind', native_enum=False, length=20), nullable=False),
    sa.Column('technology', sa.String(length=64), nullable=True),
    sa.Column('config', sa.JSON(), nullable=True),
    sa.Column('position_x', sa.Float(), nullable=False),
    sa.Column('position_y', sa.Float(), nullable=False),
    sa.Column('order_index', sa.Integer(), nullable=True),
    sa.Column('notes', sa.Text(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.ForeignKeyConstraint(['pipeline_id'], ['pipelines.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('pipeline_id', 'node_key', name='uq_pipeline_nodes_pipeline_key')
    )
    op.create_index(op.f('ix_pipeline_nodes_pipeline_id'), 'pipeline_nodes', ['pipeline_id'], unique=False)

    # ------------------------------------------------------------------ #
    # knowledge_documents — RAG corpus (logical sources)
    # ------------------------------------------------------------------ #
    op.create_table('knowledge_documents',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('project_id', sa.Uuid(), nullable=True),
    sa.Column('source_key', sa.String(length=128), nullable=False),
    sa.Column('title', sa.String(length=255), nullable=False),
    sa.Column('kind', sa.Enum('data_contract', 'schema_doc', 'runbook', 'postmortem', 'incident_fix', 'metric_definition', 'lineage_snapshot', 'incident_pattern', name='dockind', native_enum=False, length=32), nullable=False),
    sa.Column('origin', sa.String(length=64), nullable=True),
    sa.Column('content', sa.Text(), nullable=True),
    sa.Column('tags', sa.JSON(), nullable=True),
    sa.Column('embedding_model', sa.String(length=64), nullable=True),
    sa.Column('chunk_count', sa.Integer(), nullable=False),
    sa.Column('retrieval_count', sa.Integer(), nullable=False),
    sa.Column('last_retrieved_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('ingested_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('source_key')
    )
    op.create_index(op.f('ix_knowledge_documents_project_id'), 'knowledge_documents', ['project_id'], unique=False)
    op.create_index(op.f('ix_knowledge_documents_kind'), 'knowledge_documents', ['kind'], unique=False)

    # ------------------------------------------------------------------ #
    # knowledge_chunks — embedded pieces (documents → chunks)
    # ------------------------------------------------------------------ #
    op.create_table('knowledge_chunks',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('document_id', sa.Uuid(), nullable=False),
    sa.Column('chunk_index', sa.Integer(), nullable=False),
    sa.Column('content', sa.Text(), nullable=False),
    sa.Column('token_count', sa.Integer(), nullable=True),
    sa.Column('vector_id', sa.String(length=64), nullable=True),
    sa.Column('embedding_model', sa.String(length=64), nullable=True),
    sa.Column('metadata_json', sa.JSON(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.ForeignKeyConstraint(['document_id'], ['knowledge_documents.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_knowledge_chunks_document_id'), 'knowledge_chunks', ['document_id'], unique=False)
    op.create_index('ix_knowledge_chunks_doc_index', 'knowledge_chunks', ['document_id', 'chunk_index'], unique=True)

    # ------------------------------------------------------------------ #
    # mcp_integrations — registered MCP servers
    # ------------------------------------------------------------------ #
    op.create_table('mcp_integrations',
    sa.Column('id', sa.String(length=64), nullable=False),
    sa.Column('name', sa.String(length=255), nullable=False),
    sa.Column('transport', sa.Enum('http', 'sse', 'stdio', name='mcptransport', native_enum=False, length=10), nullable=False),
    sa.Column('endpoint', sa.String(length=512), nullable=False),
    sa.Column('auth_mode', sa.String(length=64), nullable=False),
    sa.Column('status', sa.Enum('connected', 'disconnected', 'degraded', name='mcpstatus', native_enum=False, length=20), nullable=False),
    sa.Column('purpose', sa.String(length=512), nullable=True),
    sa.Column('tools_allowed_for', sa.JSON(), nullable=True),
    sa.Column('tools', sa.JSON(), nullable=True),
    sa.Column('last_sync_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_mcp_integrations_status'), 'mcp_integrations', ['status'], unique=False)

    # ------------------------------------------------------------------ #
    # notifications — persisted notification drawer rows
    # ------------------------------------------------------------------ #
    op.create_table('notifications',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('user_id', sa.Uuid(), nullable=True),
    sa.Column('type', sa.Enum('info', 'success', 'warning', 'error', name='notificationtype', native_enum=False, length=10), nullable=False),
    sa.Column('title', sa.String(length=255), nullable=False),
    sa.Column('message', sa.Text(), nullable=False),
    sa.Column('link', sa.String(length=512), nullable=True),
    sa.Column('read_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_notifications_user_id'), 'notifications', ['user_id'], unique=False)
    op.create_index('ix_notifications_user_created', 'notifications', ['user_id', 'created_at'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_notifications_user_created', table_name='notifications')
    op.drop_index(op.f('ix_notifications_user_id'), table_name='notifications')
    op.drop_table('notifications')

    op.drop_index(op.f('ix_mcp_integrations_status'), table_name='mcp_integrations')
    op.drop_table('mcp_integrations')

    op.drop_index('ix_knowledge_chunks_doc_index', table_name='knowledge_chunks')
    op.drop_index(op.f('ix_knowledge_chunks_document_id'), table_name='knowledge_chunks')
    op.drop_table('knowledge_chunks')

    op.drop_index(op.f('ix_knowledge_documents_kind'), table_name='knowledge_documents')
    op.drop_index(op.f('ix_knowledge_documents_project_id'), table_name='knowledge_documents')
    op.drop_table('knowledge_documents')

    op.drop_index(op.f('ix_pipeline_nodes_pipeline_id'), table_name='pipeline_nodes')
    op.drop_table('pipeline_nodes')
