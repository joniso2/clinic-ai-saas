import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth-server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

/** POST /api/admin/reset-password — set new password for user (Super Admin only). */
export async function POST(req: NextRequest) {
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

  const { user_id, new_password } = body as { user_id?: string; new_password?: string };
  const userId = typeof user_id === 'string' ? user_id.trim() : '';
  const pwd = typeof new_password === 'string' ? new_password : '';

  if (!userId) {
    return NextResponse.json({ error: 'מזהה משתמש חובה' }, { status: 400 });
  }
  if (pwd.length < 8) {
    return NextResponse.json({ error: 'סיסמה חייבת להכיל לפחות 8 תווים' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.auth.admin.updateUserById(userId, { password: pwd });

  if (error) {
    return NextResponse.json({ error: error.message || 'איפוס סיסמה נכשל' }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
