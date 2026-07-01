-- Run this manually against both your local Postgres and Supabase (prod) databases.
-- There's no Alembic in this repo — SQLAlchemy's create_all() only creates missing
-- tables, it never relaxes NOT NULL constraints on an existing one.
--
-- Run the ALTER TYPE statement on its own first — Postgres doesn't allow using a
-- freshly-added enum value inside the same transaction it was created in.

ALTER TYPE tournament_format ADD VALUE IF NOT EXISTS 'hybrid';

-- Now the rest, in one transaction.

BEGIN;

ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS stage_notes VARCHAR;

ALTER TABLE tournaments ALTER COLUMN format DROP NOT NULL;
ALTER TABLE tournaments ALTER COLUMN start_date DROP NOT NULL;
ALTER TABLE tournaments ALTER COLUMN end_date DROP NOT NULL;
ALTER TABLE tournaments ALTER COLUMN registration_deadline DROP NOT NULL;
ALTER TABLE tournaments ALTER COLUMN prize_pool_rm DROP NOT NULL;
ALTER TABLE tournaments ALTER COLUMN max_teams DROP NOT NULL;
ALTER TABLE tournaments ALTER COLUMN organiser_name DROP NOT NULL;
ALTER TABLE tournaments ALTER COLUMN organiser_contact DROP NOT NULL;
ALTER TABLE tournaments ALTER COLUMN organiser_email DROP NOT NULL;
ALTER TABLE tournaments ALTER COLUMN registration_link DROP NOT NULL;

COMMIT;
