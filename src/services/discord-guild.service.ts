import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase server env not configured');
  return createClient(url, key, { auth: { persistSession: false } });
}

/**
 * Get clinic name by id (for prompt personalization).
 */
export async function getClinicName(clinicId: string): Promise<string | null> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase.from('clinics').select('name').eq('id', clinicId).maybeSingle();
  return (data as { name: string | null } | null)?.name ?? null;
}

/**
 * Resolve clinic_id from Discord guild_id.
 * Returns null if guild_id is null/empty or not found in discord_guilds.
 */
export async function getClinicIdByGuildId(guildId: string | null | undefined): Promise<string | null> {
  if (!guildId || typeof guildId !== 'string' || !guildId.trim()) return null;
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from('discord_guilds')
    .select('clinic_id')
    .eq('guild_id', guildId.trim())
    .maybeSingle();
  return (data as { clinic_id: string } | null)?.clinic_id ?? null;
}

export type ClinicServiceForPrompt = {
  service_name: string;
  price: number;
  aliases: string[];
};

/**
 * Fetch active clinic_services for a clinic (for LLM prompt and deal value).
 */
export async function getClinicServicesForClinic(clinicId: string): Promise<ClinicServiceForPrompt[]> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from('clinic_services')
    .select('service_name, price, aliases')
    .eq('clinic_id', clinicId)
    .eq('is_active', true);
  return (data ?? []) as ClinicServiceForPrompt[];
}

/**
 * Build the pricing block string for the system prompt (Hebrew format).
 * Injected into Discord LLM so bot uses latest clinic_services.
 */
export function buildPricingBlock(services: ClinicServiceForPrompt[]): string {
  if (services.length === 0) return '';
  const lines = services.map((s) => {
    const name = (s.service_name ?? '').trim();
    const price = Number(s.price);
    return `${name}: ${price} ₪`;
  });
  return 'שירותי המרפאה והמחירים:\n\n' + lines.join('\n\n');
}

/**
 * Estimate deal value from interest text by matching to clinic services (name or aliases).
 */
export function estimateDealValueFromServices(
  interest: string | null | undefined,
  services: ClinicServiceForPrompt[],
): number | null {
  if (!interest || typeof interest !== 'string' || services.length === 0) return null;
  const normalized = interest.toLowerCase().trim();
  if (!normalized) return null;
  for (const s of services) {
    const name = (s.service_name ?? '').toLowerCase();
    const aliases = (s.aliases ?? []).map((a) => String(a).toLowerCase());
    if (name && normalized.includes(name)) return s.price;
    if (aliases.some((a) => a && (normalized.includes(a) || normalized === a))) return s.price;
  }
  return null;
}
