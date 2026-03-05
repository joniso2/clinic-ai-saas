import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth-server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

function getClinicId(req: NextRequest): string | null {
  return new URL(req.url).searchParams.get('clinic_id')?.trim() ?? null;
}

/** GET — list gallery images for clinic. */
export async function GET(req: NextRequest) {
  const user = await requireSuperAdmin();
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const clinicId = getClinicId(req);
  if (!clinicId) return NextResponse.json({ error: 'clinic_id required' }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('clinic_gallery_images')
    .select('id, image_url, sort_order')
    .eq('clinic_id', clinicId)
    .order('sort_order');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ gallery: data ?? [] });
}

/** POST — add gallery item. Body: { image_url, sort_order? } */
export async function POST(req: NextRequest) {
  const user = await requireSuperAdmin();
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const clinicId = getClinicId(req);
  if (!clinicId) return NextResponse.json({ error: 'clinic_id required' }, { status: 400 });

  let body: { image_url: string; sort_order?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!body.image_url || typeof body.image_url !== 'string') return NextResponse.json({ error: 'image_url required' }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const sort_order = typeof body.sort_order === 'number' ? body.sort_order : 0;
  const { data, error } = await supabase
    .from('clinic_gallery_images')
    .insert({ clinic_id: clinicId, image_url: body.image_url.trim(), sort_order })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
