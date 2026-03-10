-- =============================================================================
-- Fix: allow each user to read their own clinic_users row(s).
-- If RLS was enabled on clinic_users without a SELECT policy, the app could
-- not get clinic_id for the session → "Unauthorized or clinic not set".
-- Run once in Supabase SQL Editor (production + any env).
-- =============================================================================

alter table public.clinic_users enable row level security;

drop policy if exists "Users can read own clinic_users" on public.clinic_users;
create policy "Users can read own clinic_users"
  on public.clinic_users for select
  using (user_id = auth.uid());

-- Service role (create-clinic, etc.) bypasses RLS; no INSERT/UPDATE/DELETE
-- policy needed for anon/authenticated — those are done server-side with service role.
