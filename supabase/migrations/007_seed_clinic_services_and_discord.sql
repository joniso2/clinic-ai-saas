-- =============================================================================
-- STEP 9 (continued) — Seed clinic_services from prices.ts + Discord guild mapping
-- 1) Run 006_multitenant_super_admin.sql first.
-- 2) Replace @default_clinic_id@ with (select id from public.clinics limit 1) or your clinic UUID.
-- 3) Replace @your_discord_guild_id@ with your Discord server (guild) ID.
-- 4) Then run this file in Supabase SQL Editor.
-- =============================================================================

-- Get default clinic (run once to set variable, or use subquery in each insert)
-- Using a CTE to get the first clinic for the seed
do $$
declare
  cid uuid;
begin
  select id into cid from public.clinics limit 1;
  if cid is null then
    raise exception 'No clinic found. Create a clinic first or run 006 migration.';
  end if;

  -- Seed clinic_services (from src/discord/prices.ts) only if this clinic has none yet
  if not exists (select 1 from public.clinic_services where clinic_id = cid limit 1) then
    insert into public.clinic_services (clinic_id, service_name, price, aliases, is_active) values
      (cid, 'check-up', 250, array['check-up','בדיקה','ייעוץ'], true),
      (cid, 'cleaning', 350, array['cleaning','שיננית','ניקוי','אבנית'], true),
      (cid, 'x-ray', 80, array['x-ray','צילום','סטטוס'], true),
      (cid, 'white-filling', 450, array['white-filling','סתימה','חור בשן','שחזור'], true),
      (cid, 'root-canal', 1200, array['root-canal','טיפול שורש','כאב חזק'], true),
      (cid, 'extraction', 500, array['extraction','עקירה','עקירת שן בינה','לעקור'], true),
      (cid, 'whitening', 1200, array['whitening','הלבנה','הלבנת שיניים'], true),
      (cid, 'crown-zirconia', 3500, array['crown-zirconia','כתר','זירקוניה','חרסינה'], true),
      (cid, 'implant', 3500, array['implant','השתלה','שתל','שתלים'], true),
      (cid, 'veneers', 3000, array['veneers','ציפוי חרסינה','ציפויי שיניים'], true),
      (cid, 'orthodontics', 10000, array['orthodontics','גשר','יישור שיניים','גשר שקוף','אינוויזליין'], true),
      (cid, 'night-guard', 1000, array['night-guard','סד לילה','חריקת שיניים'], true),
      (cid, 'emergency', 200, array['emergency','עזרה ראשונה','חירום'], true);
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- Discord guild → clinic mapping
-- Replace @your_discord_guild_id@ with your Discord server ID.
-- Get default clinic id: select id from public.clinics limit 1;
-- -----------------------------------------------------------------------------
-- insert into public.discord_guilds (guild_id, clinic_id)
-- values ('@your_discord_guild_id@', (select id from public.clinics limit 1))
-- on conflict (guild_id) do update set clinic_id = excluded.clinic_id;

-- -----------------------------------------------------------------------------
-- Create first SUPER_ADMIN (replace YOUR_USER_UID with Auth user UUID)
-- Use this if ON CONFLICT (user_id, clinic_id) fails (no such unique constraint).
-- -----------------------------------------------------------------------------
-- update public.clinic_users set clinic_id = null, role = 'SUPER_ADMIN' where user_id = 'YOUR_USER_UID';
-- insert into public.clinic_users (user_id, clinic_id, role)
-- select 'YOUR_USER_UID', null, 'SUPER_ADMIN'
-- where not exists (select 1 from public.clinic_users where user_id = 'YOUR_USER_UID');
