import { NextRequest, NextResponse } from 'next/server';
import { getClinicUser } from '@/lib/auth-server';
import * as settingsRepo from '@/repositories/settings.repository';

/** POST /api/team/disable — set member active/inactive (CLINIC_ADMIN only). */
export async function POST(req: NextRequest) {
  const row = await getClinicUser();
  if (!row?.clinic_id) return NextResponse.json({ error: 'לא מאומת או ללא גישה לקליניקה' }, { status: 401 });
  if (row.role !== 'CLINIC_ADMIN') return NextResponse.json({ error: 'אין הרשאה' }, { status: 403 });

  let body: { user_id?: string; disable?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'נתונים לא תקינים' }, { status: 400 });
  }

  const user_id = typeof body.user_id === 'string' ? body.user_id.trim() : '';
  const disable = body.disable !== false;
  if (!user_id) return NextResponse.json({ error: 'מזהה משתמש חובה' }, { status: 400 });

  const { error } = await settingsRepo.setTeamMemberBanned(row.clinic_id, user_id, disable);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true, disabled: disable });
}
