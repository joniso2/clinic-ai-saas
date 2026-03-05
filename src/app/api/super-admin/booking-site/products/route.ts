import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth-server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

function getClinicId(req: NextRequest): string | null {
  return new URL(req.url).searchParams.get('clinic_id')?.trim() ?? null;
}

/** GET — list products for clinic. */
export async function GET(req: NextRequest) {
  const user = await requireSuperAdmin();
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const clinicId = getClinicId(req);
  if (!clinicId) return NextResponse.json({ error: 'clinic_id required' }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('booking_products')
    .select('id, name, price, image_url, description, sort_order')
    .eq('clinic_id', clinicId)
    .order('sort_order');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ products: data ?? [] });
}

/** POST — add product. Body: { name, price?, image_url?, description? } */
export async function POST(req: NextRequest) {
  const user = await requireSuperAdmin();
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const clinicId = getClinicId(req);
  if (!clinicId) return NextResponse.json({ error: 'clinic_id required' }, { status: 400 });

  let body: { name: string; price?: number | null; image_url?: string | null; description?: string | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const name = body.name?.trim();
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('booking_products')
    .insert({
      clinic_id: clinicId,
      name,
      price: body.price != null ? Number(body.price) : null,
      image_url: body.image_url ?? null,
      description: body.description ?? null,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
