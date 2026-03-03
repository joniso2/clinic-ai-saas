-- Add duration_minutes to clinic_services (service-based appointment duration).
-- No logic change; default 30, existing rows backfilled.

alter table public.clinic_services
  add column if not exists duration_minutes integer not null default 30;

update public.clinic_services set duration_minutes = 30 where duration_minutes is null;
