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
 * When conversationHistory is provided, the model sees the thread and avoids repeating questions.
 */
export async function runStructuredPrompt(params: {
  text: string;
  authorName?: string;
  channelName?: string;
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
}): Promise<LeadExtractionResult> {
  if (!process.env.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY is not configured.');
    return { is_new_lead: false, reply: 'AI not configured.' };
  }

  const { text, authorName, channelName, conversationHistory = [] } = params;

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: 'system', content: discordSystemPrompt },
  ];

  for (const m of conversationHistory) {
    if (m.role === 'user') {
      messages.push({ role: 'user', content: m.content });
    } else {
      messages.push({ role: 'assistant', content: m.content });
    }
  }

  messages.push({
    role: 'user',
    content: JSON.stringify({
      message_text: text,
      author_name: authorName ?? null,
      channel_name: channelName ?? null,
    }),
  });

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    messages,
  });

  const raw = response.choices[0]?.message?.content ?? '{}';

  try {
    return JSON.parse(raw) as LeadExtractionResult;
  } catch (err) {
    console.error('AI JSON parse failed:', err, raw);
    return { is_new_lead: false, reply: DEFAULT_REPLY };
  }
}
