import { handleDiscordWebhook } from '../webhook/discord/handler';

export async function POST(request: Request) {
  const body = (await request.json()) as Parameters<
    typeof handleDiscordWebhook
  >[0];
  return handleDiscordWebhook(body);
}
