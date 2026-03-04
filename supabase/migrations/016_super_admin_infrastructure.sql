-- =============================================================================
-- SUPER ADMIN INFRASTRUCTURE
-- clinic_integrations (per-clinic), messages (traffic), ai_models (multi-provider)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Ensure helper functions exist (from 006; safe if already present)
-- -----------------------------------------------------------------------------
create or replace function public.user_can_access_clinic(cid uuid)
returns boolean as $$
  select exists (
    select 1 from public.clinic_users
    where user_id = auth.uid()
    and (clinic_id = cid or role = 'SUPER_ADMIN')
  );
$$ language sql security definer stable;

create or replace function public.is_super_admin()
returns boolean as $$
  select exists (
    select 1 from public.clinic_users
    where user_id = auth.uid() and role = 'SUPER_ADMIN'
  );
$$ language sql security definer stable;

-- -----------------------------------------------------------------------------
-- clinic_integrations — per-clinic channel config (whatsapp, sms, discord, webhook)
-- -----------------------------------------------------------------------------
create table if not exists public.clinic_integrations (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  type text not null check (type in ('whatsapp', 'sms', 'discord', 'webhook')),
  provider text not null,
  status text not null default 'disconnected' check (status in ('connected', 'disconnected', 'error')),
  config jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (clinic_id, type)
);

create index if not exists idx_clinic_integrations_clinic_id on public.clinic_integrations(clinic_id);
create index if not exists idx_clinic_integrations_type on public.clinic_integrations(type);

alter table public.clinic_integrations enable row level security;

create policy "Super Admin read clinic_integrations"
  on public.clinic_integrations for select
  using (public.is_super_admin());

create policy "Super Admin manage clinic_integrations"
  on public.clinic_integrations for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- Service role / app can read by clinic for message router
create policy "Users see own clinic integrations"
  on public.clinic_integrations for select
  using (public.user_can_access_clinic(clinic_id));

-- -----------------------------------------------------------------------------
-- messages — all communication traffic (incoming/outgoing)
-- -----------------------------------------------------------------------------
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  channel text not null check (channel in ('whatsapp', 'sms', 'discord', 'webchat')),
  direction text not null check (direction in ('incoming', 'outgoing')),
  phone text,
  content text not null,
  status text not null default 'sent' check (status in ('sent', 'delivered', 'failed', 'pending')),
  external_id text,
  created_at timestamptz not null default now()
);

create index if not exists idx_messages_clinic_created on public.messages(clinic_id, created_at desc);
create index if not exists idx_messages_channel on public.messages(channel);
create index if not exists idx_messages_created_at on public.messages(created_at desc);

alter table public.messages enable row level security;

create policy "Super Admin read messages"
  on public.messages for select
  using (public.is_super_admin());

create policy "Service can insert messages"
  on public.messages for insert
  with check (true);

create policy "Service can update messages"
  on public.messages for update
  using (true)
  with check (true);

create policy "Users see own clinic messages"
  on public.messages for select
  using (public.user_can_access_clinic(clinic_id));

-- -----------------------------------------------------------------------------
-- ai_models — per-clinic AI provider and model config
-- -----------------------------------------------------------------------------
create table if not exists public.ai_models (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  provider text not null check (provider in ('openai', 'google', 'anthropic')),
  model text not null,
  temperature numeric(3,2) not null default 0.7 check (temperature >= 0 and temperature <= 2),
  max_tokens int not null default 1024 check (max_tokens > 0 and max_tokens <= 128000),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (clinic_id)
);

create index if not exists idx_ai_models_clinic_id on public.ai_models(clinic_id);

alter table public.ai_models enable row level security;

create policy "Super Admin manage ai_models"
  on public.ai_models for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

create policy "Users see own clinic ai_models"
  on public.ai_models for select
  using (public.user_can_access_clinic(clinic_id));
