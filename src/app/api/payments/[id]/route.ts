import { NextRequest, NextResponse } from 'next/server';
import { getClinicUser } from '@/lib/auth-server';
import { createClient } from '@/lib/supabase-server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { roundMoney } from '@/lib/billing-math';
import { PAYMENT_METHOD_LABELS } from '@/types/billing';

type Params = { params: Promise<{ id: string }> };

// ── GET /api/payments/[id] ─────────────────────────────────────────────────

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const row = await getClinicUser();
    if (!row?.clinic_id) return NextResponse.json({ error: 'לא מאומת' }, { status: 401 });

    const { id } = await params;

    const supabase = await createClient();
    // RLS enforces clinic_id; explicit filter added for defence-in-depth
    const { data, error } = await supabase
      .from('payments')
      .select('*, billing_document_payments(*)')
      .eq('id', id)
      .eq('clinic_id', row.clinic_id)
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data)  return NextResponse.json({ error: 'תשלום לא נמצא' }, { status: 404 });

    return NextResponse.json({ payment: data });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// ── PATCH /api/payments/[id] — issue refund ────────────────────────────────

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const row = await getClinicUser();
    if (!row?.clinic_id) return NextResponse.json({ error: 'לא מאומת' }, { status: 401 });
    if (row.role !== 'CLINIC_ADMIN') {
      return NextResponse.json({ error: 'רק מנהל קליניקה יכול להנפיק זיכוי' }, { status: 403 });
    }

    const { id } = await params;

  let body: { amount?: number; reason?: string; payment_method?: string } = {};
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'גוף הבקשה אינו תקין' }, { status: 400 });
  }

  // Validate refund amount if provided
  if (body.amount !== undefined && (typeof body.amount !== 'number' || body.amount <= 0)) {
    return NextResponse.json({ error: 'סכום זיכוי לא תקין' }, { status: 400 });
  }
  if (body.payment_method && !Object.keys(PAYMENT_METHOD_LABELS).includes(body.payment_method)) {
    return NextResponse.json({ error: 'אמצעי תשלום לא תקין' }, { status: 400 });
  }

  // Fetch original payment (RLS + explicit clinic_id)
  const supabase = await createClient();
  const { data: original } = await supabase
    .from('payments')
    .select('*')
    .eq('id', id)
    .eq('clinic_id', row.clinic_id)
    .maybeSingle();

  if (!original) return NextResponse.json({ error: 'תשלום לא נמצא' }, { status: 404 });
  if (original.is_refund) {
    return NextResponse.json({ error: 'לא ניתן לזכות תשלום שהוא עצמו זיכוי' }, { status: 422 });
  }
  if (original.status === 'refunded') {
    return NextResponse.json({ error: 'תשלום זה כבר זוכה' }, { status: 409 });
  }

  // Refund amount defaults to full payment amount; must not exceed original
  const refundAmount = body.amount != null
    ? roundMoney(body.amount)
    : roundMoney(Number(original.amount));

  if (refundAmount > roundMoney(Number(original.amount))) {
    return NextResponse.json(
      { error: `סכום הזיכוי (₪${refundAmount}) עולה על סכום התשלום המקורי (₪${original.amount})` },
      { status: 422 },
    );
  }

  const admin = getSupabaseAdmin();

  // Insert refund payment (service role; clinic_id is server-resolved)
  const { data: refund, error: refundError } = await admin
    .from('payments')
    .insert({
      clinic_id:        row.clinic_id,
      appointment_id:   original.appointment_id,
      patient_id:       original.patient_id,
      amount:           refundAmount,
      currency:         original.currency,
      payment_method:   body.payment_method ?? original.payment_method,
      payment_date:     new Date().toISOString().split('T')[0],
      is_refund:        true,
      refund_for_id:    id,
      refund_reason:    body.reason ?? null,
      status:           'received',
    })
    .select('*')
    .single();

  if (refundError || !refund) {
    return NextResponse.json({ error: refundError?.message ?? 'שגיאה ביצירת זיכוי' }, { status: 500 });
  }

  // Mark original as refunded if full amount
  if (refundAmount >= roundMoney(Number(original.amount))) {
    await admin.from('payments').update({ status: 'refunded' }).eq('id', id);
  }

  // Audit log
  await admin.from('billing_audit_log').insert({
    clinic_id:     row.clinic_id,
    payment_id:    id,
    event_type:    'payment_refunded',
    actor_user_id: row.user_id,
    event_payload: {
      refund_payment_id: refund.id,
      refund_amount:     refundAmount,
      original_amount:   original.amount,
      reason:            body.reason ?? null,
    },
  });

  return NextResponse.json({ refund }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
