-- Analytics upgrade: ensure source and estimated_deal_value exist on leads
-- Safe to run multiple times (IF NOT EXISTS guards)

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS source               TEXT,
  ADD COLUMN IF NOT EXISTS estimated_deal_value NUMERIC(10, 2);

-- Performance indexes for analytics queries
CREATE INDEX IF NOT EXISTS leads_source_idx         ON leads (source);
CREATE INDEX IF NOT EXISTS leads_clinic_created_idx ON leads (clinic_id, created_at DESC);
