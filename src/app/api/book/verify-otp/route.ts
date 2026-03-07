import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import * as leadRepository from '@/repositories/lead.repository';

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

    const { data: appointment, error: apptError } = await supabase
      .from('appointments')
      .update({ status: 'confirmed', locked_until: null })
      .eq('id', appointment_id)
      .eq('status', 'locked')
      .select('*')
      .single();

    if (apptError || !appointment) {
      return NextResponse.json({ error: 'Appointment expired or already confirmed' }, { status: 400 });
    }

    // Create a lead so the visitor appears in the CRM
    try {
      const existing = await leadRepository.getLeadByEmailOrPhone(
        appointment.clinic_id,
        null,
        phone,
      );
      let leadId = existing.data?.id ?? null;

      if (!leadId) {
        const { data: newLead } = await leadRepository.createLead({
          clinic_id: appointment.clinic_id,
          full_name: phone,
          phone,
          source: 'booking',
          status: 'Pending',
          next_appointment: appointment.start_time ?? appointment.datetime ?? null,
        });
        leadId = newLead?.id ?? null;
      }

      if (leadId) {
        await supabase
          .from('appointments')
          .update({ lead_id: leadId })
          .eq('id', appointment_id);
      }
    } catch (leadErr) {
      console.error('verify-otp lead creation error (non-blocking):', leadErr);
    }

    return NextResponse.json({ success: true, appointment });
  } catch (err) {
    console.error('verify-otp error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
