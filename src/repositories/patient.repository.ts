import { createClient } from '@supabase/supabase-js';
import type { Patient, PatientStatus } from '@/types/patients';
import { normalizePhone } from '@/lib/phone';

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

/** Compute status from last_visit_date (can be overridden manually). */
export function computeStatusFromLastVisit(lastVisit: string | null): PatientStatus {
  if (!lastVisit) return 'active';
  const months = (Date.now() - new Date(lastVisit).getTime()) / (30 * 24 * 60 * 60 * 1000);
  if (months < 6) return 'active';
  if (months <= 12) return 'dormant';
  return 'inactive';
}

export type ListPatientsFilters = {
  status?: PatientStatus | null;
  revenueMin?: number | null;
  lastVisitOlderThanMonths?: number | null;
  search?: string | null;
};

export async function listPatients(
  clinicId: string,
  filters?: ListPatientsFilters
): Promise<{ data: Patient[]; error: unknown }> {
  const supabase = getSupabaseAdminClient();
  let q = supabase
    .from('patients')
    .select('id, clinic_id, lead_id, full_name, phone, total_revenue, visits_count, last_visit_date, status, created_at, updated_at, deleted_at')
    .eq('clinic_id', clinicId)
    .is('deleted_at', null)
    .order('last_visit_date', { ascending: false, nullsFirst: false });

  if (filters?.status) {
    q = q.eq('status', filters.status);
  }
  if (filters?.revenueMin != null && filters.revenueMin > 0) {
    q = q.gte('total_revenue', filters.revenueMin);
  }
  if (filters?.search?.trim()) {
    const term = filters.search.trim().replace(/'/g, "''").replace(/,/g, '');
    const pattern = `%${term}%`;
    q = q.or(`full_name.ilike.${pattern},phone.ilike.${pattern}`);
  }

  const { data, error } = await q;
  if (error) return { data: [], error };

  let rows = (data ?? []) as (Patient & { deleted_at?: string | null })[];
  if (filters?.lastVisitOlderThanMonths != null && filters.lastVisitOlderThanMonths > 0) {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - filters.lastVisitOlderThanMonths);
    const cutoffIso = cutoff.toISOString();
    rows = rows.filter((r) => r.last_visit_date != null && r.last_visit_date < cutoffIso);
  }
  return { data: rows, error: null };
}

export async function getPatientById(
  patientId: string,
  clinicId: string
): Promise<{ data: Patient | null; error: unknown }> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from('patients')
    .select('id, clinic_id, lead_id, full_name, phone, total_revenue, visits_count, last_visit_date, status, created_at, updated_at, deleted_at')
    .eq('id', patientId)
    .eq('clinic_id', clinicId)
    .is('deleted_at', null)
    .maybeSingle();
  if (error) return { data: null, error };
  return { data: data as Patient | null, error: null };
}

export async function findPatientByNormalizedPhone(
  clinicId: string,
  normalizedPhone: string
): Promise<{ data: Patient | null; error: unknown }> {
  if (!normalizedPhone) return { data: null, error: null };
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from('patients')
    .select('id, clinic_id, lead_id, full_name, phone, total_revenue, visits_count, last_visit_date, status, created_at, updated_at, deleted_at')
    .eq('clinic_id', clinicId)
    .eq('phone', normalizedPhone)
    .is('deleted_at', null)
    .limit(1)
    .maybeSingle();
  if (error) return { data: null, error };
  return { data: data as Patient | null, error: null };
}

export type CreatePatientPayload = {
  clinic_id: string;
  lead_id?: string | null;
  full_name: string;
  phone: string;
  total_revenue?: number;
  visits_count?: number;
  last_visit_date?: string | null;
  status?: PatientStatus;
};

export async function createPatient(
  payload: CreatePatientPayload
): Promise<{ data: Patient | null; error: unknown }> {
  const supabase = getSupabaseAdminClient();
  const raw = (payload.phone ?? '').trim();
  const phoneNorm = normalizePhone(payload.phone) || raw;
  const phone = phoneNorm || (payload.lead_id ? `lead-${payload.lead_id}` : 'no-phone');
  const lastVisit = payload.last_visit_date ?? null;
  const status = payload.status ?? computeStatusFromLastVisit(lastVisit);
  const { data, error } = await supabase
    .from('patients')
    .insert({
      clinic_id: payload.clinic_id,
      lead_id: payload.lead_id ?? null,
      full_name: (payload.full_name ?? '').trim() || 'ללא שם',
      phone,
      total_revenue: payload.total_revenue ?? 0,
      visits_count: payload.visits_count ?? 0,
      last_visit_date: lastVisit,
      status,
      updated_at: new Date().toISOString(),
    })
    .select('id, clinic_id, lead_id, full_name, phone, total_revenue, visits_count, last_visit_date, status, created_at, updated_at, deleted_at')
    .single();
  if (error) return { data: null, error };
  return { data: data as Patient, error: null };
}

/** Returns set of normalized phone numbers already in use for the clinic (for import dedup). */
export async function getExistingPatientPhones(clinicId: string): Promise<{ data: Set<string>; error: unknown }> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from('patients')
    .select('phone')
    .eq('clinic_id', clinicId)
    .is('deleted_at', null);
  if (error) return { data: new Set(), error };
  const set = new Set((data ?? []).map((r: { phone?: string }) => normalizePhone(r.phone)));
  return { data: set, error: null };
}

/** Batch insert patients. Skips rows with empty normalized phone. */
export async function createPatientsBatch(
  clinicId: string,
  payloads: CreatePatientPayload[]
): Promise<{ inserted: number; error: unknown }> {
  if (payloads.length === 0) return { inserted: 0, error: null };
  const supabase = getSupabaseAdminClient();
  const rows = payloads.map((p) => {
    const raw = (p.phone ?? '').trim();
    const phoneNorm = normalizePhone(p.phone) || raw;
    const phone = phoneNorm || (p.lead_id ? `lead-${p.lead_id}` : 'no-phone');
    const lastVisit = p.last_visit_date ?? null;
    const status = p.status ?? computeStatusFromLastVisit(lastVisit);
    return {
      clinic_id: clinicId,
      lead_id: p.lead_id ?? null,
      full_name: (p.full_name ?? '').trim() || 'ללא שם',
      phone,
      total_revenue: p.total_revenue ?? 0,
      visits_count: p.visits_count ?? 0,
      last_visit_date: lastVisit,
      status,
      updated_at: new Date().toISOString(),
    };
  }).filter((r) => r.phone && r.phone !== 'no-phone');
  if (rows.length === 0) return { inserted: 0, error: null };
  const { error } = await supabase.from('patients').insert(rows);
  if (error) return { inserted: 0, error };
  return { inserted: rows.length, error: null };
}

export async function updatePatient(
  patientId: string,
  clinicId: string,
  updates: Partial<Pick<Patient, 'full_name' | 'phone' | 'total_revenue' | 'visits_count' | 'last_visit_date' | 'status'>>
): Promise<{ error: unknown }> {
  const supabase = getSupabaseAdminClient();
  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (updates.full_name !== undefined) payload.full_name = updates.full_name.trim();
  if (updates.phone !== undefined) payload.phone = normalizePhone(updates.phone) || updates.phone.trim();
  if (updates.total_revenue !== undefined) payload.total_revenue = updates.total_revenue;
  if (updates.visits_count !== undefined) payload.visits_count = updates.visits_count;
  if (updates.last_visit_date !== undefined) payload.last_visit_date = updates.last_visit_date;
  if (updates.status !== undefined) payload.status = updates.status;
  const { error } = await supabase
    .from('patients')
    .update(payload)
    .eq('id', patientId)
    .eq('clinic_id', clinicId);
  return { error: error ?? null };
}

/** Soft-delete: set deleted_at. */
export async function softDeletePatient(
  patientId: string,
  clinicId: string
): Promise<{ error: unknown }> {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from('patients')
    .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', patientId)
    .eq('clinic_id', clinicId);
  return { error: error ?? null };
}

/** Increment patient stats after a completed visit (revenue + visits + last_visit). */
export async function incrementPatientVisit(
  patientId: string,
  clinicId: string,
  revenue: number,
  visitDate: string
): Promise<{ error: unknown }> {
  const supabase = getSupabaseAdminClient();
  const { data: row, error: fetchErr } = await supabase
    .from('patients')
    .select('total_revenue, visits_count')
    .eq('id', patientId)
    .eq('clinic_id', clinicId)
    .single();
  if (fetchErr || !row) return { error: fetchErr ?? new Error('Patient not found') };
  const newRevenue = (Number(row.total_revenue) || 0) + revenue;
  const newVisits = (Number(row.visits_count) || 0) + 1;
  const status = computeStatusFromLastVisit(visitDate);
  const { error } = await supabase
    .from('patients')
    .update({
      total_revenue: newRevenue,
      visits_count: newVisits,
      last_visit_date: visitDate,
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', patientId)
    .eq('clinic_id', clinicId);
  return { error: error ?? null };
}
