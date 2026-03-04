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

/**
 * Transport layer: parse Discord webhook payload and delegate to LeadService.
 * Idempotency: when message_id is present, only one request per message_id is processed;
 * concurrent duplicates are claimed via INSERT and exit without processing.
 * Always returns 200 + JSON so the platform never times out with 502.
 */
export async function handleDiscordWebhook(
  body: DiscordWebhookBody,
): Promise<Response> {
  const startedAt = Date.now();
  const fallbackReply = 'שגיאה זמנית. נסה שוב או פנה למרפאה ישירות.';

  try {
    const content =
      typeof body.content === 'string' ? body.content.trim() : '';

    if (!content) {
      return Response.json({ reply: null });
    }

    const messageId = typeof body.message_id === 'string' && body.message_id.trim()
      ? body.message_id.trim()
      : undefined;
    const authorName =
      typeof body.author_name === 'string' ? body.author_name : undefined;
    const conversationHistory = Array.isArray(body.conversation_history)
      ? body.conversation_history.filter(
          (m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string',
        )
      : [];

    const guildId = typeof body.guild_id === 'string' ? body.guild_id : undefined;
    const channelId = typeof body.channel_id === 'string' ? body.channel_id : undefined;
    const useAsync = Boolean(channelId && process.env.DISCORD_BOT_TOKEN);

    // Idempotency: claim message_id before processing so only one concurrent request processes.
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
          if (insertError) {
            if (insertError.code === '23505') {
              logger.info('idempotency_duplicate', { message_id: messageId, clinic_id: clinicId, service: 'handler' });
              return Response.json({ reply: null });
            }
            throw insertError;
          }
          if (!claimed) return Response.json({ reply: null });
          logger.info('idempotency_claim', { message_id: messageId, clinic_id: clinicId, service: 'handler' });
        }
      } catch (idemErr) {
        logger.error('webhook_failed', { message_id: messageId, error: (idemErr as Error)?.message, service: 'handler' });
        return Response.json({ reply: fallbackReply });
      }
    }

    if (useAsync) {
      (async () => {
        try {
          const { reply, modelUsed } = await processDiscordMessage({
            message_id: messageId,
            content,
            authorName,
            conversationHistory,
            guildId,
          });
          let safeReply = (reply && String(reply).trim()) ? reply : fallbackReply;
          if (modelUsed?.trim()) {
            safeReply = `${safeReply}\n\n_(נעניתי עם המודל: ${modelUsed})_`;
          }
          await postMessageToChannel(channelId!, safeReply);
          const duration_ms = Date.now() - startedAt;
          logger.info('webhook_completed', { message_id: messageId, duration_ms, service: 'handler', async: true });
        } catch (err) {
          logger.error('webhook_failed', { message_id: messageId, error: (err as Error)?.message, service: 'handler' });
          console.error('Discord webhook async error:', err);
          await postMessageToChannel(channelId!, fallbackReply);
        }
      })();
      return Response.json({ reply: null });
    }

    const { reply, modelUsed } = await processDiscordMessage({
      message_id: messageId,
      content,
      authorName,
      conversationHistory,
      guildId,
    });
    let safeReply = (reply && String(reply).trim()) ? reply : fallbackReply;
    if (modelUsed?.trim()) {
      safeReply = `${safeReply}\n\n_(נעניתי עם המודל: ${modelUsed})_`;
    }
    const duration_ms = Date.now() - startedAt;
    const clinic_id = guildId ? await getClinicIdByGuildId(guildId) : undefined;
    logger.info('webhook_completed', {
      clinic_id,
      message_id: messageId,
      duration_ms,
      service: 'handler',
    });
    return Response.json({ reply: safeReply });
  } catch (err) {
    const duration_ms = Date.now() - startedAt;
    logger.error('webhook_failed', {
      message_id: undefined,
      duration_ms,
      error: (err as Error)?.message ?? 'unknown',
      service: 'handler',
    });
    console.error('Discord webhook error:', err);
    return Response.json({ reply: fallbackReply });
  }
}
