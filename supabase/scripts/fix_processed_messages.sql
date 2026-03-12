-- Run this in Supabase SQL Editor (production project linked to Railway).
-- Fixes: "Could not find the table 'public.processed_messages'" → Discord bot "שגיאה זמנית".

CREATE TABLE IF NOT EXISTS processed_messages (
  id TEXT PRIMARY KEY,
  clinic_id UUID NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_processed_messages_clinic_id
  ON processed_messages (clinic_id);
