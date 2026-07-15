"""The single model-calling seam for the AI Growth Engine.

Spec: backend/specs/growth-phase-1.md §"The harness". One public function,
`generate()`, and four responsibilities that live here and nowhere else:

  1. Model selection — Gemini via GROWTH_MODEL (default gemini-2.5-flash),
     reusing the GOOGLE_API_KEY / provider / pricing pattern already proven in
     services/ingest.py. Swapping to Claude later should be an env change plus
     `_make_llm`, touched nowhere else.
  2. JSON-only output validated against the caller's Pydantic schema, with ONE
     retry on validation failure (the error appended to the prompt).
  3. Observability — a `growth.generate` OTel span per call (tokens, estimated
     USD cost, purpose) AND exactly one growth_llm_calls row, failures included.
  4. Typed exceptions — no other module ever sees a raw provider error.

Hard rule (spec): no file other than this one may import an LLM client/SDK.

Deliberate non-goals (spec): no multi-provider abstraction, no BaseProvider
class, no model registry. One thin file.
"""
import logging
import os
import time
from typing import Optional, TypeVar

from pydantic import BaseModel

from app.database import SessionLocal
from app.models.growth import GrowthLLMCall
from app.observability import get_tracer

logger = logging.getLogger(__name__)
_tracer = get_tracer(__name__)

DEFAULT_GROWTH_MODEL = "gemini-2.5-flash"

# Mirrors growth_llm_calls.purpose (models/growth.py: llm_purpose_enum). Checked
# up front so a bad value fails loudly at the call site instead of blowing up the
# audit INSERT at the end — where the write is deliberately swallowed (_log_call).
_VALID_PURPOSES = ("generate", "evaluate")

# Schema-validation retries only. This is LOCAL to generate() and is deliberately
# unrelated to (and shares no state with) the graph's evaluation retry budget of 2
# in graph.py: that one re-runs generation because a judge rejected good JSON,
# this one re-asks because the JSON itself didn't fit the schema.
_MAX_VALIDATION_RETRIES = 1

# Approximate Gemini pricing (USD per 1M tokens) — same approach as
# services/ingest.py's _PRICING_USD_PER_1M_TOKENS: directional, not a billing
# source of truth, enough to answer "what did this run cost" and to spot an
# unexpectedly expensive call in a trace. Kept local rather than imported from
# services/ingest.py so the growth subsystem imports no product service (see
# tests/test_growth_isolation.py). Update when Google changes pricing; an
# unlisted model estimates $0 rather than raising.
_PRICING_USD_PER_1M_TOKENS = {
    "gemini-2.5-flash": {"input": 0.30, "output": 2.50},
    "gemini-2.5-flash-lite": {"input": 0.10, "output": 0.40},
}

# Appended verbatim to the original prompt on the single validation retry. This
# is harness mechanics, not content: prompts.py owns every *content* prompt
# (GENERATE_V1, EVALUATE_V1), while spec responsibility #2 assigns "retry once
# with the validation error appended" to this file.
_RETRY_INSTRUCTION = """

Your previous response did not satisfy the required JSON schema. The validation
error was:

{error}

Return a corrected JSON object that satisfies the schema exactly. Output JSON
only — no markdown fences, no explanation.
"""


# ─── Typed exceptions (nothing else in the subsystem handles provider errors) ──

class GrowthHarnessError(Exception):
    """Base for every error this module raises."""


class GrowthConfigError(GrowthHarnessError):
    """Misconfiguration: missing GOOGLE_API_KEY, SDK not installed, bad purpose."""


class GrowthAPIError(GrowthHarnessError):
    """The provider call itself failed (network, auth, quota, timeout)."""


class GrowthValidationError(GrowthHarnessError):
    """Output still failed schema validation after the retry."""


# ─── Internals ────────────────────────────────────────────────────────────────

def _estimate_cost_usd(model: str, input_tokens: int, output_tokens: int) -> float:
    prices = _PRICING_USD_PER_1M_TOKENS.get(model)
    if not prices:
        return 0.0
    return round(
        input_tokens / 1_000_000 * prices["input"]
        + output_tokens / 1_000_000 * prices["output"],
        6,
    )


def _make_llm(model_name: str):
    """Build the chat model. The only place an LLM SDK is imported.

    Lazy import + lazy env read: the growth engine runs as a CLI
    (`python -m app.ai_growth.run`), so reading GOOGLE_API_KEY at call time keeps
    this independent of whether .env happened to load before this module was
    imported.

    Temperature is left at the provider default on purpose — unlike ingest's
    pinned temperature=0 (deterministic extraction), generation wants voice
    variety, and the spec assigns no temperature policy to the harness.
    """
    try:
        from langchain_google_genai import ChatGoogleGenerativeAI  # type: ignore[import]
    except ImportError as exc:
        raise GrowthConfigError(
            "langchain-google-genai is not installed — run: pip install langchain-google-genai"
        ) from exc

    api_key = os.getenv("GOOGLE_API_KEY", "")
    if not api_key:
        raise GrowthConfigError("GOOGLE_API_KEY is not set in .env")

    return ChatGoogleGenerativeAI(model=model_name, google_api_key=api_key)


def _log_call(
    *,
    purpose: str,
    model: str,
    prompt_version: str,
    input_tokens: int,
    output_tokens: int,
    est_cost_usd: float,
    latency_ms: int,
    retries: int,
    success: bool,
    error: Optional[str],
) -> None:
    """Write the one growth_llm_calls row for a call.

    Opens its OWN session and commits it. The spec wants an audit row for every
    call including failures, so it must not ride on the caller's transaction —
    a node that rolls back (or a store step that fails) would take the audit
    trail down with it.

    Never raises: a failed audit write must not mask a successful generation or
    replace the real provider error the caller is about to see.
    """
    db = SessionLocal()
    try:
        db.add(
            GrowthLLMCall(
                purpose=purpose,
                model=model,
                prompt_version=prompt_version,
                input_tokens=input_tokens,
                output_tokens=output_tokens,
                est_cost_usd=est_cost_usd,
                latency_ms=latency_ms,
                retries=retries,
                success=success,
                error=error,
            )
        )
        db.commit()
    except Exception:
        db.rollback()
        logger.exception("growth: failed to write growth_llm_calls row (purpose=%s)", purpose)
    finally:
        db.close()


def _usage_from(raw) -> tuple[int, int]:
    """Pull (input_tokens, output_tokens) off the raw AIMessage, as ingest's
    _TriggerLogger does. Absent usage metadata counts as zero, never an error."""
    usage = getattr(raw, "usage_metadata", None) or {}
    return usage.get("input_tokens", 0) or 0, usage.get("output_tokens", 0) or 0


# ─── Public entry point ───────────────────────────────────────────────────────

SchemaT = TypeVar("SchemaT", bound=BaseModel)


def generate(prompt: str, schema: type[SchemaT], purpose: str, prompt_version: str) -> SchemaT:
    """Call the model, return an instance of `schema`.

    The model is schema-constrained (`method="json_schema"`), so malformed JSON
    is rare — but constraining the JSON shape does not enforce Pydantic-level
    validators (score ranges, field validators, cross-field checks), which is
    exactly what the single retry exists to recover from.

    Args:
        prompt: the fully assembled prompt (from prompts.py).
        schema: Pydantic model the response must validate against.
        purpose: "generate" or "evaluate" — recorded on the audit row.
        prompt_version: version tag of the prompt (e.g. "GENERATE_V1"), recorded
            on the audit row.

    Returns:
        A validated instance of `schema`.

    Raises:
        GrowthConfigError: bad purpose, missing API key, or SDK not installed.
        GrowthAPIError: the provider call failed.
        GrowthValidationError: output failed schema validation after the retry.
    """
    if purpose not in _VALID_PURPOSES:
        raise GrowthConfigError(
            f"purpose must be one of {_VALID_PURPOSES}, got {purpose!r}"
        )

    model_name = os.getenv("GROWTH_MODEL") or DEFAULT_GROWTH_MODEL
    structured = _make_llm(model_name).with_structured_output(
        schema, method="json_schema", include_raw=True
    )

    input_tokens = 0
    output_tokens = 0
    attempts = 0
    error_msg: Optional[str] = None
    start = time.monotonic()

    logger.info(
        "growth: calling model=%s purpose=%s prompt_version=%s",
        model_name, purpose, prompt_version,
    )

    with _tracer.start_as_current_span("growth.generate") as span:
        span.set_attribute("growth.purpose", purpose)
        span.set_attribute("growth.model", model_name)
        span.set_attribute("growth.prompt_version", prompt_version)
        try:
            current_prompt = prompt
            # One first attempt + _MAX_VALIDATION_RETRIES validation retries.
            for _ in range(_MAX_VALIDATION_RETRIES + 1):
                attempts += 1
                try:
                    # include_raw=True: langchain returns the validation error in
                    # "parsing_error" instead of raising, so we keep the raw
                    # message (and its token counts) for a failed attempt too —
                    # a retry's cost must still land on the audit row.
                    result = structured.invoke(current_prompt)
                except Exception as exc:
                    raise GrowthAPIError(
                        f"{model_name} call failed: {type(exc).__name__}: {exc}"
                    ) from exc

                in_tok, out_tok = _usage_from(result.get("raw"))
                input_tokens += in_tok
                output_tokens += out_tok

                parsed = result.get("parsed")
                parsing_error = result.get("parsing_error")
                if parsed is not None and parsing_error is None:
                    return parsed

                validation_error = parsing_error or "model returned no parsable object"
                logger.warning(
                    "growth: schema validation failed on attempt %d — %s",
                    attempts, validation_error,
                )
                current_prompt = prompt + _RETRY_INSTRUCTION.format(error=validation_error)

            raise GrowthValidationError(
                f"{schema.__name__} validation failed after {attempts} attempts "
                f"(1 retry): {validation_error}"
            )
        except Exception as exc:
            # Broad on purpose: anything escaping this function must be recorded
            # as a failed call, not silently logged as a success by the finally.
            error_msg = f"{type(exc).__name__}: {exc}"
            raise
        finally:
            latency_ms = int((time.monotonic() - start) * 1000)
            cost_usd = _estimate_cost_usd(model_name, input_tokens, output_tokens)
            retries = attempts - 1

            span.set_attribute("growth.tokens.input", input_tokens)
            span.set_attribute("growth.tokens.output", output_tokens)
            span.set_attribute("growth.cost_usd", cost_usd)
            span.set_attribute("growth.retries", retries)
            span.set_attribute("growth.success", error_msg is None)
            if error_msg:
                span.set_attribute("growth.error", error_msg)

            logger.info(
                "growth: done purpose=%s model=%s success=%s retries=%d "
                "tokens_in=%d tokens_out=%d cost_usd=%.6f latency_ms=%d",
                purpose, model_name, error_msg is None, retries,
                input_tokens, output_tokens, cost_usd, latency_ms,
            )

            _log_call(
                purpose=purpose,
                model=model_name,
                prompt_version=prompt_version,
                input_tokens=input_tokens,
                output_tokens=output_tokens,
                est_cost_usd=cost_usd,
                latency_ms=latency_ms,
                retries=retries,
                success=error_msg is None,
                error=error_msg,
            )
