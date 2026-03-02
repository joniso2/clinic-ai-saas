import { NextRequest, NextResponse } from 'next/server';
import { getClinicUser } from '@/lib/auth-server';
import * as settingsRepo from '@/repositories/settings.repository';

async function getClinicIdAndRole(): Promise<{ clinicId: string; role: string } | null> {
  const row = await getClinicUser();
  if (!row?.clinic_id) return null;
  return { clinicId: row.clinic_id, role: row.role };
}

/** GET /api/team — list team members for current clinic. */
export async function GET() {
  const ctx = await getClinicIdAndRole();
  if (!ctx) return NextResponse.json({ error: 'לא מאומת או ללא גישה לקליניקה' }, { status: 401 });

  const members = await settingsRepo.getTeamMembers(ctx.clinicId);
  return NextResponse.json({ members, role: ctx.role });
}

/** POST /api/team — add team member (CLINIC_ADMIN only). Creates Supabase user + clinic_users row. */
export async function POST(req: NextRequest) {
  const ctx = await getClinicIdAndRole();
  if (!ctx) return NextResponse.json({ error: 'לא מאומת או ללא גישה לקליניקה' }, { status: 401 });
  if (ctx.role !== 'CLINIC_ADMIN') return NextResponse.json({ error: 'אין הרשאה להוסיף אנשי צוות' }, { status: 403 });

  let body: { full_name?: string; email?: string; password?: string; role_display?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'נתונים לא תקינים' }, { status: 400 });
  }

  const full_name = typeof body.full_name === 'string' ? body.full_name.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const role_display = typeof body.role_display === 'string' ? body.role_display : 'תומך';

  if (!full_name) return NextResponse.json({ error: 'שם מלא חובה' }, { status: 400 });
  if (!email) return NextResponse.json({ error: 'אימייל חובה' }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ error: 'סיסמה לפחות 8 תווים' }, { status: 400 });
  if (!settingsRepo.ROLE_DISPLAY_OPTIONS.includes(role_display as typeof settingsRepo.ROLE_DISPLAY_OPTIONS[number])) {
    return NextResponse.json({ error: 'תפקיד לא תקין' }, { status: 400 });
  }

  const { error, member } = await settingsRepo.createTeamMember({
    clinicId: ctx.clinicId,
    email,
    password,
    full_name,
    role_display,
  });

  if (error) {
    const msg = error.message || 'הוספת משתמש נכשלה';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  return NextResponse.json(member, { status: 201 });
}

/** PATCH /api/team — update member role (CLINIC_ADMIN only). */
export async function PATCH(req: NextRequest) {
  const ctx = await getClinicIdAndRole();
  if (!ctx) return NextResponse.json({ error: 'לא מאומת או ללא גישה לקליניקה' }, { status: 401 });
  if (ctx.role !== 'CLINIC_ADMIN') return NextResponse.json({ error: 'אין הרשאה לעדכן תפקידים' }, { status: 403 });

  let body: { user_id?: string; role_display?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'נתונים לא תקינים' }, { status: 400 });
  }

  const user_id = typeof body.user_id === 'string' ? body.user_id.trim() : '';
  const role_display = typeof body.role_display === 'string' ? body.role_display : '';
  if (!user_id || !role_display) return NextResponse.json({ error: 'מזהה משתמש ותפקיד חובה' }, { status: 400 });
  if (!settingsRepo.ROLE_DISPLAY_OPTIONS.includes(role_display as typeof settingsRepo.ROLE_DISPLAY_OPTIONS[number])) {
    return NextResponse.json({ error: 'תפקיד לא תקין' }, { status: 400 });
  }

  const { error } = await settingsRepo.updateTeamMemberRole(ctx.clinicId, user_id, role_display);
  if (error) return NextResponse.json({ error: error.message || 'עדכון נכשל' }, { status: 500 });
  return NextResponse.json({ success: true });
}

/** DELETE /api/team — remove member from clinic (CLINIC_ADMIN only). */
export async function DELETE(req: NextRequest) {
  const ctx = await getClinicIdAndRole();
  if (!ctx) return NextResponse.json({ error: 'לא מאומת או ללא גישה לקליניקה' }, { status: 401 });
  if (ctx.role !== 'CLINIC_ADMIN') return NextResponse.json({ error: 'אין הרשאה להסיר אנשי צוות' }, { status: 403 });

  let body: { user_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'נתונים לא תקינים' }, { status: 400 });
  }

  const user_id = typeof body.user_id === 'string' ? body.user_id.trim() : '';
  if (!user_id) return NextResponse.json({ error: 'מזהה משתמש חובה' }, { status: 400 });

  const { error } = await settingsRepo.removeTeamMember(ctx.clinicId, user_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ removed: true });
}
