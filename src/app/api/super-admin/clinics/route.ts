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
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const supabase = getSupabaseAdmin();
  const { data: clinics, error: clinicsError } = await supabase
    .from('clinics')
    .select('id, name, plan_id, status')
    .order('name');

  if (clinicsError) {
    return NextResponse.json({ error: clinicsError.message }, { status: 500 });
  }

  const list = clinics ?? [];
  const { data: guildRows } = await supabase.from('discord_guilds').select('clinic_id');
  const connectedClinicIds = new Set((guildRows ?? []).map((r: { clinic_id: string }) => r.clinic_id));

  const withCounts = await Promise.all(
    list.map(async (c) => {
      const [leadsRes, appointmentsRes] = await Promise.all([
        supabase.from('leads').select('id', { count: 'exact', head: true }).eq('clinic_id', c.id),
        supabase.from('appointments').select('id', { count: 'exact', head: true }).eq('clinic_id', c.id),
      ]);
      return {
        ...c,
        leads_count: leadsRes.count ?? 0,
        appointments_count: appointmentsRes.count ?? 0,
        discord_connected: connectedClinicIds.has(c.id),
      };
    }),
  );

  return NextResponse.json({ clinics: withCounts });
}
