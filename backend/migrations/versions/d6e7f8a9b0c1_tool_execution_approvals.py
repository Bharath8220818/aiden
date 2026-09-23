"""tool_execution approval type + tool_execution_id link

Revision ID: d6e7f8a9b0c1
Revises: c9d0e1f2a3b4
Create Date: 2026-09-22 12:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'd6e7f8a9b0c1'
down_revision: Union[str, None] = 'c9d0e1f2a3b4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'approvals',
        sa.Column('tool_execution_id', sa.Uuid(), nullable=True),
    )
    op.add_column(
        'approvals',
        sa.Column('payload', sa.JSON(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column('approvals', 'payload')
    op.drop_column('approvals', 'tool_execution_id')
