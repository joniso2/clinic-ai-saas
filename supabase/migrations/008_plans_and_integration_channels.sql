-- =============================================================================
-- PLANS (SaaS billing) + INTEGRATION_CHANNELS (Discord + WhatsApp)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- plans table (future Stripe / monetization)
-- -----------------------------------------------------------------------------
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

create policy "Plans readable by authenticated"
  on public.plans for select
  using (auth.uid() is not null);

-- Seed default plans
insert into public.plans (id, name, max_users, max_leads, max_ai_tokens, max_integrations, price_monthly, features_json)
values
  ('basic', 'Basic', 5, 500, 100000, 1, 199, '["לידים", "תורים"]'),
  ('pro', 'Pro', 15, 2000, 500000, 2, 499, '["לידים", "תורים", "AI", "דיסקורד"]'),
  ('enterprise', 'Enterprise', null, null, null, null, null, '["הכל", "תמיכה"]')
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- clinics.plan_id (optional FK to plans)
-- -----------------------------------------------------------------------------
alter table public.clinics
  add column if not exists plan_id text references public.plans(id);

-- -----------------------------------------------------------------------------
-- integration_channels (DISCORD | WHATSAPP per clinic)
-- -----------------------------------------------------------------------------
create table if not exists public.integration_channels (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  type text not null check (type in ('DISCORD', 'WHATSAPP')),
  status text not null default 'active' check (status in ('active', 'inactive', 'suspended')),
  config_json jsonb default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_integration_channels_clinic_type
  on public.integration_channels(clinic_id, type);

alter table public.integration_channels enable row level security;

create policy "Users see own clinic integration_channels"
  on public.integration_channels for select
  using (public.user_can_access_clinic(clinic_id));

-- INSERT/UPDATE/DELETE: no policy (only service_role in app can write)
