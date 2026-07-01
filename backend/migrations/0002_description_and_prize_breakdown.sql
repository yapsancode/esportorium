-- Run this manually against both your local Postgres and Supabase (prod) databases,
-- same as 0001 — there's no Alembic wired up in this repo yet.

BEGIN;

ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS description TEXT;

-- DEFAULT '[]'::json means existing rows read back as an empty array instead of
-- NULL — the API schema expects a list, not null, for prize_breakdown.
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS prize_breakdown JSON DEFAULT '[]'::json;

COMMIT;
