import * as settingsRepo from '@/repositories/settings.repository';
import type { ClinicSettings } from '@/repositories/settings.repository';

export type { ClinicSettings };

/**
 * Returns clinic settings merged with defaults.
 * Never throws — falls back to DEFAULT_SETTINGS if no row exists yet.
 */
export async function getClinicSettings(clinicId: string): Promise<ClinicSettings> {
  const { data } = await settingsRepo.getClinicSettings(clinicId);
  return {
    clinic_id: clinicId,
    ...settingsRepo.DEFAULT_SETTINGS,
    ...(data ?? {}),
  };
}

/**
 * Persists a partial settings update for the given clinic.
 * Uses upsert so clinics without a settings row get one created.
 */
export async function updateClinicSettings(
  clinicId: string,
  updates: Partial<Omit<ClinicSettings, 'clinic_id' | 'created_at' | 'updated_at'>>,
) {
  return settingsRepo.upsertClinicSettings(clinicId, updates);
}
