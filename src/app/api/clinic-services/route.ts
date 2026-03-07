import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getClinicUser } from '@/lib/auth-server';

/** GET /api/clinic-services — list services for current user's clinic. STAFF + CLINIC_ADMIN. Returns role for UI. */
export async function GET() {
  const row = await getClinicUser();
  if (!row?.clinic_id) return NextResponse.json({ error: 'לא מאומת או ללא גישה לקליניקה' }, { status: 401 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('clinic_services')
    .select('id, clinic_id, service_name, price, duration_minutes, aliases, is_active, category, created_at')
    .eq('clinic_id', row.clinic_id)
    .order('service_name');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Aggregate bookings count and total revenue per service from appointments
  const { data: appts } = await supabase
    .from('appointments')
    .select('service_name, revenue')
    .eq('clinic_id', row.clinic_id);

  const statsMap = new Map<string, { bookings_count: number; total_revenue: number }>();
  for (const appt of appts ?? []) {
    const key = (appt.service_name ?? '').toLowerCase().trim();
    if (!key) continue;
    const entry = statsMap.get(key) ?? { bookings_count: 0, total_revenue: 0 };
    entry.bookings_count += 1;
    entry.total_revenue += Number(appt.revenue ?? 0);
    statsMap.set(key, entry);
  }

  const services = (data ?? []).map((s) => {
    const key = s.service_name.toLowerCase().trim();
    const stats = statsMap.get(key) ?? { bookings_count: 0, total_revenue: 0 };
    return { ...s, ...stats };
  });

  return NextResponse.json({ services, role: row.role });
}

/** POST /api/clinic-services — add service. CLINIC_ADMIN only. */
export async function POST(req: NextRequest) {
  const row = await getClinicUser();
  if (!row?.clinic_id) return NextResponse.json({ error: 'לא מאומת או ללא קליניקה' }, { status: 401 });
  if (row.role !== 'CLINIC_ADMIN') return NextResponse.json({ error: 'אין הרשאה לערוך תמחור' }, { status: 403 });

  let body: { service_name?: string; price?: number; duration_minutes?: number; aliases?: string[]; is_active?: boolean; description?: string | null; category?: string | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'נתונים לא תקינים' }, { status: 400 });
  }
  const service_name = body.service_name?.trim();
  const price = body.price != null ? Number(body.price) : undefined;
  if (!service_name || price == null || Number.isNaN(price)) {
    return NextResponse.json({ error: 'שם שירות ומחיר חובה' }, { status: 400 });
  }
  const duration_minutes = body.duration_minutes != null ? Math.max(1, Math.min(480, Math.round(Number(body.duration_minutes)))) : 30;

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from('clinic_services')
    .select('id')
    .eq('clinic_id', row.clinic_id)
    .ilike('service_name', service_name)
    .limit(1)
    .maybeSingle();
  if (existing) return NextResponse.json({ error: 'קיים כבר שירות בשם זה' }, { status: 409 });

  const aliases = Array.isArray(body.aliases) ? body.aliases : [];
  const { data, error } = await supabase
    .from('clinic_services')
    .insert({
      clinic_id: row.clinic_id,
      service_name,
      price,
      duration_minutes,
      aliases,
      is_active: body.is_active !== false,
      category: body.category?.trim() || null,
    })
    .select('id, clinic_id, service_name, price, duration_minutes, aliases, is_active, category')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
