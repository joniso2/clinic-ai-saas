-- Patients (customers) table + appointments extensions for CRM
-- Run in Supabase SQL Editor after 001–010.

-- -----------------------------------------------------------------------------
-- patients
-- -----------------------------------------------------------------------------
create table if not exists public.patients (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  lead_id uuid null,
  full_name text not null,
  phone text not null,
  total_revenue numeric not null default 0,
  visits_count int not null default 0,
  last_visit_date timestamptz null,
  status text not null default 'active' check (status in ('active', 'dormant', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null
);

create index if not exists patients_clinic_id_idx on public.patients (clinic_id);
create index if not exists patients_phone_idx on public.patients (clinic_id, phone);
create index if not exists patients_last_visit_idx on public.patients (clinic_id, last_visit_date desc nulls last);
create index if not exists patients_status_idx on public.patients (clinic_id, status);

alter table public.patients enable row level security;

create policy "Users see own clinic patients"
  on public.patients for select
  using (public.user_can_access_clinic(clinic_id));

create policy "Users insert own clinic patients"
  on public.patients for insert
  with check (public.user_can_access_clinic(clinic_id));

create policy "Users update own clinic patients"
  on public.patients for update
  using (public.user_can_access_clinic(clinic_id))
  with check (public.user_can_access_clinic(clinic_id));

create policy "Users delete own clinic patients (soft delete via updated_at)"
  on public.patients for delete
  using (public.user_can_access_clinic(clinic_id));

-- -----------------------------------------------------------------------------
-- appointments: patient_id, status, revenue, notes
-- -----------------------------------------------------------------------------
alter table public.appointments
  add column if not exists patient_id uuid null references public.patients(id) on delete set null;

alter table public.appointments
  add column if not exists status text not null default 'scheduled'
  check (status in ('scheduled', 'completed', 'cancelled'));

alter table public.appointments
  add column if not exists revenue numeric null;

alter table public.appointments
  add column if not exists service_name text null;

alter table public.appointments
  add column if not exists notes text null;

create index if not exists appointments_patient_id_idx on public.appointments (patient_id) where patient_id is not null;
