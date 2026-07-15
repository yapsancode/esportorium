# Trends

**Last updated: [FILL THIS IN — YYYY-MM-DD]**

Live file. Rotates. Feeds the `scene_trend` pillar and at least one TikTok
script per run.

## What goes here

Malaysian MLBB scene commentary worth riffing on:

- patch changes and meta shifts
- MPL MY results, standings, upsets
- roster moves, retirements, debuts
- whatever the scene is arguing about this week

**Not** TikTok audio trends. They die in days, `assemble_context` has no
freshness check, and nothing reads more bot than riffing on a dead sound. The
pillar is called *scene*_trend.

## Rules

Everything in this file is a **factual claim about the real world**. The
grounding rule in `rules.md` applies in full: if a post claims a patch nerfed a
hero or a team took a series, that claim lives here first. Never invented, never
pulled from model memory.

Facts only. The angle comes from the generator, not from this file.

**Stale is worse than empty.** Anything older than ~2 weeks: delete it. A post
riffing on last month's meta reads worse than a post that never mentioned the
meta at all.

**Empty is worse than fabricated, but it isn't free.** The generate node is
specified to produce at least one TikTok riffing on a trend from this file. With
no entries it cannot satisfy its own schema, and the harness will burn its
validation retry before failing. Keep at least one live entry here, or accept
that runs will fail until you do.

## Format

```
### [YYYY-MM-DD] Short label
One or two lines. What happened. Facts only.
```

---

## Current

<!--
Nothing here yet. Add entries before the first real run.

Example of the shape (NOT a real fact — delete before use):

### [2026-07-14] Patch 1.9.4 hero adjustments
Hero X nerfed on cooldowns, hero Y buffed. Draft priority shifting in
ranked; unclear yet whether it holds at tournament level.
-->