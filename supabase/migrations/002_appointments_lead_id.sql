-- Link follow-up appointments to leads so one follow-up per lead stays in sync with calendar

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS lead_id UUID NULL;

CREATE INDEX IF NOT EXISTS appointments_lead_id_idx ON appointments (lead_id) WHERE lead_id IS NOT NULL;
