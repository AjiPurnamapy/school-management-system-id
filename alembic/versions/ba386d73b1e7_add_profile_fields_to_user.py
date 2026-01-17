"""add profile fields to user

Revision ID: ba386d73b1e7
Revises: 5a9adcc10f69
Create Date: 2026-01-17 10:47:27.294587

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ba386d73b1e7'
down_revision: Union[str, Sequence[str], None] = '5a9adcc10f69'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema - add profile fields to user table only."""
    
    # ONLY add the new profile columns using batch mode for SQLite
    with op.batch_alter_table('user', schema=None) as batch_op:
        batch_op.add_column(sa.Column('nis', sa.String(length=20), nullable=True))
        batch_op.add_column(sa.Column('address', sa.String(length=500), nullable=True))
        batch_op.add_column(sa.Column('phone', sa.String(length=20), nullable=True))
        batch_op.add_column(sa.Column('birth_date', sa.String(length=10), nullable=True))
        batch_op.add_column(sa.Column('is_profile_complete', sa.Boolean(), nullable=False, server_default='0'))


def downgrade() -> None:
    """Downgrade schema - remove profile fields from user table."""
    
    with op.batch_alter_table('user', schema=None) as batch_op:
        batch_op.drop_column('is_profile_complete')
        batch_op.drop_column('birth_date')
        batch_op.drop_column('phone')
        batch_op.drop_column('address')
        batch_op.drop_column('nis')
