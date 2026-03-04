/**
 * GET  /api/super-admin/ai-models?clinic_id=...
 * PATCH /api/super-admin/ai-models (body: clinic_id, provider?, model?, temperature?, max_tokens?)
 *
 * Saved settings apply immediately: the Discord bot reads ai_models on every message (no cache),
 * so the chosen clinic's LLM (provider + model) is used for the next bot reply.
 */

import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth-server';
import { createClient } from '@/lib/supabase-server';

const PROVIDERS = ['openai', 'google', 'anthropic'] as const;
const DEFAULT_MODELS: Record<string, string> = { openai: 'gpt-4o-mini', google: 'gemini-1.5-flash', anthropic: 'claude-3-haiku' };

export async function GET(req: Request) {
  const user = await requireSuperAdmin();
  if (!user) return NextResponse.json({ error: 'Super Admin required' }, { status: 403 });

  const clinicId = new URL(req.url).searchParams.get('clinic_id')?.trim();
  if (!clinicId) return NextResponse.json({ error: 'clinic_id required' }, { status: 400 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('ai_models')
    .select('id, clinic_id, provider, model, temperature, max_tokens, is_default, updated_at')
    .eq('clinic_id', clinicId)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (data) return NextResponse.json(data);
  return NextResponse.json({
    clinic_id: clinicId,
    provider: 'google',
    model: 'gemini-1.5-flash',
    temperature: 0.7,
    max_tokens: 1024,
    is_default: true,
  });
}

export async function PATCH(req: Request) {
  const user = await requireSuperAdmin();
  if (!user) return NextResponse.json({ error: 'Super Admin required' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const { clinic_id, provider, model, temperature, max_tokens } = body;
  if (!clinic_id) return NextResponse.json({ error: 'clinic_id required' }, { status: 400 });

  if (provider && !PROVIDERS.includes(provider)) {
    return NextResponse.json({ error: 'provider must be one of: openai, google, anthropic' }, { status: 400 });
  }

  const supabase = await createClient();
  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (provider !== undefined) payload.provider = provider;
  if (model !== undefined) payload.model = model;
  if (temperature !== undefined) payload.temperature = Number(temperature);
  if (max_tokens !== undefined) payload.max_tokens = Number(max_tokens);

  const { data: existing } = await supabase.from('ai_models').select('id').eq('clinic_id', clinic_id).maybeSingle();
  let result;
  if (existing) {
    const { data, error } = await supabase.from('ai_models').update(payload).eq('id', existing.id).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    result = data;
  } else {
    const { data, error } = await supabase.from('ai_models').insert({
      clinic_id,
      provider: payload.provider ?? 'google',
      model: payload.model ?? DEFAULT_MODELS.google,
      temperature: payload.temperature ?? 0.7,
      max_tokens: payload.max_tokens ?? 1024,
      is_default: true,
      ...payload,
    }).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    result = data;
  }
  return NextResponse.json(result);
}
