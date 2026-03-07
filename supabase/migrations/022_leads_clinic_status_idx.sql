-- Index for common lead filtering by clinic and status
CREATE INDEX IF NOT EXISTS leads_clinic_status_idx
ON leads (clinic_id, status);
