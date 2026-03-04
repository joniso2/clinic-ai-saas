/**
 * GET  /api/super-admin/ai-persona?clinic_id=...
 * PATCH /api/super-admin/ai-persona  (body: { clinic_id, ...aiPersonaFields })
 *
 * Manages the AI Persona & Behavior configuration per clinic.
 * Only Super Admins may access this endpoint.
 */

import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth-server';
import { createClient } from '@/lib/supabase-server';

const AI_PERSONA_FIELDS = [
  'ai_tone',
  'ai_response_length',
  'strict_hours_enforcement',
  'business_description',
  'industry_type',
  'conversation_strategy',
  'custom_prompt_override',
] as const;

const VALID_TONES               = ['formal', 'friendly', 'professional'] as const;
const VALID_LENGTHS             = ['brief', 'standard', 'detailed'] as const;
const VALID_INDUSTRY_TYPES      = ['medical', 'legal', 'general_business'] as const;
const VALID_STRATEGIES          = ['consultative', 'direct', 'educational'] as const;

type SelectField = typeof AI_PERSONA_FIELDS[number];

export async function GET(req: Request) {
  const user = await requireSuperAdmin();
  if (!user) return NextResponse.json({ error: 'Super Admin required' }, { status: 403 });

  const clinicId = new URL(req.url).searchParams.get('clinic_id')?.trim();
  if (!clinicId) return NextResponse.json({ error: 'clinic_id required' }, { status: 400 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('clinic_settings')
    .select(AI_PERSONA_FIELDS.join(', '))
    .eq('clinic_id', clinicId)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(
    data ?? {
      ai_tone: 'professional',
      ai_response_length: 'standard',
      strict_hours_enforcement: true,
      business_description: null,
      industry_type: 'general_business',
      conversation_strategy: 'consultative',
      custom_prompt_override: null,
    },
  );
}

export async function PATCH(req: Request) {
  const user = await requireSuperAdmin();
  if (!user) return NextResponse.json({ error: 'Super Admin required' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const { clinic_id } = body as { clinic_id?: string };
  if (!clinic_id) return NextResponse.json({ error: 'clinic_id required' }, { status: 400 });

  // Validate enum fields
  if (body.ai_tone && !VALID_TONES.includes(body.ai_tone)) {
    return NextResponse.json({ error: `ai_tone must be one of: ${VALID_TONES.join(', ')}` }, { status: 400 });
  }
  if (body.ai_response_length && !VALID_LENGTHS.includes(body.ai_response_length)) {
    return NextResponse.json({ error: `ai_response_length must be one of: ${VALID_LENGTHS.join(', ')}` }, { status: 400 });
  }
  if (body.industry_type && !VALID_INDUSTRY_TYPES.includes(body.industry_type)) {
    return NextResponse.json({ error: `industry_type must be one of: ${VALID_INDUSTRY_TYPES.join(', ')}` }, { status: 400 });
  }
  if (body.conversation_strategy && !VALID_STRATEGIES.includes(body.conversation_strategy)) {
    return NextResponse.json({ error: `conversation_strategy must be one of: ${VALID_STRATEGIES.join(', ')}` }, { status: 400 });
  }

  // Build update payload from whitelisted fields only
  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const field of AI_PERSONA_FIELDS as readonly SelectField[]) {
    if (field in body) payload[field] = body[field] ?? null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('clinic_settings')
    .upsert(
      { clinic_id, ...payload },
      { onConflict: 'clinic_id' },
    )
    .select(AI_PERSONA_FIELDS.join(', '))
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
