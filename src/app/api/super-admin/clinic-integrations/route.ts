/**
 * GET  /api/super-admin/clinic-integrations?clinic_id=...
 * POST /api/super-admin/clinic-integrations (body: clinic_id, type, provider, config?)
 * PATCH /api/super-admin/clinic-integrations (body: id, status?, config?)
 * DELETE /api/super-admin/clinic-integrations?id=...
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
  const { data, error } = await supabase
    .from('clinic_integrations')
    .select('id, clinic_id, type, provider, status, config, created_at, updated_at')
    .eq('clinic_id', clinicId)
    .order('type');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ integrations: data ?? [] });
}

export async function POST(req: Request) {
  const user = await requireSuperAdmin();
  if (!user) return NextResponse.json({ error: 'Super Admin required' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const { clinic_id, type, provider, config } = body;
  if (!clinic_id || !type || !provider) {
    return NextResponse.json({ error: 'clinic_id, type, provider required' }, { status: 400 });
  }
  const allowed = ['whatsapp', 'sms', 'discord', 'webhook'];
  if (!allowed.includes(type)) {
    return NextResponse.json({ error: 'type must be one of: ' + allowed.join(', ') }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('clinic_integrations')
    .upsert(
      { clinic_id, type, provider, status: 'connected', config: config ?? {}, updated_at: new Date().toISOString() },
      { onConflict: 'clinic_id,type' }
    )
    .select('id, clinic_id, type, provider, status, config, created_at, updated_at')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PATCH(req: Request) {
  const user = await requireSuperAdmin();
  if (!user) return NextResponse.json({ error: 'Super Admin required' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const { id, status, config } = body;
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const supabase = await createClient();
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (status !== undefined) updates.status = status;
  if (config !== undefined) updates.config = config;

  const { data, error } = await supabase
    .from('clinic_integrations')
    .update(updates)
    .eq('id', id)
    .select('id, clinic_id, type, provider, status, config, created_at, updated_at')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: Request) {
  const user = await requireSuperAdmin();
  if (!user) return NextResponse.json({ error: 'Super Admin required' }, { status: 403 });

  const id = new URL(req.url).searchParams.get('id')?.trim();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const supabase = await createClient();
  const { error } = await supabase.from('clinic_integrations').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
