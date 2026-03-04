/**
 * GET /api/super-admin/ai-models/status
 * Returns each clinic's current LLM (provider + model) and whether that provider's API key is set (up/down).
 * Used by AI Control Center to show "which clinic is on what LLM" and if the bot will work.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireSuperAdmin } from '@/lib/auth-server';

const PROVIDER_KEYS: Record<string, string> = {
  google: 'GEMINI_API_KEY',
  openai: 'OPENAI_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY',
};

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase server env not configured');
  return createClient(url, key, { auth: { persistSession: false } });
}

export type ClinicLLMStatus = {
  clinic_id: string;
  clinic_name: string | null;
  provider: string;
  model: string;
  status: 'up' | 'down';
};

export async function GET() {
  const user = await requireSuperAdmin();
  if (!user) return NextResponse.json({ error: 'Super Admin required' }, { status: 403 });

  const supabase = getSupabaseAdmin();
  const { data: clinics, error: clinicsError } = await supabase
    .from('clinics')
    .select('id, name')
    .order('name');

  if (clinicsError) return NextResponse.json({ error: clinicsError.message }, { status: 500 });
  const clinicList = clinics ?? [];

  const { data: aiRows, error: aiError } = await supabase
    .from('ai_models')
    .select('clinic_id, provider, model');

  if (aiError) return NextResponse.json({ error: aiError.message }, { status: 500 });
  const byClinic = new Map<string, { provider: string; model: string }>();
  for (const row of aiRows ?? []) {
    byClinic.set(row.clinic_id, { provider: row.provider ?? 'google', model: row.model ?? 'gemini-1.5-flash' });
  }

  const results: ClinicLLMStatus[] = clinicList.map((c) => {
    const config = byClinic.get(c.id) ?? { provider: 'google', model: 'gemini-1.5-flash' };
    const envKey = PROVIDER_KEYS[config.provider];
    const keySet = !!process.env[envKey];
    return {
      clinic_id: c.id,
      clinic_name: (c as { name?: string | null }).name ?? null,
      provider: config.provider,
      model: config.model,
      status: keySet ? 'up' : 'down',
    };
  });

  return NextResponse.json({ clinics: results });
}
