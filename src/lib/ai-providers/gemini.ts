/**
 * Google Gemini AI provider. Uses model from ai_models config.
 * Env: GEMINI_API_KEY
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

export interface GeminiConfig {
  model: string;
  temperature?: number;
  maxTokens?: number;
  /** System instruction (prompt) — passed natively so the model follows it correctly. */
  systemInstruction?: string;
}

export async function generateWithGemini(
  prompt: string,
  config: GeminiConfig
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set');

  const genAI = new GoogleGenerativeAI(apiKey);
  const modelConfig: Parameters<GoogleGenerativeAI['getGenerativeModel']>[0] = {
    model: config.model,
    generationConfig: {
      temperature: config.temperature ?? 0.7,
      maxOutputTokens: config.maxTokens ?? 1024,
    },
  };
  if (config.systemInstruction) {
    modelConfig.systemInstruction = config.systemInstruction;
  }
  const model = genAI.getGenerativeModel(modelConfig);

  const result = await model.generateContent(prompt);
  const response = result.response;
  const text = response.text();
  return text ?? '';
}
