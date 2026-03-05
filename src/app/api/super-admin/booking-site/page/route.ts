import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth-server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import * as settingsRepo from '@/repositories/settings.repository';

function getClinicId(req: NextRequest): string | null {
  const url = new URL(req.url);
  return url.searchParams.get('clinic_id')?.trim() ?? null;
}

/** GET — get booking page data for a clinic (hero, logo, address, gallery). */
export async function GET(req: NextRequest) {
  const user = await requireSuperAdmin();
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const clinicId = getClinicId(req);
  if (!clinicId) return NextResponse.json({ error: 'clinic_id required' }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { data: clinic } = await supabase
    .from('clinics')
    .select('id, name, hero_image, logo_url, slug')
    .eq('id', clinicId)
    .maybeSingle();
  const { data: settings } = await supabase
    .from('clinic_settings')
    .select('address')
    .eq('clinic_id', clinicId)
    .maybeSingle();
  const { data: gallery } = await supabase
    .from('clinic_gallery_images')
    .select('id, image_url, sort_order')
    .eq('clinic_id', clinicId)
    .order('sort_order');

  const resolved = clinic
    ? { ...clinic, address: settings?.address ?? null }
    : { id: clinicId, name: '', address: settings?.address ?? null, hero_image: null as string | null, logo_url: null as string | null, slug: clinicId };
  return NextResponse.json({ clinic: resolved, gallery: gallery ?? [] });
}

/** PUT — update booking page meta (name, address, hero_image, logo_url). */
export async function PUT(req: NextRequest) {
  const user = await requireSuperAdmin();
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const clinicId = getClinicId(req);
  if (!clinicId) return NextResponse.json({ error: 'clinic_id required' }, { status: 400 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  if (body.address !== undefined) {
    const addressVal = body.address === '' || body.address === null ? null : String(body.address);
    await settingsRepo.upsertClinicSettings(clinicId, { address: addressVal });
  }

  const updates: Record<string, unknown> = {};
  if (body.name !== undefined) updates.name = body.name === '' || body.name === null ? '' : String(body.name).trim();
  if (body.hero_image !== undefined) updates.hero_image = body.hero_image === '' || body.hero_image === null ? null : body.hero_image;
  if (body.logo_url !== undefined) updates.logo_url = body.logo_url === '' || body.logo_url === null ? null : body.logo_url;

  if (Object.keys(updates).length > 0) {
    const { error } = await supabase.from('clinics').update(updates).eq('id', clinicId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: clinic } = await supabase.from('clinics').select('id, name, hero_image, logo_url, slug').eq('id', clinicId).single();
  const { data: st } = await supabase.from('clinic_settings').select('address').eq('clinic_id', clinicId).maybeSingle();
  return NextResponse.json({ ...clinic, address: st?.address ?? null });
}
