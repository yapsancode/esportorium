"""CLI for the AI Growth Engine (spec: backend/specs/growth-phase-1.md §"CLI").

    python -m app.ai_growth.run generate   # run the graph once, print the summary
    python -m app.ai_growth.run review     # approve / reject / edit drafts
    python -m app.ai_growth.run stats      # cost + reliability from growth_llm_calls

Phase 1 is deliberately CLI-only: no routers, no endpoints, no scheduler.
Publishing stays manual — this tool ends at "a human approved the text".
"""

import argparse
import os
import subprocess
import sys
import tempfile
from datetime import datetime
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import case, func

from app.ai_growth import graph
from app.database import SessionLocal
from app.models.growth import GrowthGeneratedPost, GrowthLLMCall

_RULE = "─" * 70


# ─── generate ─────────────────────────────────────────────────────────────────

def cmd_generate(args: argparse.Namespace) -> int:
    """Run the graph once. The store node prints the run summary."""
    started = datetime.utcnow()
    state = graph.run_once(run_started_at=started)

    kept = sum(1 for p in state.get("final_posts", []) if p["status"] == "draft")
    if kept:
        print(f"\n{kept} draft(s) ready — review them with:")
        print("    python -m app.ai_growth.run review")
    return 0


# ─── review ───────────────────────────────────────────────────────────────────

def _edit_text(initial: str) -> str:
    """Open the draft in $EDITOR and return what came back."""
    editor = os.getenv("EDITOR") or ("notepad" if os.name == "nt" else "vi")
    with tempfile.NamedTemporaryFile(
        "w+", suffix=".md", delete=False, encoding="utf-8"
    ) as handle:
        handle.write(initial)
        path = handle.name
    try:
        subprocess.call([editor, path])
        return Path(path).read_text(encoding="utf-8").strip()
    finally:
        os.unlink(path)


def _print_post(index: int, total: int, post: GrowthGeneratedPost) -> None:
    print(f"\n{_RULE}")
    print(
        f"[{index}/{total}]  {post.platform} · {post.pillar} · {post.language}"
        f"  ({post.prompt_version}, retries={post.retry_count})"
    )
    print(_RULE)
    print(post.content)
    if post.scores:
        scores = "  ".join(f"{k}={v}" for k, v in sorted(post.scores.items()))
        print(f"\nscores: {scores}")
    if post.evaluation:
        print(f"judge : {post.evaluation}")


def cmd_review(args: argparse.Namespace) -> int:
    db = SessionLocal()
    try:
        posts = (
            db.query(GrowthGeneratedPost)
            .filter(GrowthGeneratedPost.status == args.status)
            .order_by(GrowthGeneratedPost.created_at.desc())
            .all()
        )
        if not posts:
            print(f"no posts with status '{args.status}'")
            return 0

        print(f"{len(posts)} post(s) with status '{args.status}'")
        for index, post in enumerate(posts, start=1):
            _print_post(index, len(posts), post)

            while True:
                choice = input(
                    "\n[a]pprove  [r]eject  [e]dit  [p]ublish  [s]kip  [q]uit > "
                ).strip().lower()

                if choice in ("s", ""):
                    break
                if choice == "q":
                    db.commit()
                    print("stopped.")
                    return 0
                if choice == "a":
                    post.status = "approved"
                    db.commit()
                    print("→ approved")
                    break
                if choice == "p":
                    # Marks a post as actually posted. Not in the spec's three
                    # actions, but nothing else sets 'published', and
                    # assemble_context's "don't repeat" memory reads exactly
                    # that status — without this the memory is always empty.
                    post.status = "published"
                    db.commit()
                    print("→ published")
                    break
                if choice == "r":
                    reason = input("one-line reason (required): ").strip()
                    if not reason:
                        print("a reason is required to reject.")
                        continue
                    post.status = "rejected"
                    post.reject_reason = reason
                    db.commit()
                    print("→ rejected")
                    break
                if choice == "e":
                    edited = _edit_text(post.content)
                    if edited and edited != post.content:
                        post.content = edited
                        db.commit()
                        print("→ edited")
                        _print_post(index, len(posts), post)
                    else:
                        print("unchanged.")
                    continue
                print("unrecognised option.")

        db.commit()
        return 0
    finally:
        db.close()


# ─── stats ────────────────────────────────────────────────────────────────────

def cmd_stats(args: argparse.Namespace) -> int:
    db = SessionLocal()
    try:
        rows = (
            db.query(
                GrowthLLMCall.prompt_version,
                func.count().label("calls"),
                func.sum(case((GrowthLLMCall.success, 1), else_=0)).label("ok"),
                func.avg(GrowthLLMCall.retries).label("avg_retries"),
                func.sum(GrowthLLMCall.est_cost_usd).label("cost"),
                func.sum(GrowthLLMCall.input_tokens).label("tok_in"),
                func.sum(GrowthLLMCall.output_tokens).label("tok_out"),
            )
            .group_by(GrowthLLMCall.prompt_version)
            .order_by(GrowthLLMCall.prompt_version)
            .all()
        )
        if not rows:
            print("no growth_llm_calls rows yet — run `generate` first.")
            return 0

        print(f"\n{'prompt_version':<16} {'calls':>6} {'success':>8} "
              f"{'avg retries':>12} {'tokens':>16} {'est cost':>11}")
        print(_RULE)
        total_cost = 0.0
        for row in rows:
            cost = float(row.cost or 0)
            total_cost += cost
            success_rate = (row.ok or 0) / row.calls * 100 if row.calls else 0
            tokens = f"{row.tok_in or 0}/{row.tok_out or 0}"
            print(
                f"{row.prompt_version:<16} {row.calls:>6} {success_rate:>7.0f}% "
                f"{float(row.avg_retries or 0):>12.2f} {tokens:>16} {cost:>10.6f}"
            )
        print(_RULE)

        # No run_id column in Phase 1, so a true per-run cost isn't recoverable.
        # Generation attempts are the closest honest denominator: one per pass
        # through the generate node.
        attempts = (
            db.query(func.count())
            .select_from(GrowthLLMCall)
            .filter(GrowthLLMCall.purpose == "generate")
            .scalar()
        ) or 0
        print(f"total est cost: ${total_cost:.6f}")
        if attempts:
            print(
                f"generation attempts: {attempts}  "
                f"(≈ ${total_cost / attempts:.6f} per attempt)"
            )
        return 0
    finally:
        db.close()


# ─── entry point ──────────────────────────────────────────────────────────────

def main(argv: list[str] | None = None) -> int:
    load_dotenv(Path(__file__).resolve().parents[2] / ".env")

    parser = argparse.ArgumentParser(
        prog="python -m app.ai_growth.run", description=__doc__
    )
    sub = parser.add_subparsers(dest="command", required=True)

    sub.add_parser("generate", help="run the graph once and store the drafts")

    review = sub.add_parser("review", help="approve / reject / edit stored drafts")
    review.add_argument(
        "--status",
        default="draft",
        choices=["draft", "approved", "rejected", "published"],
        help="which posts to review (default: draft)",
    )

    sub.add_parser("stats", help="cost and reliability from growth_llm_calls")

    args = parser.parse_args(argv)
    handlers = {
        "generate": cmd_generate,
        "review": cmd_review,
        "stats": cmd_stats,
    }
    return handlers[args.command](args)


if __name__ == "__main__":
    sys.exit(main())
