import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireSuperAdmin } from '@/lib/auth-server';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase server env not configured');
  return createClient(url, key, { auth: { persistSession: false } });
}

/** GET /api/super-admin/discord — list guild mappings (Super Admin only). */
export async function GET() {
  const user = await requireSuperAdmin();
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('discord_guilds')
    .select('id, guild_id, clinic_id, created_at')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const list = (data ?? []) as { id: string; guild_id: string; clinic_id: string; created_at: string }[];
  const clinicIds = [...new Set(list.map((r) => r.clinic_id))];
  const { data: clinics } = await supabase.from('clinics').select('id, name').in('id', clinicIds);
  const nameBy = (clinics ?? []).reduce<Record<string, string>>((acc, c) => {
    acc[c.id] = (c as { name: string | null }).name ?? c.id;
    return acc;
  }, {});

  const withClinicName = list.map((r) => ({ ...r, clinic_name: nameBy[r.clinic_id] ?? '—' }));
  return NextResponse.json({ mappings: withClinicName });
}

/** POST /api/super-admin/discord — add or update mapping (Super Admin only). */
export async function POST(req: NextRequest) {
  const user = await requireSuperAdmin();
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let body: { guild_id: string; clinic_id: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const { guild_id, clinic_id } = body;
  if (!guild_id || !clinic_id) {
    return NextResponse.json({ error: 'guild_id and clinic_id required' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('discord_guilds')
    .upsert({ guild_id: guild_id.trim(), clinic_id }, { onConflict: 'guild_id' })
    .select('id, guild_id, clinic_id')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

/** DELETE /api/super-admin/discord?id= — remove mapping (Super Admin only). */
export async function DELETE(req: NextRequest) {
  const user = await requireSuperAdmin();
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from('discord_guilds').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
