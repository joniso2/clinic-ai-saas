import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth-server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

/** PATCH /api/admin/clinic-status — set clinic active/inactive (Super Admin only). */
export async function PATCH(req: NextRequest) {
  const _admin = await requireSuperAdmin();
  if (!_admin) {
    return NextResponse.json({ error: 'אין הרשאה' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'בקשה לא תקינה' }, { status: 400 });
  }

  const { clinic_id, status } = body as { clinic_id?: string; status?: string };
  const clinicId = typeof clinic_id === 'string' ? clinic_id.trim() : '';
  const s = status === 'inactive' ? 'inactive' : status === 'suspended' ? 'suspended' : 'active';

  if (!clinicId) {
    return NextResponse.json({ error: 'מזהה העסק חובה' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from('clinics').update({ status: s }).eq('id', clinicId);

  if (error) {
    return NextResponse.json({ error: error.message || 'עדכון סטטוס נכשל' }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
