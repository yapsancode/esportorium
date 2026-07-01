"""baseline: adopt alembic

The `tournaments` table was hand-migrated up to this point via the raw SQL
files in backend/migrations/ (see 0001, 0002). On your existing Supabase DB
this revision is a no-op in practice — `alembic upgrade head` was already run
there and stamped alembic_version at this revision, so it will never
re-execute. It contains the real CREATE TABLE/TYPE DDL (matching
app.models.tournament exactly, verified against a live Postgres instance)
so that a brand-new database — e.g. CI's throwaway Postgres container, or a
fresh local dev DB — can be built from nothing with just `alembic upgrade
head`. Future schema changes go through `alembic revision --autogenerate`
from here on.

Revision ID: d9613afa2379
Revises:
Create Date: 2026-07-02 03:06:40.465143

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'd9613afa2379'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'tournaments',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('game', sa.String(), nullable=True),
        sa.Column('format', sa.Enum('online', 'offline', 'hybrid', name='tournament_format'), nullable=True),
        sa.Column('state', sa.String(), nullable=True),
        sa.Column('venue', sa.String(), nullable=True),
        sa.Column('stage_notes', sa.String(), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('start_date', sa.Date(), nullable=True),
        sa.Column('end_date', sa.Date(), nullable=True),
        sa.Column('registration_deadline', sa.Date(), nullable=True),
        sa.Column('prize_pool_rm', sa.Integer(), nullable=True),
        sa.Column('additional_prizes', postgresql.ARRAY(sa.String()), nullable=True),
        sa.Column('prize_breakdown', sa.JSON(), nullable=True),
        sa.Column('max_teams', sa.Integer(), nullable=True),
        sa.Column('organiser_name', sa.String(), nullable=True),
        sa.Column('organiser_contact', sa.String(), nullable=True),
        sa.Column('organiser_email', sa.String(), nullable=True),
        sa.Column('registration_link', sa.String(), nullable=True),
        sa.Column('banner_image', sa.String(), nullable=True),
        sa.Column('is_approved', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_tournaments_state'), 'tournaments', ['state'], unique=False)
    op.create_index(op.f('ix_tournaments_start_date'), 'tournaments', ['start_date'], unique=False)
    op.create_index(op.f('ix_tournaments_is_approved'), 'tournaments', ['is_approved'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_tournaments_is_approved'), table_name='tournaments')
    op.drop_index(op.f('ix_tournaments_start_date'), table_name='tournaments')
    op.drop_index(op.f('ix_tournaments_state'), table_name='tournaments')
    op.drop_table('tournaments')
    sa.Enum(name='tournament_format').drop(op.get_bind(), checkfirst=True)
