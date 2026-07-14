# Esportorium — Backend (FastAPI)

Backend-only conventions. See root [@CLAUDE.md](../CLAUDE.md) for universal conventions and [@docs](../docs) for API / environment / roadmap references.

## Alembic — Schema Migrations (full workflow)

**Schema changes go through Alembic** — after editing a model, run `alembic revision --autogenerate -m "..."` from `backend/`, review the generated file in `alembic/versions/`, then `alembic upgrade head`. `DATABASE_URL` is read from `.env` (same var the app uses), not hardcoded in `alembic.ini`. Don't add new files to `backend/migrations/` — that folder is a frozen pre-Alembic record.

## Eval Gate

`backend/eval/run_eval.py` scores the ingest pipeline against 25 text fixtures (see `backend/eval/fixtures/`). Run locally with `python backend/eval/run_eval.py` (needs `GOOGLE_API_KEY` in `backend/.env`). The CI job (`.github/workflows/eval.yml`) triggers on PRs to `main`/`development` touching `ingest.py`, `guardrails.py`, `schemas/ingest.py`, or `eval/**`, and blocks merge if accuracy drops below 85%. Requires a GitHub repository secret named `GOOGLE_API_KEY` (Settings → Secrets and variables → Actions → New repository secret). Exit codes: 0 = PASS, 1 = FAIL (threshold), 2 = config error.

## Observability (V2)

`app/observability.py` sets up structured JSON logging (every line carries `request_id`; organiser routes also carry `organiser_id`, via contextvars) and OpenTelemetry request tracing (console exporter locally, OTLP when `OTEL_EXPORTER_OTLP_ENDPOINT` is set). The ingest pipeline (`services/ingest.py`) opens an `ingest.extract` span per call with token counts and an estimated USD cost (`_PRICING_USD_PER_1M_TOKENS` — approximate, update when Gemini pricing changes), tagged with `organiser_id` so a slow/expensive ingest call is traceable back to a tenant.

**Gotcha if you touch this:** `require_admin`/`require_organiser` in `app/auth.py` must stay `async def` — a sync dependency of an async route runs via `run_in_threadpool`, which copies the contextvars context into a worker thread, so `organiser_id_var.set()` would silently stop propagating. Same reason `RequestContextMiddleware` is raw ASGI rather than `BaseHTTPMiddleware`: the latter spawns the downstream app as a child task, so context set deeper in the stack never flows back up to the middleware's own access-log line.

## Tenant Isolation (organiser routes, V2)

The three non-negotiable rules are universal — see root [@CLAUDE.md](../CLAUDE.md). Single enforcement point: `services/organiser_service.py`. Proved by `backend/tests/test_organiser_isolation.py`, which runs in CI (`.github/workflows/backend.yml`, PRs to `main`/`development`, needs a Postgres service container — see that file).
