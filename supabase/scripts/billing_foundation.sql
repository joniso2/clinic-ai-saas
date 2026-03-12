-- ============================================================
-- Billing Foundation Migration
-- Run in Supabase SQL Editor (safe to re-run — idempotent)
-- ============================================================
-- NOTE: Foreign key references to `patients` and `appointments`
-- use the table names as they exist in this project. Verify names
-- match before running if you get FK errors.
-- ============================================================

-- ── Enums ─────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE billing_business_type AS ENUM ('osek_patur', 'osek_murshe', 'chevra');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE billing_doc_type AS ENUM (
    'receipt',
    'transaction_invoice',
    'tax_invoice',
    'tax_invoice_receipt',
    'cancellation_document'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE billing_doc_status AS ENUM ('issued', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE billing_allocation_status AS ENUM (
    'not_required', 'pending', 'approved', 'rejected', 'error'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE billing_customer_type AS ENUM ('private', 'business');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE payment_method_type AS ENUM (
    'cash', 'credit', 'bit', 'paybox', 'bank_transfer', 'other'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE payment_status_type AS ENUM ('pending', 'received', 'failed', 'refunded');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ── billing_settings ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS billing_settings (
  clinic_id       uuid PRIMARY KEY REFERENCES clinics(id) ON DELETE CASCADE,
  business_name   text NOT NULL,
  business_number text NOT NULL,
  business_type   billing_business_type NOT NULL,
  address         text,
  phone           text,
  email           text,
  logo_url        text,
  vat_number      text,
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE billing_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "billing_settings_clinic_isolation" ON billing_settings;
CREATE POLICY "billing_settings_clinic_isolation" ON billing_settings
  FOR ALL USING (
    clinic_id = (SELECT cu.clinic_id FROM clinic_users cu WHERE cu.user_id = auth.uid() AND cu.clinic_id IS NOT NULL LIMIT 1)
    OR EXISTS (SELECT 1 FROM clinic_users cu WHERE cu.user_id = auth.uid() AND cu.role = 'SUPER_ADMIN')
  )
  WITH CHECK (
    clinic_id = (SELECT cu.clinic_id FROM clinic_users cu WHERE cu.user_id = auth.uid() AND cu.clinic_id IS NOT NULL LIMIT 1)
    OR EXISTS (SELECT 1 FROM clinic_users cu WHERE cu.user_id = auth.uid() AND cu.role = 'SUPER_ADMIN')
  );

-- ── vat_rates ─────────────────────────────────────────────────
-- Read-only for clinic users. Only super-admin / system operator inserts rows.

CREATE TABLE IF NOT EXISTS vat_rates (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rate            numeric(5,4) NOT NULL,
  effective_from  date NOT NULL,
  effective_until date,
  label           text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE vat_rates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vat_rates_read_authenticated" ON vat_rates;
CREATE POLICY "vat_rates_read_authenticated" ON vat_rates
  FOR SELECT USING (auth.role() = 'authenticated');

-- Seed current VAT rate (18% as of 2025). Insert new rows for future changes.
INSERT INTO vat_rates (rate, effective_from, label)
VALUES (0.18, '2025-01-01', 'מע״מ 18%')
ON CONFLICT DO NOTHING;

-- ── israel_invoice_thresholds ─────────────────────────────────
-- Configurable thresholds for חשבונית ישראל allocation requirement.
-- System operator inserts new rows when regulations change.

CREATE TABLE IF NOT EXISTS israel_invoice_thresholds (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  amount_before_vat numeric(10,2) NOT NULL,
  effective_from    date NOT NULL,
  effective_until   date,
  notes             text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE israel_invoice_thresholds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "israel_invoice_thresholds_read_authenticated" ON israel_invoice_thresholds;
CREATE POLICY "israel_invoice_thresholds_read_authenticated" ON israel_invoice_thresholds
  FOR SELECT USING (auth.role() = 'authenticated');

-- Seed 2026 phase-in thresholds (verify against final regulation text before go-live)
INSERT INTO israel_invoice_thresholds (amount_before_vat, effective_from, notes)
VALUES
  (10000.00, '2026-01-01', 'חשבונית ישראל — שלב 1 (₪10,000 לפני מע"מ)'),
  (5000.00,  '2026-06-01', 'חשבונית ישראל — שלב 2 (₪5,000 לפני מע"מ)')
ON CONFLICT DO NOTHING;

-- ── document_sequences ────────────────────────────────────────
-- No direct client access. Written only via next_document_number() below,
-- which uses SECURITY DEFINER. Service role bypasses RLS — tenant scoping
-- is enforced explicitly via p_clinic_id in server code.

CREATE TABLE IF NOT EXISTS document_sequences (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id     uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  doc_type      billing_doc_type NOT NULL,
  document_year int NOT NULL,
  last_number   int NOT NULL DEFAULT 0,
  UNIQUE (clinic_id, doc_type, document_year)
);

ALTER TABLE document_sequences ENABLE ROW LEVEL SECURITY;
-- No SELECT/INSERT/UPDATE/DELETE policies for clinic users.
-- All access via SECURITY DEFINER function or service role with explicit tenant scoping.

-- ── next_document_number() ────────────────────────────────────
-- Atomically increments and returns the next sequential number.
-- SECURITY DEFINER: runs with owner privileges. Always called with
-- an explicit, server-resolved p_clinic_id — never trust client input.

CREATE OR REPLACE FUNCTION next_document_number(
  p_clinic_id   uuid,
  p_doc_type    billing_doc_type,
  p_year        int
) RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_next int;
BEGIN
  INSERT INTO document_sequences (clinic_id, doc_type, document_year, last_number)
  VALUES (p_clinic_id, p_doc_type, p_year, 1)
  ON CONFLICT (clinic_id, doc_type, document_year)
  DO UPDATE SET last_number = document_sequences.last_number + 1
  RETURNING last_number INTO v_next;
  RETURN v_next;
END;
$$;

-- ── billing_documents ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS billing_documents (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id       uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  doc_type        billing_doc_type NOT NULL,
  doc_number      text NOT NULL,
  seq_number      int NOT NULL,
  document_year   int NOT NULL,

  -- Relations (nullable — document can exist without a matched patient/appointment)
  -- FK constraints omitted intentionally: add them manually once you confirm
  -- the exact table names in your schema (e.g. patients, appointments).
  patient_id      uuid,
  appointment_id  uuid,

  -- Customer snapshot — frozen at issue time, never recalculated
  customer_name             text NOT NULL,
  customer_phone            text,
  customer_email            text,
  customer_type             billing_customer_type NOT NULL DEFAULT 'private',
  customer_business_number  text,   -- ע.מ / ח.פ for B2B / future allocation flows
  customer_address          text,

  -- Business snapshot — frozen at issue time
  business_name    text NOT NULL,
  business_number  text NOT NULL,
  business_address text,
  vat_number       text,

  -- Financials — exact decimal (numeric), computed server-side, stored as snapshot
  subtotal    numeric(10,2) NOT NULL,
  vat_rate    numeric(5,4)  NOT NULL,   -- snapshot from vat_rates at issue time
  vat_amount  numeric(10,2) NOT NULL,
  total       numeric(10,2) NOT NULL,
  currency    text NOT NULL DEFAULT 'ILS',

  pdf_url text,

  -- Cancellation fields
  status              billing_doc_status NOT NULL DEFAULT 'issued',
  cancelled_at        timestamptz,
  cancellation_doc_id uuid REFERENCES billing_documents(id),  -- points to BTL doc
  cancels_document_id uuid REFERENCES billing_documents(id),  -- set on BTL doc itself

  -- Israel Invoice allocation (conditional — not required for most documents)
  tax_authority_allocation_number text,
  allocation_status               billing_allocation_status NOT NULL DEFAULT 'not_required',
  allocation_requested_at         timestamptz,
  allocation_response_at          timestamptz,
  allocation_raw_response         jsonb,

  issued_at   timestamptz NOT NULL DEFAULT now(),
  created_at  timestamptz NOT NULL DEFAULT now(),

  UNIQUE (clinic_id, doc_type, document_year, seq_number)
);

CREATE INDEX IF NOT EXISTS billing_documents_clinic_issued
  ON billing_documents(clinic_id, issued_at DESC);
CREATE INDEX IF NOT EXISTS billing_documents_patient
  ON billing_documents(patient_id) WHERE patient_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS billing_documents_appointment
  ON billing_documents(appointment_id) WHERE appointment_id IS NOT NULL;

ALTER TABLE billing_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "billing_documents_select" ON billing_documents;
CREATE POLICY "billing_documents_select" ON billing_documents
  FOR SELECT USING (
    clinic_id = (SELECT cu.clinic_id FROM clinic_users cu WHERE cu.user_id = auth.uid() AND cu.clinic_id IS NOT NULL LIMIT 1)
    OR EXISTS (SELECT 1 FROM clinic_users cu WHERE cu.user_id = auth.uid() AND cu.role = 'SUPER_ADMIN')
  );

DROP POLICY IF EXISTS "billing_documents_insert" ON billing_documents;
CREATE POLICY "billing_documents_insert" ON billing_documents
  FOR INSERT WITH CHECK (
    clinic_id = (SELECT cu.clinic_id FROM clinic_users cu WHERE cu.user_id = auth.uid() AND cu.clinic_id IS NOT NULL LIMIT 1)
    OR EXISTS (SELECT 1 FROM clinic_users cu WHERE cu.user_id = auth.uid() AND cu.role = 'SUPER_ADMIN')
  );

-- No UPDATE policy for clinic users. Cancellation is handled by the
-- cancel_billing_document() SECURITY DEFINER function (service role,
-- explicit tenant scoping). No DELETE policy for any role.

-- ── billing_document_items ────────────────────────────────────

CREATE TABLE IF NOT EXISTS billing_document_items (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id  uuid NOT NULL REFERENCES billing_documents(id) ON DELETE CASCADE,
  service_id   uuid REFERENCES clinic_services(id) ON DELETE SET NULL,
  description  text NOT NULL,
  quantity     int NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price   numeric(10,2) NOT NULL CHECK (unit_price >= 0),
  line_total   numeric(10,2) NOT NULL CHECK (line_total >= 0)
);

ALTER TABLE billing_document_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "billing_document_items_select" ON billing_document_items;
CREATE POLICY "billing_document_items_select" ON billing_document_items
  FOR SELECT USING (
    document_id IN (
      SELECT id FROM billing_documents
      WHERE clinic_id = (SELECT cu.clinic_id FROM clinic_users cu WHERE cu.user_id = auth.uid() AND cu.clinic_id IS NOT NULL LIMIT 1)
    )
    OR EXISTS (SELECT 1 FROM clinic_users cu WHERE cu.user_id = auth.uid() AND cu.role = 'SUPER_ADMIN')
  );

DROP POLICY IF EXISTS "billing_document_items_insert" ON billing_document_items;
CREATE POLICY "billing_document_items_insert" ON billing_document_items
  FOR INSERT WITH CHECK (
    document_id IN (
      SELECT id FROM billing_documents
      WHERE clinic_id = (SELECT cu.clinic_id FROM clinic_users cu WHERE cu.user_id = auth.uid() AND cu.clinic_id IS NOT NULL LIMIT 1)
    )
    OR EXISTS (SELECT 1 FROM clinic_users cu WHERE cu.user_id = auth.uid() AND cu.role = 'SUPER_ADMIN')
  );

-- No UPDATE, no DELETE.

-- ── payments ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS payments (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id        uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  -- FK constraints omitted: add manually once table names are confirmed
  appointment_id   uuid,
  patient_id       uuid,

  amount           numeric(10,2) NOT NULL CHECK (amount > 0),
  currency         text NOT NULL DEFAULT 'ILS',
  payment_method   payment_method_type NOT NULL,
  payment_date     date NOT NULL,
  reference_number text,

  is_refund        bool NOT NULL DEFAULT false,
  refund_for_id    uuid REFERENCES payments(id),
  refund_reason    text,

  status           payment_status_type NOT NULL DEFAULT 'received',
  notes            text,

  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payments_clinic_date
  ON payments(clinic_id, payment_date DESC);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payments_select" ON payments;
CREATE POLICY "payments_select" ON payments
  FOR SELECT USING (
    clinic_id = (SELECT cu.clinic_id FROM clinic_users cu WHERE cu.user_id = auth.uid() AND cu.clinic_id IS NOT NULL LIMIT 1)
    OR EXISTS (SELECT 1 FROM clinic_users cu WHERE cu.user_id = auth.uid() AND cu.role = 'SUPER_ADMIN')
  );

DROP POLICY IF EXISTS "payments_insert" ON payments;
CREATE POLICY "payments_insert" ON payments
  FOR INSERT WITH CHECK (
    clinic_id = (SELECT cu.clinic_id FROM clinic_users cu WHERE cu.user_id = auth.uid() AND cu.clinic_id IS NOT NULL LIMIT 1)
    OR EXISTS (SELECT 1 FROM clinic_users cu WHERE cu.user_id = auth.uid() AND cu.role = 'SUPER_ADMIN')
  );

-- No DELETE policy.

-- ── billing_document_payments ─────────────────────────────────
-- Junction: links payments to documents.
-- Integrity rules enforced at API layer + constraints below.

CREATE TABLE IF NOT EXISTS billing_document_payments (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id      uuid NOT NULL REFERENCES billing_documents(id),
  payment_id       uuid NOT NULL REFERENCES payments(id),
  allocated_amount numeric(10,2) NOT NULL CHECK (allocated_amount > 0),
  UNIQUE (document_id, payment_id)
);

ALTER TABLE billing_document_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "billing_document_payments_select" ON billing_document_payments;
CREATE POLICY "billing_document_payments_select" ON billing_document_payments
  FOR SELECT USING (
    document_id IN (
      SELECT id FROM billing_documents
      WHERE clinic_id = (SELECT cu.clinic_id FROM clinic_users cu WHERE cu.user_id = auth.uid() AND cu.clinic_id IS NOT NULL LIMIT 1)
    )
    OR EXISTS (SELECT 1 FROM clinic_users cu WHERE cu.user_id = auth.uid() AND cu.role = 'SUPER_ADMIN')
  );

-- INSERT via service role only with explicit cross-table clinic_id validation in API.
-- Over-allocation validation happens in API before insert.
-- No UPDATE, no DELETE.

-- ── billing_audit_log ─────────────────────────────────────────
-- Append-only. Service role bypasses RLS — clinic_id always set explicitly in server code.
-- No UPDATE or DELETE policy for any role including service role (enforced at API layer).

CREATE TABLE IF NOT EXISTS billing_audit_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id     uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  document_id   uuid REFERENCES billing_documents(id) ON DELETE SET NULL,
  payment_id    uuid REFERENCES payments(id) ON DELETE SET NULL,
  event_type    text NOT NULL,
  actor_user_id uuid,
  event_payload jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS billing_audit_log_clinic
  ON billing_audit_log(clinic_id, created_at DESC);
CREATE INDEX IF NOT EXISTS billing_audit_log_document
  ON billing_audit_log(document_id) WHERE document_id IS NOT NULL;

ALTER TABLE billing_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "billing_audit_log_select" ON billing_audit_log;
CREATE POLICY "billing_audit_log_select" ON billing_audit_log
  FOR SELECT USING (
    clinic_id = (SELECT cu.clinic_id FROM clinic_users cu WHERE cu.user_id = auth.uid() AND cu.clinic_id IS NOT NULL LIMIT 1)
    OR EXISTS (SELECT 1 FROM clinic_users cu WHERE cu.user_id = auth.uid() AND cu.role = 'SUPER_ADMIN')
  );

-- INSERT via service role only. No UPDATE, no DELETE for any role.

-- ── idempotency_keys ──────────────────────────────────────────
-- Operational infrastructure records — NOT accounting records.
-- May be purged by scheduled server-side cleanup job after retention window
-- (default 7 days post-expiry). Distinct from the no-hard-delete policy
-- that applies to all billing/accounting tables.

CREATE TABLE IF NOT EXISTS idempotency_keys (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id         uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  idempotency_key   text NOT NULL,
  endpoint          text NOT NULL,
  payload_hash      text NOT NULL,
  response_status   int,
  response_body     jsonb,
  created_at        timestamptz NOT NULL DEFAULT now(),
  expires_at        timestamptz NOT NULL,
  locked_at         timestamptz,
  locked_until      timestamptz,
  UNIQUE (clinic_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idempotency_keys_expires ON idempotency_keys(expires_at);

ALTER TABLE idempotency_keys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "idempotency_keys_select" ON idempotency_keys;
CREATE POLICY "idempotency_keys_select" ON idempotency_keys
  FOR SELECT USING (
    clinic_id = (SELECT cu.clinic_id FROM clinic_users cu WHERE cu.user_id = auth.uid() AND cu.clinic_id IS NOT NULL LIMIT 1)
    OR EXISTS (SELECT 1 FROM clinic_users cu WHERE cu.user_id = auth.uid() AND cu.role = 'SUPER_ADMIN')
  );

-- All writes via service role with explicit clinic_id scoping in server code.
-- No client DELETE. Cleanup by scheduled server job only.

-- ── cancel_billing_document() ─────────────────────────────────
-- Atomic cancellation: inserts cancellation document + updates original in one transaction.
-- SECURITY DEFINER: service role context — p_clinic_id must be server-resolved, never client-provided.

CREATE OR REPLACE FUNCTION cancel_billing_document(
  p_document_id   uuid,
  p_clinic_id     uuid,
  p_actor_user_id uuid,
  p_reason        text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_original      billing_documents;
  v_cancel_seq    int;
  v_cancel_year   int;
  v_cancel_number text;
  v_cancellation  billing_documents;
BEGIN
  -- Lock original row for this transaction
  SELECT * INTO v_original
  FROM billing_documents
  WHERE id = p_document_id AND clinic_id = p_clinic_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'מסמך לא נמצא';
  END IF;

  IF v_original.status = 'cancelled' THEN
    RAISE EXCEPTION 'מסמך כבר בוטל';
  END IF;

  IF v_original.doc_type = 'cancellation_document' THEN
    RAISE EXCEPTION 'לא ניתן לבטל מסמך ביטול';
  END IF;

  -- Get next cancellation sequence number
  v_cancel_year := EXTRACT(YEAR FROM now())::int;

  INSERT INTO document_sequences (clinic_id, doc_type, document_year, last_number)
  VALUES (p_clinic_id, 'cancellation_document', v_cancel_year, 1)
  ON CONFLICT (clinic_id, doc_type, document_year)
  DO UPDATE SET last_number = document_sequences.last_number + 1
  RETURNING last_number INTO v_cancel_seq;

  v_cancel_number := 'BTL-' || v_cancel_year || '-' || LPAD(v_cancel_seq::text, 4, '0');

  -- Insert cancellation document (amounts are negative mirrors)
  INSERT INTO billing_documents (
    clinic_id, doc_type, doc_number, seq_number, document_year,
    patient_id, appointment_id,
    customer_name, customer_phone, customer_email,
    customer_type, customer_business_number, customer_address,
    business_name, business_number, business_address, vat_number,
    subtotal, vat_rate, vat_amount, total, currency,
    status, cancels_document_id, allocation_status, issued_at
  ) VALUES (
    p_clinic_id, 'cancellation_document', v_cancel_number, v_cancel_seq, v_cancel_year,
    v_original.patient_id, v_original.appointment_id,
    v_original.customer_name, v_original.customer_phone, v_original.customer_email,
    v_original.customer_type, v_original.customer_business_number, v_original.customer_address,
    v_original.business_name, v_original.business_number, v_original.business_address, v_original.vat_number,
    -(v_original.subtotal), v_original.vat_rate, -(v_original.vat_amount), -(v_original.total), v_original.currency,
    'issued', v_original.id, 'not_required', now()
  )
  RETURNING * INTO v_cancellation;

  -- Mirror line items with negated quantities and line totals
  INSERT INTO billing_document_items (document_id, service_id, description, quantity, unit_price, line_total)
  SELECT v_cancellation.id, service_id, description, -quantity, unit_price, -line_total
  FROM billing_document_items
  WHERE document_id = p_document_id;

  -- Mark original as cancelled (the only post-issue mutation allowed)
  UPDATE billing_documents SET
    status = 'cancelled',
    cancelled_at = now(),
    cancellation_doc_id = v_cancellation.id
  WHERE id = p_document_id;

  -- Audit log (service role — clinic_id set explicitly)
  INSERT INTO billing_audit_log (clinic_id, document_id, event_type, actor_user_id, event_payload)
  VALUES (
    p_clinic_id, p_document_id, 'cancellation_created', p_actor_user_id,
    jsonb_build_object(
      'original_doc_number', v_original.doc_number,
      'cancellation_doc_number', v_cancel_number,
      'reason', p_reason
    )
  );

  RETURN jsonb_build_object(
    'cancellation_id', v_cancellation.id,
    'cancellation_doc_number', v_cancel_number,
    'original_id', p_document_id
  );
END;
$$;
