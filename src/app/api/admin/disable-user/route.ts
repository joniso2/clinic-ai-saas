import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth-server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

/** POST /api/admin/disable-user — ban or unban user (Super Admin only). */
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

  const { user_id, disable } = body as { user_id?: string; disable?: boolean };
  const userId = typeof user_id === 'string' ? user_id.trim() : '';
  const shouldDisable = disable !== false;

  if (!userId) {
    return NextResponse.json({ error: 'מזהה משתמש חובה' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.auth.admin.updateUserById(userId, {
    ban_duration: shouldDisable ? '876000h' : 'none',
  });

  if (error) {
    return NextResponse.json({ error: error.message || (shouldDisable ? 'השבתת משתמש נכשלה' : 'הפעלת משתמש נכשלה') }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
