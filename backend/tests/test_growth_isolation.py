"""Isolation proof for the AI Growth Engine (spec: backend/specs/growth-phase-1.md).

Two guarantees, both of them load-bearing:

1. `tournament_tool` is strictly read-only and only ever sees approved rows —
   the growth subsystem must not be able to mutate the product's data.
2. Growth code imports no tournament/organiser service or router, and no file
   except harness.py imports an LLM client.

Both are checked mechanically rather than by review, because they are the kind
of rule that quietly erodes: one convenient import and the boundary is gone.
"""

import ast
from pathlib import Path

import pytest
from sqlalchemy import event
from sqlalchemy.engine import Engine

from app.ai_growth import tournament_tool

_GROWTH_DIR = Path(__file__).parents[1] / "app" / "ai_growth"

# Product code the growth subsystem must never reach into. Reading tournaments
# is allowed — but only through tournament_tool, never a service or router.
_FORBIDDEN_PREFIXES = ("app.services", "app.routers")

# Spec hard rule: "no file other than harness.py may import an LLM client/SDK".
# langgraph is deliberately absent — it's workflow wiring, not a model client.
_LLM_SDK_PREFIXES = (
    "langchain_google_genai",
    "langchain_anthropic",
    "langchain_openai",
    "google.generativeai",
    "google.genai",
    "anthropic",
    "openai",
)

_WRITE_KEYWORDS = ("INSERT", "UPDATE", "DELETE", "DROP", "ALTER", "TRUNCATE", "CREATE")


def _imported_modules(path: Path) -> set[str]:
    """Every absolute module name imported by a file, including lazy imports
    inside functions (harness.py imports its SDK that way)."""
    tree = ast.parse(path.read_text(encoding="utf-8"))
    modules: set[str] = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            modules.update(alias.name for alias in node.names)
        elif isinstance(node, ast.ImportFrom) and node.module and node.level == 0:
            modules.add(node.module)
    return modules


def _growth_files() -> list[Path]:
    files = sorted(_GROWTH_DIR.glob("*.py"))
    assert files, "no growth source files found — check the path"
    return files


@pytest.fixture
def captured_sql():
    """Every SQL statement executed while the fixture is active."""
    statements: list[str] = []

    def listener(conn, cursor, statement, parameters, context, executemany):
        statements.append(statement)

    event.listen(Engine, "before_cursor_execute", listener)
    try:
        yield statements
    finally:
        event.remove(Engine, "before_cursor_execute", listener)


# ─── 1. tournament_tool is read-only ──────────────────────────────────────────

def test_tournament_tool_issues_only_selects(captured_sql):
    tournament_tool.get_active_tournaments(days_ahead=30)

    assert captured_sql, "no SQL captured — the tool didn't reach the database"
    for statement in captured_sql:
        first_word = statement.lstrip().split(None, 1)[0].upper()
        assert first_word == "SELECT", f"non-SELECT statement issued: {statement!r}"


def test_tournament_tool_never_emits_a_write(captured_sql):
    tournament_tool.get_active_tournaments(days_ahead=30)

    for statement in captured_sql:
        upper = statement.upper()
        for keyword in _WRITE_KEYWORDS:
            assert f"{keyword} " not in upper, f"{keyword} appeared in: {statement!r}"


def test_tournament_tool_filters_on_is_approved(captured_sql):
    """Public-facing convention: growth content may only ever cite approved rows."""
    tournament_tool.get_active_tournaments(days_ahead=30)

    assert any("is_approved" in s for s in captured_sql), (
        "no is_approved filter in the emitted SQL"
    )


def test_returned_tournaments_are_active_only():
    for tournament in tournament_tool.get_active_tournaments(days_ahead=30):
        assert tournament["status"] in ("upcoming", "current")


# ─── 2. import boundaries ─────────────────────────────────────────────────────

def test_growth_code_imports_no_product_service_or_router():
    offenders = [
        (path.name, module)
        for path in _growth_files()
        for module in _imported_modules(path)
        if module.startswith(_FORBIDDEN_PREFIXES)
    ]
    assert not offenders, f"growth code reached into product code: {offenders}"


def test_only_the_harness_imports_an_llm_client():
    offenders = [
        (path.name, module)
        for path in _growth_files()
        if path.name != "harness.py"
        for module in _imported_modules(path)
        if module.startswith(_LLM_SDK_PREFIXES)
    ]
    assert not offenders, f"LLM SDK imported outside harness.py: {offenders}"


def test_the_harness_really_is_the_seam():
    """Guards the test above from silently passing if harness.py stopped being
    the file that talks to the model."""
    modules = _imported_modules(_GROWTH_DIR / "harness.py")
    assert any(module.startswith(_LLM_SDK_PREFIXES) for module in modules)
