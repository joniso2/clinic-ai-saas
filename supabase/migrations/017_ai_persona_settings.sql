-- Migration 017: AI Persona & Behavior settings
-- Adds per-clinic AI persona configuration columns to clinic_settings

ALTER TABLE clinic_settings
  ADD COLUMN IF NOT EXISTS industry_type          VARCHAR NOT NULL DEFAULT 'general_business',
  ADD COLUMN IF NOT EXISTS conversation_strategy  VARCHAR NOT NULL DEFAULT 'consultative',
  ADD COLUMN IF NOT EXISTS custom_prompt_override TEXT;

COMMENT ON COLUMN clinic_settings.industry_type IS
  'Vertical context for the AI: medical | legal | general_business';

COMMENT ON COLUMN clinic_settings.conversation_strategy IS
  'How the AI drives the conversation: consultative | direct | educational';

COMMENT ON COLUMN clinic_settings.custom_prompt_override IS
  'Optional freeform instructions appended at the end of the system prompt. Null = no override.';
