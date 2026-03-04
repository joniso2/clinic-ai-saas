/**
 * OpenAI provider. Uses model from ai_models config.
 * Env: OPENAI_API_KEY
 */

import OpenAI from 'openai';

export interface OpenAIConfig {
  model: string;
  temperature?: number;
  maxTokens?: number;
}

export async function generateWithOpenAI(
  prompt: string,
  config: OpenAIConfig
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY is not set');

  const openai = new OpenAI({ apiKey });
  const completion = await openai.chat.completions.create({
    model: config.model,
    messages: [{ role: 'user', content: prompt }],
    temperature: config.temperature ?? 0.7,
    max_tokens: config.maxTokens ?? 1024,
  });

  const content = completion.choices[0]?.message?.content;
  return content ?? '';
}
