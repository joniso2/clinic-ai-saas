import { NextRequest, NextResponse } from 'next/server';
import { getClinicUser } from '@/lib/auth-server';
import { createClient } from '@/lib/supabase-server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { checkIdempotency, resolveIdempotency, hashPayload } from '@/lib/billing-idempotency';
import { computeDocumentTotals } from '@/lib/billing-math';
import { ALLOWED_DOC_TYPES, DOC_TYPE_PREFIXES } from '@/types/billing';
import type { CreateDocumentBody, BillingDocType } from '@/types/billing';
import { toZonedTime } from 'date-fns-tz';

const TZ = 'Asia/Jerusalem';

// ── GET /api/billing-documents ─────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const row = await getClinicUser();
  if (!row?.clinic_id) return NextResponse.json({ error: 'לא מאומת' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const docType        = searchParams.get('doc_type');
  const status         = searchParams.get('status');
  const from           = searchParams.get('from');
  const to             = searchParams.get('to');
  const patientId      = searchParams.get('patient_id');
  const appointmentId  = searchParams.get('appointment_id');
  const appointmentIds = searchParams.get('appointment_ids'); // comma-separated batch
  const page     = Math.max(1, parseInt(searchParams.get('page')  ?? '1',  10));
  const limit    = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '50', 10)));
  const offset   = (page - 1) * limit;

  const supabase = await createClient();
  // RLS enforces clinic_id; we also filter explicitly for defence-in-depth
  let query = supabase
    .from('billing_documents')
    .select('*, billing_document_items(*)', { count: 'exact' })
    .eq('clinic_id', row.clinic_id)
    .order('issued_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (docType)   query = query.eq('doc_type', docType);
  if (status)    query = query.eq('status', status);
  if (from)      query = query.gte('issued_at', from);
  if (to)        query = query.lte('issued_at', to);
  if (patientId)     query = query.eq('patient_id', patientId);
  if (appointmentId) query = query.eq('appointment_id', appointmentId);
  if (appointmentIds) query = query.in('appointment_id', appointmentIds.split(',').map(s => s.trim()).filter(Boolean));

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ documents: data ?? [], total: count ?? 0, page, limit });
}

// ── POST /api/billing-documents ────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // 1. Idempotency-Key header — required; prevents duplicate documents on retry
  const idempotencyKey = req.headers.get('Idempotency-Key');
  if (!idempotencyKey) {
    return NextResponse.json(
      { error: 'חסר Idempotency-Key header — נדרש למניעת כפילויות' },
      { status: 400 },
    );
  }

  // 2. Auth + server-side tenant resolution — never trusts client-provided clinic_id
  const row = await getClinicUser();
  if (!row?.clinic_id) return NextResponse.json({ error: 'לא מאומת' }, { status: 401 });
  const clinicId = row.clinic_id;

  // 3. Parse and validate body
  let body: CreateDocumentBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'גוף הבקשה אינו תקין' }, { status: 400 });
  }

  const { doc_type, customer_name, items } = body;

  if (!doc_type)        return NextResponse.json({ error: 'חסר doc_type' }, { status: 400 });
  if (!customer_name?.trim()) return NextResponse.json({ error: 'חסר שם לקוח' }, { status: 400 });
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'נדרש לפחות פריט אחד' }, { status: 400 });
  }

  for (const item of items) {
    if (!item.description?.trim()) {
      return NextResponse.json({ error: 'כל פריט חייב תיאור' }, { status: 400 });
    }
    if (typeof item.quantity !== 'number' || item.quantity < 1 || !Number.isInteger(item.quantity)) {
      return NextResponse.json({ error: 'כמות לא תקינה — חייבת להיות מספר שלם חיובי' }, { status: 400 });
    }
    if (typeof item.unit_price !== 'number' || item.unit_price < 0) {
      return NextResponse.json({ error: 'מחיר יחידה לא תקין' }, { status: 400 });
    }
  }

  // 4. Idempotency check (service role; clinic_id enforced explicitly inside helper)
  const payloadHash = hashPayload(body);
  const idem = await checkIdempotency(
    clinicId,
    idempotencyKey,
    'POST /api/billing-documents',
    payloadHash,
  );

  if (idem.status === 'replay')     return NextResponse.json(idem.responseBody, { status: idem.responseStatus });
  if (idem.status === 'in_progress') return NextResponse.json({ error: 'בקשה זו כבר מעובדת' }, { status: 409 });
  if (idem.status === 'conflict')    return NextResponse.json({ error: 'מפתח Idempotency שימש עם תוכן שונה' }, { status: 422 });

  // 5. Load billing settings (RLS + explicit clinic_id filter)
  const supabase = await createClient();
  const { data: settings } = await supabase
    .from('billing_settings')
    .select('*')
    .eq('clinic_id', clinicId)
    .maybeSingle();

  if (!settings) {
    return NextResponse.json(
      { error: 'פרטי העסק לחשבוניות טרם הוגדרו — נא להגדיר בהגדרות' },
      { status: 422 },
    );
  }

  // 6. Business-type permission check (server-enforced, not client-trusted)
  const allowedTypes = ALLOWED_DOC_TYPES[settings.business_type as keyof typeof ALLOWED_DOC_TYPES] ?? [];
  if (!allowedTypes.includes(doc_type as BillingDocType)) {
    return NextResponse.json(
      { error: `סוג מסמך "${doc_type}" אינו מותר לעסק מסוג ${settings.business_type}` },
      { status: 403 },
    );
  }

  // 7. Resolve current VAT rate from DB (server-side; rate never trusted from client)
  // Service role bypasses RLS — clinic_id not relevant here (global table), explicit query used
  const admin = getSupabaseAdmin();
  const issuedAt = new Date().toISOString();

  const { data: vatRateRow } = await admin
    .from('vat_rates')
    .select('rate')
    .lte('effective_from', issuedAt)
    .order('effective_from', { ascending: false })
    .limit(1)
    .maybeSingle();

  const vatRate: number = vatRateRow ? Number(vatRateRow.rate) : 0.18;

  // 8. Server-side financial calculations — exact decimal math, never from client totals
  const { line_totals, subtotal, vat_amount, total } = computeDocumentTotals(
    items.map((i) => ({ quantity: i.quantity, unit_price: i.unit_price })),
    vatRate,
  );

  // 9. Sequential document number (atomic upsert via SECURITY DEFINER function)
  //    Service role bypasses RLS; p_clinic_id is server-resolved, never client-provided
  const documentYear = toZonedTime(new Date(), TZ).getFullYear();
  const { data: seqData, error: seqError } = await admin.rpc('next_document_number', {
    p_clinic_id: clinicId,
    p_doc_type:  doc_type,
    p_year:      documentYear,
  });

  if (seqError || seqData == null) {
    return NextResponse.json({ error: 'שגיאה בהפקת מספר מסמך' }, { status: 500 });
  }

  const seqNumber = seqData as number;
  const prefix    = DOC_TYPE_PREFIXES[doc_type as BillingDocType];
  const docNumber = `${prefix}-${documentYear}-${String(seqNumber).padStart(4, '0')}`;

  // 10. Determine Israel Invoice allocation requirement
  //     Conditional: only for eligible tax invoices above the current threshold
  let allocationStatus = 'not_required';
  if (doc_type === 'tax_invoice' || doc_type === 'tax_invoice_receipt') {
    const { data: threshold } = await admin
      .from('israel_invoice_thresholds')
      .select('amount_before_vat')
      .lte('effective_from', issuedAt)
      .order('effective_from', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (threshold && subtotal >= Number(threshold.amount_before_vat)) {
      allocationStatus = 'pending'; // Future: queue allocation API call
    }
  }

  // 11. Insert billing_document (service role — clinic_id explicitly set)
  const { data: document, error: docError } = await admin
    .from('billing_documents')
    .insert({
      clinic_id:               clinicId,
      doc_type,
      doc_number:              docNumber,
      seq_number:              seqNumber,
      document_year:           documentYear,
      patient_id:              body.patient_id      ?? null,
      appointment_id:          body.appointment_id  ?? null,
      customer_name:           customer_name.trim(),
      customer_phone:          body.customer_phone  ?? null,
      customer_email:          body.customer_email  ?? null,
      customer_type:           body.customer_type   ?? 'private',
      customer_business_number: body.customer_business_number ?? null,
      customer_address:        body.customer_address ?? null,
      business_name:           settings.business_name,
      business_number:         settings.business_number,
      business_address:        settings.address ?? null,
      vat_number:              settings.vat_number ?? null,
      subtotal,
      vat_rate:                vatRate,
      vat_amount,
      total,
      currency:                'ILS',
      status:                  'issued',
      allocation_status:       allocationStatus,
      issued_at:               issuedAt,
    })
    .select('*')
    .single();

  if (docError || !document) {
    return NextResponse.json({ error: docError?.message ?? 'שגיאה ביצירת מסמך' }, { status: 500 });
  }

  // 12. Insert line items with server-computed line_totals
  const itemRows = items.map((item, idx) => ({
    document_id: document.id,
    service_id:  item.service_id ?? null,
    description: item.description.trim(),
    quantity:    item.quantity,
    unit_price:  item.unit_price,
    line_total:  line_totals[idx],
  }));

  const { error: itemsError } = await admin
    .from('billing_document_items')
    .insert(itemRows);

  if (itemsError) {
    console.error('[POST /api/billing-documents] items insert failed:', itemsError.message, 'doc_id:', document.id);
    // Rollback: delete the orphaned document header to prevent a doc with no items
    await admin.from('billing_documents').delete().eq('id', document.id);
    return NextResponse.json({ error: 'שגיאה בהוספת פריטי המסמך' }, { status: 500 });
  }

  // 13. Audit log
  await admin.from('billing_audit_log').insert({
    clinic_id:     clinicId,
    document_id:   document.id,
    event_type:    'document_issued',
    actor_user_id: row.user_id,
    event_payload: {
      doc_number:    docNumber,
      doc_type,
      total,
      customer_name: customer_name.trim(),
    },
  });

  // 14. Store idempotency response (after all writes complete)
  const responseBody = { document: { ...document, billing_document_items: itemRows } };
  await resolveIdempotency(clinicId, idempotencyKey, 201, responseBody);

  return NextResponse.json(responseBody, { status: 201 });
}
