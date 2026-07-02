"""organiser accounts + tenant isolation

Adds the `organisers` table and a nullable `organiser_id` FK on `tournaments`.

Backfill is intentionally omitted: existing rows keep `organiser_id = NULL`,
which means "legacy public submission, admin-managed" — they behave exactly as
before. New drafts created by a logged-in organiser set `organiser_id` from the
JWT, and every organiser-scoped query filters on this column.

Matches the models in app/models/organiser.py and app/models/tournament.py
(verified field-by-field against what `alembic revision --autogenerate` would
emit for these two changes).

Revision ID: f3a1c2b4d5e6
Revises: d9613afa2379
Create Date: 2026-07-02 04:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'f3a1c2b4d5e6'
down_revision: Union[str, Sequence[str], None] = 'd9613afa2379'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'organisers',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('email', sa.String(), nullable=False),
        sa.Column('password_hash', sa.String(), nullable=False),
        sa.Column('display_name', sa.String(), nullable=False),
        sa.Column('contact', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_organisers_email'), 'organisers', ['email'], unique=True)

    op.add_column(
        'tournaments',
        sa.Column('organiser_id', postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_index(
        op.f('ix_tournaments_organiser_id'), 'tournaments', ['organiser_id'], unique=False
    )
    op.create_foreign_key(
        'fk_tournaments_organiser_id_organisers',
        'tournaments', 'organisers',
        ['organiser_id'], ['id'],
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint(
        'fk_tournaments_organiser_id_organisers', 'tournaments', type_='foreignkey'
    )
    op.drop_index(op.f('ix_tournaments_organiser_id'), table_name='tournaments')
    op.drop_column('tournaments', 'organiser_id')
    op.drop_index(op.f('ix_organisers_email'), table_name='organisers')
    op.drop_table('organisers')
