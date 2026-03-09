-- ============================================================
-- Fix booking race condition
-- Old index: unique on (clinic_id, datetime) WHERE status = 'scheduled'
-- Problems:
--   1. Booking flow uses 'locked'/'confirmed', not 'scheduled' — index doesn't apply
--   2. Index is on `datetime` but booking flow uses `start_time`
-- Fix: cover all active statuses, use COALESCE(start_time, datetime)
--   so both CRM appointments (datetime) and booking-page appointments
--   (start_time) are protected.
-- ============================================================

-- Drop the old index that only covered 'scheduled'
DROP INDEX IF EXISTS appointments_unique_slot;

-- New: prevent double-booking for any active appointment status.
-- COALESCE handles both column conventions: booking flow sets start_time,
-- CRM flow sets datetime, lock-slot sets both.
CREATE UNIQUE INDEX appointments_unique_active_slot
ON appointments (clinic_id, COALESCE(start_time, datetime))
WHERE status IN ('locked', 'confirmed', 'scheduled');
