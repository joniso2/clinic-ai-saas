import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth-server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

function getClinicId(req: NextRequest): string | null {
  return new URL(req.url).searchParams.get('clinic_id')?.trim() ?? null;
}

/** GET — list services for clinic. */
export async function GET(req: NextRequest) {
  const user = await requireSuperAdmin();
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const clinicId = getClinicId(req);
  if (!clinicId) return NextResponse.json({ error: 'clinic_id required' }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('clinic_services')
    .select('id, clinic_id, service_name, price, duration_minutes, is_active')
    .eq('clinic_id', clinicId)
    .order('service_name');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ services: data ?? [] });
}

/** POST — add service. Body: { service_name, price, duration_minutes?, description? } */
export async function POST(req: NextRequest) {
  const user = await requireSuperAdmin();
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const clinicId = getClinicId(req);
  if (!clinicId) return NextResponse.json({ error: 'clinic_id required' }, { status: 400 });

  let body: { service_name: string; price: number; duration_minutes?: number; description?: string | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const service_name = body.service_name?.trim();
  const price = body.price != null ? Number(body.price) : undefined;
  if (!service_name || price == null || Number.isNaN(price)) return NextResponse.json({ error: 'service_name and price required' }, { status: 400 });
  const duration_minutes = body.duration_minutes != null ? Math.max(1, Math.min(480, Math.round(Number(body.duration_minutes)))) : 30;

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('clinic_services')
    .insert({
      clinic_id: clinicId,
      service_name,
      price,
      duration_minutes,
      is_active: true,
    })
    .select('id, clinic_id, service_name, price, duration_minutes, is_active')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
