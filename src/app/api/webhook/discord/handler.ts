import { getSupabaseAdmin } from '@/lib/supabase-admin';
import logger from '@/lib/logger';
import { processDiscordMessage } from '@/services/lead.service';
import { getClinicIdByGuildId } from '@/services/discord-guild.service';
import { postMessageToChannel } from '@/lib/discord-post';

export type DiscordWebhookBody = {
  message_id?: string;
  content?: string;
  author_name?: string;
  channel_id?: string;
  guild_id?: string;
  conversation_history?: Array<{ role: 'user' | 'assistant'; content: string }>;
};

const FALLBACK_REPLY = 'שגיאה זמנית. נסה שוב או פנה אלינו ישירות.';

/**
 * Transport layer: parse Discord webhook payload and delegate to LeadService.
 * When DISCORD_BOT_TOKEN + channel_id exist: return 200 immediately, process fully in background (avoids proxy 502).
 * Idempotency is done in background so duplicates still get only one reply.
 */
export async function handleDiscordWebhook(
  body: DiscordWebhookBody,
): Promise<Response> {
  const content = typeof body.content === 'string' ? body.content.trim() : '';
  if (!content) {
    return Response.json({ reply: null });
  }

  const messageId = typeof body.message_id === 'string' && body.message_id.trim()
    ? body.message_id.trim()
    : undefined;
  const authorName = typeof body.author_name === 'string' ? body.author_name : undefined;
  const conversationHistory = Array.isArray(body.conversation_history)
    ? body.conversation_history.filter(
        (m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string',
      )
    : [];
  const guildId = typeof body.guild_id === 'string' ? body.guild_id : undefined;
  const channelId = typeof body.channel_id === 'string' ? body.channel_id : undefined;
  const useAsync = Boolean(channelId && process.env.DISCORD_BOT_TOKEN);

  if (useAsync) {
    runDiscordWebhookBackground({
      messageId,
      content,
      authorName,
      conversationHistory,
      guildId,
      channelId: channelId!,
    }).catch((err) => {
      logger.error('webhook_background_error', { message_id: messageId, error: (err as Error)?.message, service: 'handler' });
      console.error('Discord webhook background error:', err);
    });
    return Response.json({ reply: null });
  }

  const startedAt = Date.now();
  try {
    if (messageId && guildId) {
      try {
        const clinicId = await getClinicIdByGuildId(guildId);
        if (clinicId) {
          const supabase = getSupabaseAdmin();
          const { data: claimed, error: insertError } = await supabase
            .from('processed_messages')
            .insert({ id: messageId, clinic_id: clinicId })
            .select('id')
            .maybeSingle();
          if (insertError?.code === '23505') {
            logger.info('idempotency_duplicate', { message_id: messageId, clinic_id: clinicId, service: 'handler' });
            return Response.json({ reply: null });
          }
          if (insertError || !claimed) return Response.json({ reply: FALLBACK_REPLY });
          logger.info('idempotency_claim', { message_id: messageId, clinic_id: clinicId, service: 'handler' });
        }
      } catch (idemErr) {
        logger.error('webhook_failed', { message_id: messageId, error: (idemErr as Error)?.message, service: 'handler' });
        return Response.json({ reply: FALLBACK_REPLY });
      }
    }

    const { reply, modelUsed } = await processDiscordMessage({
      message_id: messageId,
      content,
      authorName,
      conversationHistory,
      guildId,
    });
    let safeReply = (reply && String(reply).trim()) ? reply : FALLBACK_REPLY;
    if (modelUsed?.trim()) safeReply = `${safeReply}\n\n_(נעניתי עם המודל: ${modelUsed})_`;
    logger.info('webhook_completed', { message_id: messageId, duration_ms: Date.now() - startedAt, service: 'handler' });
    return Response.json({ reply: safeReply });
  } catch (err) {
    logger.error('webhook_failed', { message_id: messageId, error: (err as Error)?.message, service: 'handler' });
    console.error('Discord webhook error:', err);
    return Response.json({ reply: FALLBACK_REPLY });
  }
}

async function runDiscordWebhookBackground(params: {
  messageId: string | undefined;
  content: string;
  authorName: string | undefined;
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
  guildId: string | undefined;
  channelId: string;
}): Promise<void> {
  const startedAt = Date.now();
  const { messageId, content, authorName, conversationHistory, guildId, channelId } = params;

  try {
    if (messageId && guildId) {
      const clinicId = await getClinicIdByGuildId(guildId);
      if (clinicId) {
        const supabase = getSupabaseAdmin();
        const { data: claimed, error: insertError } = await supabase
          .from('processed_messages')
          .insert({ id: messageId, clinic_id: clinicId })
          .select('id')
          .maybeSingle();
        if (insertError?.code === '23505') {
          logger.info('idempotency_duplicate', { message_id: messageId, clinic_id: clinicId, service: 'handler' });
          return;
        }
        if (insertError || !claimed) {
          logger.error('webhook_idempotency_insert_failed', { message_id: messageId, clinic_id: clinicId, insert_error: insertError?.message ?? (claimed ? null : 'no row returned'), code: insertError?.code, service: 'handler' });
          await postMessageToChannel(channelId, FALLBACK_REPLY);
          return;
        }
        logger.info('idempotency_claim', { message_id: messageId, clinic_id: clinicId, service: 'handler' });
      }
    }

    const { reply, modelUsed } = await processDiscordMessage({
      message_id: messageId,
      content,
      authorName,
      conversationHistory,
      guildId,
    });
    let safeReply = (reply && String(reply).trim()) ? reply : FALLBACK_REPLY;
    if (modelUsed?.trim()) safeReply = `${safeReply}\n\n_(נעניתי עם המודל: ${modelUsed})_`;
    await postMessageToChannel(channelId, safeReply);
    logger.info('webhook_completed', { message_id: messageId, duration_ms: Date.now() - startedAt, service: 'handler', async: true });
  } catch (err) {
    const errMsg = (err as Error)?.message ?? String(err);
    const errStack = (err as Error)?.stack;
    logger.error('webhook_failed', { message_id: messageId, error: errMsg, service: 'handler' });
    console.error('Discord webhook background error:', errMsg, errStack);
    await postMessageToChannel(channelId, FALLBACK_REPLY);
  }
}
