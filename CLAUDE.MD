# Esportorium — Claude Code Briefing

## Project Overview

**Esportorium** is a Malaysia-focused esports tournament discovery platform. Players can browse and discover upcoming, current, and past tournaments. Tournament organisers can submit their events for listing. The platform is curated — all submissions require admin approval before going live.

**Current scope:** Mobile Legends tournaments only.  
**Phase:** MVP

---

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React + Vite + Tailwind CSS + shadcn/ui |
| Backend | FastAPI (Python) |
| Database | PostgreSQL (Supabase for prod, local for dev) |
| File Storage | Cloudflare R2 (tournament banner images) |
| Frontend Hosting | Cloudflare Pages |
| Backend Hosting | Railway or Render |

---

## Project Structure

```
esportorium/
├── frontend/                  # React + Vite app
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   │   └── ui/            # shadcn/ui components
│   │   ├── pages/             # Page-level components
│   │   ├── lib/               # Utilities, API calls, helpers
│   │   ├── hooks/             # Custom React hooks
│   │   └── assets/            # Static assets (logo, icons)
│   ├── public/
│   ├── tailwind.config.js
│   └── vite.config.js
│
├── backend/                   # FastAPI app
│   ├── app/
│   │   ├── main.py            # FastAPI entry point
│   │   ├── models/            # SQLAlchemy models
│   │   ├── schemas/           # Pydantic schemas
│   │   ├── routers/           # API route handlers
│   │   ├── services/          # Business logic
│   │   └── database.py        # DB connection
│   ├── requirements.txt
│   └── .env
│
└── CLAUDE.md
```

---

## Design System

**Theme:** Light  
**Vibe:** Modern, intense + casual  
**Font:** Plus Jakarta Sans (headings bold, body regular)

### Colour Tokens (override shadcn defaults)

```css
--background: #FAFAF8;       /* warm white */
--foreground: #1A1A1A;       /* charcoal */
--primary: #B5522A;          /* terracotta (brand colour) */
--primary-foreground: #FFFFFF;
--muted: #F0EFED;            /* light warm grey */
--muted-foreground: #6B6B6B;
--border: #E5E3DF;
--radius: 0.625rem;
```

### shadcn Components Used
- `Tabs` — All / Upcoming / Current / Past filter
- `Card` — Tournament listing cards
- `Badge` — Status pills (Upcoming, Live, Past)
- `Select` / `DropdownMenu` — State filter
- `Dialog` — Share modal
- `Form` + `Input` + `Textarea` — Organiser submission form
- `Table` — Admin panel tournament list
- `Button` — Primary (terracotta), secondary (ghost)

---

## Pages & Routes

### Public

| Route | Page | Description |
|---|---|---|
| `/` | Home | Tournament listings. Default tab: Upcoming. Tabs: All / Upcoming / Current / Past. List/Grid view toggle. Filter by Malaysian state. |
| `/tournament/:id` | Tournament Detail | Full tournament info. Banner image (collapsible/expandable). Share button (with or without poster). External registration link. |
| `/submit` | Submit Tournament | Public form for organisers to submit a tournament. Goes into pending queue. No account needed. |

### Admin (protected)

| Route | Page | Description |
|---|---|---|
| `/admin/login` | Admin Login | Simple login for site owner only. |
| `/admin/dashboard` | Pending Submissions | List of submissions awaiting approval. Approve / Reject actions. |
| `/admin/tournaments` | Manage Tournaments | All tournaments. Add / Edit / Delete. |

---

## Data Model

### Tournament

```python
class Tournament(Base):
    __tablename__ = "tournaments"

    id                    = Column(UUID, primary_key=True, default=uuid4)
    title                 = Column(String, nullable=False)
    game                  = Column(String, default="Mobile Legends")
    format                = Column(Enum("online", "offline"), nullable=False)
    state                 = Column(String, nullable=True)       # null if online
    venue                 = Column(String, nullable=True)       # null if online
    start_date            = Column(Date, nullable=False)
    end_date              = Column(Date, nullable=False)
    registration_deadline = Column(Date, nullable=False)
    prize_pool_rm         = Column(Integer, nullable=False)     # cash prize in RM
    additional_prizes     = Column(ARRAY(String), default=[])   # e.g. ["Trophy", "Jersey"]
    max_teams             = Column(Integer, nullable=False)
    organiser_name        = Column(String, nullable=False)
    organiser_contact     = Column(String, nullable=False)      # WhatsApp or email
    organiser_email       = Column(String, nullable=False)      # for approval notification
    registration_link     = Column(String, nullable=False)      # external URL
    banner_image          = Column(String, nullable=True)       # R2 public URL
    is_approved           = Column(Boolean, default=False)
    created_at            = Column(DateTime, default=datetime.utcnow)
    updated_at            = Column(DateTime, onupdate=datetime.utcnow)
```

### Derived Status (computed, not stored)

```python
def get_status(tournament) -> str:
    today = date.today()
    if tournament.start_date > today:
        return "upcoming"
    elif tournament.start_date <= today <= tournament.end_date:
        return "current"
    else:
        return "past"
```

---

## API Endpoints

### Tournaments (public)
```
GET    /api/tournaments              # list all approved tournaments (filter: status, state)
GET    /api/tournaments/:id          # single tournament detail
POST   /api/tournaments/submit       # organiser submission (creates unapproved record)
```

### Admin (protected)
```
GET    /api/admin/tournaments        # all tournaments including unapproved
GET    /api/admin/submissions        # pending submissions only
PATCH  /api/admin/tournaments/:id/approve
PATCH  /api/admin/tournaments/:id/reject
POST   /api/admin/tournaments        # manually add tournament
PUT    /api/admin/tournaments/:id    # edit tournament
DELETE /api/admin/tournaments/:id    # delete tournament
POST   /api/admin/auth/login         # admin login
```

### File Upload
```
POST   /api/upload/banner            # upload image to R2, returns public URL
```

---

## Environment Variables

### Backend `.env`
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
JWT_SECRET=
```

### Frontend `.env`
```
VITE_API_BASE_URL=http://localhost:8000
```

---

## Key Conventions

- **Status is always derived from dates** — never stored in the DB
- **All public endpoints return only approved tournaments** (`is_approved = true`)
- **Banner images** are uploaded to R2 first, then the URL is stored in PostgreSQL
- **Admin auth** is simple JWT — single admin user, no roles needed for MVP
- **Organiser email** is collected on submission to notify them on approval/rejection
- **State filter** only applies to offline tournaments — online tournaments appear regardless of state filter
- **Default tab on home page** is Upcoming

---

## What is NOT in MVP

- User accounts / player login
- Native registration (link out to external registration only)
- Malaysia map view
- Organiser accounts / organiser login (V2)
- Multiple games beyond Mobile Legends
- Payment / monetization features
- Notifications beyond email on approval

---

## Logo & Branding

- Logo file: `src/assets/esportorium-logo.png` (Colosseum icon, terracotta background)
- Use logo in navbar and favicon
- Do not place logo on terracotta backgrounds (same colour clash)
- Terracotta is used for: primary buttons, active tabs, badges, highlights — use sparingly