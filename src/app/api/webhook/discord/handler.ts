import { processDiscordMessage } from '@/services/lead.service';

export type DiscordWebhookBody = {
  content?: string;
  author_name?: string;
  channel_id?: string;
  guild_id?: string;
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

  try {
    const { reply } = await processDiscordMessage({
      content,
      authorName,
    });
    return Response.json({ reply });
  } catch (err) {
    console.error('Discord webhook error:', err);
    return Response.json({ reply: null });
  }
}
