import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth-server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

/** PATCH /api/admin/update-role — update user role in clinic (Super Admin only). */
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

  const { user_id, clinic_id, role } = body as { user_id?: string; clinic_id?: string; role?: string };
  const userId = typeof user_id === 'string' ? user_id.trim() : '';
  const clinicId = typeof clinic_id === 'string' ? clinic_id.trim() : '';
  const r = role === 'CLINIC_ADMIN' ? 'CLINIC_ADMIN' : role === 'STAFF' ? 'STAFF' : null;

  if (!userId || !clinicId || !r) {
    return NextResponse.json({ error: 'משתמש, עסק ותפקיד חובה' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from('clinic_users')
    .update({ role: r })
    .eq('user_id', userId)
    .eq('clinic_id', clinicId);

  if (error) {
    return NextResponse.json({ error: error.message || 'עדכון תפקיד נכשל' }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
