import { NextRequest, NextResponse } from 'next/server';
import { getClinicUser } from '@/lib/auth-server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { DOC_TYPE_LABELS, PAYMENT_METHOD_LABELS } from '@/types/billing';
import type { BillingDocType, PaymentMethod } from '@/types/billing';

/**
 * GET /api/billing-documents/export
 *
 * Query params:
 *   from       ISO date string (required)
 *   to         ISO date string (required)
 *   doc_type   optional filter
 */
export async function GET(req: NextRequest) {
  try {
    const row = await getClinicUser();
    if (!row?.clinic_id) return NextResponse.json({ error: 'לא מאומת' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const from     = searchParams.get('from');
    const to       = searchParams.get('to');
    const docType  = searchParams.get('doc_type') as BillingDocType | null;

    if (!from || !to) {
      return NextResponse.json({ error: 'נדרשים פרמטרים: from, to' }, { status: 400 });
    }

    const admin = getSupabaseAdmin();

  let query = admin
    .from('billing_documents')
    .select(`
      doc_number,
      doc_type,
      status,
      customer_name,
      customer_phone,
      customer_type,
      issued_at,
      subtotal,
      vat_rate,
      vat_amount,
      total,
      currency,
      billing_document_payments ( payment_id, payments ( payment_method ) )
    `)
    .eq('clinic_id', row.clinic_id)
    .gte('issued_at', from)
    .lte('issued_at', `${to}T23:59:59`)
    .order('issued_at', { ascending: true });

  if (docType) query = query.eq('doc_type', docType);

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const docs = data ?? [];

  // Build CSV rows
  const header = [
    'מספר מסמך',
    'סוג מסמך',
    'סטטוס',
    'שם לקוח',
    'טלפון',
    'סוג לקוח',
    'תאריך הנפקה',
    'סכום לפני מע״מ',
    'מע״מ (%)',
    'סכום מע״מ',
    'סה״כ',
    'מטבע',
    'אמצעי תשלום',
  ];

  const rows = docs.map((d) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payments = (d as any).billing_document_payments ?? [];
    const method =
      payments[0]?.payments?.payment_method
        ? PAYMENT_METHOD_LABELS[payments[0].payments.payment_method as PaymentMethod]
        : '';

    const vatPct = Math.round(Number(d.vat_rate) * 100);
    const issuedDate = new Date(d.issued_at).toLocaleDateString('he-IL');

    return [
      d.doc_number,
      DOC_TYPE_LABELS[d.doc_type as BillingDocType] ?? d.doc_type,
      d.status === 'issued' ? 'הופק' : 'בוטל',
      d.customer_name,
      d.customer_phone ?? '',
      d.customer_type === 'business' ? 'עסקי' : 'פרטי',
      issuedDate,
      Number(d.subtotal).toFixed(2),
      String(vatPct),
      Number(d.vat_amount).toFixed(2),
      Number(d.total).toFixed(2),
      d.currency,
      method,
    ];
  });

  const csvLines = [header, ...rows].map((cols) =>
    cols.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
  );
  const csv = '\uFEFF' + csvLines.join('\r\n'); // BOM for Excel Hebrew support

  const fromLabel = from.slice(0, 10);
  const toLabel   = to.slice(0, 10);
  const filename  = `billing-export-${fromLabel}-to-${toLabel}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'private, no-cache',
    },
  });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
