"""LangGraph wiring for the AI Growth Engine.

Spec: backend/specs/growth-phase-1.md §"The workflow".

    assemble_context → generate → evaluate ──all pass──→ store → END
                           ▲            │
                           └─any fail───┘   retry ≤ 2

The retry edge is the whole point of using a graph here: a rejected batch goes
back to generation carrying the evaluator's reasons (nodes._build_retry_feedback),
and after the budget is spent the failing drafts are stored as 'rejected' rather
than dropped.

This file imports no LLM client — every model call is inside nodes → harness.
"""

from datetime import datetime
from typing import Optional

from langgraph.graph import END, StateGraph

from app.ai_growth import nodes
from app.ai_growth.state import GrowthState

# Spec: "retry ≤ 2". Counts regenerations, not total generate calls — a run that
# exhausts the budget calls generate three times (1 initial + 2 retries).
#
# Unrelated to harness._MAX_VALIDATION_RETRIES, which re-asks the model when the
# JSON doesn't fit the schema. This one re-asks because a judge rejected valid JSON.
MAX_RETRIES = 2


def route_after_evaluate(state: GrowthState) -> str:
    """All drafts pass → store. Any fail → regenerate, until the budget is spent.

    Spending the budget still routes to store: the spec requires failing drafts
    to be persisted as 'rejected', so there is no path where a draft is silently
    discarded.
    """
    evaluations = state.get("evaluations") or []
    if evaluations and all(ev.get("passed") for ev in evaluations):
        return "store"
    if state.get("retry_count", 0) >= MAX_RETRIES:
        return "store"
    return "generate"


def build_graph(run_started_at: Optional[datetime] = None):
    """Compile the growth graph.

    Args:
        run_started_at: start of this run, bound into the store node so its
            summary totals only count the growth_llm_calls rows this run wrote.
            Bound here via a closure rather than carried in GrowthState, because
            the spec fixes GrowthState's fields.
    """
    started = run_started_at or datetime.utcnow()

    workflow = StateGraph(GrowthState)
    workflow.add_node("assemble_context", nodes.assemble_context)
    workflow.add_node("generate", nodes.generate)
    workflow.add_node("evaluate", nodes.evaluate)
    workflow.add_node("store", lambda state: nodes.store(state, run_started_at=started))

    workflow.set_entry_point("assemble_context")
    workflow.add_edge("assemble_context", "generate")
    workflow.add_edge("generate", "evaluate")
    workflow.add_conditional_edges(
        "evaluate",
        route_after_evaluate,
        {"generate": "generate", "store": "store"},
    )
    workflow.add_edge("store", END)

    return workflow.compile()


def run_once(run_started_at: Optional[datetime] = None) -> dict:
    """Execute the graph once and return the final state."""
    started = run_started_at or datetime.utcnow()
    graph = build_graph(run_started_at=started)
    # Only the pipeline fields need seeding — assemble_context fills the rest.
    return graph.invoke(
        {"drafts": [], "evaluations": [], "retry_count": 0, "final_posts": []}
    )
