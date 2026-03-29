import { createClient } from '@supabase/supabase-js';
import type { Appointment, AppointmentType } from '@/types/appointments';

function getSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase server environment variables are not configured.');
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
}

export type CreateAppointmentPayload = {
  clinic_id: string;
  patient_name: string;
  datetime: string; // ISO with timezone, e.g. "2026-02-27T10:00:00+02:00"
  type: AppointmentType;
  lead_id?: string | null;
  patient_id?: string | null;
  status?: 'scheduled' | 'completed' | 'cancelled';
  revenue?: number | null;
  service_name?: string | null;
  duration_minutes?: number;
  notes?: string | null;
  // Intelligence fields
  appointment_summary?: string | null;
  urgency_level?: 'low' | 'medium' | 'high' | null;
  priority_level?: 'low' | 'medium' | 'high' | null;
};

/** Fetch all appointments for a given month (1-indexed month). */
export async function getAppointmentsByMonth(
  clinicId: string,
  year: number,
  month: number,
): Promise<{ data: Appointment[] | null; error: unknown }> {
  const supabase = getSupabaseAdminClient();
  const start = new Date(Date.UTC(year, month - 1, 1)).toISOString();
  const end   = new Date(Date.UTC(year, month, 1)).toISOString();

  const { data, error } = await supabase
    .from('appointments')
    .select('id, clinic_id, patient_name, datetime, type, created_at, lead_id, service_name')
    .eq('clinic_id', clinicId)
    .gte('datetime', start)
    .lt('datetime', end)
    .order('datetime', { ascending: true });

  if (error) return { data: null, error };
  const rows = (data ?? []) as (Omit<Appointment, 'duration_minutes'> & { duration_minutes?: number })[];
  return { data: rows.map((r) => ({ ...r, duration_minutes: r.duration_minutes ?? 30 })) as Appointment[], error: null };
}

/** Fetch appointments in an arbitrary UTC range (for availability checks). */
export async function getAppointmentsInRange(
  clinicId: string,
  startIso: string,
  endIso: string,
): Promise<{ data: Appointment[] | null; error: unknown }> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from('appointments')
    .select('id, clinic_id, patient_name, datetime, type, created_at, lead_id, service_name')
    .eq('clinic_id', clinicId)
    .eq('status', 'scheduled')
    .gte('datetime', startIso)
    .lt('datetime', endIso)
    .order('datetime', { ascending: true });

  if (error) return { data: null, error };
  const rows = (data ?? []) as (Omit<Appointment, 'duration_minutes'> & { duration_minutes?: number })[];
  return { data: rows.map((r) => ({ ...r, duration_minutes: r.duration_minutes ?? 30 })) as Appointment[], error: null };
}

/** Get the most recent appointment for a patient (for follow-up validation). */
export async function getLastAppointmentForPatient(
  clinicId: string,
  patientName: string,
): Promise<{ data: Appointment | null; error: unknown }> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from('appointments')
    .select('id, clinic_id, patient_name, datetime, type, created_at, lead_id, service_name')
    .eq('clinic_id', clinicId)
    .ilike('patient_name', patientName.trim())
    .order('datetime', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return { data: null, error };
  const row = data as ((Omit<Appointment, 'duration_minutes'> & { duration_minutes?: number }) | null);
  return { data: row ? ({ ...row, duration_minutes: row.duration_minutes ?? 30 } as Appointment) : null, error: null };
}

/** Insert a new appointment row. */
export async function createAppointment(
  payload: CreateAppointmentPayload,
): Promise<{ data: Appointment | null; error: unknown }> {
  const supabase = getSupabaseAdminClient();
  const insertPayload: Record<string, unknown> = { ...payload };
  if (payload.patient_id !== undefined) insertPayload.patient_id = payload.patient_id;
  if (payload.status !== undefined) insertPayload.status = payload.status;
  if (payload.revenue !== undefined) insertPayload.revenue = payload.revenue;
  if (payload.service_name !== undefined) insertPayload.service_name = payload.service_name;
  if (payload.notes !== undefined) insertPayload.notes = payload.notes;
  insertPayload.duration_minutes = payload.duration_minutes ?? 30;
  const { data, error } = await supabase
    .from('appointments')
    .insert(insertPayload)
    .select('id, clinic_id, patient_name, datetime, type, created_at, lead_id, duration_minutes, appointment_summary, urgency_level, priority_level')
    .single();

  if (error) return { data: null, error };
  return { data: data as Appointment, error: null };
}

export type CompletedAppointmentRow = {
  id: string;
  datetime: string;
  service_name: string | null;
  revenue: number | null;
  notes: string | null;
};

/** Fetch completed appointments for a patient (for customer timeline). */
export async function getCompletedAppointmentsByPatientId(
  patientId: string,
  clinicId: string,
): Promise<{ data: CompletedAppointmentRow[]; error: unknown }> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from('appointments')
    .select('id, datetime, service_name, revenue, notes')
    .eq('patient_id', patientId)
    .eq('clinic_id', clinicId)
    .eq('status', 'completed')
    .order('datetime', { ascending: false });
  if (error) return { data: [], error };
  return { data: (data ?? []) as CompletedAppointmentRow[], error: null };
}

/** Check if a completed appointment already exists for a lead (duplicate protection). */
export async function getCompletedAppointmentsByLeadId(
  leadId: string,
  clinicId: string,
): Promise<{ data: CompletedAppointmentRow[]; error: unknown }> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from('appointments')
    .select('id, datetime, service_name, revenue, notes')
    .eq('lead_id', leadId)
    .eq('clinic_id', clinicId)
    .eq('status', 'completed')
    .limit(1);
  if (error) return { data: [], error };
  return { data: (data ?? []) as CompletedAppointmentRow[], error: null };
}

/** Delete an appointment by id + clinicId (ownership check). Returns the deleted row's lead_id if any. */
export async function deleteAppointment(
  id: string,
  clinicId: string,
): Promise<{ data: { lead_id: string | null } | null; error: unknown }> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from('appointments')
    .delete()
    .eq('id', id)
    .eq('clinic_id', clinicId)
    .select('lead_id')
    .maybeSingle();
  if (error) return { data: null, error };
  return { data: data as { lead_id: string | null } | null, error: null };
}

/** Update appointment datetime, duration_minutes, and/or status. */
export async function updateAppointment(
  id: string,
  clinicId: string,
  updates: { datetime?: string; duration_minutes?: number; status?: string },
): Promise<{ data: Appointment | null; error: unknown }> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from('appointments')
    .update(updates)
    .eq('id', id)
    .eq('clinic_id', clinicId)
    .select('id, clinic_id, patient_name, datetime, type, created_at, lead_id, duration_minutes, appointment_summary, urgency_level, priority_level')
    .single();
  if (error) return { data: null, error };
  return { data: data as Appointment, error: null };
}

/** Delete all appointments linked to a lead (used when updating/clearing lead follow-up). */
export async function deleteAppointmentsByLeadId(
  leadId: string,
  clinicId: string,
): Promise<{ error: unknown }> {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from('appointments')
    .delete()
    .eq('lead_id', leadId)
    .eq('clinic_id', clinicId);
  return { error: error ?? null };
}

// ─── Enriched Patient Queries ───────────────────────────────────────────────

/** Next future scheduled appointment for a patient. Tries patient_id first; falls back to lead_id. */
export async function getNextAppointmentForPatient(
  clinicId: string,
  patientId: string | null,
  leadId: string | null,
): Promise<{ datetime: string; service_name: string | null } | null> {
  const supabase = getSupabaseAdminClient();

  function buildQuery(key: 'patient_id' | 'lead_id', value: string) {
    return supabase
      .from('appointments')
      .select('datetime, service_name')
      .eq('clinic_id', clinicId)
      .eq('status', 'scheduled')
      .gt('datetime', new Date().toISOString())
      .eq(key, value)
      .order('datetime', { ascending: true })
      .limit(1)
      .maybeSingle();
  }

  // Try patient_id first
  if (patientId) {
    const { data } = await buildQuery('patient_id', patientId);
    if (data) return data as { datetime: string; service_name: string | null };
  }
  // Fallback to lead_id (appointments created before backfill)
  if (leadId) {
    const { data } = await buildQuery('lead_id', leadId);
    if (data) return data as { datetime: string; service_name: string | null };
  }
  return null;
}

/** Appointment counts by status for a patient. Source for cancellation risk calculation.
 *  Merges results from patient_id and lead_id to cover un-backfilled appointments. */
export async function getAppointmentStatsForPatient(
  clinicId: string,
  patientId: string | null,
  leadId: string | null,
): Promise<{ total: number; completed: number; cancelled: number; noShow: number }> {
  const empty = { total: 0, completed: 0, cancelled: 0, noShow: 0 };
  const supabase = getSupabaseAdminClient();

  // Collect appointment IDs to deduplicate across both queries
  const seen = new Set<string>();
  const allRows: { id: string; status: string }[] = [];

  if (patientId) {
    const { data } = await supabase
      .from('appointments').select('id, status')
      .eq('clinic_id', clinicId).eq('patient_id', patientId);
    for (const r of (data ?? []) as { id: string; status: string }[]) {
      seen.add(r.id);
      allRows.push(r);
    }
  }
  if (leadId) {
    const { data } = await supabase
      .from('appointments').select('id, status')
      .eq('clinic_id', clinicId).eq('lead_id', leadId);
    for (const r of (data ?? []) as { id: string; status: string }[]) {
      if (!seen.has(r.id)) { seen.add(r.id); allRows.push(r); }
    }
  }

  if (allRows.length === 0) return empty;
  return {
    total: allRows.length,
    completed: allRows.filter((r) => r.status === 'completed').length,
    cancelled: allRows.filter((r) => r.status === 'cancelled').length,
    noShow: allRows.filter((r) => r.status === 'no_show').length,
  };
}

/** Most frequent service_name from completed appointments (primary treatment).
 *  Merges patient_id and lead_id results. */
export async function getPrimaryTreatmentForPatient(
  clinicId: string,
  patientId: string | null,
  leadId: string | null,
): Promise<string | null> {
  const supabase = getSupabaseAdminClient();
  const seen = new Set<string>();
  const allNames: string[] = [];

  async function query(key: 'patient_id' | 'lead_id', value: string) {
    const { data } = await supabase
      .from('appointments').select('id, service_name')
      .eq('clinic_id', clinicId).eq('status', 'completed')
      .not('service_name', 'is', null).eq(key, value);
    for (const r of (data ?? []) as { id: string; service_name: string }[]) {
      if (!seen.has(r.id)) { seen.add(r.id); allNames.push(r.service_name); }
    }
  }

  if (patientId) await query('patient_id', patientId);
  if (leadId) await query('lead_id', leadId);
  if (allNames.length === 0) return null;

  const counts = new Map<string, number>();
  for (const name of allNames) counts.set(name, (counts.get(name) ?? 0) + 1);
  let best: string | null = null;
  let bestCount = 0;
  for (const [name, count] of counts) {
    if (count > bestCount) { best = name; bestCount = count; }
  }
  return best;
}

/** Backfill patient_id on appointments that only have lead_id. Called during lead→patient conversion only. */
export async function backfillPatientIdForLead(
  clinicId: string,
  leadId: string,
  patientId: string,
): Promise<{ count: number; error: unknown }> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from('appointments')
    .update({ patient_id: patientId })
    .eq('clinic_id', clinicId)
    .eq('lead_id', leadId)
    .is('patient_id', null)
    .select('id');
  if (error) return { count: 0, error };
  return { count: (data ?? []).length, error: null };
}
