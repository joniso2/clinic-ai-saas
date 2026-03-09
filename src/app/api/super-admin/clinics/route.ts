import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireSuperAdmin } from '@/lib/auth-server';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase server env not configured');
  return createClient(url, key, { auth: { persistSession: false } });
}

/** GET /api/super-admin/clinics — list all clinics (Super Admin only). */
export async function GET() {
  const user = await requireSuperAdmin();
  if (!user) {
    return NextResponse.json(
      { error: 'Super Admin role required. Ensure your user has a clinic_users row with role = SUPER_ADMIN.' },
      { status: 403 }
    );
  }

  const supabase = getSupabaseAdmin();
  const { data: clinics, error: clinicsError } = await supabase
    .from('clinics')
    .select('id, name, slug, logo_url')
    .order('name');

  if (clinicsError) {
    return NextResponse.json({ error: clinicsError.message }, { status: 500 });
  }

  const list = clinics ?? [];
  const { data: guildRows } = await supabase.from('discord_guilds').select('clinic_id');
  const connectedClinicIds = new Set((guildRows ?? []).map((r: { clinic_id: string }) => r.clinic_id));

  // Batch: 2 queries total instead of 2N (one per table, count in JS)
  const [leadsRes, appointmentsRes] = await Promise.all([
    supabase.from('leads').select('clinic_id'),
    supabase.from('appointments').select('clinic_id'),
  ]);
  const leadCounts: Record<string, number> = {};
  for (const r of leadsRes.data ?? []) leadCounts[r.clinic_id] = (leadCounts[r.clinic_id] ?? 0) + 1;
  const appointmentCounts: Record<string, number> = {};
  for (const r of appointmentsRes.data ?? []) appointmentCounts[r.clinic_id] = (appointmentCounts[r.clinic_id] ?? 0) + 1;

  const withCounts = list.map((c) => ({
    ...c,
    plan_id: (c as { plan_id?: string }).plan_id ?? null,
    status: (c as { status?: string }).status ?? 'active',
    leads_count: leadCounts[c.id] ?? 0,
    appointments_count: appointmentCounts[c.id] ?? 0,
    discord_connected: connectedClinicIds.has(c.id),
  }));

  return NextResponse.json({ clinics: withCounts });
}
