-- =============================================================================
-- Fix: ensure clinics has all columns needed for Super Admin "Create New Client"
-- Run once in Supabase SQL Editor (e.g. production) if you see errors like:
--   "Could not find the 'plan_id' column of 'clinics'"
--   "Could not find the 'created_by' column of 'clinics'"
-- =============================================================================

-- 1) Plans table (required for plan_id FK)
create table if not exists public.plans (
  id text primary key,
  name text not null,
  max_users int,
  max_leads int,
  max_ai_tokens bigint,
  max_integrations int,
  price_monthly numeric(10,2),
  features_json jsonb default '[]',
  created_at timestamptz not null default now()
);

alter table public.plans enable row level security;

drop policy if exists "Plans readable by authenticated" on public.plans;
create policy "Plans readable by authenticated"
  on public.plans for select
  using (auth.uid() is not null);

insert into public.plans (id, name, max_users, max_leads, max_ai_tokens, max_integrations, price_monthly, features_json)
values
  ('basic', 'Basic', 5, 500, 100000, 1, 199, '["לידים", "תורים"]'),
  ('pro', 'Pro', 15, 2000, 500000, 2, 499, '["לידים", "תורים", "AI", "דיסקורד"]'),
  ('enterprise', 'Enterprise', null, null, null, null, null, '["הכל", "תמיכה"]')
on conflict (id) do nothing;

-- 2) clinics columns for provisioning
alter table public.clinics
  add column if not exists status text not null default 'active' check (status in ('active', 'inactive', 'suspended'));

alter table public.clinics
  add column if not exists created_by uuid references auth.users(id) on delete set null;

alter table public.clinics
  add column if not exists plan_id text references public.plans(id);

-- If plan_id was added without FK (e.g. plans didn't exist), optionally add FK now:
-- alter table public.clinics drop constraint if exists clinics_plan_id_fkey;
-- alter table public.clinics add constraint clinics_plan_id_fkey foreign key (plan_id) references public.plans(id);
