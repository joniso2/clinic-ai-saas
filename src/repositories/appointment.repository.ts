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
    .select('id, clinic_id, patient_name, datetime, type, created_at')
    .eq('clinic_id', clinicId)
    .gte('datetime', start)
    .lt('datetime', end)
    .order('datetime', { ascending: true });

  if (error) return { data: null, error };
  return { data: (data ?? []) as Appointment[], error: null };
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
    .select('id, clinic_id, patient_name, datetime, type, created_at')
    .eq('clinic_id', clinicId)
    .gte('datetime', startIso)
    .lt('datetime', endIso)
    .order('datetime', { ascending: true });

  if (error) return { data: null, error };
  return { data: (data ?? []) as Appointment[], error: null };
}

/** Get the most recent appointment for a patient (for follow-up validation). */
export async function getLastAppointmentForPatient(
  clinicId: string,
  patientName: string,
): Promise<{ data: Appointment | null; error: unknown }> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from('appointments')
    .select('id, clinic_id, patient_name, datetime, type, created_at')
    .eq('clinic_id', clinicId)
    .ilike('patient_name', patientName.trim())
    .order('datetime', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return { data: null, error };
  return { data: data as Appointment | null, error: null };
}

/** Insert a new appointment row. */
export async function createAppointment(
  payload: CreateAppointmentPayload,
): Promise<{ data: Appointment | null; error: unknown }> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from('appointments')
    .insert(payload)
    .select('id, clinic_id, patient_name, datetime, type, created_at')
    .single();

  if (error) return { data: null, error };
  return { data: data as Appointment, error: null };
}

/** Delete an appointment by id + clinicId (ownership check). */
export async function deleteAppointment(
  id: string,
  clinicId: string,
): Promise<{ error: unknown }> {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from('appointments')
    .delete()
    .eq('id', id)
    .eq('clinic_id', clinicId);
  return { error: error ?? null };
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
