"""add jwt auth fields to users

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-04-28 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c3d4e5f6a7b8'
down_revision: Union[str, None] = 'b2c3d4e5f6a7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('email', sa.String(), nullable=True))
    op.add_column('users', sa.Column('hashed_password', sa.String(), nullable=True))
    op.add_column('users', sa.Column('auth_provider', sa.String(), nullable=False, server_default='local'))
    op.add_column('users', sa.Column('google_id', sa.String(), nullable=True))

    op.create_unique_constraint('uq_users_email', 'users', ['email'])
    op.create_unique_constraint('uq_users_google_id', 'users', ['google_id'])

    # Make firebase_uid nullable (was NOT NULL)
    op.alter_column('users', 'firebase_uid', existing_type=sa.String(), nullable=True)


def downgrade() -> None:
    op.alter_column('users', 'firebase_uid', existing_type=sa.String(), nullable=False)
    op.drop_constraint('uq_users_google_id', 'users', type_='unique')
    op.drop_constraint('uq_users_email', 'users', type_='unique')
    op.drop_column('users', 'google_id')
    op.drop_column('users', 'auth_provider')
    op.drop_column('users', 'hashed_password')
    op.drop_column('users', 'email')
