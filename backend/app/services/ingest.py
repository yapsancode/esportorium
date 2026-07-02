"""Agentic ingest: LangChain + Gemini, with structured output and fallback chain.

Architecture (DEEPENING.md §Item 2, updated):
  - LangChain's ChatGoogleGenerativeAI drives the extraction via
    .with_structured_output(ExtractionResult) — schema-constrained, same
    contract as before.
  - Primary model: INGEST_MODEL (default: gemini-2.5-flash-lite).
  - Fallback model: INGEST_FALLBACK_MODEL (default: gemini-2.5-flash),
    wired via .with_fallbacks() which handles BOTH triggers:

      Reliability trigger  — primary errors or times out (any Exception).
      Quality trigger      — primary succeeds but flags > QUALITY_FLAG_THRESHOLD
                             fields; the quality gate raises LowConfidenceError,
                             which .with_fallbacks() treats like any other error.

  - If fallback is also low-confidence, those fields stay flagged for the
    organiser — no further retry.
  - LangSmith tracing is automatic when LANGCHAIN_TRACING_V2=true.
    Per-call metadata (model names, prompt version) is passed via RunnableConfig.
    A _TriggerLogger callback records which path was taken in Python logs and
    annotates the trace with a human-readable reason.
  - Draft is never persisted. Organiser reviews → submits → admin approves.

Required env vars:
  GOOGLE_API_KEY           — Gemini API key
  INGEST_MODEL             — primary model id (default: gemini-2.5-flash-lite)
  INGEST_FALLBACK_MODEL    — fallback model id (default: gemini-2.5-flash)
  LANGCHAIN_TRACING_V2     — set to "true" to enable LangSmith tracing
  LANGCHAIN_API_KEY        — LangSmith API key (required when tracing enabled)
  LANGCHAIN_PROJECT        — LangSmith project name (e.g. "esportorium-ingest")
"""
import base64
import logging
import os
from dataclasses import dataclass
from datetime import date
from typing import Optional

from langchain_core.callbacks import BaseCallbackHandler
from langchain_core.messages import HumanMessage
from langchain_core.runnables import RunnableConfig, RunnableLambda

from app.schemas.ingest import (
    DraftTournament,
    ExtractionResult,
    ExtractedField,
    IngestDraftOut,
)
from app.services import guardrails

logger = logging.getLogger(__name__)

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "")
INGEST_MODEL = os.getenv("INGEST_MODEL", "gemini-2.5-flash-lite")
INGEST_FALLBACK_MODEL = os.getenv("INGEST_FALLBACK_MODEL", "gemini-2.5-flash")

# If primary flags more than this many fields, its output is low-quality enough
# that it's worth the extra latency/cost to try the stronger model.
# 5 out of 10 fields uncertain = half the form is empty — below that threshold
# the organiser can fill in a couple of gaps without much friction.
QUALITY_FLAG_THRESHOLD = 5

_TARGETED_FIELDS = [
    "title", "format", "state", "venue",
    "start_date", "end_date", "registration_deadline",
    "prize_pool_rm", "max_teams", "registration_link",
]

PROMPT_VERSION = "v1"
_EXTRACTION_PROMPT = f"""\
[prompt:{PROMPT_VERSION}] You are extracting tournament information from a Malaysian esports announcement (image, PDF, or text).

For EVERY field listed below, return a JSON object with two keys:
  "found": true  if the source explicitly states this value
  "found": false if the source does NOT state it
  "value": the extracted string, or null when found is false

RULES — read carefully:
- NEVER guess, infer, or fabricate. If it is not written, return found=false, value=null.
- "format" must be exactly one of: "online", "offline", "hybrid"
- All dates must be in YYYY-MM-DD format
- "prize_pool_rm" is the raw string as written (e.g. "RM 5,000" or "5K")
- "max_teams" is the raw number as a string (e.g. "16")
- "registration_link" must be the full URL including http:// or https://
- "state" is the Malaysian state (e.g. "Selangor", "Kuala Lumpur") — null for online events

Fields to extract: title, format, state, venue, start_date, end_date,
registration_deadline, prize_pool_rm, max_teams, registration_link

Return a single JSON object. No markdown fences, no explanation, nothing else.
"""


# ─── Fallback trigger ─────────────────────────────────────────────────────────

class LowConfidenceError(Exception):
    """Primary model returned enough low-confidence fields to warrant a retry
    with the stronger fallback model. Raised inside the quality gate so that
    .with_fallbacks() treats it identically to a reliability error."""


@dataclass
class _RunState:
    """Mutable state shared between the callback and run_ingest for one call."""
    model_used: str = "primary"
    fallback_reason: Optional[str] = None


class _TriggerLogger(BaseCallbackHandler):
    """LangChain callback that records which fallback path was taken.

    Writes to the app log AND sets fields on _RunState so run_ingest can
    include them in the API response — giving callers a verifiable signal of
    which model produced the result.
    """

    def __init__(self, state: _RunState):
        super().__init__()
        self.state = state

    def on_chain_error(self, error: Exception, *, run_id, parent_run_id=None, **kwargs):
        if isinstance(error, LowConfidenceError):
            self.state.model_used = "fallback"
            self.state.fallback_reason = "quality"
            logger.info("ingest: quality fallback — %s", error)
        else:
            self.state.model_used = "fallback"
            self.state.fallback_reason = "reliability"
            logger.warning(
                "ingest: reliability fallback — %s: %s", type(error).__name__, error
            )


# ─── Chain construction ───────────────────────────────────────────────────────

def _make_llm(model_name: str):
    """Lazy import so the app starts without GOOGLE_API_KEY if ingest isn't called."""
    try:
        from langchain_google_genai import ChatGoogleGenerativeAI  # type: ignore[import]
    except ImportError:
        raise RuntimeError(
            "langchain-google-genai is not installed — "
            "run: pip install langchain-google-genai"
        )
    if not GOOGLE_API_KEY:
        raise RuntimeError("GOOGLE_API_KEY is not set in .env")
    return ChatGoogleGenerativeAI(
        model=model_name,
        google_api_key=GOOGLE_API_KEY,
        temperature=0,           # deterministic extraction; never creative
    )


def _quality_gate(result: ExtractionResult) -> ExtractionResult:
    """After primary extraction, count low-confidence fields.

    If too many are flagged, raise LowConfidenceError so .with_fallbacks()
    triggers the stronger model. This is the quality trigger; .with_fallbacks()
    also handles the reliability trigger (any exception from the model call).
    """
    _, flagged = _apply_guardrails(result)
    n = len(flagged)
    if n > QUALITY_FLAG_THRESHOLD:
        raise LowConfidenceError(
            f"Primary model flagged {n}/{len(_TARGETED_FIELDS)} fields "
            f"(threshold: >{QUALITY_FLAG_THRESHOLD}) — escalating to fallback"
        )
    return result


def _build_chain():
    """Compose the full extraction chain with fallback.

    primary  = structured_llm_primary | quality_gate
    fallback = structured_llm_fallback            (no quality gate — don't escalate further)
    full     = primary.with_fallbacks([fallback])
    """
    primary_llm = _make_llm(INGEST_MODEL)
    fallback_llm = _make_llm(INGEST_FALLBACK_MODEL)

    primary_structured = primary_llm.with_structured_output(ExtractionResult, method="json_schema")
    fallback_structured = fallback_llm.with_structured_output(ExtractionResult, method="json_schema")

    # Quality gate is ONLY on the primary — if the fallback is still low-confidence
    # those fields stay flagged for the organiser. No further retry.
    primary_chain = primary_structured | RunnableLambda(_quality_gate)

    return primary_chain.with_fallbacks(
        [fallback_structured],
        exceptions_to_handle=(Exception,),  # catches both LowConfidenceError and model errors
    )


# ─── Message building (multimodal) ───────────────────────────────────────────

def _build_messages(
    text: Optional[str],
    file_bytes: Optional[bytes],
    mime_type: Optional[str],
) -> list[HumanMessage]:
    """Build the LangChain HumanMessage for the extraction call.

    Supports text, image (jpeg/png/gif/webp), and PDF. All are passed as inline
    data via base64 data URIs — the underlying Gemini model reads them natively
    without a separate OCR step.
    """
    content: list = []

    if file_bytes and mime_type:
        b64 = base64.b64encode(file_bytes).decode()
        if mime_type == "application/pdf":
            content.append({"type": "file", "base64": b64, "mime_type": mime_type})
        else:
            content.append({"type": "image", "base64": b64, "mime_type": mime_type})

    if text:
        content.append({"type": "text", "text": text})

    content.append({"type": "text", "text": _EXTRACTION_PROMPT})
    return [HumanMessage(content=content)]


# ─── Guardrail application (unchanged from Item 2) ───────────────────────────

def _apply_guardrails(raw: ExtractionResult) -> tuple[DraftTournament, list[str]]:
    """Run validators + transformers on the model's extraction.

    A field is flagged (and null in the draft) when:
    - found=False or value=None (model didn't see it)
    - a validator returns False (bad URL)
    - a transformer returns None (unparseable / implausible)

    Low-confidence fields are null in the draft. The organiser is the fallback —
    they fill flagged fields and submit through the normal approval queue.
    """
    flagged: list[str] = []

    def _val(f: ExtractedField) -> Optional[str]:
        return f.value if f.found and f.value else None

    def _check(name: str, value) -> None:
        if value is None:
            flagged.append(name)

    title = _val(raw.title)
    _check("title", title)

    fmt_raw = _val(raw.format)
    fmt = fmt_raw if fmt_raw in ("online", "offline", "hybrid") else None
    _check("format", fmt)

    state = _val(raw.state)   # optional — not flagged if absent
    venue = _val(raw.venue)   # optional — not flagged if absent

    start_date: Optional[date] = None
    if sd := _val(raw.start_date):
        start_date = guardrails.parse_date(sd)
    _check("start_date", start_date)

    end_date: Optional[date] = None
    if ed := _val(raw.end_date):
        end_date = guardrails.parse_date(ed)
    _check("end_date", end_date)

    reg_deadline: Optional[date] = None
    if rd := _val(raw.registration_deadline):
        reg_deadline = guardrails.parse_date(rd)
    _check("registration_deadline", reg_deadline)

    prize_pool: Optional[int] = None
    if pp := _val(raw.prize_pool_rm):
        prize_pool = guardrails.normalize_rm(pp)
    _check("prize_pool_rm", prize_pool)

    max_teams: Optional[int] = None
    if mt := _val(raw.max_teams):
        max_teams = guardrails.parse_int(mt)
    _check("max_teams", max_teams)

    reg_link: Optional[str] = None
    if rl := _val(raw.registration_link):
        reg_link = rl if guardrails.is_valid_url(rl) else None
    _check("registration_link", reg_link)

    draft = DraftTournament(
        title=title,
        format=fmt,
        state=state,
        venue=venue,
        start_date=start_date,
        end_date=end_date,
        registration_deadline=reg_deadline,
        prize_pool_rm=prize_pool,
        max_teams=max_teams,
        registration_link=reg_link,
    )
    return draft, flagged


# ─── Public entry point ───────────────────────────────────────────────────────

def run_ingest(
    *,
    text: Optional[str] = None,
    file_bytes: Optional[bytes] = None,
    mime_type: Optional[str] = None,
) -> IngestDraftOut:
    """Extract tournament fields, apply guardrails, return a draft.

    Chain: primary (gemini-2.5-flash-lite + quality gate)
             → fallback on LowConfidenceError OR any model error
           fallback (gemini-2.5-flash, no quality gate)

    This function does NOT write to the database. The organiser reviews the
    draft, edits flagged fields, and submits via POST /api/organiser/tournaments
    → admin approval → public listing.
    """
    if not text and not file_bytes:
        raise ValueError("Provide either text or a file")

    messages = _build_messages(text, file_bytes, mime_type)
    chain = _build_chain()
    state = _RunState()

    config = RunnableConfig(
        run_name="TournamentExtraction",
        tags=["ingest"],
        metadata={
            "prompt_version": PROMPT_VERSION,
            "primary_model": INGEST_MODEL,
            "fallback_model": INGEST_FALLBACK_MODEL,
        },
        callbacks=[_TriggerLogger(state)],
    )

    logger.info(
        "ingest: starting extraction primary=%s fallback=%s prompt=%s",
        INGEST_MODEL, INGEST_FALLBACK_MODEL, PROMPT_VERSION,
    )

    try:
        raw: ExtractionResult = chain.invoke(messages, config=config)
    except Exception as exc:
        # Both primary AND fallback failed — surface as a 502.
        logger.error("ingest: both primary and fallback failed: %s", exc)
        raise ValueError(f"Extraction failed on all models: {exc}") from exc

    draft, flagged = _apply_guardrails(raw)

    extracted_count = sum(
        1 for f in _TARGETED_FIELDS
        if getattr(raw, f).found and getattr(raw, f).value is not None
    )

    logger.info(
        "ingest: done model=%s extracted=%d/%d flagged=%s",
        state.model_used, extracted_count, len(_TARGETED_FIELDS), flagged,
    )

    return IngestDraftOut(
        draft=draft,
        flagged_fields=flagged,
        extracted_count=extracted_count,
        model_used=state.model_used,
        fallback_reason=state.fallback_reason,
    )
