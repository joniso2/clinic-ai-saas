/**
 * GET /api/super-admin/clinic-integrations/metrics?clinic_id=...
 * Returns messages_today, messages_this_month, last_message_at for the clinic.
 */

import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth-server';
import { createClient } from '@/lib/supabase-server';

export async function GET(req: Request) {
  const user = await requireSuperAdmin();
  if (!user) return NextResponse.json({ error: 'Super Admin required' }, { status: 403 });

  const clinicId = new URL(req.url).searchParams.get('clinic_id')?.trim();
  if (!clinicId) return NextResponse.json({ error: 'clinic_id required' }, { status: 400 });

  const supabase = await createClient();
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [todayRes, monthRes, lastRes] = await Promise.all([
    supabase.from('messages').select('id', { count: 'exact', head: true }).eq('clinic_id', clinicId).gte('created_at', todayStart),
    supabase.from('messages').select('id', { count: 'exact', head: true }).eq('clinic_id', clinicId).gte('created_at', monthStart),
    supabase.from('messages').select('created_at').eq('clinic_id', clinicId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
  ]);

  return NextResponse.json({
    messages_today: todayRes.count ?? 0,
    messages_this_month: monthRes.count ?? 0,
    last_message_at: lastRes.data?.created_at ?? null,
  });
}
