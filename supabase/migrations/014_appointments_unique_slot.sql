-- Atomic booking: one scheduled appointment per (clinic_id, datetime).
-- Cancelled/completed appointments are excluded (partial index).
-- Safe to run in production; does not drop or modify existing data.
--
-- If this migration fails with "duplicate key value violates unique constraint
-- appointments_unique_slot", then duplicate (clinic_id, datetime) rows with
-- status = 'scheduled' already exist. Resolve them (e.g. cancel duplicates
-- or merge) before re-running. List duplicates with:
--   SELECT clinic_id, datetime, count(*) FROM appointments
--   WHERE status = 'scheduled' GROUP BY clinic_id, datetime HAVING count(*) > 1;

CREATE UNIQUE INDEX IF NOT EXISTS appointments_unique_slot
ON appointments (clinic_id, datetime)
WHERE status = 'scheduled';
