/**
 * Anthropic Claude provider. Uses model from ai_models config.
 * Env: ANTHROPIC_API_KEY
 */

import Anthropic from '@anthropic-ai/sdk';

export interface AnthropicConfig {
  model: string;
  temperature?: number;
  maxTokens?: number;
}

export async function generateWithAnthropic(
  prompt: string,
  config: AnthropicConfig
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set');

  const anthropic = new Anthropic({ apiKey });
  const message = await anthropic.messages.create({
    model: config.model,
    max_tokens: config.maxTokens ?? 1024,
    temperature: config.temperature ?? 0.7,
    messages: [{ role: 'user', content: prompt }],
  });

  const block = message.content.find((b) => b.type === 'text');
  return block && block.type === 'text' ? block.text : '';
}
