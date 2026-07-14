# Environment Variables

## Backend `.env`
```
DATABASE_URL=postgresql://...
SUPABASE_URL=
SUPABASE_KEY=
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=esportorium-assets
R2_PUBLIC_URL=https://pub-xxx.r2.dev
ADMIN_USERNAME=
ADMIN_PASSWORD_HASH=
JWT_SECRET=                            # REQUIRED — app refuses to start if unset (no insecure default)
CLAIM_TOKEN_EXPIRE_DAYS=30             # lifetime of a "claim your tournament" link (emailed on approval)

# Deployment / bot protection
ENVIRONMENT=production                 # set to "production" on Cloud Run; gates the Turnstile fail-loud guard
TURNSTILE_SECRET_KEY=                  # Cloudflare Turnstile secret; in production a missing value fails startup
ALLOWED_ORIGINS=                       # comma-separated CORS origins (defaults to localhost:3000,5173)
FRONTEND_BASE_URL=                     # public site base for links in emails (claim, listing); default https://esportorium.com

# Discord webhooks (optional — leave blank to skip)
DISCORD_WEBHOOK_URL=                   # private admin channel: new submissions, rejections
DISCORD_PUBLIC_WEBHOOK_URL=            # public channel: approved tournaments (falls back to admin webhook)

# Transactional email (Resend) — approval/rejection notifications to organisers
RESEND_API_KEY=                       # Resend API key
EMAIL_FROM=                           # sender shown to recipients, e.g. "Esportorium <noreply@esportorium.com>"
                                      # TESTING: use onboarding@resend.dev — delivers ONLY to your own Resend account email
                                      # PRODUCTION: verify your domain at resend.com/domains (add DNS records),
                                      #   then use an address on that domain to email any organiser

# Agentic ingest (Item 2 — V2)
GOOGLE_API_KEY=                       # Gemini API key (required for /api/organiser/ingest)
INGEST_MODEL=gemini-2.5-flash-lite    # primary extraction model (cheaper, faster)
INGEST_FALLBACK_MODEL=gemini-2.5-flash # fallback model (stronger; used when primary fails or flags > 5 fields)

# LangSmith tracing (optional — leave blank to skip)
LANGCHAIN_TRACING_V2=true             # set to "true" to enable LangSmith tracing
LANGCHAIN_API_KEY=                    # LangSmith API key
LANGCHAIN_PROJECT=esportorium-ingest  # LangSmith project name

# Observability (Item 4 — V2)
OTEL_SERVICE_NAME=esportorium-backend # resource name shown in traces (default: esportorium-backend)
OTEL_EXPORTER_OTLP_ENDPOINT=          # e.g. Grafana Cloud / Honeycomb OTLP/HTTP endpoint
                                      # unset locally: traces print to the console instead
OTEL_EXPORTER_OTLP_HEADERS=           # auth header for the OTLP endpoint, e.g. "x-honeycomb-team=..."
```

## Frontend `.env`

Next.js 16 — client-exposed vars use the `NEXT_PUBLIC_` prefix (read via `process.env` in `frontend/src/lib/api.ts`).
```
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000    # backend base URL (falls back to http://localhost:8000 in code)

# Cloudflare Turnstile site key
# Get keys at: https://dash.cloudflare.com/?to=/:account/turnstile
NEXT_PUBLIC_TURNSTILE_SITE_KEY=your_turnstile_site_key
```
