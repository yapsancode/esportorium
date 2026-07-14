# Esportorium — Claude Code Briefing

## Project Overview

**Esportorium** is a Malaysia-focused esports tournament discovery platform: players browse upcoming / current / past tournaments; organisers submit their events for listing. The platform is curated — all submissions require admin approval before going live.

**Current scope:** Mobile Legends tournaments only.  
**Phase:** V2 — Depth is complete (see [@docs/roadmap.md](docs/roadmap.md)). Next up: Phase 0 (launch/seed, "claim your account" email link) or Phase V3 (product features).

---

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 16 (App Router) + TypeScript + Tailwind CSS + shadcn/ui |
| Backend | FastAPI (Python) |
| Database | PostgreSQL (Supabase for prod, local for dev) |
| File Storage | Cloudflare R2 (tournament banner images) |
| Frontend Hosting | Vercel |
| Backend Hosting | Google Cloud Run (Docker) |

---

## Project Structure

```
esportorium/
├── frontend/      # Next.js 16 App Router app (TypeScript) — see @frontend/CLAUDE.md
│   ├── src/       # app/ (pages & layouts), components/ (+ ui/ shadcn), lib/, assets/
│   └── public/    # static files served at root URL
├── backend/       # FastAPI app — see @backend/CLAUDE.md
│   ├── app/       # main.py, auth.py, models/, schemas/, routers/, services/, database.py
│   ├── alembic/   # schema migrations (versions/ + env.py)
│   ├── migrations/# legacy hand-written SQL, pre-Alembic — historical only
│   ├── tests/     # pytest suite (status logic, health, approval flow, tenant isolation proof)
│   └── eval/      # ingest accuracy eval gate (fixtures/ + run_eval.py)
├── docs/          # api.md, environment.md, roadmap.md
└── CLAUDE.md
```

---

## Data Model

Models: `backend/app/models/` — status is always derived from dates, never stored.

---

## Universal Conventions

- **Status is always derived from dates** — never stored in the DB
- **All public endpoints return only approved tournaments** (`is_approved = true`)
- **Schema changes go through Alembic** — after editing a model, run `alembic revision --autogenerate -m "..."` from `backend/`, then `alembic upgrade head`. Full workflow: [@backend/CLAUDE.md](backend/CLAUDE.md)
- **Don't add new files to `backend/migrations/`** — that folder is a frozen pre-Alembic record
- **Tenant isolation (organiser routes, V2)** — three non-negotiable rules, enforced in `services/organiser_service.py` (single enforcement point, not scattered across routers): (1) `organiser_id` always comes from the JWT, never the request body; (2) every organiser-scoped query filters by the token's `organiser_id`; (3) an ownership mismatch on a `:id` route returns **404, never 403** — don't leak that the row exists. Proved by `backend/tests/test_organiser_isolation.py`, which runs in CI (`.github/workflows/backend.yml`, PRs to `main`/`development`, needs a Postgres service container — see that file).

---

## AI Growth Engine (app/ai_growth/)

**Required reading before any growth work:** [@backend/specs/growth-phase-1.md](backend/specs/growth-phase-1.md). Non-negotiables:

- **All model calls go through `app/ai_growth/harness.py`** — no other file imports an LLM client/SDK
- **Prompts live only in `prompts.py`**, version-tagged (e.g. `GENERATE_V1`); version recorded on posts and llm_calls
- **Models in `app/models/growth.py`**, all tables `growth_` prefixed, migrated via Alembic
- **Never modifies tournament/organiser tables, services, routers, or public endpoints** — `tournament_tool.py` is strictly read-only
- **Retry loop bounded at 2**; failed drafts stored as `rejected`, never discarded
- **Reuse `app/observability.py`** — OTel span + cost-estimation pattern from `services/ingest.py`

---

## What is NOT in MVP

- User accounts / player login
- Native registration (link out to external registration only)
- Malaysia map view
- Multiple games beyond Mobile Legends
- Payment / monetization features
- Notifications beyond email on approval
- Pagination — deliberately deferred. The listing fetches all approved tournaments and filters client-side (status is derived in the browser). Fine under ~150 tournaments. Revisit when the **Past** tab (the only unbounded bucket) grows long; start with a client-side "Load more" before building server-side pagination.

---

## Detailed References

- [@backend/CLAUDE.md](backend/CLAUDE.md) — backend conventions: observability (+ async-dependency / contextvars gotcha), eval gate (commands, CI triggers, exit codes), full Alembic workflow
- [@frontend/CLAUDE.md](frontend/CLAUDE.md) — design system (colour tokens, shadcn components), logo & branding, frontend behaviour conventions
- [@docs/api.md](docs/api.md) — all API endpoint tables
- [@docs/environment.md](docs/environment.md) — full environment variables (backend + frontend) with comments
- [@docs/roadmap.md](docs/roadmap.md) — roadmap + pages & routes tables
