-- Add optional description and updated_at to clinic_services (RLS unchanged).
alter table public.clinic_services
  add column if not exists description text,
  add column if not exists updated_at timestamptz;

-- Backfill updated_at from created_at where null.
update public.clinic_services set updated_at = created_at where updated_at is null;

-- Trigger to set updated_at on update.
create or replace function public.set_clinic_services_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists clinic_services_updated_at on public.clinic_services;
create trigger clinic_services_updated_at
  before update on public.clinic_services
  for each row execute function public.set_clinic_services_updated_at();
