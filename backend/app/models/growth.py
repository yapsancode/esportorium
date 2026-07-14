import uuid
from datetime import datetime

from sqlalchemy import Column, String, Integer, Boolean, DateTime, Enum, Text, ForeignKey, Numeric
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from app.database import Base

# Spec: backend/specs/growth-phase-1.md — all tables growth_ prefixed.
# Enum objects are shared between tables so each Postgres type is created once.
pillar_enum = Enum("utility", "scene_trend", "relatable", "build_in_public", name="growth_pillar")
source_enum = Enum("agent", "human", name="growth_source")
platform_enum = Enum("threads", "tiktok", name="growth_platform")
language_enum = Enum("bm", "manglish", "en", name="growth_language")
post_status_enum = Enum("draft", "approved", "rejected", "published", name="growth_post_status")
llm_purpose_enum = Enum("generate", "evaluate", name="growth_llm_purpose")


class GrowthContentIdea(Base):
    """A content topic the generator (or a human) queued up."""

    __tablename__ = "growth_content_ideas"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    topic = Column(Text, nullable=False)
    pillar = Column(pillar_enum, nullable=False)
    source = Column(source_enum, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    posts = relationship("GrowthGeneratedPost", back_populates="idea")


class GrowthGeneratedPost(Base):
    """One generated draft (Threads post or TikTok script) plus its evaluation."""

    __tablename__ = "growth_generated_posts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    idea_id = Column(UUID(as_uuid=True), ForeignKey("growth_content_ideas.id"), nullable=False, index=True)
    platform = Column(platform_enum, nullable=False)
    content = Column(Text, nullable=False)
    language = Column(language_enum, nullable=False)
    pillar = Column(pillar_enum, nullable=False)
    scores = Column(JSONB, nullable=True)  # judge scores, e.g. {"brand_fit": 8.5, ...}
    evaluation = Column(Text, nullable=True)  # judge reasoning
    retry_count = Column(Integer, nullable=False, default=0)
    status = Column(post_status_enum, nullable=False, default="draft", index=True)
    reject_reason = Column(Text, nullable=True)  # human-written on manual reject
    prompt_version = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, onupdate=datetime.utcnow)

    idea = relationship("GrowthContentIdea", back_populates="posts")
    metrics = relationship("GrowthPerformanceMetric", back_populates="post")


class GrowthPerformanceMetric(Base):
    """A manually recorded performance snapshot for a published post (Phase 1)."""

    __tablename__ = "growth_performance_metrics"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    post_id = Column(UUID(as_uuid=True), ForeignKey("growth_generated_posts.id"), nullable=False, index=True)
    views = Column(Integer, nullable=True)
    likes = Column(Integer, nullable=True)
    replies = Column(Integer, nullable=True)
    shares = Column(Integer, nullable=True)
    clicks = Column(Integer, nullable=True)
    recorded_at = Column(DateTime, default=datetime.utcnow)

    post = relationship("GrowthGeneratedPost", back_populates="metrics")


class GrowthLearning(Base):
    """An observation about what content works. Human-written in Phase 1."""

    __tablename__ = "growth_learnings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    observation = Column(Text, nullable=False)
    source = Column(source_enum, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class GrowthLLMCall(Base):
    """One row per harness.generate() call, including failures — cost/latency audit."""

    __tablename__ = "growth_llm_calls"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    purpose = Column(llm_purpose_enum, nullable=False)
    model = Column(String, nullable=False)
    prompt_version = Column(String, nullable=False)
    input_tokens = Column(Integer, nullable=True)
    output_tokens = Column(Integer, nullable=True)
    est_cost_usd = Column(Numeric(10, 6), nullable=True)
    latency_ms = Column(Integer, nullable=True)
    retries = Column(Integer, nullable=False, default=0)
    success = Column(Boolean, nullable=False)
    error = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
