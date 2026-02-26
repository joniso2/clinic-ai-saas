-- Run this in your Supabase SQL editor (Dashboard → SQL Editor)

CREATE TABLE IF NOT EXISTS appointments (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id   UUID        NOT NULL,
  patient_name TEXT       NOT NULL,
  datetime    TIMESTAMPTZ NOT NULL,
  type        TEXT        NOT NULL DEFAULT 'new' CHECK (type IN ('new', 'follow_up')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS appointments_clinic_id_idx ON appointments (clinic_id);
CREATE INDEX IF NOT EXISTS appointments_datetime_idx  ON appointments (datetime);
