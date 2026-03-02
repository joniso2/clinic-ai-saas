import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth-server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

/** DELETE /api/admin/delete-user — remove user from clinic (and optionally delete auth user) (Super Admin only). */
export async function DELETE(req: NextRequest) {
  const _admin = await requireSuperAdmin();
  if (!_admin) {
    return NextResponse.json({ error: 'אין הרשאה' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('user_id')?.trim() ?? '';
  const clinicId = searchParams.get('clinic_id')?.trim() ?? '';
  const deleteAuth = searchParams.get('delete_auth') === 'true';

  if (!userId || !clinicId) {
    return NextResponse.json({ error: 'משתמש וקליניקה חובה' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  const { error: delError } = await supabase
    .from('clinic_users')
    .delete()
    .eq('user_id', userId)
    .eq('clinic_id', clinicId);

  if (delError) {
    return NextResponse.json({ error: delError.message || 'הסרת משתמש נכשלה' }, { status: 500 });
  }

  if (deleteAuth) {
    const { error: authErr } = await supabase.auth.admin.deleteUser(userId);
    if (authErr) {
      return NextResponse.json({ error: authErr.message || 'מחיקת חשבון נכשלה' }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}
