/**
 * GET /api/super-admin/messages?clinic_id=&channel=&from=&to=
 * Conversation logs for Super Admin (filters: clinic, channel, date range).
 */

import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth-server';
import { createClient } from '@/lib/supabase-server';

export async function GET(req: Request) {
  const user = await requireSuperAdmin();
  if (!user) return NextResponse.json({ error: 'Super Admin required' }, { status: 403 });

  const u = new URL(req.url);
  const clinicId = u.searchParams.get('clinic_id')?.trim();
  const channel = u.searchParams.get('channel')?.trim();
  const from = u.searchParams.get('from')?.trim();
  const to = u.searchParams.get('to')?.trim();
  const limit = Math.min(Number(u.searchParams.get('limit')) || 100, 500);

  const supabase = await createClient();
  let q = supabase
    .from('messages')
    .select('id, clinic_id, channel, direction, phone, content, status, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (clinicId) q = q.eq('clinic_id', clinicId);
  if (channel) q = q.eq('channel', channel);
  if (from) q = q.gte('created_at', from);
  if (to) q = q.lte('created_at', to);

  const { data, error, count } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const clinicIds = [...new Set((data ?? []).map((r: { clinic_id: string }) => r.clinic_id))];
  const { data: clinics } = clinicIds.length
    ? await supabase.from('clinics').select('id, name').in('id', clinicIds)
    : { data: [] };
  const nameBy = (clinics ?? []).reduce<Record<string, string>>((acc, c: { id: string; name: string | null }) => {
    acc[c.id] = c.name ?? '—';
    return acc;
  }, {});

  const list = (data ?? []).map((r: { clinic_id: string; content: string; [k: string]: unknown }) => ({
    ...r,
    clinic_name: nameBy[r.clinic_id] ?? '—',
    message_preview: (r.content ?? '').slice(0, 80) + ((r.content ?? '').length > 80 ? '…' : ''),
  }));

  return NextResponse.json({ messages: list, total: count ?? list.length });
}
