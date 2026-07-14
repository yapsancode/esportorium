"""growth engine tables

Revision ID: c22f8c927ff4
Revises: f3a1c2b4d5e6
Create Date: 2026-07-14 13:20:43.647733

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'c22f8c927ff4'
down_revision: Union[str, Sequence[str], None] = 'f3a1c2b4d5e6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# growth_pillar and growth_source are shared by two tables each, so the types
# are created explicitly once here (create_type=False on the columns) instead
# of letting each op.create_table emit its own CREATE TYPE and collide.
growth_pillar = postgresql.ENUM('utility', 'scene_trend', 'relatable', 'build_in_public', name='growth_pillar', create_type=False)
growth_source = postgresql.ENUM('agent', 'human', name='growth_source', create_type=False)
growth_platform = postgresql.ENUM('threads', 'tiktok', name='growth_platform', create_type=False)
growth_language = postgresql.ENUM('bm', 'manglish', 'en', name='growth_language', create_type=False)
growth_post_status = postgresql.ENUM('draft', 'approved', 'rejected', 'published', name='growth_post_status', create_type=False)
growth_llm_purpose = postgresql.ENUM('generate', 'evaluate', name='growth_llm_purpose', create_type=False)

_ENUMS = (growth_pillar, growth_source, growth_platform, growth_language, growth_post_status, growth_llm_purpose)


def upgrade() -> None:
    """Upgrade schema."""
    bind = op.get_bind()
    for enum_type in _ENUMS:
        enum_type.create(bind, checkfirst=True)

    op.create_table('growth_content_ideas',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('topic', sa.Text(), nullable=False),
    sa.Column('pillar', growth_pillar, nullable=False),
    sa.Column('source', growth_source, nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('growth_learnings',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('observation', sa.Text(), nullable=False),
    sa.Column('source', growth_source, nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('growth_llm_calls',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('purpose', growth_llm_purpose, nullable=False),
    sa.Column('model', sa.String(), nullable=False),
    sa.Column('prompt_version', sa.String(), nullable=False),
    sa.Column('input_tokens', sa.Integer(), nullable=True),
    sa.Column('output_tokens', sa.Integer(), nullable=True),
    sa.Column('est_cost_usd', sa.Numeric(precision=10, scale=6), nullable=True),
    sa.Column('latency_ms', sa.Integer(), nullable=True),
    sa.Column('retries', sa.Integer(), nullable=False),
    sa.Column('success', sa.Boolean(), nullable=False),
    sa.Column('error', sa.Text(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('growth_generated_posts',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('idea_id', sa.UUID(), nullable=False),
    sa.Column('platform', growth_platform, nullable=False),
    sa.Column('content', sa.Text(), nullable=False),
    sa.Column('language', growth_language, nullable=False),
    sa.Column('pillar', growth_pillar, nullable=False),
    sa.Column('scores', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    sa.Column('evaluation', sa.Text(), nullable=True),
    sa.Column('retry_count', sa.Integer(), nullable=False),
    sa.Column('status', growth_post_status, nullable=False),
    sa.Column('reject_reason', sa.Text(), nullable=True),
    sa.Column('prompt_version', sa.String(), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.Column('updated_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['idea_id'], ['growth_content_ideas.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_growth_generated_posts_idea_id'), 'growth_generated_posts', ['idea_id'], unique=False)
    op.create_index(op.f('ix_growth_generated_posts_status'), 'growth_generated_posts', ['status'], unique=False)
    op.create_table('growth_performance_metrics',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('post_id', sa.UUID(), nullable=False),
    sa.Column('views', sa.Integer(), nullable=True),
    sa.Column('likes', sa.Integer(), nullable=True),
    sa.Column('replies', sa.Integer(), nullable=True),
    sa.Column('shares', sa.Integer(), nullable=True),
    sa.Column('clicks', sa.Integer(), nullable=True),
    sa.Column('recorded_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['post_id'], ['growth_generated_posts.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_growth_performance_metrics_post_id'), 'growth_performance_metrics', ['post_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_growth_performance_metrics_post_id'), table_name='growth_performance_metrics')
    op.drop_table('growth_performance_metrics')
    op.drop_index(op.f('ix_growth_generated_posts_status'), table_name='growth_generated_posts')
    op.drop_index(op.f('ix_growth_generated_posts_idea_id'), table_name='growth_generated_posts')
    op.drop_table('growth_generated_posts')
    op.drop_table('growth_llm_calls')
    op.drop_table('growth_learnings')
    op.drop_table('growth_content_ideas')

    bind = op.get_bind()
    for enum_type in _ENUMS:
        enum_type.drop(bind, checkfirst=True)
