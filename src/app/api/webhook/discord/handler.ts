import { getSupabaseAdmin } from '@/lib/supabase-admin';
import logger from '@/lib/logger';
import { processDiscordMessage } from '@/services/lead.service';
import { getClinicIdByGuildId } from '@/services/discord-guild.service';

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
 */
export async function handleDiscordWebhook(
  body: DiscordWebhookBody,
): Promise<Response> {
  const startedAt = Date.now();
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

  // Idempotency: claim message_id before processing so only one concurrent request processes.
  if (messageId && guildId) {
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
  }

  try {
    const { reply } = await processDiscordMessage({
      message_id: messageId,
      content,
      authorName,
      conversationHistory,
      guildId,
    });
    const safeReply = (reply && String(reply).trim()) ? reply : 'שגיאה זמנית. נסה שוב או פנה למרפאה ישירות.';
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
    let clinic_id: string | undefined;
    if (messageId && guildId) {
      clinic_id = await getClinicIdByGuildId(guildId);
      if (clinic_id) {
        const supabase = getSupabaseAdmin();
        await supabase.from('processed_messages').delete().eq('id', messageId);
      }
    }
    logger.error('webhook_failed', {
      clinic_id,
      message_id: messageId,
      duration_ms,
      error: (err as Error)?.message ?? 'unknown',
      service: 'handler',
    });
    console.error('Discord webhook error:', err);
    return Response.json({ reply: 'שגיאה זמנית. נסה שוב או פנה למרפאה ישירות.' });
  }
}
