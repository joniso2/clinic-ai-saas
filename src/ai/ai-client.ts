import OpenAI from 'openai';
import { discordSystemPrompt } from '@/prompts/discord.prompt';
import { getAIConfig } from '@/lib/ai-router';
import { generateWithGemini } from '@/lib/ai-providers/gemini';
import { generateWithOpenAI } from '@/lib/ai-providers/openai';
import { generateWithAnthropic } from '@/lib/ai-providers/anthropic';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const JSON_INSTRUCTION = '\n\nRespond with valid JSON only. No markdown, no explanation.';

/** Extract JSON string from raw model output (handles ```json ... ``` or ``` ... ``` wrapping). */
function extractJsonFromRaw(raw: string): string {
  const s = raw.trim();
  const codeBlock = /^```(?:json)?\s*([\s\S]*?)```$/i;
  const m = s.match(codeBlock);
  if (m) return m[1].trim();
  return s;
}

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
  urgency_level?:            'low' | 'medium' | 'high' | null;
  priority_level?:           'low' | 'medium' | 'high' | null;
  callback_recommendation?:  string | null;
  estimated_value?:          number | null;
};

/** @deprecated use DiscordAnalysisResult */
export type LeadExtractionResult = DiscordAnalysisResult;

/** Result of runStructuredPrompt; includes which model was used when clinicId is provided. */
export type RunStructuredPromptResult = DiscordAnalysisResult & { modelUsed?: string };

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
 * Build a single prompt string from system + conversation + user (for providers that take one prompt).
 */
function buildPromptForStructured(
  systemPrompt: string,
  todayIso: string,
  authorName: string | undefined,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
  text: string
): string {
  let out = `[System]\n${systemPrompt}\n\nToday's date (Israel time): ${todayIso}${authorName ? `. Patient name hint: ${authorName}` : ''}\n\n`;
  for (const m of conversationHistory) {
    out += `[${m.role}]\n${m.content}\n\n`;
  }
  out += `[user]\n${text}`;
  return out + JSON_INSTRUCTION;
}

/**
 * Build only the user-facing part (for Gemini: system is sent via systemInstruction).
 */
function buildUserPromptForStructured(
  todayIso: string,
  authorName: string | undefined,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
  text: string
): string {
  let out = `Today's date (Israel time): ${todayIso}${authorName ? `. Patient name hint: ${authorName}` : ''}\n\n`;
  for (const m of conversationHistory) {
    out += `[${m.role}]\n${m.content}\n\n`;
  }
  out += `[user]\n${text}`;
  return out + JSON_INSTRUCTION;
}

/**
 * Runs the Discord lead-extraction prompt (structured JSON).
 * When clinicId is provided, uses that clinic's ai_models config (provider + model). Changes in Super Admin take effect immediately.
 */
export async function runStructuredPrompt(params: {
  text: string;
  authorName?: string;
  channelName?: string;
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
  /** Override the default system prompt (used to inject AI behavior settings). */
  systemPrompt?: string;
  /** When set, use this clinic's ai_models (provider + model). Enables live model switching from Super Admin. */
  clinicId?: string | null;
}): Promise<RunStructuredPromptResult> {
  const { text, authorName, channelName, conversationHistory = [], systemPrompt, clinicId } = params;

  // Short-circuit: pure greetings never need AI — always reply warmly
  if (GREETING_PATTERNS.test(text.trim())) {
    const reply = GREETING_REPLIES[Math.floor(Math.random() * GREETING_REPLIES.length)];
    return { is_new_lead: false, intent: 'other', reply };
  }

  const todayIso = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' });
  const sysPrompt = systemPrompt ?? discordSystemPrompt;
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: 'system', content: sysPrompt },
    { role: 'system', content: `Today's date (Israel time): ${todayIso}${authorName ? `. Patient name hint: ${authorName}` : ''}` },
  ];
  for (const m of conversationHistory) {
    messages.push(m.role === 'user' ? { role: 'user', content: m.content } : { role: 'assistant', content: m.content });
  }
  messages.push({ role: 'user', content: text });

  let raw: string = '{}';
  let modelUsed: string | undefined;

  if (clinicId) {
    const aiConfig = await getAIConfig(clinicId);
    if (aiConfig) {
      console.log('AI Provider:', aiConfig.provider);
      console.log('AI Model:', aiConfig.model);
      modelUsed = aiConfig.model;
      const { provider, model, temperature, max_tokens } = aiConfig;
      try {
        if (provider === 'openai') {
          const response = await openai.chat.completions.create({
            model,
            response_format: { type: 'json_object' },
            messages,
            temperature: temperature ?? 0.7,
            max_tokens: max_tokens ?? 2048,
          });
          raw = response.choices[0]?.message?.content ?? '{}';
        } else if (provider === 'google') {
          const userPrompt = buildUserPromptForStructured(todayIso, authorName, conversationHistory, text);
          raw = await generateWithGemini(userPrompt, {
            model,
            temperature,
            maxTokens: max_tokens,
            systemInstruction: sysPrompt,
          });
        } else if (provider === 'anthropic') {
          const prompt = buildPromptForStructured(sysPrompt, todayIso, authorName, conversationHistory, text);
          raw = await generateWithAnthropic(prompt, { model, temperature, maxTokens: max_tokens });
        }
      } catch (err) {
        console.error('AI (per-clinic) failed:', err);
        return { is_new_lead: false, reply: DEFAULT_REPLY, modelUsed };
      }
    }
    // If clinicId set but no ai_models row, fall through to default OpenAI below
  }

  if (!clinicId || raw === '{}') {
    if (!process.env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY is not configured.');
      return { is_new_lead: false, reply: 'AI not configured.' };
    }
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages,
    });
    raw = response.choices[0]?.message?.content ?? '{}';
    if (!modelUsed) modelUsed = 'gpt-4o-mini';
  }

  const toParse = extractJsonFromRaw(raw);
  try {
    const parsed = JSON.parse(toParse) as DiscordAnalysisResult;
    return { ...parsed, modelUsed };
  } catch (err) {
    console.error('AI JSON parse failed:', err, 'raw length:', raw?.length, 'preview:', raw?.slice(0, 200));
    return { is_new_lead: false, reply: DEFAULT_REPLY, modelUsed };
  }
}
