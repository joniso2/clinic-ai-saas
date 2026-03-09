import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { calculateAvailability } from '@/lib/availability';
import { parse, startOfDay, endOfDay } from 'date-fns';

const TZ = 'Asia/Jerusalem';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const clinic_id = searchParams.get('clinic_id');
    const service_id = searchParams.get('service_id');
    const worker_id = searchParams.get('worker_id');
    const date = searchParams.get('date');

    if (!clinic_id || !service_id || !date) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

  const { data: service } = await supabase
    .from('clinic_services')
    .select('duration_minutes')
    .eq('id', service_id)
    .single();

  if (!service) {
    return NextResponse.json({ error: 'Service not found' }, { status: 404 });
  }

  const dayOfWeek = parse(date, 'yyyy-MM-dd', new Date()).getDay();

  // Debug: list services and workers for this clinic
  const { data: servicesForClinic } = await supabase
    .from('clinic_services')
    .select('id, service_name, duration_minutes, is_active')
    .eq('clinic_id', clinic_id);
  const { data: workersForClinic } = await supabase
    .from('clinic_workers')
    .select('id, name, active')
    .eq('clinic_id', clinic_id);
  const { data: allWorkingHours } = await supabase
    .from('working_hours')
    .select('*')
    .eq('clinic_id', clinic_id);

  console.log('[availability] clinic_id=', clinic_id, 'date=', date, 'dayOfWeek=', dayOfWeek);
  console.log('[availability] services=', JSON.stringify(servicesForClinic ?? []));
  console.log('[availability] workers=', JSON.stringify(workersForClinic ?? []));
  console.log('[availability] working_hours (all)=', JSON.stringify(allWorkingHours ?? []));

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
    if (data) console.log('[availability] worker-specific working_hours=', JSON.stringify(data));
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
    if (data) console.log('[availability] clinic-wide working_hours=', JSON.stringify(data));
  }

  if (!workingHours) {
    const { data: settings } = await supabase
      .from('clinic_settings')
      .select('working_hours')
      .eq('clinic_id', clinic_id)
      .maybeSingle();
    const hours = (settings?.working_hours as Array<{ day: number; enabled: boolean; open: string; close: string }>) ?? [];
    const daySettings = hours.find((h) => h.day === dayOfWeek) ?? hours[dayOfWeek];
    if (daySettings?.enabled && daySettings.open && daySettings.close) {
      workingHours = { start_time: daySettings.open, end_time: daySettings.close };
      console.log('[availability] using clinic_settings working_hours for day', dayOfWeek, workingHours);
    }
  }

  if (!workingHours) {
    console.log('[availability] no working_hours for this day → returning empty slots');
    return NextResponse.json({ slots: [] });
  }

  const parsedDate = parse(date, 'yyyy-MM-dd', new Date());
  const dayStartIso = startOfDay(parsedDate).toISOString();
  const dayEndIso = endOfDay(parsedDate).toISOString();

  let query = supabase
    .from('appointments')
    .select('start_time, end_time, status, locked_until')
    .eq('clinic_id', clinic_id)
    .neq('status', 'cancelled')
    .gte('start_time', dayStartIso)
    .lte('start_time', dayEndIso);

  if (worker_id) {
    query = query.eq('worker_id', worker_id);
  }

  const { data: appointments } = await query;

  const slots = calculateAvailability({
    date,
    workingHours,
    appointments: appointments ?? [],
    serviceDuration: service.duration_minutes,
  });

  return NextResponse.json({ slots });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
