"""GrowthState — the LangGraph state for the AI Growth Engine.

Matches the spec block verbatim (backend/specs/growth-phase-1.md §"The
workflow"). Knowledge files are kept as four separate fields so the judge
can be handed a subset (rules + voice_examples only) — never the whole
generation context.
"""

from typing import TypedDict


class GrowthState(TypedDict):
    # knowledge (static files) — kept separate so the judge can be handed a subset
    brand: str                # brand.md
    audience: str             # audience.md
    rules: str                # rules.md
    voice_examples: str       # voice_examples.md
    # live
    trends: str               # trends.md
    tournaments: list[dict]   # tournament_tool
    # memory
    recent_posts: list[str]   # last 5 published — "don't repeat"
    # pipeline
    drafts: list[dict]
    evaluations: list[dict]
    retry_count: int
    final_posts: list[dict]
    run_summary: str
