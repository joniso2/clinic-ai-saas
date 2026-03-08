-- =============================================================================
-- FIX: Create missing public.patients table + wire appointments.patient_id FK
-- Safe to run on current DB state where leads, appointments, billing_documents
-- exist but patients does NOT.
-- Idempotent: uses IF NOT EXISTS / IF NOT EXISTS throughout.
-- =============================================================================

-- 1. Create patients table
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

-- 2. Indexes
create index if not exists patients_clinic_id_idx on public.patients (clinic_id);
create index if not exists patients_phone_idx on public.patients (clinic_id, phone);
create index if not exists patients_last_visit_idx on public.patients (clinic_id, last_visit_date desc nulls last);
create index if not exists patients_status_idx on public.patients (clinic_id, status);

-- 3. Enable RLS
alter table public.patients enable row level security;

-- 4. RLS policies (drop-if-exists + create for idempotency)
do $$ begin
  drop policy if exists "Users see own clinic patients" on public.patients;
  drop policy if exists "Users insert own clinic patients" on public.patients;
  drop policy if exists "Users update own clinic patients" on public.patients;
  drop policy if exists "Users delete own clinic patients (soft delete via updated_at)" on public.patients;
end $$;

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

-- 5. Add patient_id column to appointments (if not already present)
alter table public.appointments
  add column if not exists patient_id uuid null;

-- 5b. Add FK constraint if it doesn't already exist
do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'appointments_patient_id_fkey'
      and table_name = 'appointments'
  ) then
    alter table public.appointments
      add constraint appointments_patient_id_fkey
      foreign key (patient_id) references public.patients(id) on delete set null;
  end if;
end $$;

create index if not exists appointments_patient_id_idx
  on public.appointments (patient_id) where patient_id is not null;

-- 6. Add CRM columns to appointments (from migration 011, may be missing)
--    These are required for completed-appointment tracking and receipt flow.
alter table public.appointments
  add column if not exists status text not null default 'scheduled';

-- Add CHECK constraint for status if not already present
do $$
begin
  if not exists (
    select 1 from information_schema.constraint_column_usage ccu
    join information_schema.check_constraints cc
      on cc.constraint_name = ccu.constraint_name
    where ccu.table_name = 'appointments' and ccu.column_name = 'status'
  ) then
    alter table public.appointments
      add constraint appointments_status_check
      check (status in ('scheduled', 'completed', 'cancelled'));
  end if;
end $$;

alter table public.appointments
  add column if not exists revenue numeric null;

alter table public.appointments
  add column if not exists service_name text null;

alter table public.appointments
  add column if not exists notes text null;

-- 7. Grant service_role full access (matches other tables in this project)
grant all on public.patients to service_role;
