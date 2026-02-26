import { runStructuredPrompt } from '@/ai/ai-client';
import * as leadRepository from '@/repositories/lead.repository';

export type ProcessDiscordMessageResult = {
  reply: string | null;
};

/**
 * Processes a Discord message: runs AI lead extraction, optionally creates a lead.
 * All business logic for "is this a lead?" and "create lead" lives here.
 */
export async function processDiscordMessage(params: {
  content: string;
  authorName?: string;
  channelName?: string;
}): Promise<ProcessDiscordMessageResult> {
  const { content, authorName, channelName } = params;

  const analysis = await runStructuredPrompt({
    text: content,
    authorName,
    channelName,
  });

  const clinicId = process.env.DISCORD_DEFAULT_CLINIC_ID;

  if (analysis.is_new_lead && analysis.full_name && clinicId) {
    console.log(
      '[Discord] Creating lead:',
      analysis.full_name,
      '| clinic_id:',
      clinicId,
    );
    const { data, error } = await leadRepository.createLead({
      clinic_id: clinicId,
      full_name: analysis.full_name,
      phone: analysis.phone ?? null,
      email: analysis.email ?? null,
      interest: analysis.interest ?? null,
      status: 'New',
    });
    if (error) {
      console.error('[Discord] Lead creation failed:', error);
    } else if (data) {
      console.log('[Discord] Lead created successfully.');
    }
  }

  return {
    reply: analysis.reply ?? null,
  };
}
