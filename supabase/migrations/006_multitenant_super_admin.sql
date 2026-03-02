-- =============================================================================
-- MULTI-TENANT + SUPER ADMIN (per prompt: Steps 1–4, 9)
-- Run in Supabase SQL Editor. Then run seed (Step 9) with your clinic_id.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- STEP 1 — discord_guilds (resolve clinic from guild_id, no more ENV)
-- -----------------------------------------------------------------------------
create table if not exists public.discord_guilds (
  id uuid primary key default gen_random_uuid(),
  guild_id text not null unique,
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.discord_guilds enable row level security;

-- Only server-side (service_role) or SUPER_ADMIN should manage; restrict in app.
-- This policy allows read for authenticated users (app will filter by role).
create policy "Allow read for authenticated"
  on public.discord_guilds for select
  using (auth.uid() is not null);

create policy "Allow all for service role (server-side only)"
  on public.discord_guilds for all
  using (true)
  with check (true);
-- Note: In app, only call this table from server with requireSuperAdmin(); do not expose to client.

-- -----------------------------------------------------------------------------
-- STEP 2 — RBAC: clinic_users (role, clinic_id nullable for SUPER_ADMIN)
-- -----------------------------------------------------------------------------
-- Ensure role column exists; align with prompt: SUPER_ADMIN | CLINIC_ADMIN | STAFF
alter table public.clinic_users
  add column if not exists role text not null default 'CLINIC_ADMIN';

-- Migrate existing non-RBAC roles to CLINIC_ADMIN (member, admin, etc.)
update public.clinic_users
set role = 'CLINIC_ADMIN'
where role is null or role not in ('SUPER_ADMIN', 'CLINIC_ADMIN', 'STAFF');
alter table public.clinic_users alter column role set default 'CLINIC_ADMIN';

-- Allow clinic_id null for SUPER_ADMIN
alter table public.clinic_users
  alter column clinic_id drop not null;

-- Constraint: only allowed roles (after all rows are migrated)
alter table public.clinic_users
  drop constraint if exists clinic_users_role_check;
alter table public.clinic_users
  add constraint clinic_users_role_check
  check (role in ('SUPER_ADMIN', 'CLINIC_ADMIN', 'STAFF'));

-- -----------------------------------------------------------------------------
-- STEP 3 — clinic_services + RLS
-- -----------------------------------------------------------------------------
create table if not exists public.clinic_services (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  service_name text not null,
  price numeric not null,
  aliases text[] default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.clinic_services enable row level security;

create or replace function public.user_can_access_clinic(cid uuid)
returns boolean as $$
  select exists (
    select 1 from public.clinic_users
    where user_id = auth.uid()
    and (clinic_id = cid or role = 'SUPER_ADMIN')
  );
$$ language sql security definer stable;

drop policy if exists "Users see own clinic services" on public.clinic_services;
create policy "Users see own clinic services"
  on public.clinic_services for select
  using (public.user_can_access_clinic(clinic_id));

drop policy if exists "Users insert own clinic services" on public.clinic_services;
create policy "Users insert own clinic services"
  on public.clinic_services for insert
  with check (public.user_can_access_clinic(clinic_id));

drop policy if exists "Users update own clinic services" on public.clinic_services;
create policy "Users update own clinic services"
  on public.clinic_services for update
  using (public.user_can_access_clinic(clinic_id))
  with check (public.user_can_access_clinic(clinic_id));

drop policy if exists "Users delete own clinic services" on public.clinic_services;
create policy "Users delete own clinic services"
  on public.clinic_services for delete
  using (public.user_can_access_clinic(clinic_id));

-- -----------------------------------------------------------------------------
-- STEP 4 — discord_guilds access: RLS above allows read for auth; write only
-- via server (service_role). No policy for insert/update/delete for anon/auth
-- so only service_role can write unless we add a "super admin can write" policy.
-- Adding a policy that allows insert/update/delete only when user is SUPER_ADMIN:
-- -----------------------------------------------------------------------------
create or replace function public.is_super_admin()
returns boolean as $$
  select exists (
    select 1 from public.clinic_users
    where user_id = auth.uid() and role = 'SUPER_ADMIN'
  );
$$ language sql security definer stable;

drop policy if exists "Allow all for service role (server-side only)" on public.discord_guilds;
drop policy if exists "Super Admin manage discord_guilds" on public.discord_guilds;
create policy "Super Admin manage discord_guilds"
  on public.discord_guilds for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- -----------------------------------------------------------------------------
-- STEP 9 — Migration: ensure default clinic exists
-- -----------------------------------------------------------------------------
-- If clinics table is empty, add one row. (Assumes clinics has id, name.)
-- If your clinics table has more required columns, add them here or create the clinic in the dashboard first.
insert into public.clinics (id, name)
select gen_random_uuid(), 'Default Clinic'
where not exists (select 1 from public.clinics limit 1);
