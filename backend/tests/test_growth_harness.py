"""Harness proof (spec: backend/specs/growth-phase-1.md §Testing).

Covers the two things the spec names — the schema-validation retry path and
growth_llm_calls logging — with the LLM client mocked: harness._make_llm is
replaced, so no API key and no network are involved.

The audit row is asserted against the real DB, like the rest of the suite
(CI provides Postgres + `alembic upgrade head`). Each test tags its rows with a
unique prompt_version so it can find exactly its own and clean them up.
"""
import uuid

import pytest
from pydantic import BaseModel, Field

from app.ai_growth import harness
from app.database import SessionLocal
from app.models.growth import GrowthLearning, GrowthLLMCall


class _Draft(BaseModel):
    """Stand-in for the real growth schemas. `score` carries a Pydantic-level
    bound that a JSON-schema-constrained model can still violate — which is the
    exact failure the harness's single retry exists to recover from."""

    hook: str
    score: float = Field(ge=0, le=10)


class _FakeRaw:
    """The raw AIMessage langchain hands back alongside the parsed object."""

    def __init__(self, input_tokens: int, output_tokens: int):
        self.usage_metadata = {"input_tokens": input_tokens, "output_tokens": output_tokens}


def _ok(parsed: BaseModel, input_tokens: int = 100, output_tokens: int = 50) -> dict:
    return {"raw": _FakeRaw(input_tokens, output_tokens), "parsed": parsed, "parsing_error": None}


def _invalid(error: str, input_tokens: int = 100, output_tokens: int = 20) -> dict:
    """include_raw=True reports validation failures here rather than raising —
    note the raw message (and its tokens) still comes back on a failed attempt."""
    return {"raw": _FakeRaw(input_tokens, output_tokens), "parsed": None, "parsing_error": error}


class _FakeStructured:
    def __init__(self, responses: list):
        self._responses = list(responses)
        self.prompts: list[str] = []

    def invoke(self, prompt: str):
        self.prompts.append(prompt)
        response = self._responses.pop(0)
        if isinstance(response, Exception):
            raise response
        return response

    @property
    def calls(self) -> int:
        return len(self.prompts)


class _FakeLLM:
    def __init__(self, structured: _FakeStructured):
        self._structured = structured
        self.structured_kwargs: dict = {}

    def with_structured_output(self, schema, **kwargs):
        self.structured_kwargs = kwargs
        return self._structured


@pytest.fixture
def fake_llm(monkeypatch):
    """Install a scripted fake in place of the real Gemini client.

    Also clears GROWTH_MODEL so the assertions below pin the documented default
    (gemini-2.5-flash) rather than whatever a developer happens to have in .env.
    """
    monkeypatch.delenv("GROWTH_MODEL", raising=False)

    def _install(responses: list) -> _FakeStructured:
        structured = _FakeStructured(responses)
        monkeypatch.setattr(harness, "_make_llm", lambda model_name: _FakeLLM(structured))
        return structured

    return _install


@pytest.fixture
def version_tag():
    """A prompt_version unique to one test, so its audit rows are findable and
    removable without touching anyone else's."""
    tag = f"TEST_{uuid.uuid4().hex[:12]}"
    yield tag
    db = SessionLocal()
    try:
        db.query(GrowthLLMCall).filter(GrowthLLMCall.prompt_version == tag).delete(
            synchronize_session=False
        )
        db.commit()
    finally:
        db.close()


def _rows(tag: str) -> list[GrowthLLMCall]:
    db = SessionLocal()
    try:
        return db.query(GrowthLLMCall).filter(GrowthLLMCall.prompt_version == tag).all()
    finally:
        db.close()


# ─── Success path ─────────────────────────────────────────────────────────────

def test_success_returns_parsed_and_writes_one_row(fake_llm, version_tag):
    structured = fake_llm([_ok(_Draft(hook="lah", score=8.0))])

    result = harness.generate("write me a post", _Draft, "generate", version_tag)

    assert isinstance(result, _Draft)
    assert result.hook == "lah"
    assert structured.calls == 1  # no retry when the first response validates

    rows = _rows(version_tag)
    assert len(rows) == 1
    row = rows[0]
    assert row.success is True
    assert row.retries == 0
    assert row.error is None
    assert row.purpose == "generate"
    assert row.model == harness.DEFAULT_GROWTH_MODEL
    assert row.prompt_version == version_tag
    assert row.input_tokens == 100
    assert row.output_tokens == 50
    # 100/1M * $0.30 + 50/1M * $2.50
    assert float(row.est_cost_usd) == pytest.approx(0.000155)
    assert row.latency_ms >= 0


# ─── Schema-validation retry path ─────────────────────────────────────────────

def test_validation_failure_retries_once_with_error_appended(fake_llm, version_tag):
    error = "score: Input should be less than or equal to 10"
    structured = fake_llm([_invalid(error), _ok(_Draft(hook="second try", score=9.0))])

    result = harness.generate("write me a post", _Draft, "evaluate", version_tag)

    assert result.hook == "second try"
    assert structured.calls == 2

    # The retry is the original prompt with the validation error appended.
    first, second = structured.prompts
    assert first == "write me a post"
    assert second.startswith("write me a post")
    assert error in second

    rows = _rows(version_tag)
    assert len(rows) == 1  # one row per generate() call, not per attempt
    row = rows[0]
    assert row.success is True
    assert row.retries == 1
    assert row.purpose == "evaluate"
    # Tokens from BOTH attempts land on the row — a retry's cost is still cost.
    assert row.input_tokens == 200
    assert row.output_tokens == 70


def test_retry_is_bounded_at_one_then_raises_and_logs_failure(fake_llm, version_tag):
    structured = fake_llm([_invalid("bad #1"), _invalid("bad #2")])

    with pytest.raises(harness.GrowthValidationError) as exc_info:
        harness.generate("write me a post", _Draft, "generate", version_tag)

    assert "bad #2" in str(exc_info.value)
    assert structured.calls == 2  # exactly one retry — never a third attempt

    rows = _rows(version_tag)
    assert len(rows) == 1  # failures are logged too
    row = rows[0]
    assert row.success is False
    assert row.retries == 1
    assert "GrowthValidationError" in row.error


# ─── Provider errors surface as typed exceptions, still logged ────────────────

def test_api_error_raises_typed_and_logs_failure(fake_llm, version_tag):
    fake_llm([RuntimeError("503 upstream unavailable")])

    with pytest.raises(harness.GrowthAPIError) as exc_info:
        harness.generate("write me a post", _Draft, "generate", version_tag)

    # The raw provider error is wrapped, never leaked to callers, but preserved.
    assert isinstance(exc_info.value.__cause__, RuntimeError)
    assert "503 upstream unavailable" in str(exc_info.value)

    rows = _rows(version_tag)
    assert len(rows) == 1
    assert rows[0].success is False
    assert rows[0].retries == 0  # an API error is not a validation retry
    assert "503 upstream unavailable" in rows[0].error


def test_invalid_purpose_rejected_before_any_model_call(fake_llm, version_tag):
    structured = fake_llm([_ok(_Draft(hook="never", score=1.0))])

    with pytest.raises(harness.GrowthConfigError):
        harness.generate("write me a post", _Draft, "publish", version_tag)

    assert structured.calls == 0
    assert _rows(version_tag) == []  # no model call happened, so no audit row


# ─── The audit row must not ride on the caller's transaction ──────────────────

def test_llm_call_row_survives_caller_rollback(fake_llm, version_tag):
    fake_llm([_ok(_Draft(hook="durable", score=7.0))])

    caller_db = SessionLocal()
    try:
        # The caller has uncommitted work in flight when it calls the harness...
        caller_db.add(GrowthLearning(observation="scratch work", source="agent"))
        caller_db.flush()

        harness.generate("write me a post", _Draft, "generate", version_tag)

        # ...and then throws it all away.
        caller_db.rollback()
    finally:
        caller_db.close()

    # The audit row is on its own session/transaction, so it survives.
    rows = _rows(version_tag)
    assert len(rows) == 1
    assert rows[0].success is True
