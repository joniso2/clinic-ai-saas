import OpenAI from 'openai';
import { discordSystemPrompt } from '@/discord/prompt';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export type DiscordWebhookBody = {
  content?: string;
  author_name?: string;
  channel_id?: string;
  guild_id?: string;
};

type LeadExtractionResult = {
  is_new_lead: boolean;
  full_name?: string | null;
  phone?: string | null;
  email?: string | null;
  interest?: string | null;
  reply?: string;
};

async function analyzeMessageWithAI(params: {
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
      {
        role: 'system',
        content: discordSystemPrompt,
      },
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
    return {
      is_new_lead: false,
      reply: 'Thank you. Our team will review your message shortly.',
    };
  }
}

async function createLeadViaInternalApi(payload: {
  full_name: string;
  phone?: string | null;
  email?: string | null;
  interest?: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  const baseUrl = process.env.APP_BASE_URL;
  const secret = process.env.AGENT_API_SECRET;
  const clinicId = process.env.DISCORD_DEFAULT_CLINIC_ID;

  if (!baseUrl || !secret || !clinicId) {
    const missing = [
      !baseUrl && 'APP_BASE_URL',
      !secret && 'AGENT_API_SECRET',
      !clinicId && 'DISCORD_DEFAULT_CLINIC_ID',
    ].filter(Boolean);
    console.error('Discord webhook: missing env:', missing.join(', '));
    return { ok: false, error: `Missing: ${missing.join(', ')}` };
  }

  try {
    const res = await fetch(`${baseUrl}/api/leads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-agent-secret': secret,
      },
      body: JSON.stringify({
        ...payload,
        clinic_id: clinicId,
      }),
    });

    const body = await res.text();
    if (!res.ok) {
      console.error(
        `Discord webhook: /api/leads failed ${res.status}`,
        body,
      );
      return { ok: false, error: `${res.status}: ${body}` };
    }
    return { ok: true };
  } catch (err) {
    console.error('Discord webhook: failed to create lead', err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function handleDiscordWebhook(
  body: DiscordWebhookBody,
): Promise<Response> {
  const content =
    typeof body.content === 'string' ? body.content.trim() : '';

  if (!content) {
    return Response.json({ reply: null });
  }

  const authorName =
    typeof body.author_name === 'string' ? body.author_name : undefined;

  try {
    const analysis = await analyzeMessageWithAI({
      text: content,
      authorName,
    });

    if (analysis.is_new_lead && analysis.full_name) {
      const clinicId = process.env.DISCORD_DEFAULT_CLINIC_ID;
      console.log(
        '[Discord] Creating lead:',
        analysis.full_name,
        '| clinic_id:',
        clinicId ?? '(not set)',
      );
      const result = await createLeadViaInternalApi({
        full_name: analysis.full_name,
        phone: analysis.phone ?? null,
        email: analysis.email ?? null,
        interest: analysis.interest ?? null,
      });
      if (result.ok) {
        console.log('[Discord] Lead created successfully.');
      } else {
        console.error('[Discord] Lead creation failed:', result.error);
      }
    }
    return Response.json({
      reply: analysis.reply ?? null,
    });
  } catch (err) {
    console.error('Discord processing error:', err);
    return Response.json({ reply: null });
  }
}
