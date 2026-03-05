import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth-server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

function getClinicId(req: NextRequest): string | null {
  return new URL(req.url).searchParams.get('clinic_id')?.trim() ?? null;
}

const SECTION_TYPES = ['hero', 'gallery', 'services', 'products', 'contact'] as const;

/** GET — list sections for clinic (with defaults if none). */
export async function GET(req: NextRequest) {
  const user = await requireSuperAdmin();
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const clinicId = getClinicId(req);
  if (!clinicId) return NextResponse.json({ error: 'clinic_id required' }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { data: rows } = await supabase
    .from('booking_page_sections')
    .select('id, section_type, position, is_enabled, settings_json')
    .eq('clinic_id', clinicId)
    .order('position');

  if (rows && rows.length > 0) {
    return NextResponse.json({ sections: rows });
  }
  const defaults = SECTION_TYPES.map((section_type, i) => ({
    clinic_id: clinicId,
    section_type,
    position: i + 1,
    is_enabled: true,
    settings_json: null,
  }));
  const { data: inserted, error } = await supabase
    .from('booking_page_sections')
    .insert(defaults)
    .select('id, section_type, position, is_enabled, settings_json');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ sections: inserted ?? [] });
}

/** PUT — reorder and toggle sections. Body: { sections: { id?, section_type, position, is_enabled, settings_json? }[] } */
export async function PUT(req: NextRequest) {
  const user = await requireSuperAdmin();
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const clinicId = getClinicId(req);
  if (!clinicId) return NextResponse.json({ error: 'clinic_id required' }, { status: 400 });

  let body: { sections: Array<{ id?: string; section_type: string; position: number; is_enabled: boolean; settings_json?: unknown }> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!Array.isArray(body.sections)) return NextResponse.json({ error: 'sections array required' }, { status: 400 });

  const supabase = getSupabaseAdmin();
  for (const s of body.sections) {
    const payload = { position: s.position, is_enabled: s.is_enabled, settings_json: s.settings_json ?? null };
    if (s.id) {
      await supabase.from('booking_page_sections').update(payload).eq('id', s.id).eq('clinic_id', clinicId);
    } else {
      await supabase.from('booking_page_sections').upsert(
        { clinic_id: clinicId, section_type: s.section_type, ...payload },
        { onConflict: 'clinic_id,section_type' }
      );
    }
  }
  const { data } = await supabase
    .from('booking_page_sections')
    .select('id, section_type, position, is_enabled, settings_json')
    .eq('clinic_id', clinicId)
    .order('position');
  return NextResponse.json({ sections: data ?? [] });
}
