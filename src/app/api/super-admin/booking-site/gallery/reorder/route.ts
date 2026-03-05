import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth-server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

function getClinicId(req: NextRequest): string | null {
  return new URL(req.url).searchParams.get('clinic_id')?.trim() ?? null;
}

/** PUT — reorder gallery. Body: { items: { id, sort_order }[] } */
export async function PUT(req: NextRequest) {
  const user = await requireSuperAdmin();
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const clinicId = getClinicId(req);
  if (!clinicId) return NextResponse.json({ error: 'clinic_id required' }, { status: 400 });

  let body: { items: Array<{ id: string; sort_order: number }> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!Array.isArray(body.items)) return NextResponse.json({ error: 'items array required' }, { status: 400 });

  const supabase = getSupabaseAdmin();
  for (const it of body.items) {
    await supabase.from('clinic_gallery_images').update({ sort_order: it.sort_order }).eq('id', it.id).eq('clinic_id', clinicId);
  }
  const { data } = await supabase.from('clinic_gallery_images').select('id, image_url, sort_order').eq('clinic_id', clinicId).order('sort_order');
  return NextResponse.json({ gallery: data ?? [] });
}
