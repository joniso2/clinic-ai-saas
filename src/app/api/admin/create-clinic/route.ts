import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth-server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

function randomPassword(length = 12): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
  let s = '';
  for (let i = 0; i < length; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

/** Generate a URL-safe slug from clinic name; ensure unique by appending short id. */
function slugFromName(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\u0590-\u05ff-]/g, '') // allow Hebrew
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'clinic';
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${base}-${suffix}`;
}

/** POST /api/admin/create-clinic — create clinic + admin user (Super Admin only). */
export async function POST(req: NextRequest) {
  const user = await requireSuperAdmin();
  if (!user) {
    return NextResponse.json({ error: 'אין הרשאה' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'בקשה לא תקינה' }, { status: 400 });
  }

  const {
    name,
    plan_id,
    admin_email,
    admin_full_name,
    admin_password: rawPassword,
    phone,
  } = body as {
    name?: string;
    plan_id?: string;
    admin_email?: string;
    admin_full_name?: string;
    admin_password?: string;
    phone?: string;
  };

  const clinicName = typeof name === 'string' ? name.trim() : '';
  const email = typeof admin_email === 'string' ? admin_email.trim().toLowerCase() : '';
  if (!clinicName) {
    return NextResponse.json({ error: 'שם העסק חובה' }, { status: 400 });
  }
  if (!email) {
    return NextResponse.json({ error: 'אימייל מנהל ראשי חובה' }, { status: 400 });
  }

  const password = typeof rawPassword === 'string' && rawPassword.length >= 8
    ? rawPassword
    : randomPassword();

  const supabase = getSupabaseAdmin();

  // 1) Create auth user
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: typeof admin_full_name === 'string' ? admin_full_name.trim() : null,
      phone: typeof phone === 'string' ? phone.trim() || null : null,
    },
  });

  if (authError) {
    if (authError.message.includes('already registered')) {
      return NextResponse.json({ error: 'האימייל כבר רשום במערכת' }, { status: 400 });
    }
    return NextResponse.json({ error: authError.message || 'יצירת משתמש נכשלה' }, { status: 400 });
  }

  if (!authUser.user) {
    return NextResponse.json({ error: 'יצירת משתמש נכשלה' }, { status: 500 });
  }

  // 2) Create clinic (slug required for booking URLs)
  const slug = slugFromName(clinicName);
  const { data: clinic, error: clinicError } = await supabase
    .from('clinics')
    .insert({
      name: clinicName,
      slug,
      plan_id: plan_id || null,
      status: 'active',
      created_by: user.id,
    })
    .select('id, name, slug, plan_id, status')
    .single();

  if (clinicError) {
    await supabase.auth.admin.deleteUser(authUser.user.id);
    return NextResponse.json({ error: clinicError.message || 'יצירת העסק נכשלה' }, { status: 500 });
  }

  // 3) Link user to clinic as CLINIC_ADMIN
  const { error: linkError } = await supabase
    .from('clinic_users')
    .insert({
      user_id: authUser.user.id,
      clinic_id: clinic.id,
      role: 'CLINIC_ADMIN',
    });

  if (linkError) {
    await supabase.from('clinics').delete().eq('id', clinic.id);
    await supabase.auth.admin.deleteUser(authUser.user.id);
    return NextResponse.json({ error: linkError.message || 'קישור משתמש לעסק נכשל' }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    clinic: { id: clinic.id, name: clinic.name, plan_id: clinic.plan_id, status: clinic.status },
    admin: { id: authUser.user.id, email: authUser.user.email },
    temporary_password: password,
  });
}
