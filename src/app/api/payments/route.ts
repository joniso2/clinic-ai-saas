import { NextRequest, NextResponse } from 'next/server';
import { getClinicUser } from '@/lib/auth-server';
import { createClient } from '@/lib/supabase-server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { checkIdempotency, resolveIdempotency, hashPayload } from '@/lib/billing-idempotency';
import { roundMoney } from '@/lib/billing-math';
import type { CreatePaymentBody } from '@/types/billing';
import { PAYMENT_METHOD_LABELS } from '@/types/billing';

// ── GET /api/payments ──────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const row = await getClinicUser();
  if (!row?.clinic_id) return NextResponse.json({ error: 'לא מאומת' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const appointmentId = searchParams.get('appointment_id');
  const patientId     = searchParams.get('patient_id');
  const from          = searchParams.get('from');
  const to            = searchParams.get('to');
  const page          = Math.max(1, parseInt(searchParams.get('page')  ?? '1',  10));
  const limit         = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '50', 10)));
  const offset        = (page - 1) * limit;

  const supabase = await createClient();
  // RLS enforces clinic_id; explicit filter added for defence-in-depth
  let query = supabase
    .from('payments')
    .select('*', { count: 'exact' })
    .eq('clinic_id', row.clinic_id)
    .order('payment_date', { ascending: false })
    .range(offset, offset + limit - 1);

  if (appointmentId) query = query.eq('appointment_id', appointmentId);
  if (patientId)     query = query.eq('patient_id', patientId);
  if (from)          query = query.gte('payment_date', from);
  if (to)            query = query.lte('payment_date', to);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ payments: data ?? [], total: count ?? 0, page, limit });
}

// ── POST /api/payments ─────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // 1. Idempotency-Key header — required
  const idempotencyKey = req.headers.get('Idempotency-Key');
  if (!idempotencyKey) {
    return NextResponse.json(
      { error: 'חסר Idempotency-Key header — נדרש למניעת כפילויות' },
      { status: 400 },
    );
  }

  // 2. Auth + server-side tenant resolution
  const row = await getClinicUser();
  if (!row?.clinic_id) return NextResponse.json({ error: 'לא מאומת' }, { status: 401 });
  const clinicId = row.clinic_id;

  // 3. Parse body
  let body: CreatePaymentBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'גוף הבקשה אינו תקין' }, { status: 400 });
  }

  // 4. Validate required fields
  const { amount, payment_method, payment_date } = body;

  if (typeof amount !== 'number' || amount <= 0 || isNaN(amount)) {
    return NextResponse.json({ error: 'סכום לא תקין — חייב להיות מספר חיובי' }, { status: 400 });
  }
  if (!payment_method || !Object.keys(PAYMENT_METHOD_LABELS).includes(payment_method)) {
    return NextResponse.json({ error: 'אמצעי תשלום לא תקין' }, { status: 400 });
  }
  if (!payment_date || !/^\d{4}-\d{2}-\d{2}$/.test(payment_date)) {
    return NextResponse.json({ error: 'תאריך תשלום לא תקין — נדרש פורמט YYYY-MM-DD' }, { status: 400 });
  }

  // 5. Idempotency check
  const payloadHash = hashPayload(body);
  const idem = await checkIdempotency(
    clinicId,
    idempotencyKey,
    'POST /api/payments',
    payloadHash,
  );

  if (idem.status === 'replay')      return NextResponse.json(idem.responseBody, { status: idem.responseStatus });
  if (idem.status === 'in_progress') return NextResponse.json({ error: 'בקשה זו כבר מעובדת' }, { status: 409 });
  if (idem.status === 'conflict')    return NextResponse.json({ error: 'מפתח Idempotency שימש עם תוכן שונה' }, { status: 422 });

  // 6. Server-side amount rounding (exact decimal — never trust raw client float)
  const safeAmount = roundMoney(amount);

  // 7. Insert payment (service role; clinic_id is server-resolved)
  const admin = getSupabaseAdmin();
  const { data: payment, error: payError } = await admin
    .from('payments')
    .insert({
      clinic_id:        clinicId,
      appointment_id:   body.appointment_id   ?? null,
      patient_id:       body.patient_id        ?? null,
      amount:           safeAmount,
      currency:         'ILS',
      payment_method,
      payment_date,
      reference_number: body.reference_number  ?? null,
      is_refund:        false,
      status:           'received',
      notes:            body.notes             ?? null,
    })
    .select('*')
    .single();

  if (payError || !payment) {
    return NextResponse.json({ error: payError?.message ?? 'שגיאה בשמירת תשלום' }, { status: 500 });
  }

  // 8. Audit log
  await admin.from('billing_audit_log').insert({
    clinic_id:     clinicId,
    payment_id:    payment.id,
    event_type:    'payment_linked',
    actor_user_id: row.user_id,
    event_payload: {
      amount:         safeAmount,
      payment_method,
      payment_date,
      appointment_id: body.appointment_id ?? null,
    },
  });

  // 9. Store idempotency response
  const responseBody = { payment };
  await resolveIdempotency(clinicId, idempotencyKey, 201, responseBody);

  return NextResponse.json(responseBody, { status: 201 });
}
