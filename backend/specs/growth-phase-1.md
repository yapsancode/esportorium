# Phase 1 Spec — AI Growth Engine (Generate, Don't Publish)

Status: approved for build · Owner: founder · Version: 1.0 (2026-07-14)

## Goal

From live tournament data + brand knowledge + curated trends, generate
evaluated Threads posts and TikTok scripts, stored in Postgres for human
review and manual publishing.

Success (week 1): 10 real drafts generated, at least 5 published manually,
none reading as AI-generated, zero hallucinated tournament facts, and
content creation time drops from hours to ~20 minutes of review.

Explicit non-goal: automation of publishing. The bottleneck being solved
is ideation + drafting, not posting.

## Where code lives (follows existing repo conventions)

```
backend/app/models/growth.py       # all 5 SQLAlchemy models (growth_ prefix)
backend/app/schemas/growth.py      # Pydantic: ThreadsPost, TikTokScript,
                                   # ThreadsBatch, DraftEvaluation
backend/app/ai_growth/             # the subsystem (flat, no nested pkgs)
    context/
        brand.md  audience.md  rules.md  voice_examples.md  trends.md
    harness.py                     # the ONLY file that imports an LLM client
    tournament_tool.py             # read-only query on tournaments table
    prompts.py                     # every prompt, version-tagged
    state.py                       # GrowthState TypedDict
    nodes.py                       # assemble_context / generate / evaluate / store
    graph.py                       # LangGraph wiring incl. retry edge
    run.py                         # CLI: python -m app.ai_growth.run <cmd>
backend/specs/growth-phase-1.md    # this file
```

Rules inherited from the main repo:
- Schema changes go through Alembic (`alembic revision --autogenerate`,
  review, `upgrade head`). Never hand-written SQL, never the frozen
  `backend/migrations/` folder.
- New code must not modify tournament/organiser models, services, routers,
  or any public endpoint. `tournament_tool.py` is strictly read-only.
- Reuse `app/database.py` session/Base and `app/observability.py`.

## Data model (5 tables, all `growth_` prefixed)

**growth_content_ideas** — id, topic (text), pillar (enum: utility |
scene_trend | relatable | build_in_public), source (enum: agent | human),
created_at.

**growth_generated_posts** — id, idea_id FK, platform (enum: threads |
tiktok), content (text), language (enum: bm | manglish | en),
pillar (enum, as above), scores (JSONB), evaluation (text, judge
reasoning), retry_count (int, default 0), status (enum: draft | approved |
rejected | published, default draft), reject_reason (text, human-written),
prompt_version (string), created_at, updated_at.

**growth_performance_metrics** — id, post_id FK, views, likes, replies,
shares, clicks (all nullable ints), recorded_at. Filled manually in
Phase 1.

**growth_learnings** — id, observation (text), source (enum: human |
agent), created_at. Human-written in Phase 1.

**growth_llm_calls** — id, purpose (enum: generate | evaluate), model,
prompt_version, input_tokens, output_tokens, est_cost_usd numeric(10,6),
latency_ms, retries, success (bool), error (text nullable), created_at.

## The harness (`harness.py`)

One public function:

```python
generate(prompt: str, schema: type[BaseModel], purpose: str,
         prompt_version: str) -> BaseModel
```

Responsibilities (all of them, in this one file):
1. Model selection. Phase 1 default: Gemini `gemini-2.5-flash` via the
   existing GOOGLE_API_KEY — reuses the provider, billing, and pricing
   pattern already proven in services/ingest.py. Model + provider read
   from env: GROWTH_MODEL (default gemini-2.5-flash). Swapping generation
   to Claude later (if week-1 human_feel scores are weak on BM/Manglish
   voice) must be an env/config change plus at most one function, touched
   nowhere else.
2. JSON-only output, validated against the given Pydantic schema. On
   validation failure: retry ONCE with the validation error appended.
3. Observability, matching the ingest pipeline's pattern: open a
   `growth.generate` OTel span per call with token counts, estimated USD
   cost (copy the pricing-constant approach from services/ingest.py), and
   purpose; AND insert one row into growth_llm_calls (including failures).
4. Raise clean typed exceptions; no other module handles raw API errors.

Hard rule: no file other than harness.py may import an LLM client/SDK.

Deliberate non-goals: no multi-provider abstraction layer, no BaseProvider
classes, no model registry. One thin file.

## The workflow (LangGraph)

State (`state.py`):

```python
class GrowthState(TypedDict):
    brand_context: str        # knowledge: brand + audience + rules
    voice_examples: str       # knowledge: few-shot tone anchor
    trends: str               # live: trends.md
    tournaments: list[dict]   # live: tournament_tool
    recent_posts: list[str]   # memory: last 5 published (don't repeat)
    drafts: list[dict]
    evaluations: list[dict]
    retry_count: int
    final_posts: list[dict]
    run_summary: str
```

Graph:

```
assemble_context → generate → evaluate ──all pass──→ store → END
                       ▲            │
                       └─any fail───┘  (retry ≤ 2, evaluator reasons
                                        injected into retry_feedback;
                                        after 2 retries, failing drafts
                                        stored as status='rejected')
```

**assemble_context** — deterministic, no LLM. Loads the 5 context files,
calls tournament_tool.get_active_tournaments(days_ahead=30) (approved
tournaments only, upcoming/current per the derived-status convention,
returns title, status, format, state, dates, registration_deadline,
prize_pool_rm, additional_prizes, max_teams, registration_link), pulls
last 5 published growth posts.

**generate** — one harness.generate() call (purpose="generate").
Output: 3 Threads posts spread across at least 2 different pillars +
2 TikTok scripts (at least 1 riffing on a trend from trends.md), as a
validated ThreadsBatch. Prompt embeds: scoped grounding rule,
banned-phrase list, content pillars, voice_examples.md as few-shot
anchors, recent_posts as "don't repeat", and a retry_feedback slot
(empty string on first attempt).

**evaluate** — a pipeline, cheapest first:
1. Rule engine in pure Python (no LLM): banned-phrase substring match
   (list sourced from rules.md), Threads ≤ 500 chars, ≤ 2 hashtags,
   TikTok script has hook + ≤3 scenes + CTA. Any hit = fail with reason;
   failed drafts skip the judge.
2. LLM judge via harness.generate() (purpose="evaluate", prompt
   evaluate_v1): receives ONLY rules.md + voice_examples.md + surviving
   drafts (never the generation prompt). Returns per draft: brand_fit,
   hook_strength, grounding, human_feel, cta_strength, language_fit
   (0–10 floats), verdict (pass|fail), reasoning.
3. Auto-fail: any rule-engine hit; grounding < 10 for drafts making
   factual tournament claims; human_feel < 7.

**store** — no LLM. Writes ideas, drafts, evaluations, retry_count,
prompt_version. Prints run summary including totals from this run's
growth_llm_calls rows (calls, tokens, est cost, wall time).

Scoped grounding (definition used everywhere): factual tournament claims
(title, date, state, deadline, prize, venue) must exist in the provided
tournament data. Creative/opinion/meme/trend content is exempt, but must
never present fiction as fact.

## CLI (`run.py`)

- `generate` — run the graph once, print summary
- `review` — list draft posts; approve / reject (requires a one-line
  reason → reject_reason) / edit; updates status
- `stats` — from growth_llm_calls: cost per run, success rate, avg
  retries, grouped by prompt_version

## Prompts (`prompts.py`)

Every prompt is a named, version-tagged constant (e.g. GENERATE_V1,
EVALUATE_V1) with a date comment. prompt_version is recorded on every
llm_calls row and every generated post. Bumping a prompt = new constant,
old one kept for reference.

## Testing

pytest (backend/tests/, runs with the existing suite):
- test_growth_rule_engine.py — banned phrases, length, hashtag count,
  script structure (pure code, no API)
- test_growth_harness.py — schema-validation retry path and llm_calls
  logging, with the LLM client mocked
- test_growth_isolation.py — tournament_tool issues only SELECTs;
  growth code imports no tournament/organiser services

Future (not Phase 1): an eval gate mirroring backend/eval/ — fixture
drafts scored by the judge, CI threshold. Note the symmetry with the
ingest eval; build it in Phase 2.

## Environment additions (backend/.env)

```
GROWTH_MODEL=gemini-2.5-flash     # harness default; change to swap models
# GOOGLE_API_KEY already present (ingest)
# ANTHROPIC_API_KEY=              # only if/when generation swaps to Claude
```

## Out of scope — do not build any of this

- Publishing APIs, OAuth, schedulers, cron, webhooks
- New FastAPI routers/endpoints (CLI only in Phase 1)
- Multiple agents, multi-provider abstractions, pgvector, embeddings
- Dashboards or tracing UIs (growth_llm_calls + existing OTel is the
  observability)
- Any UI beyond the CLI review command
- Frontend changes of any kind
- Docker/Cloud Run changes (runs locally against dev DB)

## Hard requirements checklist

- [ ] Nodes never import an LLM client — harness only
- [ ] Retry loop bounded at 2, evaluator feedback fed into regeneration
- [ ] Failed drafts stored as rejected with reasons (never discarded)
- [ ] Rule engine runs before the LLM judge
- [ ] All prompts in prompts.py, version-tagged; version recorded on
      posts and llm_calls
- [ ] Alembic migration for all 5 tables, autogenerated and reviewed
- [ ] tournament_tool is read-only; only approved tournaments
- [ ] Existing tables, services, routers, endpoints untouched
- [ ] OTel spans + cost estimation reuse the ingest.py pattern