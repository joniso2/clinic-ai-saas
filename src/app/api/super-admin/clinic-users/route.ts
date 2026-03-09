import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth-server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

/** GET /api/super-admin/clinic-users?clinic_id= — list users for a clinic (Super Admin only). */
export async function GET(req: NextRequest) {
  const _admin = await requireSuperAdmin();
  if (!_admin) {
    return NextResponse.json({ error: 'אין הרשאה' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const clinicId = searchParams.get('clinic_id')?.trim();
  if (!clinicId) {
    return NextResponse.json({ error: 'חסר מזהה העסק' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  const { data: rows, error: linkError } = await supabase
    .from('clinic_users')
    .select('user_id, role')
    .eq('clinic_id', clinicId);

  if (linkError) {
    return NextResponse.json({ error: linkError.message }, { status: 500 });
  }

  const users: { user_id: string; email: string; full_name: string | null; role: string; last_sign_in_at: string | null; banned_until?: string }[] = [];

  for (const row of rows ?? []) {
    const { data: u, error: userError } = await supabase.auth.admin.getUserById(row.user_id);
    if (userError || !u.user) continue;
    const us = u.user;
    users.push({
      user_id: us.id,
      email: us.email ?? '',
      full_name: (us.user_metadata?.full_name as string) ?? null,
      role: row.role,
      last_sign_in_at: us.last_sign_in_at ?? null,
      banned_until: us.banned_until ?? undefined,
    });
  }

  return NextResponse.json({ users });
}
