import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import * as leadRepository from '@/repositories/lead.repository';

/**
 * POST /api/public/booking
 * Public submission from landing booking form (e.g. /lulu/booking).
 * Body: { slug, full_name, phone, service_name?, date?, time? }
 * Resolves clinic_id by slug and creates a lead so it appears in dashboard Leads.
 */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = body as {
    slug?: string;
    full_name?: string;
    phone?: string;
    service_name?: string;
    service_price?: number;
    date?: string;
    time?: string;
  };

  const slug = typeof parsed.slug === 'string' ? parsed.slug.trim() : '';
  const fullName = typeof parsed.full_name === 'string' ? parsed.full_name.trim() : '';
  const phone = typeof parsed.phone === 'string' ? parsed.phone.trim() : '';

  if (!slug || !fullName || !phone) {
    return NextResponse.json(
      { error: 'slug, full_name and phone are required' },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdmin();
  const { data: clinic, error: clinicErr } = await supabase
    .from('clinics')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();

  if (clinicErr || !clinic?.id) {
    return NextResponse.json(
      { error: 'Clinic not found for this booking page' },
      { status: 404 },
    );
  }

  const parts: string[] = [];
  if (parsed.service_name) parts.push(parsed.service_name);
  if (parsed.date && parsed.time) parts.push(`${parsed.date} ${parsed.time}`);
  const interest = parts.length ? parts.join(' · ') : null;

  const estimatedDealValue =
    typeof parsed.service_price === 'number' && parsed.service_price >= 0
      ? parsed.service_price
      : null;

  // Build ISO datetime for next_appointment so it shows in lead overview and can be confirmed to calendar
  let nextAppointment: string | null = null;
  if (parsed.date && parsed.time) {
    const d = String(parsed.date).trim();
    const t = String(parsed.time).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(d) && /^\d{1,2}:\d{2}$/.test(t)) {
      const [hours, minutes] = t.split(':').map((x) => parseInt(x, 10));
      nextAppointment = `${d}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
    } else if (d && t) {
      nextAppointment = `${d}T${t.includes(':') ? t : t + ':00'}`;
    }
  }

  const { data: lead, error: leadError } = await leadRepository.createLead({
    clinic_id: clinic.id,
    full_name: fullName,
    phone,
    interest,
    status: 'Pending',
    source: 'website_booking',
    ...(estimatedDealValue != null && { estimated_deal_value: estimatedDealValue }),
    ...(nextAppointment && { next_appointment: nextAppointment }),
  });

  if (leadError) {
    console.error('[public/booking] createLead error:', leadError);
    return NextResponse.json(
      { error: 'Failed to save booking' },
      { status: 500 },
    );
  }

  return NextResponse.json({ lead }, { status: 201 });
}
