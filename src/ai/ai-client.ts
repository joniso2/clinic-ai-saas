import OpenAI from 'openai';
import { discordSystemPrompt } from '@/prompts/discord.prompt';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export type DiscordAnalysisResult = {
  intent?: 'lead' | 'appointment' | 'question' | 'other';
  // Lead fields
  is_new_lead: boolean;
  full_name?: string | null;
  phone?: string | null;
  email?: string | null;
  interest?: string | null;
  // Appointment fields (only when intent === 'appointment')
  appointment_datetime?: string | null;  // ISO "YYYY-MM-DDTHH:mm:ss" (Israel time, no tz suffix)
  appointment_type?: 'new' | 'follow_up' | null;
  appointment_patient_name?: string | null;
  reply?: string;
  // Intelligence fields
  conversation_summary?:     string | null;
  lead_quality_score?:       number | null;  // 1–100
  urgency_level?:            'low' | 'medium' | 'high' | null;
  priority_level?:           'low' | 'medium' | 'high' | null;
  callback_recommendation?:  string | null;
};

/** @deprecated use DiscordAnalysisResult */
export type LeadExtractionResult = DiscordAnalysisResult;

const DEFAULT_REPLY = 'תודה. הצוות שלנו ייצור איתך קשר בהקדם.';

const GREETING_PATTERNS = /^(היי|הי|שלום|hello|hi|hey|good morning|bonjour|bonsoir|hola|ciao|salut|yo|sup|howdy)[!.,\s]*$/i;

const GREETING_REPLIES = [
  'היי! איך אפשר לעזור היום?',
  'שלום! במה אוכל לסייע?',
  'היי, מה מביא אותך אלינו היום?',
  'שלום! ספר לי, מה קורה?',
  'היי! שמח שפנית, במה אוכל לעזור?',
];

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
}): Promise<DiscordAnalysisResult> {
  if (!process.env.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY is not configured.');
    return { is_new_lead: false, reply: 'AI not configured.' };
  }

  const { text, authorName, channelName, conversationHistory = [] } = params;

  // Short-circuit: pure greetings never need AI — always reply warmly
  if (GREETING_PATTERNS.test(text.trim())) {
    const reply = GREETING_REPLIES[Math.floor(Math.random() * GREETING_REPLIES.length)];
    return { is_new_lead: false, intent: 'other', reply };
  }

  // Include today's date so AI can resolve relative dates like "tomorrow"
  const todayIso = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' });

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
      today_date: todayIso,
    }),
  });

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    messages,
  });

  const raw = response.choices[0]?.message?.content ?? '{}';

  try {
    return JSON.parse(raw) as DiscordAnalysisResult;
  } catch (err) {
    console.error('AI JSON parse failed:', err, raw);
    return { is_new_lead: false, reply: DEFAULT_REPLY };
  }
}
