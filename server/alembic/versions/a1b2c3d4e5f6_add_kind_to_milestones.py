"""add kind to milestones

Revision ID: a1b2c3d4e5f6
Revises: 499f96d0f469
Create Date: 2026-04-21 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '499f96d0f469'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('milestones', sa.Column('kind', sa.String(), nullable=False, server_default='milestone'))


def downgrade() -> None:
    op.drop_column('milestones', 'kind')
