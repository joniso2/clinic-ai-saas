import { runChatPrompt } from '@/ai/ai-chat';

export const runtime = 'edge';

export async function POST(req: Request) {
  const { messages } = (await req.json()) as {
    messages: Array<{
      role: 'system' | 'user' | 'assistant';
      content: string;
    }>;
  };

  const result = await runChatPrompt(messages);
  return result.toTextStreamResponse();
}
