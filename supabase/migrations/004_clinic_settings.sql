-- SaaS control center: clinic settings + team roles

CREATE TABLE IF NOT EXISTS clinic_settings (
  clinic_id UUID PRIMARY KEY REFERENCES clinics(id) ON DELETE CASCADE,

  -- General
  clinic_phone         TEXT,
  address              TEXT,
  timezone             TEXT    NOT NULL DEFAULT 'Asia/Jerusalem',
  currency             TEXT    NOT NULL DEFAULT 'ILS',
  logo_url             TEXT,
  business_description TEXT,

  -- Scheduling
  working_hours            JSONB   NOT NULL DEFAULT '[
    {"day":0,"enabled":false,"open":"08:00","close":"16:00"},
    {"day":1,"enabled":true,"open":"08:00","close":"16:00"},
    {"day":2,"enabled":true,"open":"08:00","close":"16:00"},
    {"day":3,"enabled":true,"open":"08:00","close":"16:00"},
    {"day":4,"enabled":true,"open":"08:00","close":"16:00"},
    {"day":5,"enabled":true,"open":"08:00","close":"14:00"},
    {"day":6,"enabled":false,"open":"08:00","close":"16:00"}
  ]'::jsonb,
  slot_minutes              INTEGER NOT NULL DEFAULT 30,
  buffer_minutes            INTEGER NOT NULL DEFAULT 0,
  max_appointments_per_day  INTEGER,
  min_booking_notice_hours  INTEGER NOT NULL DEFAULT 0,
  max_booking_window_days   INTEGER NOT NULL DEFAULT 60,
  break_slots               JSONB   NOT NULL DEFAULT '[]'::jsonb,

  -- Automation
  require_phone_before_booking      BOOLEAN NOT NULL DEFAULT true,
  auto_create_lead_on_first_message BOOLEAN NOT NULL DEFAULT false,
  sla_target_minutes                INTEGER NOT NULL DEFAULT 60,
  auto_mark_contacted               BOOLEAN NOT NULL DEFAULT false,

  -- AI Behavior
  ai_tone                  TEXT    NOT NULL DEFAULT 'professional',
  ai_response_length       TEXT    NOT NULL DEFAULT 'standard',
  strict_hours_enforcement BOOLEAN NOT NULL DEFAULT true,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE clinic_users
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'member';
