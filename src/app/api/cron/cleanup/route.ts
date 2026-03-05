import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

// Called by Vercel Cron or any external scheduler every minute.
// Removes expired locked appointments to free up slots.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('appointments')
    .update({ status: 'cancelled', cancelled_by: 'system', cancelled_at: new Date().toISOString() })
    .eq('status', 'locked')
    .lt('locked_until', new Date().toISOString())
    .select('id');

  if (error) {
    console.error('cleanup cron error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ cleaned: data?.length ?? 0 });
}
