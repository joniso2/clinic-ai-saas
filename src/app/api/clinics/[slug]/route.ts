import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const supabase = getSupabaseAdmin();

    const { data: clinic, error } = await supabase
    .from('clinics')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error || !clinic) {
    return NextResponse.json({ error: 'Clinic not found' }, { status: 404 });
  }

  const [
    { data: services },
    { data: workers },
    { data: gallery },
    { data: workingHours },
    { data: settings },
  ] = await Promise.all([
    supabase
      .from('clinic_services')
      .select('*')
      .eq('clinic_id', clinic.id)
      .eq('is_active', true)
      .order('created_at'),
    supabase
      .from('clinic_workers')
      .select('*')
      .eq('clinic_id', clinic.id)
      .eq('active', true)
      .order('name'),
    supabase
      .from('clinic_gallery_images')
      .select('*')
      .eq('clinic_id', clinic.id)
      .order('sort_order'),
    supabase.from('working_hours').select('*').eq('clinic_id', clinic.id),
    supabase.from('clinic_settings').select('address, working_hours').eq('clinic_id', clinic.id).maybeSingle(),
  ]);

  const settingsRow = settings as { address?: string; working_hours?: Array<{ day: number; enabled: boolean; open: string; close: string }> } | null;
  const clinicWithAddress = { ...clinic, address: settingsRow?.address ?? (clinic as { address?: string }).address ?? null };

  return NextResponse.json({
    clinic: clinicWithAddress,
    services: services ?? [],
    workers: workers ?? [],
    gallery: gallery ?? [],
    workingHours: workingHours ?? [],
    /** שעות פעילות מהגדרות העסק (התאמה להגדרות → זמנים) */
    businessWorkingHours: settingsRow?.working_hours ?? null,
  });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
