-- Add duration_minutes to appointments (no logic change; default 30, backfill existing).

alter table public.appointments
  add column if not exists duration_minutes integer not null default 30;

update public.appointments set duration_minutes = 30 where duration_minutes is null;
