# Pages & Routes and Roadmap

## Pages & Routes

### Public

| Route | Page | Description |
|---|---|---|
| `/` | Landing | Marketing page: hero + live stats, featured upcoming tournaments, how-it-works, organiser CTA. Data fetched server-side (revalidate 60s); stats/featured sections hide gracefully if the API is down or empty. |
| `/tournaments` | Browse | Tournament listings. Default tab: Upcoming. Tabs: All / Upcoming / Current / Past. List/Grid view toggle. Filter by Malaysian state. |
| `/tournament/:id` | Tournament Detail | Full tournament info. Banner image (collapsible/expandable). Share button (with or without poster). External registration link. |
| `/submit` | Submit Tournament | Public form for organisers to submit a tournament. Goes into pending queue. No account needed. |

### Admin (protected)

| Route | Page | Description |
|---|---|---|
| `/admin/login` | Admin Login | Simple login for site owner only. |
| `/admin/dashboard` | Pending Submissions | List of submissions awaiting approval. Approve / Reject actions. |
| `/admin/tournaments` | Manage Tournaments | All tournaments. Add / Edit / Delete. |

---

## Roadmap

- Phase MVP  ✓
    Mobile Legends tournaments,
    Public browse & discovery,
    Organiser submission form,
    Admin review panel,
    Cloudflare R2 banner hosting

- Phase 0 — Launch & seed
    Ship the directory as-is,
    Seed with real MLBB tournaments via existing form,
    No gated submission (accounts stay optional)

- Phase V2 — Depth (the spine)
    Organiser accounts + tenant isolation  ✓,
    Agentic ingest (messy input → structured draft → approval queue)  ✓,
    Eval gate for the AI feature in CI  ✓,
    Observability  ✓,
    Test suite (including the isolation proof)  ✓

- Phase V3 — Product features
    Additional games (Valorant, PUBG Mobile),
    Malaysia map view,
    Tournament bracket display,
    Registered teams display,
    Email notifications to players,
    AI poster generator

- Phase V4 — Later
    Native registration flow,
    Player profiles,
    Monetisation & featured listings,
    Mobile app
