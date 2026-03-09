import { NextRequest, NextResponse } from 'next/server';
import { handleDiscordWebhook } from './handler';

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.DISCORD_WEBHOOK_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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
