/**
 * AI provider router: loads clinic AI config from ai_models and calls the correct engine.
 */

import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { generateWithGemini } from '@/lib/ai-providers/gemini';
import { generateWithOpenAI } from '@/lib/ai-providers/openai';
import { generateWithAnthropic } from '@/lib/ai-providers/anthropic';

export interface AIConfigRow {
  provider: string;
  model: string;
  temperature: number;
  max_tokens: number;
}

export interface GenerateAIResponseParams {
  clinicId: string;
  message: string;
  conversationContext?: string;
}

/**
 * Load AI configuration for a clinic from ai_models table.
 */
export async function getAIConfig(clinicId: string): Promise<AIConfigRow | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('ai_models')
    .select('provider, model, temperature, max_tokens')
    .eq('clinic_id', clinicId)
    .maybeSingle();

  if (error || !data) return null;
  return {
    provider: data.provider,
    model: data.model,
    temperature: Number(data.temperature) ?? 0.7,
    max_tokens: Number(data.max_tokens) ?? 1024,
  };
}

/**
 * Generate AI response using the clinic's configured provider and model.
 * Flow: load ai_models → route to Gemini / OpenAI / Anthropic.
 */
export async function generateAIResponse(params: GenerateAIResponseParams): Promise<string> {
  const { clinicId, message, conversationContext = '' } = params;

  const aiConfig = await getAIConfig(clinicId);
  if (!aiConfig) {
    console.log('AI Router: No ai_models config for clinic', clinicId, '- skipping AI response');
    return '';
  }

  const { provider, model, temperature, max_tokens } = aiConfig;
  console.log('AI Provider:', provider);
  console.log('AI Model:', model);

  const systemContext = conversationContext
    ? `Context from conversation:\n${conversationContext}\n\n`
    : '';
  const prompt = `${systemContext}User message:\n${message}`;

  try {
    if (provider === 'google') {
      return await generateWithGemini(prompt, { model, temperature, maxTokens: max_tokens });
    }
    if (provider === 'openai') {
      return await generateWithOpenAI(prompt, { model, temperature, maxTokens: max_tokens });
    }
    if (provider === 'anthropic') {
      return await generateWithAnthropic(prompt, { model, temperature, maxTokens: max_tokens });
    }
    console.warn('AI Router: Unknown provider', provider);
    return '';
  } catch (err) {
    console.error('AI Router: Error generating response', { provider, model, error: err });
    throw err;
  }
}
