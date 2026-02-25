import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';

export const runtime = 'edge';

export async function POST(req: Request) {
  const { messages } = (await req.json()) as {
    messages: Array<{
      role: 'system' | 'user' | 'assistant';
      content: string;
    }>;
  };

  const result = await streamText({
    model: openai('gpt-4o'),
    messages,
    system:
      'You are Clinic AI, an assistant for a multi-tenant clinic CRM. ' +
      'Help with lead management, patient communication, and clinic operations. ' +
      'Keep answers concise, professional, and easy to follow. ' +
      'If the user mentions capturing a new lead, remind them that the system ' +
      'provides a dedicated API endpoint for agents to register leads securely.',
  });

  // Use the helper provided by streamText to return a proper streaming response.
  return result.toTextStreamResponse();
}



