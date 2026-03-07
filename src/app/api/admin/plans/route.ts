import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth-server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

/** GET /api/admin/plans — list plans (Super Admin only). */
export async function GET() {
  try {
    const user = await requireSuperAdmin();
    if (!user) {
      return NextResponse.json({ error: 'אין הרשאה' }, { status: 403 });
    }
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('plans')
      .select('id, name, price_monthly')
      .order('id');
    if (error) {
      return NextResponse.json({ error: 'טעינת תוכניות נכשלה' }, { status: 500 });
    }
    return NextResponse.json({ plans: data ?? [] });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
