import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth-server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

/** POST /api/admin/create-user — create user and link to clinic (Super Admin only). */
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

  const { clinic_id, email, full_name, password, role } = body as {
    clinic_id?: string;
    email?: string;
    full_name?: string;
    password?: string;
    role?: string;
  };

  const clinicId = typeof clinic_id === 'string' ? clinic_id.trim() : '';
  const emailStr = typeof email === 'string' ? email.trim().toLowerCase() : '';
  const r = role === 'CLINIC_ADMIN' ? 'CLINIC_ADMIN' : 'STAFF';
  if (!clinicId || !emailStr) {
    return NextResponse.json({ error: 'קליניקה ואימייל חובה' }, { status: 400 });
  }

  const pwd = typeof password === 'string' && password.length >= 8 ? password : undefined;
  const supabase = getSupabaseAdmin();

  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email: emailStr,
    password: pwd ?? 'ChangeMe123!',
    email_confirm: true,
    user_metadata: { full_name: typeof full_name === 'string' ? full_name.trim() : null },
  });

  if (authError) {
    if (authError.message.includes('already registered')) {
      return NextResponse.json({ error: 'האימייל כבר רשום במערכת' }, { status: 400 });
    }
    return NextResponse.json({ error: authError.message || 'יצירת משתמש נכשלה' }, { status: 400 });
  }

  if (!authUser.user) {
    return NextResponse.json({ error: 'יצירת משתמש נכשלה' }, { status: 500 });
  }

  const { error: linkError } = await supabase
    .from('clinic_users')
    .insert({ user_id: authUser.user.id, clinic_id: clinicId, role: r });

  if (linkError) {
    await supabase.auth.admin.deleteUser(authUser.user.id);
    return NextResponse.json({ error: linkError.message || 'קישור לקליניקה נכשל' }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    user: { id: authUser.user.id, email: authUser.user.email },
    temporary_password: pwd ?? 'ChangeMe123!',
  });
}
