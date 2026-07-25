"""LangGraph node functions for the AI Growth Engine.

Spec: backend/specs/growth-phase-1.md §"The workflow". All four nodes live here
— assemble_context, generate, evaluate, store — plus the pure-Python rule engine
that forms the first (and cheapest) stage of evaluate. graph.py wires them.

Each node takes the full GrowthState and returns a partial-state dict (only
the keys it updates), so graph.py can wire them directly.

Hard rule (spec): this file never imports an LLM client/SDK — all model access
goes through harness.generate(). assemble_context makes no LLM call at all.
"""

import json
import re
from datetime import datetime
from pathlib import Path
from typing import Optional

from app.ai_growth import harness, tournament_tool
from app.ai_growth.prompts import EVALUATE_V1, GENERATE_V1
from app.ai_growth.state import GrowthState
from app.database import SessionLocal
from app.models.growth import GrowthContentIdea, GrowthGeneratedPost, GrowthLLMCall
from app.schemas.growth import DraftEvaluationBatch, ThreadsBatch

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
    """Why the previous attempt was rejected, fed back into regeneration (spec:
    "evaluator reasons injected into retry_feedback").

    Empty string on the first pass, when there are no evaluations yet.
    """
    evaluations = state.get("evaluations") or []
    drafts = state.get("drafts") or []
    failed = [
        (draft, ev)
        for draft, ev in zip(drafts, evaluations)
        if not ev.get("passed")
    ]
    if not failed:
        return ""

    lines = [
        "",
        "# Your previous attempt was rejected — fix these and write new drafts",
        "Each item is a draft you wrote and why it failed. Do not repeat the mistake.",
        "",
    ]
    for draft, ev in failed:
        reasons = "; ".join(ev.get("reasons") or []) or "no reason recorded"
        lines.append(f"- [{draft.get('platform')} / {draft.get('pillar')}] {reasons}")
    return "\n".join(lines)


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
    owns schema validation and its single retry — no re-validation here.

    Also owns the graph-level retry counter: non-empty retry_feedback means
    evaluate sent us back, so this is a regeneration. The router can't do it —
    LangGraph routers return a destination, they don't write state — and this is
    the node that knows it is retrying.
    """
    retry_feedback = _build_retry_feedback(state)
    retry_count = state.get("retry_count", 0) + (1 if retry_feedback else 0)

    prompt = GENERATE_V1.format(
        brand=state["brand"],
        audience=state["audience"],
        rules=state["rules"],
        voice_examples=state["voice_examples"],
        tournaments=_serialize_tournaments(state["tournaments"]),
        trends=state["trends"],
        recent_posts=_serialize_recent_posts(state["recent_posts"]),
        retry_feedback=retry_feedback,
    )

    batch = harness.generate(
        prompt=prompt,
        schema=ThreadsBatch,
        purpose="generate",
        prompt_version="GENERATE_V1",
    )

    return {"drafts": _batch_to_drafts(batch), "retry_count": retry_count}


# ─── Rule engine (evaluate stage 1 — pure Python, never an LLM) ───────────────

_BANNED_HEADING = "## Banned phrases"
_THREADS_MAX_CHARS = 500
_MAX_HASHTAGS = 2
_MAX_SCENES = 3

# Judge score floors (spec §evaluate step 3, "Auto-fail"). Grounding is absolute:
# one invented tournament fact is the exact failure this pipeline exists to stop.
_MIN_GROUNDING = 10.0
_MIN_HUMAN_FEEL = 7.0


def parse_banned_phrases(rules_md: str) -> list[str]:
    """The bullet list under '## Banned phrases' in rules.md, lowercased.

    rules.md is the single source of the list (spec). Everything above that
    heading is prose written for the judge and must never be substring-matched —
    it names the very phrases it is banning.
    """
    lines = rules_md.splitlines()
    try:
        start = next(i for i, line in enumerate(lines) if line.strip() == _BANNED_HEADING)
    except StopIteration:
        return []

    phrases = []
    for line in lines[start + 1:]:
        if line.startswith("## "):  # next section ends the list
            break
        if line.startswith("- "):
            phrases.append(line[2:].strip().lower())
    return [p for p in phrases if p]


def _draft_text(draft: dict) -> str:
    """Every human-readable string in a draft, for substring and hashtag checks."""
    if draft.get("platform") == "tiktok":
        parts = [draft.get("hook") or "", *(draft.get("scenes") or []), draft.get("cta") or ""]
        return "\n".join(p for p in parts if p)
    return draft.get("content") or ""


def check_draft(draft: dict, banned_phrases: list[str]) -> list[str]:
    """Rule-engine verdict for one draft: the list of failure reasons.

    An empty list means the draft survives to the judge. Checks exactly what the
    spec assigns to the rule engine — banned phrases, Threads length, the hashtag
    ceiling, TikTok script structure — and nothing the judge is meant to weigh.
    """
    reasons: list[str] = []
    text = _draft_text(draft)
    lowered = text.lower()

    for phrase in banned_phrases:
        if phrase in lowered:
            reasons.append(f"banned phrase: {phrase!r}")

    hashtags = re.findall(r"#\w+", text)
    if len(hashtags) > _MAX_HASHTAGS:
        reasons.append(f"{len(hashtags)} hashtags, ceiling is {_MAX_HASHTAGS}")

    if draft.get("platform") == "threads":
        length = len(draft.get("content") or "")
        if length > _THREADS_MAX_CHARS:
            reasons.append(f"{length} chars, Threads limit is {_THREADS_MAX_CHARS}")
    else:
        if not (draft.get("hook") or "").strip():
            reasons.append("TikTok script has no hook")
        scenes = [s for s in (draft.get("scenes") or []) if s.strip()]
        if not scenes:
            reasons.append("TikTok script has no scenes")
        elif len(scenes) > _MAX_SCENES:
            reasons.append(f"{len(scenes)} scenes, limit is {_MAX_SCENES}")
        if not (draft.get("cta") or "").strip():
            reasons.append("TikTok script has no CTA")

    return reasons


def _serialize_drafts_for_judge(drafts: list[dict]) -> str:
    """Numbered plain-text rendering of the drafts handed to the judge."""
    blocks = []
    for n, draft in enumerate(drafts, start=1):
        header = (
            f"## Draft {n} — {draft.get('platform')} / {draft.get('pillar')} "
            f"/ language={draft.get('language')}"
        )
        if draft.get("platform") == "tiktok":
            body = "\n".join(
                [
                    f"HOOK: {draft.get('hook', '')}",
                    *[
                        f"SCENE {i}: {s}"
                        for i, s in enumerate(draft.get("scenes") or [], start=1)
                    ],
                    f"CTA: {draft.get('cta', '')}",
                ]
            )
        else:
            body = draft.get("content", "")
        blocks.append(f"{header}\n{body}")
    return "\n\n".join(blocks)


def evaluate(state: GrowthState) -> dict:
    """Rule engine first, then one LLM judge call over whatever survives.

    Cheapest-first by design (spec): a draft that trips a rule never costs a judge
    call. Returns one evaluation per draft, index-aligned with state["drafts"]:

        {"passed": bool, "reasons": [str], "scores": dict|None, "reasoning": str|None}

    `scores` stays None for drafts the rule engine killed — they never reached the
    judge, so there is nothing to record.
    """
    drafts = state["drafts"]
    banned_phrases = parse_banned_phrases(state["rules"])

    # Stage 1 — rule engine.
    evaluations: list[dict] = []
    for draft in drafts:
        reasons = check_draft(draft, banned_phrases)
        evaluations.append(
            {
                "passed": not reasons,
                "reasons": reasons,
                "scores": None,
                "reasoning": None,
            }
        )

    survivor_indexes = [i for i, ev in enumerate(evaluations) if ev["passed"]]
    if not survivor_indexes:
        return {"evaluations": evaluations}

    # Stage 2 — one judge call over the survivors.
    survivors = [drafts[i] for i in survivor_indexes]
    prompt = EVALUATE_V1.format(
        rules=state["rules"],
        voice_examples=state["voice_examples"],
        tournaments=_serialize_tournaments(state["tournaments"]),
        drafts=_serialize_drafts_for_judge(survivors),
        draft_count=len(survivors),
    )
    batch = harness.generate(
        prompt=prompt,
        schema=DraftEvaluationBatch,
        purpose="evaluate",
        prompt_version="EVALUATE_V1",
    )

    # Order is the only mapping back to drafts (DraftEvaluation carries no index
    # — the spec fixes its fields), so a length mismatch is unrecoverable. Fail
    # the survivors rather than align scores to drafts by guesswork.
    if len(batch.evaluations) != len(survivors):
        for i in survivor_indexes:
            evaluations[i]["passed"] = False
            evaluations[i]["reasons"] = [
                f"judge returned {len(batch.evaluations)} evaluations for "
                f"{len(survivors)} drafts — cannot map scores to drafts"
            ]
        return {"evaluations": evaluations}

    # Stage 3 — auto-fail. Applied in code rather than trusting the judge's own
    # verdict: the thresholds are the spec's, so code is the authority on them.
    for index, judged in zip(survivor_indexes, batch.evaluations):
        reasons = []
        if judged.grounding < _MIN_GROUNDING:
            reasons.append(f"grounding {judged.grounding} < {_MIN_GROUNDING}")
        if judged.human_feel < _MIN_HUMAN_FEEL:
            reasons.append(f"human_feel {judged.human_feel} < {_MIN_HUMAN_FEEL}")
        if judged.verdict == "fail":
            reasons.append("judge verdict: fail")

        evaluations[index] = {
            "passed": not reasons,
            "reasons": reasons,
            "scores": judged.model_dump(exclude={"verdict", "reasoning"}),
            "reasoning": judged.reasoning,
        }

    return {"evaluations": evaluations}


# ─── store ────────────────────────────────────────────────────────────────────

def _tiktok_content(draft: dict) -> str:
    """Flatten a TikTok script into the single `content` column a human reviews."""
    lines = [f"HOOK: {draft.get('hook', '')}"]
    lines += [
        f"SCENE {i}: {s}"
        for i, s in enumerate(draft.get("scenes") or [], start=1)
    ]
    lines.append(f"CTA: {draft.get('cta', '')}")
    return "\n".join(lines)


def _draft_content(draft: dict) -> str:
    if draft.get("platform") == "tiktok":
        return _tiktok_content(draft)
    return draft.get("content") or ""


def _evaluation_text(ev: dict) -> str:
    """Human-readable evaluation for the `evaluation` column: the judge's
    reasoning, the failure reasons, or both."""
    parts = []
    if ev.get("reasoning"):
        parts.append(ev["reasoning"])
    if ev.get("reasons"):
        parts.append("FAILED: " + "; ".join(ev["reasons"]))
    return "\n".join(parts) or "passed"


def _run_llm_totals(db, since: datetime) -> dict:
    """Totals across the growth_llm_calls rows this run wrote."""
    rows = db.query(GrowthLLMCall).filter(GrowthLLMCall.created_at >= since).all()
    return {
        "calls": len(rows),
        "failures": sum(1 for r in rows if not r.success),
        "input_tokens": sum(r.input_tokens or 0 for r in rows),
        "output_tokens": sum(r.output_tokens or 0 for r in rows),
        "est_cost_usd": float(sum(r.est_cost_usd or 0 for r in rows)),
    }


def store(state: GrowthState, run_started_at: Optional[datetime] = None) -> dict:
    """Persist every draft with its evaluation, then build the run summary. No LLM.

    Failing drafts are written with status='rejected' and their reasons in
    `evaluation` — the spec is explicit that they are never discarded. A rejected
    draft is the signal for the next prompt version, so throwing it away throws
    away the only record of what the prompt gets wrong.

    Args:
        run_started_at: start of this run, used to scope the growth_llm_calls
            totals in the summary. graph.py binds it per run; defaults to "all
            rows" only when called bare (tests).
    """
    drafts = state["drafts"]
    evaluations = state.get("evaluations") or []
    retry_count = state.get("retry_count", 0)
    since = run_started_at or datetime.utcfromtimestamp(0)

    db = SessionLocal()
    try:
        final_posts: list[dict] = []
        for draft, ev in zip(drafts, evaluations):
            idea = GrowthContentIdea(
                topic=draft.get("topic") or "(untitled)",
                pillar=draft["pillar"],
                source="agent",
            )
            db.add(idea)
            db.flush()  # assign idea.id without ending the transaction

            passed = bool(ev.get("passed"))
            post = GrowthGeneratedPost(
                idea_id=idea.id,
                platform=draft["platform"],
                content=_draft_content(draft),
                language=draft["language"],
                pillar=draft["pillar"],
                scores=ev.get("scores"),
                evaluation=_evaluation_text(ev),
                retry_count=retry_count,
                status="draft" if passed else "rejected",
                prompt_version="GENERATE_V1",
            )
            db.add(post)
            db.flush()

            final_posts.append(
                {
                    "id": str(post.id),
                    "platform": post.platform,
                    "pillar": post.pillar,
                    "language": post.language,
                    "status": post.status,
                    "topic": idea.topic,
                    "reasons": ev.get("reasons") or [],
                }
            )

        totals = _run_llm_totals(db, since)
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

    kept = sum(1 for p in final_posts if p["status"] == "draft")
    rejected = len(final_posts) - kept
    wall_seconds = (datetime.utcnow() - since).total_seconds() if run_started_at else 0.0

    lines = [
        "",
        "─── growth run summary ───────────────────────────────",
        f"  drafts stored     : {len(final_posts)}  ({kept} draft, {rejected} rejected)",
        f"  generation retries: {retry_count}",
        f"  llm calls         : {totals['calls']}  ({totals['failures']} failed)",
        f"  tokens            : {totals['input_tokens']} in / {totals['output_tokens']} out",
        f"  est cost          : ${totals['est_cost_usd']:.6f}",
        f"  wall time         : {wall_seconds:.1f}s",
    ]
    if rejected:
        lines.append("  rejected:")
        for post in final_posts:
            if post["status"] == "rejected":
                why = "; ".join(post["reasons"]) or "no reason recorded"
                lines.append(f"    - [{post['platform']}/{post['pillar']}] {why}")
    lines.append("──────────────────────────────────────────────────────")

    summary = "\n".join(lines)
    print(summary)

    return {"final_posts": final_posts, "run_summary": summary}
