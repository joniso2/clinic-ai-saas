-- Idempotency for Discord webhook: one processing per message_id.
-- Primary key prevents duplicate processing under concurrency.

CREATE TABLE IF NOT EXISTS processed_messages (
  id TEXT PRIMARY KEY,
  clinic_id UUID NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_processed_messages_clinic_id
  ON processed_messages (clinic_id);
