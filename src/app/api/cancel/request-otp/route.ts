import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { sendSMS } from '@/lib/sms';
import { addMinutes } from 'date-fns';

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { appointment_id, phone } = body;

    if (!appointment_id || !phone) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    const { data: appointment } = await supabase
      .from('appointments')
      .select('id, clinic_id, customer_phone, status')
      .eq('id', appointment_id)
      .eq('customer_phone', phone)
      .eq('status', 'confirmed')
      .single();

    if (!appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    const otpCode = generateOTP();
    const otpExpiry = addMinutes(new Date(), 5).toISOString();

    await supabase.from('otp_codes').insert({
      phone,
      clinic_id: appointment.clinic_id,
      appointment_id: appointment.id,
      code: otpCode,
      expires_at: otpExpiry,
      is_used: false,
    });

    await sendSMS(phone, `קוד לביטול תור: ${otpCode}\nהקוד תקף ל-5 דקות.`);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('cancel/request-otp error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
