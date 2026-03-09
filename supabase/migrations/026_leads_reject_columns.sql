-- Add reject_reason and rejected_at columns to leads table.
-- These columns are already used in code (types, repository, UI) but
-- were never defined in a migration — likely added manually via SQL editor.
-- Safe to re-run: IF NOT EXISTS / ADD COLUMN IF NOT EXISTS.

ALTER TABLE leads ADD COLUMN IF NOT EXISTS reject_reason text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS rejected_at timestamptz;
