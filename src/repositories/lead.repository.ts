import { createClient } from '@supabase/supabase-js';

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

export type CreateLeadPayload = {
  clinic_id: string;
  full_name: string;
  phone?: string | null;
  email?: string | null;
  interest?: string | null;
  status?: string;
};

export type LeadRow = {
  id: string;
  clinic_id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  interest: string | null;
  status: string | null;
  created_at: string;
  next_follow_up_date?: string | null;
};

export async function createLead(payload: CreateLeadPayload): Promise<{
  data: LeadRow | null;
  error: unknown;
}> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from('leads')
    .insert({
      clinic_id: payload.clinic_id,
      full_name: payload.full_name,
      phone: payload.phone ?? null,
      email: payload.email ?? null,
      interest: payload.interest ?? null,
      status: payload.status ?? 'New',
    })
    .select('id, clinic_id, full_name, phone, email, interest, status, created_at')
    .single();

  if (error) return { data: null, error };
  return { data: data as LeadRow, error: null };
}

export async function getLeadsByClinicId(clinicId: string): Promise<{
  data: LeadRow[] | null;
  error: unknown;
}> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from('leads')
    .select('id, full_name, email, phone, interest, status, created_at, next_follow_up_date')
    .eq('clinic_id', clinicId)
    .order('created_at', { ascending: false });

  if (error) return { data: null, error };
  return { data: (data ?? []) as LeadRow[], error: null };
}

/** Find first lead for clinic by full name (case-insensitive). */
export async function getLeadByClinicAndName(
  clinicId: string,
  fullName: string,
): Promise<{ data: LeadRow | null; error: unknown }> {
  const supabase = getSupabaseAdminClient();
  const name = fullName.trim();
  if (!name) return { data: null, error: null };
  const { data, error } = await supabase
    .from('leads')
    .select('id, clinic_id, full_name, phone, email, interest, status, created_at, next_follow_up_date')
    .eq('clinic_id', clinicId)
    .ilike('full_name', name)
    .limit(1)
    .maybeSingle();
  if (error) return { data: null, error };
  return { data: data as LeadRow | null, error: null };
}

export async function getLeadById(
  leadId: string,
  clinicId: string
): Promise<{ data: LeadRow | null; error: unknown }> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from('leads')
    .select('id, full_name, email, phone, interest, status, created_at, next_follow_up_date')
    .eq('id', leadId)
    .eq('clinic_id', clinicId)
    .maybeSingle();
  if (error) return { data: null, error };
  return { data: data as LeadRow | null, error: null };
}

export async function updateLead(
  id: string,
  clinicId: string,
  data: Partial<Pick<LeadRow, 'full_name' | 'phone' | 'email' | 'interest' | 'status' | 'next_follow_up_date'>>
): Promise<{ error: unknown }> {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from('leads')
    .update(data)
    .eq('id', id)
    .eq('clinic_id', clinicId);
  return { error: error ?? null };
}

export async function deleteLead(id: string, clinicId: string): Promise<{ error: unknown }> {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from('leads').delete().eq('id', id).eq('clinic_id', clinicId);
  return { error: error ?? null };
}
