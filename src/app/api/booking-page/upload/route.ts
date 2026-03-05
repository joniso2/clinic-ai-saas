import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

// Create in Supabase: Storage → New bucket → name "clinic-assets" → Public
const BUCKET = 'clinic-assets';

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

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  if (!file || !file.size) return NextResponse.json({ error: 'No file' }, { status: 400 });

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const path = `${clinicId}/${safeName}`;

  const supabase = getSupabaseAdmin();
  const buffer = await file.arrayBuffer();

  let result = await supabase.storage.from(BUCKET).upload(path, buffer, { contentType: file.type, upsert: true });

  if (result.error && (result.error.message?.includes('Bucket not found') || result.error.message?.includes('not found'))) {
    const { error: createErr } = await supabase.storage.createBucket(BUCKET, { public: true });
    if (createErr) {
      return NextResponse.json({
        error: 'Bucket not found. Create it in Supabase: Storage → New bucket → name "clinic-assets" → Public.',
        code: 'BUCKET_NOT_FOUND',
      }, { status: 400 });
    }
    result = await supabase.storage.from(BUCKET).upload(path, buffer, { contentType: file.type, upsert: true });
  }

  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });

  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${result.data.path}`;
  return NextResponse.json({ url });
}
