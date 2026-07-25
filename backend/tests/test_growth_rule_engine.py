"""Rule engine tests — evaluate stage 1 (spec: backend/specs/growth-phase-1.md).

Pure code: no API calls, no database, no mocks. This is the cheap gate that
runs before any draft costs a judge call, so it has to be exactly right about
what it rejects and — just as important — what it lets through.
"""

from pathlib import Path

import pytest

from app.ai_growth.nodes import check_draft, parse_banned_phrases

_REAL_RULES = Path(__file__).parents[1] / "app" / "ai_growth" / "context" / "rules.md"


def _threads(content: str) -> dict:
    return {
        "platform": "threads",
        "topic": "t",
        "pillar": "utility",
        "language": "bm",
        "content": content,
    }


def _tiktok(hook="Hook line", scenes=("Scene one", "Scene two"), cta="Link kat bio.") -> dict:
    return {
        "platform": "tiktok",
        "topic": "t",
        "pillar": "relatable",
        "language": "bm",
        "hook": hook,
        "scenes": list(scenes),
        "cta": cta,
    }


# ─── parse_banned_phrases ─────────────────────────────────────────────────────

def test_parses_bullets_under_the_banned_heading():
    rules = """# Rules

## Tone
- this bullet is prose, not a ban

## Banned phrases

- jom sertai
- Don't Miss Out
"""
    assert parse_banned_phrases(rules) == ["jom sertai", "don't miss out"]


def test_stops_at_the_next_section():
    rules = """## Banned phrases

- banned one

## Something else

- not a banned phrase
"""
    assert parse_banned_phrases(rules) == ["banned one"]


def test_missing_section_yields_no_phrases():
    assert parse_banned_phrases("# Rules\n\nNo banned section here.\n") == []


def test_real_rules_file_parses_and_excludes_prose_bullets():
    """The Pronouns section above the heading is also a '- ' bullet list — the
    parser must not treat those as bans."""
    phrases = parse_banned_phrases(_REAL_RULES.read_text(encoding="utf-8"))

    assert len(phrases) > 15
    assert "jom sertai" in phrases
    assert "don't miss out" in phrases
    # Pronoun bullets live above the heading and carry markdown bold.
    assert not any("korang" in p for p in phrases)
    assert not any("**" in p for p in phrases)


# ─── banned phrases ───────────────────────────────────────────────────────────

def test_clean_threads_post_passes():
    assert check_draft(_threads("PEC 2026 kat Pahang dah masuk listing."), ["jom sertai"]) == []


def test_banned_phrase_is_caught_case_insensitively():
    reasons = check_draft(_threads("JOM SERTAI sekarang"), ["jom sertai"])
    assert len(reasons) == 1
    assert "jom sertai" in reasons[0]


def test_banned_phrase_is_caught_inside_a_tiktok_script():
    """TikTok text lives in hook/scenes/cta, not `content` — all three are checked."""
    assert check_draft(_tiktok(scenes=("jom sertai now", "b")), ["jom sertai"]) != []
    assert check_draft(_tiktok(hook="jom sertai"), ["jom sertai"]) != []
    assert check_draft(_tiktok(cta="jom sertai"), ["jom sertai"]) != []


# ─── length and hashtags ──────────────────────────────────────────────────────

@pytest.mark.parametrize("length,expect_fail", [(500, False), (501, True)])
def test_threads_length_boundary(length, expect_fail):
    reasons = check_draft(_threads("x" * length), [])
    assert bool(reasons) is expect_fail


@pytest.mark.parametrize("count,expect_fail", [(0, False), (2, False), (3, True)])
def test_hashtag_ceiling(count, expect_fail):
    content = "post " + " ".join(f"#tag{i}" for i in range(count))
    reasons = check_draft(_threads(content), [])
    assert bool(reasons) is expect_fail


def test_length_limit_does_not_apply_to_tiktok_scripts():
    """The 500-char cap is a Threads rule; a script is judged on structure."""
    assert check_draft(_tiktok(hook="x" * 600), []) == []


# ─── TikTok script structure ──────────────────────────────────────────────────

def test_valid_script_passes():
    assert check_draft(_tiktok(), []) == []


def test_missing_hook_fails():
    assert any("hook" in r for r in check_draft(_tiktok(hook="   "), []))


def test_missing_cta_fails():
    assert any("CTA" in r for r in check_draft(_tiktok(cta=""), []))


def test_no_scenes_fails():
    assert any("scenes" in r for r in check_draft(_tiktok(scenes=()), []))


@pytest.mark.parametrize("n,expect_fail", [(1, False), (3, False), (4, True)])
def test_scene_ceiling(n, expect_fail):
    reasons = check_draft(_tiktok(scenes=tuple(f"scene {i}" for i in range(n))), [])
    assert bool(reasons) is expect_fail


def test_blank_scenes_do_not_count_toward_the_ceiling():
    assert check_draft(_tiktok(scenes=("a", "  ", "b", "", "c")), []) == []


def test_all_failures_are_reported_together():
    """One pass returns every reason — a human editing a prompt wants the whole
    list, not the first thing that tripped."""
    draft = _threads("jom sertai " + "#a #b #c " + "x" * 520)
    reasons = check_draft(draft, ["jom sertai"])
    assert len(reasons) == 3
