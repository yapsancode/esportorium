"""LangGraph node functions for the AI Growth Engine.

Spec: backend/specs/growth-phase-1.md §"The workflow". This file holds the
first two nodes only — assemble_context and generate; evaluate / store / the
graph wiring arrive in later prompts.

Each node takes the full GrowthState and returns a partial-state dict (only
the keys it updates), so graph.py can wire them directly.

Hard rule (spec): this file never imports an LLM client/SDK — all model access
goes through harness.generate(). assemble_context makes no LLM call at all.
"""

import json
from pathlib import Path
from typing import Optional

from app.ai_growth import harness, tournament_tool
from app.ai_growth.prompts import GENERATE_V1
from app.ai_growth.state import GrowthState
from app.database import SessionLocal
from app.models.growth import GrowthGeneratedPost
from app.schemas.growth import ThreadsBatch

_CONTEXT_FILES = {
    "brand": "brand.md",
    "audience": "audience.md",
    "rules": "rules.md",
    "voice_examples": "voice_examples.md",
    "trends": "trends.md",
}


# ─── Pure helpers ─────────────────────────────────────────────────────────────

def _serialize_tournaments(items: list[dict]) -> str:
    if not items:
        return "(no active tournaments this run)"
    return json.dumps(items, indent=2, ensure_ascii=False, default=str)


def _serialize_recent_posts(posts: list[str]) -> str:
    if not posts:
        return "(none yet)"
    return "\n".join(f"- {p}" for p in posts)


def _build_retry_feedback(state: GrowthState) -> str:
    """Prompt 6 builds this from state['evaluations'] when the retry edge is
    wired. Empty string on every first-pass generation."""
    return ""


def _batch_to_drafts(batch: ThreadsBatch) -> list[dict]:
    """Flatten a validated ThreadsBatch into plain draft dicts for the state.
    Order preserved: threads first, then tiktoks."""
    drafts: list[dict] = []
    for post in batch.threads:
        drafts.append(
            {
                "platform": "threads",
                "topic": post.topic,
                "pillar": post.pillar,
                "language": post.language,
                "content": post.content,
            }
        )
    for script in batch.tiktoks:
        drafts.append(
            {
                "platform": "tiktok",
                "topic": script.topic,
                "pillar": script.pillar,
                "language": script.language,
                "hook": script.hook,
                "scenes": list(script.scenes),
                "cta": script.cta,
            }
        )
    return drafts


def _recent_published_posts(limit: int = 5) -> list[str]:
    """Content of the last `limit` published growth posts, newest first.
    Opens/closes its own session, like other non-request code. [] on a fresh DB."""
    db = SessionLocal()
    try:
        rows = (
            db.query(GrowthGeneratedPost.content)
            .filter(GrowthGeneratedPost.status == "published")
            .order_by(GrowthGeneratedPost.created_at.desc())
            .limit(limit)
            .all()
        )
        return [content for (content,) in rows]
    finally:
        db.close()


# ─── Nodes ────────────────────────────────────────────────────────────────────

def assemble_context(state: GrowthState, context_dir: Optional[Path] = None) -> dict:
    """Deterministic, no LLM. Loads the 5 context files, the active tournament
    window, and the last 5 published posts ("don't repeat" memory)."""
    if context_dir is None:
        context_dir = Path(__file__).parent / "context"

    knowledge = {
        field: (context_dir / filename).read_text(encoding="utf-8")
        for field, filename in _CONTEXT_FILES.items()
    }

    return {
        **knowledge,
        "tournaments": tournament_tool.get_active_tournaments(days_ahead=30),
        "recent_posts": _recent_published_posts(),
    }


def generate(state: GrowthState) -> dict:
    """One harness.generate() call producing the 3+2 ThreadsBatch. The harness
    owns schema validation and its single retry — no re-validation here."""
    prompt = GENERATE_V1.format(
        brand=state["brand"],
        audience=state["audience"],
        rules=state["rules"],
        voice_examples=state["voice_examples"],
        tournaments=_serialize_tournaments(state["tournaments"]),
        trends=state["trends"],
        recent_posts=_serialize_recent_posts(state["recent_posts"]),
        retry_feedback=_build_retry_feedback(state),
    )

    batch = harness.generate(
        prompt=prompt,
        schema=ThreadsBatch,
        purpose="generate",
        prompt_version="GENERATE_V1",
    )

    return {"drafts": _batch_to_drafts(batch)}
