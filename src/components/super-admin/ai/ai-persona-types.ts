import type { IndustryType, ConversationStrategy } from '@/prompts/discord.prompt';

export type AiTone           = 'formal' | 'friendly' | 'professional';
export type AiResponseLength = 'brief' | 'standard' | 'detailed';

export interface AIPersonaForm {
  ai_tone: AiTone;
  ai_response_length: AiResponseLength;
  strict_hours_enforcement: boolean;
  business_description: string;
  industry_type: IndustryType;
  conversation_strategy: ConversationStrategy;
  custom_prompt_override: string;
}

export const DEFAULT_FORM: AIPersonaForm = {
  ai_tone: 'professional',
  ai_response_length: 'standard',
  strict_hours_enforcement: true,
  business_description: '',
  industry_type: 'general_business',
  conversation_strategy: 'consultative',
  custom_prompt_override: '',
};

export interface PreviewSegment {
  key: string;
  label: string;
  content: string;
  colorClass: string;
  bgClass: string;
}
