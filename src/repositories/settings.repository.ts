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
  role: string;
};

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
      const { data: authUser } = await supabase.auth.admin.getUserById(row.user_id);
      members.push({
        user_id: row.user_id,
        email: authUser?.user?.email ?? '—',
        role: row.role ?? 'member',
      });
    } catch {
      members.push({ user_id: row.user_id, email: '—', role: row.role ?? 'member' });
    }
  }
  return members;
}

export async function inviteTeamMember(clinicId: string, email: string, role: string) {
  const supabase = getAdminClient();
  const { data, error } = await supabase.auth.admin.inviteUserByEmail(email);
  if (error || !data?.user) return { error: error ?? new Error('Invite failed') };

  const { error: insertError } = await supabase
    .from('clinic_users')
    .insert({ clinic_id: clinicId, user_id: data.user.id, role });

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

export async function updateTeamMemberRole(clinicId: string, userId: string, role: string) {
  const supabase = getAdminClient();
  const { error } = await supabase
    .from('clinic_users')
    .update({ role })
    .eq('clinic_id', clinicId)
    .eq('user_id', userId);
  return { error };
}
