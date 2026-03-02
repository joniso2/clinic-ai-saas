import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getAnalytics } from '@/services/analytics.service';

function getDefaultRange(days: number): { from: string; to: string } {
  const to   = new Date();
  const from = new Date(to.getTime() - days * 86_400_000);
  return { from: from.toISOString(), to: to.toISOString() };
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: clinicLink } = await supabase
      .from('clinic_users')
      .select('clinic_id')
      .eq('user_id', user.id)
      .single();

    const clinicId = clinicLink?.clinic_id;
    if (!clinicId) {
      return NextResponse.json({ error: 'Clinic not found for this user' }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const preset    = searchParams.get('preset'); // '7d' | '30d' | '90d'
    const fromParam = searchParams.get('from');
    const toParam   = searchParams.get('to');

    let range: { from: string; to: string };
    if (fromParam && toParam) {
      range = { from: new Date(fromParam).toISOString(), to: new Date(toParam).toISOString() };
    } else {
      const days = preset === '7d' ? 7 : preset === '90d' ? 90 : 30;
      range = getDefaultRange(days);
    }

    const { data, error } = await getAnalytics(clinicId, range);
    if (error) {
      console.error('[Analytics API] service error:', error);
      return NextResponse.json({ error: 'Failed to compute analytics' }, { status: 500 });
    }

    return NextResponse.json({ analytics: data });
  } catch (err) {
    console.error('[Analytics API] unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
