import { handleDiscordWebhook } from './handler';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Parameters<
      typeof handleDiscordWebhook
    >[0];
    return handleDiscordWebhook(body);
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
