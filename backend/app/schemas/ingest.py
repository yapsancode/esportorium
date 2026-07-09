"""Schemas for the agentic ingest pipeline.

ExtractionResult: the schema the vision model must conform to. Each field
carries its raw extracted value (always a string — the model doesn't type-
convert; guardrails do that downstream) and a found flag. The model is
instructed to return found=False and value=null when a field isn't stated —
never to guess.

DraftTournament + IngestDraftOut: what the API returns to the organiser.
Null fields in the draft are also listed in flagged_fields, telling the UI
which inputs to highlight for human completion. The organiser fills those in
and submits via POST /api/organiser/tournaments, which enters the normal
admin approval queue.
"""
from datetime import date
from typing import Literal, Optional

from pydantic import BaseModel, Field


# ─── LLM extraction output ───────────────────────────────────────────────────

class ExtractedField(BaseModel):
    """One field as returned by the model: raw string value + boolean found."""
    value: Optional[str] = None
    found: bool = False


class ExtractionResult(BaseModel):
    """Full extraction from the vision model, validated with model_validate()
    before any guardrail runs — same pattern as request body validation."""
    title: ExtractedField = ExtractedField()
    format: ExtractedField = ExtractedField()              # "online"|"offline"|"hybrid"
    state: ExtractedField = ExtractedField()
    venue: ExtractedField = ExtractedField()
    start_date: ExtractedField = ExtractedField()          # model emits YYYY-MM-DD
    end_date: ExtractedField = ExtractedField()
    registration_deadline: ExtractedField = ExtractedField()
    prize_pool_rm: ExtractedField = ExtractedField()       # raw: "RM 5,000" / "5K"
    max_teams: ExtractedField = ExtractedField()           # raw: "16" / "32"
    registration_link: ExtractedField = ExtractedField()


# ─── API response ─────────────────────────────────────────────────────────────

class DraftTournament(BaseModel):
    """Guardrail-cleaned draft. A null field is low-confidence — the organiser
    fills it in before submitting."""
    title: Optional[str] = None
    format: Optional[Literal["online", "offline", "hybrid"]] = None
    state: Optional[str] = None
    venue: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    registration_deadline: Optional[date] = None
    prize_pool_rm: Optional[int] = None
    max_teams: Optional[int] = None
    registration_link: Optional[str] = None


class IngestDraftOut(BaseModel):
    """Response from POST /api/organiser/ingest.

    The organiser reviews this, edits any flagged_fields, and submits via
    POST /api/organiser/tournaments → admin approval → public. The draft never
    skips that flow.

    model_used / fallback_reason tell you which extraction path ran:
      model_used="primary"   → gemini-2.5-flash-lite answered, all good
      model_used="fallback", fallback_reason="quality"      → primary flagged
                               too many fields; stronger model was tried
      model_used="fallback", fallback_reason="reliability"  → primary errored
                               or timed out; stronger model was tried
    """
    draft: DraftTournament
    flagged_fields: list[str]  # fields that are null and need human input
    extracted_count: int       # how many of total_fields the model found
    total_fields: int = 10
    model_used: Literal["primary", "fallback"] = "primary"
    fallback_reason: Optional[Literal["quality", "reliability"]] = Field(
        default=None,
        description="Why the fallback was triggered; null when model_used='primary'",
    )
