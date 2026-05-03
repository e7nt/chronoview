"""add timeline collaborators

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2026-04-28 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


# revision identifiers, used by Alembic.
revision: str = 'd4e5f6a7b8c9'
down_revision: Union[str, None] = 'c3d4e5f6a7b8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'timeline_collaborators',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('timeline_id', UUID(as_uuid=True), sa.ForeignKey('timelines.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=True),
        sa.Column('email', sa.String(), nullable=False),
        sa.Column('role', sa.String(), nullable=False, server_default='viewer'),
        sa.Column('invited_by', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_unique_constraint('uq_collab_timeline_email', 'timeline_collaborators', ['timeline_id', 'email'])
    op.create_index('ix_collab_email', 'timeline_collaborators', ['email'])
    op.create_index('ix_collab_user_id', 'timeline_collaborators', ['user_id'])


def downgrade() -> None:
    op.drop_index('ix_collab_user_id', 'timeline_collaborators')
    op.drop_index('ix_collab_email', 'timeline_collaborators')
    op.drop_constraint('uq_collab_timeline_email', 'timeline_collaborators', type_='unique')
    op.drop_table('timeline_collaborators')
