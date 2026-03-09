import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { calculateAvailability } from '@/lib/availability';
import { sendSMS } from '@/lib/sms';
import { parse, addMinutes, startOfDay, endOfDay, format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

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

    const dayOfWeek = parse(date, 'yyyy-MM-dd', new Date()).getDay();
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

    const parsedDate = parse(date, 'yyyy-MM-dd', new Date());
    const dayStart = startOfDay(parsedDate).toISOString();
    const dayEnd = endOfDay(parsedDate).toISOString();

    let existingQuery = supabase
      .from('appointments')
      .select('start_time, end_time, status, locked_until')
      .eq('clinic_id', clinic_id)
      .neq('status', 'cancelled')
      .gte('start_time', dayStart)
      .lte('start_time', dayEnd);

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

    const slotDate = parse(`${date} ${time}`, 'yyyy-MM-dd HH:mm', new Date());
    const startTime = slotDate.toISOString();
    const endTime = addMinutes(slotDate, service.duration_minutes).toISOString();
    const lockedUntil = addMinutes(new Date(), 3).toISOString();

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
    const otpExpiry = addMinutes(new Date(), 5).toISOString();

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
