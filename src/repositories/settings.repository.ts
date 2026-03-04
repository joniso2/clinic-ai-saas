import { createClient } from '@supabase/supabase-js';

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase admin env vars not configured.');
  return createClient(url, key, { auth: { persistSession: false } });
}

export type WorkingHoursDay = {
  day: number;       // 0 = Sunday … 6 = Saturday
  enabled: boolean;
  open: string;      // "HH:mm"
  close: string;     // "HH:mm"
};

export type BreakSlot = {
  start: string;     // "HH:mm"
  end: string;       // "HH:mm"
  label?: string;
};

export type ClinicSettings = {
  clinic_id: string;
  // General
  clinic_phone: string | null;
  address: string | null;
  timezone: string;
  currency: string;
  logo_url: string | null;
  business_description: string | null;
  // Scheduling
  working_hours: WorkingHoursDay[];
  slot_minutes: number;
  buffer_minutes: number;
  max_appointments_per_day: number | null;
  min_booking_notice_hours: number;
  max_booking_window_days: number;
  break_slots: BreakSlot[];
  // Automation
  require_phone_before_booking: boolean;
  auto_create_lead_on_first_message: boolean;
  sla_target_minutes: number;
  auto_mark_contacted: boolean;
  // AI Behavior
  ai_tone: 'formal' | 'friendly' | 'professional';
  ai_response_length: 'brief' | 'standard' | 'detailed';
  strict_hours_enforcement: boolean;
  // AI Persona
  industry_type: 'medical' | 'legal' | 'general_business';
  conversation_strategy: 'consultative' | 'direct' | 'educational';
  custom_prompt_override: string | null;
  // Timestamps
  created_at?: string;
  updated_at?: string;
};

export const DEFAULT_SETTINGS: Omit<ClinicSettings, 'clinic_id' | 'created_at' | 'updated_at'> = {
  clinic_phone: null,
  address: null,
  timezone: 'Asia/Jerusalem',
  currency: 'ILS',
  logo_url: null,
  business_description: null,
  working_hours: [
    { day: 0, enabled: false, open: '08:00', close: '16:00' },
    { day: 1, enabled: true,  open: '08:00', close: '16:00' },
    { day: 2, enabled: true,  open: '08:00', close: '16:00' },
    { day: 3, enabled: true,  open: '08:00', close: '16:00' },
    { day: 4, enabled: true,  open: '08:00', close: '16:00' },
    { day: 5, enabled: true,  open: '08:00', close: '14:00' },
    { day: 6, enabled: false, open: '08:00', close: '16:00' },
  ],
  slot_minutes: 30,
  buffer_minutes: 0,
  max_appointments_per_day: null,
  min_booking_notice_hours: 0,
  max_booking_window_days: 60,
  break_slots: [],
  require_phone_before_booking: true,
  auto_create_lead_on_first_message: false,
  sla_target_minutes: 60,
  auto_mark_contacted: false,
  ai_tone: 'professional',
  ai_response_length: 'standard',
  strict_hours_enforcement: true,
  industry_type: 'general_business',
  conversation_strategy: 'consultative',
  custom_prompt_override: null,
};

export async function getClinicSettings(clinicId: string) {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from('clinic_settings')
    .select('*')
    .eq('clinic_id', clinicId)
    .maybeSingle();
  return { data: data as ClinicSettings | null, error };
}

export async function upsertClinicSettings(
  clinicId: string,
  updates: Partial<Omit<ClinicSettings, 'clinic_id' | 'created_at' | 'updated_at'>>,
) {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from('clinic_settings')
    .upsert(
      { clinic_id: clinicId, ...updates, updated_at: new Date().toISOString() },
      { onConflict: 'clinic_id' },
    )
    .select()
    .single();
  return { data: data as ClinicSettings | null, error };
}

// ─── Team helpers ─────────────────────────────────────────────────────────────

export type TeamMember = {
  user_id: string;
  email: string;
  full_name: string | null;
  role: string;
  job_title: string | null;
  banned_until: string | null;
  last_sign_in_at: string | null;
};

const ROLE_TO_DB: Record<string, 'CLINIC_ADMIN' | 'STAFF'> = {
  מנהל: 'CLINIC_ADMIN',
  רופא: 'STAFF',
  מזכירה: 'STAFF',
  תומך: 'STAFF',
};

export const ROLE_DISPLAY_OPTIONS = ['מנהל', 'רופא', 'מזכירה', 'תומך'] as const;

export function getRoleDisplay(dbRole: string, jobTitle: string | null): string {
  if (dbRole === 'CLINIC_ADMIN') return 'מנהל';
  if (jobTitle && ROLE_DISPLAY_OPTIONS.includes(jobTitle as typeof ROLE_DISPLAY_OPTIONS[number])) return jobTitle;
  return 'צוות';
}

export async function getTeamMembers(clinicId: string): Promise<TeamMember[]> {
  const supabase = getAdminClient();

  const { data: rows } = await supabase
    .from('clinic_users')
    .select('user_id, role')
    .eq('clinic_id', clinicId);

  if (!rows || rows.length === 0) return [];

  const members: TeamMember[] = [];
  for (const row of rows) {
    try {
      const { data: authData } = await supabase.auth.admin.getUserById(row.user_id);
      const u = authData?.user;
      const meta = (u?.user_metadata as { full_name?: string; job_title?: string } | undefined) ?? {};
      members.push({
        user_id: row.user_id,
        email: u?.email ?? '—',
        full_name: meta.full_name ?? null,
        role: row.role ?? 'STAFF',
        job_title: meta.job_title ?? null,
        banned_until: u?.banned_until ?? null,
        last_sign_in_at: u?.last_sign_in_at ?? null,
      });
    } catch {
      members.push({
        user_id: row.user_id,
        email: '—',
        full_name: null,
        role: row.role ?? 'STAFF',
        job_title: null,
        banned_until: null,
        last_sign_in_at: null,
      });
    }
  }
  return members;
}

export async function createTeamMember(params: {
  clinicId: string;
  email: string;
  password: string;
  full_name: string;
  role_display: string;
}): Promise<{ error: Error | null; member: TeamMember | null }> {
  const supabase = getAdminClient();
  const dbRole = ROLE_TO_DB[params.role_display] ?? 'STAFF';
  const jobTitle = params.role_display !== 'מנהל' ? params.role_display : null;

  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email: params.email.trim().toLowerCase(),
    password: params.password,
    email_confirm: true,
    user_metadata: { full_name: params.full_name.trim(), job_title: jobTitle },
  });

  if (authError) {
    if (authError.message.includes('already registered') || authError.message.includes('already exists')) {
      return { error: new Error('האימייל כבר רשום במערכת'), member: null };
    }
    return { error: authError, member: null };
  }

  if (!authUser.user) return { error: new Error('יצירת משתמש נכשלה'), member: null };

  const { error: insertError } = await supabase
    .from('clinic_users')
    .insert({ user_id: authUser.user.id, clinic_id: params.clinicId, role: dbRole });

  if (insertError) {
    await supabase.auth.admin.deleteUser(authUser.user.id);
    return { error: insertError, member: null };
  }

  const member: TeamMember = {
    user_id: authUser.user.id,
    email: authUser.user.email ?? params.email,
    full_name: params.full_name.trim(),
    role: dbRole,
    job_title: jobTitle,
    banned_until: null,
    last_sign_in_at: null,
  };
  return { error: null, member };
}

export async function inviteTeamMember(clinicId: string, email: string, role: string) {
  const supabase = getAdminClient();
  const { data, error } = await supabase.auth.admin.inviteUserByEmail(email);
  if (error || !data?.user) return { error: error ?? new Error('Invite failed') };

  const dbRole = role === 'CLINIC_ADMIN' ? 'CLINIC_ADMIN' : 'STAFF';
  const { error: insertError } = await supabase
    .from('clinic_users')
    .insert({ clinic_id: clinicId, user_id: data.user.id, role: dbRole });

  return { error: insertError ?? null, user: data.user };
}

export async function removeTeamMember(clinicId: string, userId: string) {
  const supabase = getAdminClient();
  const { error } = await supabase
    .from('clinic_users')
    .delete()
    .eq('clinic_id', clinicId)
    .eq('user_id', userId);
  return { error };
}

export async function updateTeamMemberRole(clinicId: string, userId: string, roleDisplay: string) {
  const supabase = getAdminClient();
  const dbRole = ROLE_TO_DB[roleDisplay] ?? 'STAFF';
  const jobTitle = roleDisplay !== 'מנהל' ? roleDisplay : null;

  const { error } = await supabase
    .from('clinic_users')
    .update({ role: dbRole })
    .eq('clinic_id', clinicId)
    .eq('user_id', userId);
  if (error) return { error };

  const { data: u } = await supabase.auth.admin.getUserById(userId);
  const meta = (u?.user?.user_metadata as Record<string, unknown>) ?? {};
  const { error: metaErr } = await supabase.auth.admin.updateUserById(userId, {
    user_metadata: { ...meta, job_title: jobTitle },
  });
  return { error: metaErr ?? null };
}

export async function setTeamMemberBanned(clinicId: string, userId: string, banned: boolean): Promise<{ error: Error | null }> {
  const supabase = getAdminClient();
  const { data: row } = await supabase
    .from('clinic_users')
    .select('user_id')
    .eq('clinic_id', clinicId)
    .eq('user_id', userId)
    .maybeSingle();
  if (!row) return { error: new Error('משתמש לא נמצא בקליניקה זו') };

  const { error } = await supabase.auth.admin.updateUserById(userId, {
    ban_duration: banned ? '876000h' : 'none',
  });
  return { error: error ?? null };
}
