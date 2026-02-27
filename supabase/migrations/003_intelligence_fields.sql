-- Intelligence feature extension — ADD ONLY, no removals or modifications
-- Safe to run multiple times due to IF NOT EXISTS guards

-- leads table extensions
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS conversation_summary      TEXT,
  ADD COLUMN IF NOT EXISTS lead_quality_score        INTEGER CHECK (lead_quality_score BETWEEN 1 AND 100),
  ADD COLUMN IF NOT EXISTS urgency_level             TEXT CHECK (urgency_level IN ('low', 'medium', 'high')),
  ADD COLUMN IF NOT EXISTS priority_level            TEXT CHECK (priority_level IN ('low', 'medium', 'high')),
  ADD COLUMN IF NOT EXISTS sla_deadline              TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS follow_up_recommended_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS callback_recommendation   TEXT;

-- appointments table extensions
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS appointment_summary  TEXT,
  ADD COLUMN IF NOT EXISTS urgency_level        TEXT CHECK (urgency_level IN ('low', 'medium', 'high')),
  ADD COLUMN IF NOT EXISTS lead_quality_score   INTEGER CHECK (lead_quality_score BETWEEN 1 AND 100),
  ADD COLUMN IF NOT EXISTS priority_level       TEXT CHECK (priority_level IN ('low', 'medium', 'high'));
