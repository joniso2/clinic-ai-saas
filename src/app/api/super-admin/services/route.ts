import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireSuperAdmin } from '@/lib/auth-server';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase server env not configured');
  return createClient(url, key, { auth: { persistSession: false } });
}

/** GET /api/super-admin/services?clinic_id= — list services for a clinic (Super Admin only). */
export async function GET(req: NextRequest) {
  const user = await requireSuperAdmin();
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const clinicId = req.nextUrl.searchParams.get('clinic_id');
  if (!clinicId) return NextResponse.json({ error: 'clinic_id required' }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('clinic_services')
    .select('id, clinic_id, service_name, price, aliases, is_active, created_at')
    .eq('clinic_id', clinicId)
    .order('service_name');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ services: data ?? [] });
}

/** POST /api/super-admin/services — add service (Super Admin only). */
export async function POST(req: NextRequest) {
  const user = await requireSuperAdmin();
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let body: { clinic_id: string; service_name: string; price: number; aliases?: string[]; is_active?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const { clinic_id, service_name, price, aliases, is_active } = body;
  if (!clinic_id || !service_name || price == null) {
    return NextResponse.json({ error: 'clinic_id, service_name, price required' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('clinic_services')
    .insert({
      clinic_id,
      service_name: String(service_name).trim(),
      price: Number(price),
      aliases: Array.isArray(aliases) ? aliases : [],
      is_active: is_active !== false,
    })
    .select('id, clinic_id, service_name, price, aliases, is_active')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
