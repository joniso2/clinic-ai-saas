import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth-server';
import { getImpersonateCookieName } from '@/lib/auth-server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

/** GET /api/admin/impersonation — get current impersonation clinic_id and name (Super Admin only). */
export async function GET(req: NextRequest) {
  const _admin = await requireSuperAdmin();
  if (!_admin) {
    return NextResponse.json({ error: 'אין הרשאה' }, { status: 403 });
  }

  const cookie = req.cookies.get(getImpersonateCookieName())?.value?.trim();
  if (!cookie) {
    return NextResponse.json({ clinic_id: null, clinic_name: null });
  }

  const supabase = getSupabaseAdmin();
  const { data } = await supabase.from('clinics').select('id, name').eq('id', cookie).single();

  return NextResponse.json({
    clinic_id: data?.id ?? null,
    clinic_name: data?.name ?? null,
  });
}
