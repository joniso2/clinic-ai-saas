import { NextRequest, NextResponse } from 'next/server';
import { getClinicUser } from '@/lib/auth-server';
import { createClient } from '@/lib/supabase-server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

type Params = { params: Promise<{ id: string }> };

// ── GET /api/billing-documents/[id] ───────────────────────────────────────

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const row = await getClinicUser();
    if (!row?.clinic_id) return NextResponse.json({ error: 'לא מאומת' }, { status: 401 });

    const { id } = await params;

    const supabase = await createClient();
    // RLS enforces clinic_id; explicit filter added for defence-in-depth
    const { data, error } = await supabase
      .from('billing_documents')
      .select('*, billing_document_items(*), billing_document_payments(*)')
      .eq('id', id)
      .eq('clinic_id', row.clinic_id)
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data)  return NextResponse.json({ error: 'מסמך לא נמצא' }, { status: 404 });

    // Audit: document_viewed (fire-and-forget; service role, explicit clinic_id)
    getSupabaseAdmin().from('billing_audit_log').insert({
      clinic_id:     row.clinic_id,
      document_id:   id,
      event_type:    'document_viewed',
      actor_user_id: row.user_id,
      event_payload: { doc_number: data.doc_number },
    });

    return NextResponse.json({ document: data });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// ── PATCH /api/billing-documents/[id] — cancel document ───────────────────

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const row = await getClinicUser();
    if (!row?.clinic_id) return NextResponse.json({ error: 'לא מאומת' }, { status: 401 });
    if (row.role !== 'CLINIC_ADMIN') {
      return NextResponse.json({ error: 'רק מנהל קליניקה יכול לבטל מסמכים' }, { status: 403 });
    }

    const { id } = await params;

    let body: { reason?: string } = {};
    try { body = await req.json(); } catch { /* reason is optional */ }

    // Cancellation is handled by an atomic SECURITY DEFINER function.
    // Service role bypasses RLS — clinic_id and document_id are server-resolved.
    const admin = getSupabaseAdmin();
    const { data, error } = await admin.rpc('cancel_billing_document', {
      p_document_id:   id,
      p_clinic_id:     row.clinic_id,  // server-resolved — never client-provided
      p_actor_user_id: row.user_id,
      p_reason:        body.reason ?? null,
    });

    if (error) {
      const msg = error.message ?? '';
      if (msg.includes('לא נמצא'))  return NextResponse.json({ error: 'מסמך לא נמצא' }, { status: 404 });
      if (msg.includes('כבר בוטל')) return NextResponse.json({ error: 'מסמך כבר בוטל' }, { status: 409 });
      if (msg.includes('ביטול'))    return NextResponse.json({ error: msg }, { status: 422 });
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
