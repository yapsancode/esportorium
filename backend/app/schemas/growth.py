"""Pydantic schemas for the AI Growth Engine (spec: backend/specs/growth-phase-1.md).

Structural validation only — length caps, hashtag counts, and scene-count
limits are the rule engine's job (evaluate step 1), not the schema's.
"""

from typing import Literal

from pydantic import BaseModel, Field

Pillar = Literal["utility", "scene_trend", "relatable", "build_in_public"]
Language = Literal["bm", "manglish", "en"]


class ThreadsPost(BaseModel):
    topic: str          # the angle; populates growth_content_ideas.topic
    pillar: Pillar
    language: Language
    content: str


class TikTokScript(BaseModel):
    topic: str
    pillar: Pillar
    language: Language
    hook: str
    scenes: list[str]   # rule engine enforces <=3; schema stays permissive
    cta: str


class ThreadsBatch(BaseModel):   # spec-mandated name; holds both platforms
    threads: list[ThreadsPost] = Field(min_length=3, max_length=3)
    tiktoks: list[TikTokScript] = Field(min_length=2, max_length=2)


class DraftEvaluation(BaseModel):
    brand_fit: float = Field(ge=0, le=10)
    hook_strength: float = Field(ge=0, le=10)
    grounding: float = Field(ge=0, le=10)
    human_feel: float = Field(ge=0, le=10)
    cta_strength: float = Field(ge=0, le=10)
    language_fit: float = Field(ge=0, le=10)
    verdict: Literal["pass", "fail"]
    reasoning: str


class DraftEvaluationBatch(BaseModel):
    """One DraftEvaluation per surviving draft, in the order they were sent.

    Not named in the spec's schema list, but harness.generate() validates against
    a single schema and the judge is spec'd as ONE call over all surviving drafts.
    DraftEvaluation itself carries no index (spec fixes its fields), so order is
    the mapping — the evaluate node rejects a batch whose length doesn't match
    the number of drafts it sent rather than guessing the alignment.
    """

    evaluations: list[DraftEvaluation]
