import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { calculateAvailability } from '@/lib/availability';
import { sendSMS } from '@/lib/sms';
import moment from 'moment-timezone';

const TZ = 'Asia/Jerusalem';

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { clinic_id, service_id, worker_id, date, time, phone } = body;

    if (!clinic_id || !service_id || !date || !time || !phone) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    const { data: service } = await supabase
      .from('clinic_services')
      .select('*')
      .eq('id', service_id)
      .eq('clinic_id', clinic_id)
      .single();

    if (!service) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 });
    }

    const { data: clinic } = await supabase
      .from('clinics')
      .select('name')
      .eq('id', clinic_id)
      .single();

    const dayOfWeek = moment.tz(date, 'YYYY-MM-DD', TZ).day();
    let workingHours = null;

    if (worker_id) {
      const { data } = await supabase
        .from('working_hours')
        .select('*')
        .eq('clinic_id', clinic_id)
        .eq('worker_id', worker_id)
        .eq('day_of_week', dayOfWeek)
        .maybeSingle();
      workingHours = data;
    }

    if (!workingHours) {
      const { data } = await supabase
        .from('working_hours')
        .select('*')
        .eq('clinic_id', clinic_id)
        .is('worker_id', null)
        .eq('day_of_week', dayOfWeek)
        .maybeSingle();
      workingHours = data;
    }

    if (!workingHours) {
      return NextResponse.json({ error: 'No working hours for this day' }, { status: 400 });
    }

    const startOfDay = moment.tz(date, 'YYYY-MM-DD', TZ).startOf('day').toISOString();
    const endOfDay = moment.tz(date, 'YYYY-MM-DD', TZ).endOf('day').toISOString();

    let existingQuery = supabase
      .from('appointments')
      .select('start_time, end_time, status, locked_until')
      .eq('clinic_id', clinic_id)
      .neq('status', 'cancelled')
      .gte('start_time', startOfDay)
      .lte('start_time', endOfDay);

    if (worker_id) existingQuery = existingQuery.eq('worker_id', worker_id);

    const { data: existingAppointments } = await existingQuery;

    const availableSlots = calculateAvailability({
      date,
      workingHours,
      appointments: existingAppointments ?? [],
      serviceDuration: service.duration_minutes,
    });

    if (!availableSlots.includes(time)) {
      return NextResponse.json({ error: 'Slot no longer available' }, { status: 409 });
    }

    const startTime = moment.tz(`${date} ${time}`, 'YYYY-MM-DD HH:mm', TZ).toISOString();
    const endTime = moment
      .tz(`${date} ${time}`, 'YYYY-MM-DD HH:mm', TZ)
      .add(service.duration_minutes, 'minutes')
      .toISOString();
    const lockedUntil = moment().tz(TZ).add(3, 'minutes').toISOString();

    const { data: appointment, error: apptError } = await supabase
      .from('appointments')
      .insert({
        clinic_id,
        service_id,
        worker_id: worker_id ?? null,
        customer_phone: phone,
        service_name_snapshot: service.service_name,
        service_duration_minutes: service.duration_minutes,
        price_snapshot: service.price,
        start_time: startTime,
        end_time: endTime,
        datetime: startTime,
        duration_minutes: service.duration_minutes,
        status: 'locked',
        locked_until: lockedUntil,
        booking_source: 'booking_page',
      })
      .select()
      .single();

    if (apptError || !appointment) {
      console.error('lock-slot insert error:', apptError);
      return NextResponse.json({ error: 'Failed to create appointment' }, { status: 500 });
    }

    const otpCode = generateOTP();
    const otpExpiry = moment().tz(TZ).add(5, 'minutes').toISOString();

    await supabase.from('otp_codes').insert({
      phone,
      clinic_id,
      appointment_id: appointment.id,
      code: otpCode,
      expires_at: otpExpiry,
      is_used: false,
    });

    const clinicName = clinic?.name ?? 'העסק';
    const serviceName = service.service_name;
    await sendSMS(
      phone,
      `קוד האימות שלך: ${otpCode}\nלאישור תור ל${serviceName} ב${clinicName}.\nהקוד תקף ל-5 דקות.`,
    );

    return NextResponse.json({ appointment_id: appointment.id });
  } catch (err) {
    console.error('lock-slot error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
