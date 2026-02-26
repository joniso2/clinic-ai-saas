import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { chatSystemPrompt } from '@/prompts/chat.prompt';

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

/**
 * Runs the chat prompt (streaming). Edge-safe (AI SDK only).
 * Single entry point for in-app Chat AI; uses centralized system prompt.
 */
export async function runChatPrompt(messages: ChatMessage[]) {
  return streamText({
    model: openai('gpt-4o'),
    messages,
    system: chatSystemPrompt,
  });
}
