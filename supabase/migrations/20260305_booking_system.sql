-- Booking System Migration
-- Run this in Supabase SQL editor

CREATE TABLE IF NOT EXISTS clinics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  logo_url text,
  hero_image text,
  address text,
  lat numeric,
  lng numeric,
  phone text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS clinic_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid REFERENCES clinics(id) ON DELETE CASCADE,
  name text NOT NULL,
  price numeric,
  duration_minutes integer NOT NULL,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS clinic_workers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid REFERENCES clinics(id) ON DELETE CASCADE,
  name text NOT NULL,
  is_default boolean DEFAULT false,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- day_of_week: 0=Sunday, 1=Monday, ..., 6=Saturday (matches moment.js .day())
-- worker_id NULL means clinic-wide hours (applies to all workers)
CREATE TABLE IF NOT EXISTS working_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid REFERENCES clinics(id) ON DELETE CASCADE,
  worker_id uuid REFERENCES clinic_workers(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL
);

CREATE TABLE IF NOT EXISTS clinic_gallery_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid REFERENCES clinics(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid REFERENCES clinics(id) ON DELETE CASCADE,
  service_id uuid REFERENCES clinic_services(id),
  worker_id uuid REFERENCES clinic_workers(id),
  customer_phone text NOT NULL,
  service_name_snapshot text,
  service_duration_minutes integer,
  price_snapshot numeric,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  status text CHECK (status IN ('locked', 'confirmed', 'cancelled')),
  locked_until timestamptz,
  booking_source text DEFAULT 'booking_page',
  cancelled_at timestamptz,
  cancelled_by text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS otp_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  clinic_id uuid REFERENCES clinics(id),
  appointment_id uuid REFERENCES appointments(id),
  code text NOT NULL,
  expires_at timestamptz NOT NULL,
  is_used boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_clinics_slug ON clinics(slug);
CREATE INDEX IF NOT EXISTS idx_appointments_clinic_id ON appointments(clinic_id);
CREATE INDEX IF NOT EXISTS idx_appointments_worker_id ON appointments(worker_id);
CREATE INDEX IF NOT EXISTS idx_appointments_start_time ON appointments(start_time);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_clinic_status ON appointments(clinic_id, status, start_time);
CREATE INDEX IF NOT EXISTS idx_otp_codes_appointment_id ON otp_codes(appointment_id);
CREATE INDEX IF NOT EXISTS idx_otp_codes_phone ON otp_codes(phone);
CREATE INDEX IF NOT EXISTS idx_working_hours_clinic_id ON working_hours(clinic_id);
CREATE INDEX IF NOT EXISTS idx_working_hours_worker_day ON working_hours(worker_id, day_of_week);
CREATE INDEX IF NOT EXISTS idx_clinic_services_clinic_id ON clinic_services(clinic_id);
CREATE INDEX IF NOT EXISTS idx_clinic_workers_clinic_id ON clinic_workers(clinic_id);

-- RLS: public read access for booking page
ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinic_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinic_workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE working_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinic_gallery_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_clinics" ON clinics FOR SELECT USING (true);
CREATE POLICY "public_read_clinic_services" ON clinic_services FOR SELECT USING (true);
CREATE POLICY "public_read_clinic_workers" ON clinic_workers FOR SELECT USING (true);
CREATE POLICY "public_read_working_hours" ON working_hours FOR SELECT USING (true);
CREATE POLICY "public_read_clinic_gallery" ON clinic_gallery_images FOR SELECT USING (true);
