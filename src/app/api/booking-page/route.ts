import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import * as settingsRepo from '@/repositories/settings.repository';

async function getAuthenticatedClinicId(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from('clinic_users')
    .select('clinic_id')
    .eq('user_id', user.id)
    .single();
  return data?.clinic_id ?? null;
}

export async function GET() {
  const clinicId = await getAuthenticatedClinicId();
  if (!clinicId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getSupabaseAdmin();
  const { data: clinic } = await supabase
    .from('clinics')
    .select('id, name, hero_image, hero_video, hero_3d_slot_image_url, logo_url, slug')
    .eq('id', clinicId)
    .maybeSingle();

  const { data: settings } = await supabase
    .from('clinic_settings')
    .select('address')
    .eq('clinic_id', clinicId)
    .maybeSingle();

  const address = settings?.address ?? null;

  const resolvedClinic = clinic
    ? { ...clinic, address }
    : {
        id: clinicId,
        name: '',
        address,
        hero_image: null as string | null,
        hero_video: null as string | null,
        hero_3d_slot_image_url: null as string | null,
        logo_url: null as string | null,
        slug: clinicId,
      };

  const { data: gallery } = await supabase
    .from('clinic_gallery_images')
    .select('id, image_url, sort_order')
    .eq('clinic_id', clinicId)
    .order('sort_order');

  return NextResponse.json({ clinic: resolvedClinic, gallery: gallery ?? [] });
}

export async function PUT(req: NextRequest) {
  const clinicId = await getAuthenticatedClinicId();
  if (!clinicId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  const { data: existing } = await supabase
    .from('clinics')
    .select('id, slug, name')
    .eq('id', clinicId)
    .maybeSingle();

  // address lives in clinic_settings, not clinics
  if (body.address !== undefined) {
    const addressVal = body.address === '' || body.address === null ? null : body.address;
    await settingsRepo.upsertClinicSettings(clinicId, { address: addressVal });
  }

  const updates: Record<string, unknown> = {};
  const nameVal = body.name !== undefined ? String(body.name).trim() : undefined;
  const currentName = existing && 'name' in existing ? (existing as { name?: string }).name : undefined;
  if (nameVal !== undefined) updates.name = nameVal || currentName || 'מרפאה';
  if (body.hero_image !== undefined) updates.hero_image = body.hero_image === '' || body.hero_image === null ? null : body.hero_image;
  if (body.hero_video !== undefined) updates.hero_video = body.hero_video === '' || body.hero_video === null ? null : body.hero_video;
  if (body.hero_3d_slot_image_url !== undefined) updates.hero_3d_slot_image_url = body.hero_3d_slot_image_url === '' || body.hero_3d_slot_image_url === null ? null : body.hero_3d_slot_image_url;
  if (body.logo_url !== undefined) updates.logo_url = body.logo_url === '' || body.logo_url === null ? null : body.logo_url;

  if (existing) {
    if (Object.keys(updates).length === 0 && body.address === undefined) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }
    if (Object.keys(updates).length > 0) {
      const { data, error } = await supabase
        .from('clinics')
        .update(updates)
        .eq('id', clinicId)
        .select()
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      const { data: st } = await supabase.from('clinic_settings').select('address').eq('clinic_id', clinicId).maybeSingle();
      return NextResponse.json({ ...data, address: st?.address ?? null });
    }
    const { data: st } = await supabase.from('clinic_settings').select('address').eq('clinic_id', clinicId).maybeSingle();
    const { data: clinicRow } = await supabase.from('clinics').select('*').eq('id', clinicId).single();
    return NextResponse.json({ ...clinicRow, address: st?.address ?? null });
  }

  // No row yet: insert so booking page and editor work (clinics has no address column)
  const name = (body.name as string) ?? '';
  const slug = (body.slug as string)?.trim() || clinicId;
  const { data, error } = await supabase
    .from('clinics')
    .upsert(
      {
        id: clinicId,
        name: name || 'מרפאה',
        hero_image: body.hero_image === '' || body.hero_image === null ? null : body.hero_image,
        hero_video: body.hero_video === '' || body.hero_video === null ? null : body.hero_video,
        hero_3d_slot_image_url: body.hero_3d_slot_image_url === '' || body.hero_3d_slot_image_url === null ? null : body.hero_3d_slot_image_url,
        logo_url: body.logo_url === '' || body.logo_url === null ? null : body.logo_url,
        slug,
      },
      { onConflict: 'id' },
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const { data: st } = await supabase.from('clinic_settings').select('address').eq('clinic_id', clinicId).maybeSingle();
  return NextResponse.json({ ...data, address: body.address ?? st?.address ?? null });
}
