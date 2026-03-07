import { runChatPrompt } from '@/ai/ai-chat';

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const { messages } = (await req.json()) as {
      messages: Array<{
        role: 'system' | 'user' | 'assistant';
        content: string;
      }>;
    };

    const result = await runChatPrompt(messages);
    return result.toTextStreamResponse();
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
