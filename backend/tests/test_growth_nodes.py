"""Tests for the assemble_context and generate nodes (app/ai_growth/nodes.py).

Two tiers:
- Mocked (default): no network, no real Gemini, no real DB — tournament_tool,
  the recent-posts query, and harness.generate are all monkeypatched.
- Live (@pytest.mark.live, manual): real context files, real dev-DB
  tournaments, one real Gemini call. Run with `pytest -m live -s` to read the
  drafts; skipped when GOOGLE_API_KEY is unset. The "live" marker is not
  registered in an ini file (the repo has none), so the unknown-mark warning
  is filtered here.
"""

import os
import warnings

import pytest

warnings.filterwarnings("ignore", category=pytest.PytestUnknownMarkWarning)

from app.ai_growth import nodes  # noqa: E402
from app.schemas.growth import ThreadsBatch, ThreadsPost, TikTokScript  # noqa: E402

# ─── Fixtures ─────────────────────────────────────────────────────────────────

_FIXTURE_TOURNAMENTS = [
    {
        "title": "Test Cup Kedah",
        "status": "upcoming",
        "format": "offline",
        "state": "Kedah",
        "venue": "Dewan Test, Alor Setar",
        "stage_notes": None,
        "dates": {"start": "2026-07-25", "end": "2026-07-26"},
        "registration_deadline": "2026-07-23",
        "prize_pool_rm": 1000,
        "additional_prizes": [],
        "max_teams": 32,
        "registration_link": "https://example.com/register",
    },
    {
        "title": "Online Clash",
        "status": "current",
        "format": "online",
        "state": None,
        "venue": None,
        "stage_notes": "Finals offline, venue TBA",
        "dates": {"start": "2026-07-18", "end": "2026-07-20"},
        "registration_deadline": None,
        "prize_pool_rm": 500,
        "additional_prizes": ["skin codes"],
        "max_teams": None,
        "registration_link": None,
    },
]


@pytest.fixture
def context_dir(tmp_path):
    files = {
        "brand.md": "Esportorium is a curated MLBB tournament directory.",
        "audience.md": "Malaysian MLBB players and organisers.",
        "rules.md": "No corporate speak. Max 2 hashtags.",
        "voice_examples.md": "contoh post: 'siapa main weekend ni?'",
        "trends.md": "### [2026-07-19] test patch\nHero X nerfed on cooldowns.",
    }
    for name, text in files.items():
        (tmp_path / name).write_text(text, encoding="utf-8")
    return tmp_path


@pytest.fixture
def assembled_state(context_dir, monkeypatch):
    monkeypatch.setattr(
        nodes.tournament_tool,
        "get_active_tournaments",
        lambda days_ahead=30: _FIXTURE_TOURNAMENTS,
    )
    monkeypatch.setattr(nodes, "_recent_published_posts", lambda limit=5: [])

    update = nodes.assemble_context({}, context_dir=context_dir)
    return {
        **update,
        "drafts": [],
        "evaluations": [],
        "retry_count": 0,
        "final_posts": [],
        "run_summary": "",
    }


def _valid_batch() -> ThreadsBatch:
    return ThreadsBatch(
        threads=[
            ThreadsPost(
                topic="deadline nudge",
                pillar="utility",
                language="bm",
                content="Test Cup Kedah tutup register 23 Julai. 32 slot je.",
            ),
            ThreadsPost(
                topic="patch riff",
                pillar="scene_trend",
                language="bm",
                content="Hero X kena nerf. Draft weekend ni lain macam sikit.",
            ),
            ThreadsPost(
                topic="scrim confession",
                pillar="relatable",
                language="bm",
                content="Scrim jam 12 malam, esok kerja. Kita semua sama.",
            ),
        ],
        tiktoks=[
            TikTokScript(
                topic="patch riff",
                pillar="scene_trend",
                language="bm",
                hook="Hero X lepas patch ni...",
                scenes=["scene 1", "scene 2"],
                cta="Check tournament list kat bio.",
            ),
            TikTokScript(
                topic="weekend tournament",
                pillar="utility",
                language="bm",
                hook="Weekend ni ada tournament kat Kedah.",
                scenes=["scene 1"],
                cta="Link register kat bio.",
            ),
        ],
    )


# ─── Mocked tests (default — no network, no DB) ───────────────────────────────

def test_assemble_context_mocked(assembled_state):
    for field in ("brand", "audience", "rules", "voice_examples", "trends"):
        assert assembled_state[field].strip(), f"{field} should be non-empty"
    assert assembled_state["tournaments"] == _FIXTURE_TOURNAMENTS
    assert assembled_state["recent_posts"] == []


def test_generate_mocked(assembled_state, monkeypatch):
    calls = []

    def fake_generate(*, prompt, schema, purpose, prompt_version):
        calls.append(
            {
                "prompt": prompt,
                "schema": schema,
                "purpose": purpose,
                "prompt_version": prompt_version,
            }
        )
        return _valid_batch()

    monkeypatch.setattr(nodes.harness, "generate", fake_generate)

    result = nodes.generate(assembled_state)

    # Exactly one harness call, with the right routing metadata.
    assert len(calls) == 1
    call = calls[0]
    assert call["purpose"] == "generate"
    assert call["prompt_version"] == "GENERATE_V1"
    assert call["schema"] is ThreadsBatch

    # Every format slot was filled — no literal placeholders survive.
    for slot in (
        "{brand}",
        "{audience}",
        "{rules}",
        "{voice_examples}",
        "{tournaments}",
        "{trends}",
        "{recent_posts}",
        "{retry_feedback}",
    ):
        assert slot not in call["prompt"], f"unfilled slot {slot} in prompt"

    # Flattened drafts: 3 threads first, then 2 tiktoks.
    drafts = result["drafts"]
    assert len(drafts) == 5
    assert [d["platform"] for d in drafts] == ["threads"] * 3 + ["tiktok"] * 2
    for tiktok in drafts[3:]:
        assert isinstance(tiktok["scenes"], list)


# ─── Live test (manual: pytest -m live -s) ────────────────────────────────────

@pytest.mark.live
@pytest.mark.skipif(
    not os.getenv("GOOGLE_API_KEY"), reason="GOOGLE_API_KEY not set — live test is manual"
)
def test_generate_live():
    """Real context files, real dev-DB tournaments, one real Gemini call.
    Prints every draft so a human can judge the voice with `-s`."""
    state = {
        **nodes.assemble_context({}),
        "drafts": [],
        "evaluations": [],
        "retry_count": 0,
        "final_posts": [],
        "run_summary": "",
    }

    result = nodes.generate(state)
    drafts = result["drafts"]

    assert len(drafts) == 5
    assert [d["platform"] for d in drafts] == ["threads"] * 3 + ["tiktok"] * 2

    for i, d in enumerate(drafts, 1):
        print(f"\n--- draft {i} [{d['platform']} | {d['pillar']} | {d['language']}] ---")
        if d["platform"] == "threads":
            print(d["content"])
        else:
            print(f"HOOK: {d['hook']}")
            for n, scene in enumerate(d["scenes"], 1):
                print(f"SCENE {n}: {scene}")
            print(f"CTA: {d['cta']}")
