# Esportorium — Frontend (Next.js 16)

Frontend-only conventions. See root [@CLAUDE.md](../CLAUDE.md) for universal conventions and [@docs](../docs) for API / environment / roadmap references.

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

## Logo & Branding

- Logo file: `src/assets/esportorium-logo.png` (Colosseum icon, terracotta background)
- Use logo in navbar and favicon
- Do not place logo on terracotta backgrounds (same colour clash)
- Terracotta is used for: primary buttons, active tabs, badges, highlights — use sparingly

## Behaviour Conventions

- **Default tab on home page** is Upcoming
- **State filter** only applies to offline tournaments — online tournaments appear regardless of state filter
- **`/tournaments` browse** — tabs: All / Upcoming / Current / Past; List/Grid view toggle; filter by Malaysian state
- **Pagination** is deliberately deferred — the listing fetches all approved tournaments and filters client-side (status is derived in the browser). See root [@CLAUDE.md](../CLAUDE.md) "What is NOT in MVP".
