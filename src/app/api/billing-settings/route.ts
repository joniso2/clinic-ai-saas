import { NextRequest, NextResponse } from 'next/server';
import { getClinicUser } from '@/lib/auth-server';
import { createClient } from '@/lib/supabase-server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import type { UpdateBillingSettingsBody } from '@/types/billing';
import { BILLING_BUSINESS_TYPE_LABELS } from '@/types/billing';

/** GET /api/billing-settings — fetch current clinic's billing settings. */
export async function GET() {
  const row = await getClinicUser();
  if (!row?.clinic_id) return NextResponse.json({ error: 'לא מאומת' }, { status: 401 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('billing_settings')
    .select('*')
    .eq('clinic_id', row.clinic_id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ settings: data ?? null });
}

/** PATCH /api/billing-settings — create or update billing settings. CLINIC_ADMIN only. */
export async function PATCH(req: NextRequest) {
  const row = await getClinicUser();
  if (!row?.clinic_id) return NextResponse.json({ error: 'לא מאומת' }, { status: 401 });
  if (row.role !== 'CLINIC_ADMIN') {
    return NextResponse.json({ error: 'רק מנהל קליניקה יכול לערוך פרטי עסק' }, { status: 403 });
  }

  let body: UpdateBillingSettingsBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'גוף הבקשה אינו תקין' }, { status: 400 });
  }

  // Validate business_type if provided
  if (body.business_type && !Object.keys(BILLING_BUSINESS_TYPE_LABELS).includes(body.business_type)) {
    return NextResponse.json({ error: 'סוג עסק לא תקין' }, { status: 400 });
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.business_name  !== undefined) updates.business_name  = String(body.business_name).trim();
  if (body.business_number !== undefined) updates.business_number = String(body.business_number).trim();
  if (body.business_type  !== undefined) updates.business_type  = body.business_type;
  if (body.address        !== undefined) updates.address        = body.address?.trim() || null;
  if (body.phone          !== undefined) updates.phone          = body.phone?.trim() || null;
  if (body.email          !== undefined) updates.email          = body.email?.trim() || null;
  if (body.logo_url       !== undefined) updates.logo_url       = body.logo_url?.trim() || null;
  if (body.vat_number     !== undefined) updates.vat_number     = body.vat_number?.trim() || null;

  // Use service role for upsert; clinic_id is server-resolved — never from client
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from('billing_settings')
    .upsert({ clinic_id: row.clinic_id, ...updates }, { onConflict: 'clinic_id' })
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Audit log
  await admin.from('billing_audit_log').insert({
    clinic_id:     row.clinic_id,
    event_type:    'settings_updated',
    actor_user_id: row.user_id,
    event_payload: { updated_fields: Object.keys(updates).filter((k) => k !== 'updated_at') },
  });

  return NextResponse.json({ settings: data });
}
