-- Run this in Supabase SQL Editor to verify 016_super_admin_infrastructure applied correctly.
-- You should see: 3 tables, 2 functions, and several RLS policies.

-- 1) Tables from 016
select 'table' as kind, table_schema || '.' || table_name as name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('clinic_integrations', 'messages', 'ai_models')
order by table_name;

-- 2) Functions used by 016
select 'function' as kind, routine_schema || '.' || routine_name as name
from information_schema.routines
where routine_schema = 'public'
  and routine_name in ('is_super_admin', 'user_can_access_clinic')
order by routine_name;

-- 3) RLS policies on the new tables
select 'policy' as kind, tablename || ': ' || policyname as name
from pg_policies
where schemaname = 'public'
  and tablename in ('clinic_integrations', 'messages', 'ai_models')
order by tablename, policyname;
