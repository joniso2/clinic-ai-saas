-- clinics: status + created_by for provisioning
alter table public.clinics
  add column if not exists status text not null default 'active' check (status in ('active', 'inactive', 'suspended'));
alter table public.clinics
  add column if not exists created_by uuid references auth.users(id) on delete set null;
