import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { appointment_id, phone, code } = body;

    if (!appointment_id || !phone || !code) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    const { data: otp } = await supabase
      .from('otp_codes')
      .select('*')
      .eq('appointment_id', appointment_id)
      .eq('phone', phone)
      .eq('code', code)
      .eq('is_used', false)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!otp) {
      return NextResponse.json({ error: 'Invalid or expired code' }, { status: 400 });
    }

    await supabase.from('otp_codes').update({ is_used: true }).eq('id', otp.id);

    const { data: appointment, error } = await supabase
      .from('appointments')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancelled_by: 'customer',
      })
      .eq('id', appointment_id)
      .eq('status', 'confirmed')
      .select('*')
      .single();

    if (error || !appointment) {
      return NextResponse.json({ error: 'Failed to cancel appointment' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('cancel/confirm error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
