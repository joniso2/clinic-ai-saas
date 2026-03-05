import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth-server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

const BUCKET = 'booking-media';

export async function POST(req: NextRequest) {
  const user = await requireSuperAdmin();
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  const clinicId = formData.get('clinic_id') as string | null;
  if (!file || !file.size) return NextResponse.json({ error: 'No file' }, { status: 400 });
  if (!clinicId?.trim()) return NextResponse.json({ error: 'clinic_id required' }, { status: 400 });

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const isVideo = ['mp4', 'webm', 'mov'].includes(ext);
  const type = isVideo ? 'video' : 'image';
  const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const path = `${clinicId}/${safeName}`;

  const supabase = getSupabaseAdmin();
  const buffer = await file.arrayBuffer();

  let result = await supabase.storage.from(BUCKET).upload(path, buffer, { contentType: file.type, upsert: true });
  if (result.error && (result.error.message?.includes('Bucket not found') || result.error.message?.includes('not found'))) {
    await supabase.storage.createBucket(BUCKET, { public: true });
    result = await supabase.storage.from(BUCKET).upload(path, buffer, { contentType: file.type, upsert: true });
  }
  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });

  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${result.data.path}`;
  const { data: row, error: insertErr } = await supabase
    .from('media_library')
    .insert({ clinic_id: clinicId.trim(), url, type, filename: file.name })
    .select()
    .single();
  if (insertErr) return NextResponse.json({ url, error: insertErr.message }, { status: 500 });
  return NextResponse.json({ url, id: row.id });
}
