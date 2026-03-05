'use server';

import { requireSuperAdmin } from '@/lib/auth-server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export type BookingSiteServicesResult = { ok: true; services: Array<{ id: string; clinic_id: string; service_name: string; price: number; duration_minutes: number; description?: string | null; is_active: boolean }> } | { ok: false; error: string };

export async function loadBookingSiteServices(clinicId: string): Promise<BookingSiteServicesResult> {
  const user = await requireSuperAdmin();
  if (!user) return { ok: false, error: 'Forbidden' };
  if (!clinicId?.trim()) return { ok: false, error: 'clinic_id required' };

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('clinic_services')
    .select('id, clinic_id, service_name, price, duration_minutes, is_active')
    .eq('clinic_id', clinicId.trim())
    .order('service_name');

  if (error) return { ok: false, error: error.message };
  return { ok: true, services: data ?? [] };
}
