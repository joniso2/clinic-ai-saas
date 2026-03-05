import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

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

export async function POST(req: NextRequest) {
  const clinicId = await getAuthenticatedClinicId();
  if (!clinicId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { image_url: string; sort_order?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.image_url || typeof body.image_url !== 'string') {
    return NextResponse.json({ error: 'image_url required' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('clinic_gallery_images')
    .insert({
      clinic_id: clinicId,
      image_url: body.image_url.trim(),
      sort_order: typeof body.sort_order === 'number' ? body.sort_order : 0,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
