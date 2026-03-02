import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth-server';
import { getImpersonateCookieName } from '@/lib/auth-server';

const COOKIE_MAX_AGE = 60 * 60 * 24; // 24 hours

/** POST /api/admin/impersonate — set impersonation clinic (Super Admin only). Sets cookie. */
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

  const { clinic_id } = body as { clinic_id?: string };
  const clinicId = typeof clinic_id === 'string' ? clinic_id.trim() : '';

  const res = clinicId
    ? NextResponse.json({ success: true, clinic_id: clinicId })
    : NextResponse.json({ success: true, clinic_id: null });

  const name = getImpersonateCookieName();
  if (clinicId) {
    res.cookies.set(name, clinicId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: COOKIE_MAX_AGE,
      path: '/',
    });
  } else {
    res.cookies.set(name, '', { maxAge: 0, path: '/' });
  }
  return res;
}

/** DELETE /api/admin/impersonate — clear impersonation. */
export async function DELETE() {
  const _admin = await requireSuperAdmin();
  if (!_admin) {
    return NextResponse.json({ error: 'אין הרשאה' }, { status: 403 });
  }
  const res = NextResponse.json({ success: true });
  res.cookies.set(getImpersonateCookieName(), '', { maxAge: 0, path: '/' });
  return res;
}
