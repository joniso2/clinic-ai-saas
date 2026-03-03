import { processDiscordMessage } from '@/services/lead.service';

export type DiscordWebhookBody = {
  content?: string;
  author_name?: string;
  channel_id?: string;
  guild_id?: string;
  conversation_history?: Array<{ role: 'user' | 'assistant'; content: string }>;
};

/**
 * Transport layer: parse Discord webhook payload and delegate to LeadService.
 */
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
  const conversationHistory = Array.isArray(body.conversation_history)
    ? body.conversation_history.filter(
        (m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string',
      )
    : [];

  const guildId = typeof body.guild_id === 'string' ? body.guild_id : undefined;

  try {
    const { reply } = await processDiscordMessage({
      content,
      authorName,
      conversationHistory,
      guildId,
    });
    const safeReply = (reply && String(reply).trim()) ? reply : 'שגיאה זמנית. נסה שוב או פנה למרפאה ישירות.';
    return Response.json({ reply: safeReply });
  } catch (err) {
    console.error('Discord webhook error:', err);
    return Response.json({ reply: 'שגיאה זמנית. נסה שוב או פנה למרפאה ישירות.' });
  }
}
