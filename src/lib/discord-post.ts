/**
 * Post a message to a Discord channel (server-side).
 * Used when webhook responds 200 immediately and we send the reply from the app.
 * Requires DISCORD_BOT_TOKEN in env.
 */
export async function postMessageToChannel(
  channelId: string,
  content: string
): Promise<boolean> {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token?.trim()) {
    console.error('discord-post: DISCORD_BOT_TOKEN is not set');
    return false;
  }
  const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bot ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error('discord-post: failed', res.status, text.slice(0, 200));
    return false;
  }
  return true;
}
