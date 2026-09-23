"""connection_registry table + governance surface (Phase F)

Revision ID: a1f9c3d2e4b5
Revises: 4864c74780d6
Create Date: 2026-09-13 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1f9c3d2e4b5'
down_revision: Union[str, None] = '4864c74780d6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('connection_registry',
    sa.Column('id', sa.String(length=64), nullable=False),
    sa.Column('name', sa.String(length=255), nullable=False),
    sa.Column('provider_id', sa.String(length=64), nullable=False),
    sa.Column('category', sa.Enum('warehouse', 'database', 'streaming', 'compute', 'cloud', name='connectioncategory', native_enum=False, length=20), nullable=False),
    sa.Column('environment', sa.String(length=20), nullable=False),
    sa.Column('host', sa.String(length=255), nullable=False),
    sa.Column('port', sa.Integer(), nullable=True),
    sa.Column('database', sa.String(length=255), nullable=True),
    sa.Column('auth_type', sa.String(length=30), nullable=False),
    sa.Column('credentials', sa.JSON(), nullable=True),
    sa.Column('ssl_enabled', sa.Boolean(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_connection_registry_provider_id'), 'connection_registry', ['provider_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_connection_registry_provider_id'), table_name='connection_registry')
    op.drop_table('connection_registry')
