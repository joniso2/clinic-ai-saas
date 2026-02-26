import OpenAI from 'openai';
import { discordSystemPrompt } from '@/prompts/discord.prompt';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export type LeadExtractionResult = {
  is_new_lead: boolean;
  full_name?: string | null;
  phone?: string | null;
  email?: string | null;
  interest?: string | null;
  reply?: string;
};

const DEFAULT_REPLY = 'תודה. הצוות שלנו ייצור איתך קשר בהקדם.';

/**
 * Runs the Discord lead-extraction prompt (structured JSON).
 * Single entry point for Discord AI behavior.
 */
export async function runStructuredPrompt(params: {
  text: string;
  authorName?: string;
  channelName?: string;
}): Promise<LeadExtractionResult> {
  if (!process.env.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY is not configured.');
    return { is_new_lead: false, reply: 'AI not configured.' };
  }

  const { text, authorName, channelName } = params;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: discordSystemPrompt },
      {
        role: 'user',
        content: JSON.stringify({
          message_text: text,
          author_name: authorName ?? null,
          channel_name: channelName ?? null,
        }),
      },
    ],
  });

  const raw = response.choices[0]?.message?.content ?? '{}';

  try {
    return JSON.parse(raw) as LeadExtractionResult;
  } catch (err) {
    console.error('AI JSON parse failed:', err, raw);
    return { is_new_lead: false, reply: DEFAULT_REPLY };
  }
}
