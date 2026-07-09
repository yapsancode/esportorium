#!/usr/bin/env python3
"""
Eval gate for the agentic ingest pipeline.

Loads every fixture from backend/eval/fixtures/, runs each through run_ingest(),
scores the output field-by-field against the labelled expected values, and prints
a per-field accuracy table plus an overall score.

The empty-vs-wrong distinction is reported separately because it drives the
model-upgrade decision:
  empty  — model didn't extract the value (safe: organiser fills it in)
  wrong  — model extracted an incorrect value (risky: organiser may not notice)

model_used and fallback_reason from each IngestDraftOut are tallied so you can
see how much the fallback chain contributed to the eval results.

Exit codes:
  0   overall accuracy >= --threshold    (PASS — merge allowed)
  1   overall accuracy <  --threshold    (FAIL — merge blocked)
  2   configuration error (missing API key, import failure, no fixtures found)

Usage (from repo root):
  python backend/eval/run_eval.py
  python backend/eval/run_eval.py --threshold 0.90
  python backend/eval/run_eval.py --fixtures backend/eval/fixtures
"""

import argparse
import json
import os
import sys
import time
from datetime import date
from difflib import SequenceMatcher
from pathlib import Path

# The report uses Unicode box/check characters; Windows consoles default to
# cp1252 and crash on them. Force UTF-8 (errors=replace as a last resort).
for _stream in (sys.stdout, sys.stderr):
    if _stream.encoding and _stream.encoding.lower() not in ("utf-8", "utf8"):
        _stream.reconfigure(encoding="utf-8", errors="replace")

# ── sys.path setup (must happen before any app.* imports) ─────────────────────
# backend/eval/run_eval.py  →  parent = backend/eval/  →  parent.parent = backend/
_BACKEND = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_BACKEND))

# Load .env for local dev; CI injects secrets as env vars directly.
_env_file = _BACKEND / ".env"
if _env_file.exists():
    try:
        from dotenv import load_dotenv  # type: ignore[import]
        load_dotenv(_env_file)
    except ImportError:
        pass  # python-dotenv not installed — rely on env vars being set already

# Validate GOOGLE_API_KEY before importing the ingest module, which reads it at
# module level. A missing key produces a misleading import error otherwise.
if not os.getenv("GOOGLE_API_KEY"):
    print(
        "ERROR: GOOGLE_API_KEY is not set.\n"
        "  • local dev: add it to backend/.env\n"
        "  • CI: add it as a repository secret named GOOGLE_API_KEY",
        file=sys.stderr,
    )
    sys.exit(2)

try:
    from app.services.ingest import (
        INGEST_FALLBACK_MODEL,
        INGEST_MODEL,
        PROMPT_VERSION,
        run_ingest,
    )
    from app.schemas.ingest import IngestDraftOut
except Exception as exc:
    print(f"ERROR: failed to import ingest service — {exc}", file=sys.stderr)
    sys.exit(2)

# ── Field definitions ─────────────────────────────────────────────────────────

FIELDS = [
    "title",
    "format",
    "state",
    "venue",
    "start_date",
    "end_date",
    "registration_deadline",
    "prize_pool_rm",
    "max_teams",
    "registration_link",
]

# Free-text fields where a near-match is acceptable.
# Exact-match fields (dates, enums, ints, URLs) are not in this set.
FUZZY_FIELDS = {"title", "venue"}
FUZZY_THRESHOLD = 0.65   # SequenceMatcher ratio; catches extra/missing words in titles

DEFAULT_THRESHOLD = 0.85
DEFAULT_FIXTURES_DIR = Path(__file__).parent / "fixtures"

# ── Eval-runner rate / retry tuning ──────────────────────────────────────────
# Production traffic won't fire 25 requests in a few seconds, so these constants
# only live here and have no effect on ingest.py's runtime fallback behaviour.
#
# Why retry on "reliability" fallback (not just on exceptions)?
#   A transient 503 on the primary model causes LangChain's .with_fallbacks()
#   to fire immediately, consuming 2× quota.  If we detect that outcome
#   (fallback_reason="reliability") and retry the whole run_ingest() call, the
#   primary often succeeds on the next attempt — costing 1× quota instead of 2×,
#   and preventing the fallback's extra calls from draining quota and causing
#   429 cascades on subsequent fixtures.
#
# Quality fallbacks (fallback_reason="quality") are never retried — they reflect
# genuine model behaviour on this input, not a transient infrastructure issue.
EVAL_MAX_RETRIES: int = 2       # up to 2 retries after the initial attempt
EVAL_RETRY_DELAY_S: float = 2.5  # seconds between retry attempts
EVAL_FIXTURE_DELAY_S: float = 1.5  # seconds between fixtures to avoid quota bursts

# ── Scoring ───────────────────────────────────────────────────────────────────

PASSING_OUTCOMES = {"correct", "correct_null"}


def _norm(s: str) -> str:
    """Lowercase and collapse whitespace for robust string comparison."""
    return " ".join(s.strip().lower().split())


def _fuzzy_match(a: str, b: str) -> bool:
    return SequenceMatcher(None, _norm(a), _norm(b)).ratio() >= FUZZY_THRESHOLD


def _get_actual(result: IngestDraftOut, field: str):
    """Extract the guardrail-processed value from the draft, normalising dates to ISO."""
    val = getattr(result.draft, field)
    if val is None:
        return None
    if isinstance(val, date):
        return val.isoformat()
    return val


def score_field(field: str, expected, actual) -> str:
    """
    Score one (field, fixture) cell.

    Returns one of:
      correct_null  expected=null, actual=null      — correctly absent
      correct       expected=X,    actual≈X         — correctly extracted
      empty         expected=X,    actual=null      — missed (safe: human fills in)
      wrong         expected=X,    actual=Y≠X      — wrong value (risky: human may miss)
      spurious      expected=null, actual=Y         — hallucinated (null expected)
    """
    if expected is None and actual is None:
        return "correct_null"
    if expected is None:
        return "spurious"
    if actual is None:
        return "empty"
    # Both non-null — check match
    if field in FUZZY_FIELDS:
        return "correct" if _fuzzy_match(str(expected), str(actual)) else "wrong"
    # Integers: strict equality
    if isinstance(expected, (int, float)):
        return "correct" if expected == actual else "wrong"
    # Everything else (dates, enums, URLs, state): case-insensitive exact
    return "correct" if _norm(str(expected)) == _norm(str(actual)) else "wrong"


# ── Per-fixture runner ────────────────────────────────────────────────────────

def run_fixture(fixture: dict) -> dict:
    """
    Run one fixture through the ingest pipeline, with retry-on-transient-error,
    and score the result.

    Retry triggers (up to EVAL_MAX_RETRIES additional attempts):
      • exception          — both primary AND fallback failed (e.g. network down)
      • reliability fallback — primary errored, fallback handled it; retry to give
                               primary another chance so a one-off 503 doesn't
                               permanently consume 2× quota or cascade into 429s

    Never retried:
      • quality fallback   — primary succeeded but was low-confidence; that's
                             intended model behaviour, not a transient error

    elapsed in the returned dict covers the full wall-clock time including retries.
    """
    text = fixture["input"].get("text")
    t0 = time.monotonic()
    result = None
    error_msg = None

    for attempt in range(EVAL_MAX_RETRIES + 1):
        if attempt > 0:
            # Print inline so the retry appears on the same progress line.
            print(
                f"\n    ↳ retry {attempt}/{EVAL_MAX_RETRIES} "
                f"(transient error, waiting {EVAL_RETRY_DELAY_S:.0f}s)...",
                end=" ", flush=True,
            )
            time.sleep(EVAL_RETRY_DELAY_S)

        try:
            result = run_ingest(text=text)
            error_msg = None
        except Exception as exc:
            # Both primary and fallback failed — transient; retry if budget allows.
            result = None
            error_msg = str(exc)
            if attempt < EVAL_MAX_RETRIES:
                continue
            break  # retries exhausted

        # Call succeeded. Only retry if the fallback fired for reliability reasons
        # (primary hit a transient error).  Quality fallbacks are expected behaviour.
        if result.fallback_reason == "reliability" and attempt < EVAL_MAX_RETRIES:
            continue

        break  # primary succeeded, quality fallback, or retry budget exhausted

    elapsed = time.monotonic() - t0

    if result is None:
        return {
            "id": fixture["id"],
            "scores": {},
            "model_used": "error",
            "fallback_reason": None,
            "elapsed": elapsed,
            "error": error_msg,
        }

    expected = fixture["expected"]
    scores = {
        f: score_field(f, expected.get(f), _get_actual(result, f))
        for f in FIELDS
    }

    return {
        "id": fixture["id"],
        "scores": scores,
        "model_used": result.model_used,
        "fallback_reason": result.fallback_reason,
        "elapsed": elapsed,
        "error": None,
    }


# ── Report ────────────────────────────────────────────────────────────────────

_W = 72   # report width


def _line(char="─"):
    return char * _W


def print_report(fixture_results: list, threshold: float) -> float:
    """
    Print the full eval report to stdout.

    Returns the effective overall accuracy (errors count as all-wrong),
    which is what the exit-code threshold is compared against.
    """
    n = len(fixture_results)
    valid = [r for r in fixture_results if not r["error"]]
    errors = [r for r in fixture_results if r["error"]]

    # ── Aggregate per-field counts ─────────────────────────────────────────
    OUTCOMES = ("correct", "correct_null", "empty", "wrong", "spurious")
    field_stats: dict = {f: {o: 0 for o in OUTCOMES} for f in FIELDS}
    for r in valid:
        for f, outcome in r["scores"].items():
            field_stats[f][outcome] += 1

    total_passing = sum(
        field_stats[f][o] for f in FIELDS for o in PASSING_OUTCOMES
    )
    total_cells_valid = len(FIELDS) * len(valid)

    # Effective accuracy: errors count as 0 passing cells
    total_cells_all = len(FIELDS) * n
    effective_accuracy = total_passing / total_cells_all if total_cells_all else 0.0

    # ── Model usage ────────────────────────────────────────────────────────
    usage: dict = {"primary": 0, "fallback:quality": 0, "fallback:reliability": 0}
    for r in valid:
        if r["model_used"] == "primary":
            usage["primary"] += 1
        else:
            key = f"fallback:{r['fallback_reason'] or 'unknown'}"
            usage[key] = usage.get(key, 0) + 1

    # ── Header ────────────────────────────────────────────────────────────
    print()
    print("═" * _W)
    print(f"  ESPORTORIUM INGEST EVAL  •  prompt {PROMPT_VERSION}  •  {n} fixtures")
    print(f"  primary : {INGEST_MODEL}")
    print(f"  fallback: {INGEST_FALLBACK_MODEL}")
    print("═" * _W)

    # ── Per-fixture lines ─────────────────────────────────────────────────
    print("\nPer-fixture results:")
    for r in fixture_results:
        if r["error"]:
            print(f"  ✗ {r['id']:<42}  ERROR  {r['error'][:25]}")
            continue
        passing = sum(1 for v in r["scores"].values() if v in PASSING_OUTCOMES)
        total = len(r["scores"])
        icon = "✓" if passing == total else "~"
        model_tag = r["model_used"]
        if r["fallback_reason"]:
            model_tag = f"fallback:{r['fallback_reason']}"
        print(f"  {icon} {r['id']:<42}  {passing}/{total}  {model_tag:<24} ({r['elapsed']:.1f}s)")

    # ── Model usage summary ────────────────────────────────────────────────
    print(f"\nModel usage  ({len(valid)}/{n} fixtures completed):")
    for key, count in usage.items():
        bar = "█" * count + "░" * (n - count)
        print(f"  {key:<28} {count:>3}  {bar}")
    if errors:
        print(f"  {'errors':<28} {len(errors):>3}")

    # ── Per-field accuracy table ───────────────────────────────────────────
    nv = len(valid)
    print(f"\nPer-field accuracy  (n={nv} fixtures):")
    hdr = f"  {'Field':<28}  {'Correct':>7}  {'Empty':>5}  {'Wrong':>5}  {'Spuri':>5}  {'Acc.':>6}"
    print(hdr)
    print("  " + _line())

    for f in FIELDS:
        s = field_stats[f]
        passing_f = s["correct"] + s["correct_null"]
        acc = passing_f / nv if nv else 0.0
        flag = " ←" if acc < threshold else ""
        print(
            f"  {f:<28}  {passing_f:>7}  {s['empty']:>5}  {s['wrong']:>5}  {s['spurious']:>5}  {acc:>5.1%}{flag}"
        )

    print("  " + _line())
    total_empty = sum(field_stats[f]["empty"] for f in FIELDS)
    total_wrong = sum(field_stats[f]["wrong"] for f in FIELDS)
    total_spurious = sum(field_stats[f]["spurious"] for f in FIELDS)
    acc_valid = total_passing / total_cells_valid if total_cells_valid else 0.0
    print(
        f"  {'OVERALL (valid only)':<28}  {total_passing:>7}  {total_empty:>5}  "
        f"{total_wrong:>5}  {total_spurious:>5}  {acc_valid:>5.1%}"
    )
    if errors:
        print(
            f"  {'OVERALL (incl. errors)':<28}  {total_passing:>7}  {'—':>5}  "
            f"{'—':>5}  {'—':>5}  {effective_accuracy:>5.1%}"
        )

    # ── Outcome key ────────────────────────────────────────────────────────
    print()
    print("  Outcome key:")
    print("    correct = right value (or correctly null)   — passing")
    print("    empty   = model missed it  (safe: organiser fills in)")
    print("    wrong   = model wrong value  (risky: organiser may not notice)")
    print("    spuri   = hallucinated when null expected")
    print()
    print("  Model-upgrade signal: if empty >> wrong, Flash-Lite is good enough.")
    print("  If wrong is significant, upgrade INGEST_MODEL to the fallback model.")

    # ── Verdict ────────────────────────────────────────────────────────────
    print()
    print(_line("─"))
    print(f"  Threshold: {threshold:.0%}")
    print(f"  Effective accuracy (errors = all-wrong): {effective_accuracy:.1%}")
    print()
    if effective_accuracy >= threshold:
        print(f"  ✓  PASS")
    else:
        print(f"  ✗  FAIL  — accuracy {effective_accuracy:.1%} is below the {threshold:.0%} threshold")
        if total_wrong > total_empty:
            print(f"       ↳  wrong ({total_wrong}) > empty ({total_empty}): consider upgrading INGEST_MODEL")
        else:
            print(f"       ↳  empty ({total_empty}) > wrong ({total_wrong}): model misses fields, not wrong ones")
    print(_line("─"))
    print()

    return effective_accuracy


# ── Entry point ───────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Eval gate for the Esportorium ingest pipeline"
    )
    parser.add_argument(
        "--threshold",
        type=float,
        default=DEFAULT_THRESHOLD,
        help=f"Pass/fail threshold (default: {DEFAULT_THRESHOLD})",
    )
    parser.add_argument(
        "--fixtures",
        type=Path,
        default=DEFAULT_FIXTURES_DIR,
        help="Directory containing fixture JSON files",
    )
    args = parser.parse_args()

    fixture_paths = sorted(args.fixtures.glob("*.json"))
    if not fixture_paths:
        print(f"ERROR: No fixture files found in {args.fixtures}", file=sys.stderr)
        sys.exit(2)

    fixtures = []
    for path in fixture_paths:
        with open(path, encoding="utf-8") as fh:
            fixtures.append(json.load(fh))

    n_fixtures = len(fixtures)
    est_seconds = n_fixtures * (EVAL_FIXTURE_DELAY_S + 3)  # rough: 3s avg per LLM call
    print(
        f"\nLoaded {n_fixtures} fixtures. Running eval "
        f"(live LLM + {EVAL_FIXTURE_DELAY_S:.0f}s inter-fixture delay "
        f"≈ {est_seconds / 60:.0f}–{(est_seconds * 1.5) / 60:.0f} min)..."
    )
    results = []
    for i, fixture in enumerate(fixtures, 1):
        print(f"  [{i:>2}/{n_fixtures}] {fixture['id']}...", end=" ", flush=True)
        r = run_fixture(fixture)
        results.append(r)
        if r["error"]:
            print(f"ERROR: {r['error'][:50]}")
        else:
            passing = sum(1 for v in r["scores"].values() if v in PASSING_OUTCOMES)
            print(f"{passing}/{len(r['scores'])}  {r['model_used']}")
        # Pace requests to stay below Gemini's per-minute quota.
        # Skip the delay after the last fixture — no next call to protect.
        if i < n_fixtures:
            time.sleep(EVAL_FIXTURE_DELAY_S)

    accuracy = print_report(results, args.threshold)
    sys.exit(0 if accuracy >= args.threshold else 1)


if __name__ == "__main__":
    main()
