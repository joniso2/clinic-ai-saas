import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getEffectiveClinicId, getSessionUser } from '@/lib/auth-server';

const MAX_IDS = 100;

/** GET /api/leads/by-ids?ids=uuid1,uuid2,... — batch fetch leads by ids (clinic-scoped). */
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const clinicId = await getEffectiveClinicId(req);
    if (!clinicId) {
      return NextResponse.json(
        { leads: [], error: 'Clinic not set for user' },
        { status: 200 },
      );
    }

    const { searchParams } = new URL(req.url);
    const idsParam = searchParams.get('ids');
    if (!idsParam || !idsParam.trim()) {
      return NextResponse.json({ leads: [] });
    }

    const ids = idsParam
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (ids.length === 0) {
      return NextResponse.json({ leads: [] });
    }
    if (ids.length > MAX_IDS) {
      return NextResponse.json(
        { error: `Too many ids; max ${MAX_IDS}` },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .eq('clinic_id', clinicId)
      .in('id', ids);

    if (error) {
      console.error('GET /api/leads/by-ids error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch leads' },
        { status: 500 },
      );
    }

    return NextResponse.json({ leads: data ?? [] });
  } catch (err) {
    console.error('GET /api/leads/by-ids error:', err);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 },
    );
  }
}
