-- Patient/Lead Data Alignment Migration
-- Adds no_show + ai_failed appointment statuses, recall columns on patients,
-- and performance indexes for enriched patient queries.
-- Safe to re-run — idempotent.

-- ─── 1A. Expand appointments status constraint ──────────────────────────────
-- no_show is a status value (not a separate boolean).
-- Both no_show and ai_failed are already referenced in app code
-- (status-colors.ts, analytics.service.ts) but were missing from the DB.

ALTER TABLE public.appointments DROP CONSTRAINT IF EXISTS appointments_status_check;
ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_status_check
  CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no_show', 'ai_failed'));

-- ─── 1B. Add recall columns to patients ─────────────────────────────────────
-- Persists the in-memory recallMap that was previously session-only.

ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS recall_active boolean NOT NULL DEFAULT false;

ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS recall_date timestamptz NULL;

-- ─── 1C. Performance indexes ────────────────────────────────────────────────

-- Next appointment lookup (patient_id path)
CREATE INDEX IF NOT EXISTS appointments_patient_next_idx
  ON public.appointments (clinic_id, patient_id, datetime ASC)
  WHERE status = 'scheduled' AND patient_id IS NOT NULL;

-- Appointment stats by patient (for cancellation risk)
CREATE INDEX IF NOT EXISTS appointments_patient_stats_idx
  ON public.appointments (clinic_id, patient_id, status)
  WHERE patient_id IS NOT NULL;

-- Lead-based appointment fallback
CREATE INDEX IF NOT EXISTS appointments_lead_stats_idx
  ON public.appointments (clinic_id, lead_id, status)
  WHERE lead_id IS NOT NULL;

-- Billing total by patient
CREATE INDEX IF NOT EXISTS billing_documents_patient_status_idx
  ON public.billing_documents (clinic_id, patient_id)
  WHERE patient_id IS NOT NULL AND status = 'issued';

-- Payment total by patient
CREATE INDEX IF NOT EXISTS payments_patient_status_idx
  ON public.payments (clinic_id, patient_id)
  WHERE patient_id IS NOT NULL;

-- Recall lookup
CREATE INDEX IF NOT EXISTS patients_recall_idx
  ON public.patients (clinic_id, recall_active, recall_date)
  WHERE recall_active = true AND deleted_at IS NULL;
