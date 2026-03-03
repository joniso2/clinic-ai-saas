import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getClinicUser } from '@/lib/auth-server';

/** PATCH /api/clinic-services/[id] — update service. CLINIC_ADMIN only. */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const row = await getClinicUser();
  if (!row?.clinic_id) return NextResponse.json({ error: 'לא מאומת או ללא קליניקה' }, { status: 401 });
  if (row.role !== 'CLINIC_ADMIN') return NextResponse.json({ error: 'אין הרשאה לערוך תמחור' }, { status: 403 });

  const { id } = await params;
  if (!id) return NextResponse.json({ error: 'חסר מזהה שירות' }, { status: 400 });

  let body: { service_name?: string; price?: number; aliases?: string[]; is_active?: boolean; description?: string | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'נתונים לא תקינים' }, { status: 400 });
  }

  const supabase = await createClient();
  const updates: Record<string, unknown> = {};
  if (body.service_name !== undefined) updates.service_name = String(body.service_name).trim();
  if (body.price !== undefined) updates.price = Number(body.price);
  if (body.aliases !== undefined) updates.aliases = Array.isArray(body.aliases) ? body.aliases : [];
  if (body.is_active !== undefined) updates.is_active = Boolean(body.is_active);
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'אין שדות לעדכון' }, { status: 400 });
  }

  if (updates.service_name) {
    const { data: existing } = await supabase
      .from('clinic_services')
      .select('id')
      .eq('clinic_id', row.clinic_id)
      .ilike('service_name', updates.service_name as string)
      .neq('id', id)
      .limit(1)
      .maybeSingle();
    if (existing) return NextResponse.json({ error: 'קיים כבר שירות בשם זה' }, { status: 409 });
  }

  const { data, error } = await supabase
    .from('clinic_services')
    .update(updates)
    .eq('id', id)
    .eq('clinic_id', row.clinic_id)
    .select('id, service_name, price, aliases, is_active')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

/** DELETE /api/clinic-services/[id] — delete service. CLINIC_ADMIN only. */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const row = await getClinicUser();
  if (!row?.clinic_id) return NextResponse.json({ error: 'לא מאומת או ללא קליניקה' }, { status: 401 });
  if (row.role !== 'CLINIC_ADMIN') return NextResponse.json({ error: 'אין הרשאה לערוך תמחור' }, { status: 403 });

  const { id } = await params;
  if (!id) return NextResponse.json({ error: 'חסר מזהה שירות' }, { status: 400 });

  const supabase = await createClient();
  const { error } = await supabase
    .from('clinic_services')
    .delete()
    .eq('id', id)
    .eq('clinic_id', row.clinic_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
