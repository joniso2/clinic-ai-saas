-- ============================================================
-- Fix billing RLS policies for SUPER_ADMIN
-- Problem: SUPER_ADMIN has clinic_id = NULL in clinic_users.
-- The old policies compare clinic_id = NULL which is always
-- false in SQL, silently hiding all billing data from admins.
-- Fix: add OR EXISTS check for SUPER_ADMIN role.
-- ============================================================

-- Helper: reusable expression for clinic isolation + super-admin bypass
-- clinic_id = (user's clinic) OR user is SUPER_ADMIN

-- ── billing_settings ────────────────────────────────────────
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

-- ── billing_documents ───────────────────────────────────────
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

-- ── billing_document_items ──────────────────────────────────
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

-- ── payments ────────────────────────────────────────────────
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

-- ── billing_document_payments ───────────────────────────────
DROP POLICY IF EXISTS "billing_document_payments_select" ON billing_document_payments;
CREATE POLICY "billing_document_payments_select" ON billing_document_payments
  FOR SELECT USING (
    document_id IN (
      SELECT id FROM billing_documents
      WHERE clinic_id = (SELECT cu.clinic_id FROM clinic_users cu WHERE cu.user_id = auth.uid() AND cu.clinic_id IS NOT NULL LIMIT 1)
    )
    OR EXISTS (SELECT 1 FROM clinic_users cu WHERE cu.user_id = auth.uid() AND cu.role = 'SUPER_ADMIN')
  );

-- ── billing_audit_log ───────────────────────────────────────
DROP POLICY IF EXISTS "billing_audit_log_select" ON billing_audit_log;
CREATE POLICY "billing_audit_log_select" ON billing_audit_log
  FOR SELECT USING (
    clinic_id = (SELECT cu.clinic_id FROM clinic_users cu WHERE cu.user_id = auth.uid() AND cu.clinic_id IS NOT NULL LIMIT 1)
    OR EXISTS (SELECT 1 FROM clinic_users cu WHERE cu.user_id = auth.uid() AND cu.role = 'SUPER_ADMIN')
  );

-- ── idempotency_keys ────────────────────────────────────────
DROP POLICY IF EXISTS "idempotency_keys_select" ON idempotency_keys;
CREATE POLICY "idempotency_keys_select" ON idempotency_keys
  FOR SELECT USING (
    clinic_id = (SELECT cu.clinic_id FROM clinic_users cu WHERE cu.user_id = auth.uid() AND cu.clinic_id IS NOT NULL LIMIT 1)
    OR EXISTS (SELECT 1 FROM clinic_users cu WHERE cu.user_id = auth.uid() AND cu.role = 'SUPER_ADMIN')
  );
