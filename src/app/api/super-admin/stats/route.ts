import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireSuperAdmin } from '@/lib/auth-server';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase server env not configured');
  return createClient(url, key, { auth: { persistSession: false } });
}

/** GET /api/super-admin/stats — platform stats (Super Admin only). */
export async function GET() {
  const user = await requireSuperAdmin();
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const supabase = getSupabaseAdmin();
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

  const [
    { count: clinicsCount },
    { count: leadsCount },
    { count: appointmentsCount },
    { count: usersCount },
    { count: messagesToday },
  ] = await Promise.all([
    supabase.from('clinics').select('id', { count: 'exact', head: true }),
    supabase.from('leads').select('id', { count: 'exact', head: true }),
    supabase.from('appointments').select('id', { count: 'exact', head: true }),
    supabase.from('clinic_users').select('user_id', { count: 'exact', head: true }),
    supabase.from('messages').select('id', { count: 'exact', head: true }).gte('created_at', todayStart),
  ]);

  let integrationHealth = 0;
  try {
    const { count: totalInt } = await supabase.from('clinic_integrations').select('id', { count: 'exact', head: true });
    const { count: connectedInt } = await supabase.from('clinic_integrations').select('id', { count: 'exact', head: true }).eq('status', 'connected');
    integrationHealth = (totalInt ?? 0) > 0 ? ((connectedInt ?? 0) / (totalInt ?? 1)) * 100 : 0;
  } catch {
    // table may not exist before migration
  }

  const total_users = usersCount ?? 0;

  return NextResponse.json({
    active_clinics: clinicsCount ?? 0,
    total_leads: leadsCount ?? 0,
    total_appointments: appointmentsCount ?? 0,
    total_users,
    messages_per_day: messagesToday ?? 0,
    integration_health: integrationHealth,
    daily_ai_usage: 0,
    discord_conversations: 0,
    whatsapp_conversations: 0,
  });
}
