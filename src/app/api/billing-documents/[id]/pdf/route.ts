import { NextRequest, NextResponse } from 'next/server';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { renderToBuffer } = require('@react-pdf/renderer');
import { createElement } from 'react';
import { getClinicUser } from '@/lib/auth-server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { BillingDocumentPDF } from '@/components/billing/BillingDocumentPDF';
import { PAYMENT_METHOD_LABELS } from '@/types/billing';
import type { BillingDocumentWithItems, PaymentMethod } from '@/types/billing';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const row = await getClinicUser();
  if (!row?.clinic_id) return NextResponse.json({ error: 'לא מאומת' }, { status: 401 });

  const { id } = await params;

  // Fetch document with items — explicit clinic_id filter (service role bypasses RLS)
  const admin = getSupabaseAdmin();
  const { data: doc, error } = await admin
    .from('billing_documents')
    .select('*, billing_document_items(*)')
    .eq('id', id)
    .eq('clinic_id', row.clinic_id)
    .maybeSingle();

  if (error || !doc) return NextResponse.json({ error: 'מסמך לא נמצא' }, { status: 404 });

  // Fetch most recent linked payment for display (optional, non-blocking)
  let paymentMethod: string | null = null;
  const { data: paymentRows } = await admin
    .from('billing_document_payments')
    .select('payment_id')
    .eq('document_id', id)
    .limit(1);

  if (paymentRows?.length) {
    const { data: payment } = await admin
      .from('payments')
      .select('payment_method')
      .eq('id', paymentRows[0].payment_id)
      .maybeSingle();
    if (payment?.payment_method) {
      paymentMethod = PAYMENT_METHOD_LABELS[payment.payment_method as PaymentMethod] ?? null;
    }
  }

  // Generate PDF buffer
  let pdfBuffer: Uint8Array;
  try {
    pdfBuffer = await renderToBuffer(
      createElement(BillingDocumentPDF, {
        doc: doc as BillingDocumentWithItems,
        paymentMethod,
      })
    ) as Uint8Array;
  } catch (e) {
    console.error('[pdf] render error', e);
    return NextResponse.json({ error: 'שגיאה ביצירת PDF' }, { status: 500 });
  }

  // Audit (fire-and-forget)
  void admin.from('billing_audit_log').insert({
    clinic_id:     row.clinic_id,
    document_id:   id,
    event_type:    'pdf_downloaded',
    actor_user_id: row.user_id,
    event_payload: { doc_number: doc.doc_number },
  });

  const filename = `${doc.doc_number}.pdf`;
  return new NextResponse(Buffer.from(pdfBuffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': String(Buffer.from(pdfBuffer).byteLength),
      'Cache-Control': 'private, no-cache',
    },
  });
}
