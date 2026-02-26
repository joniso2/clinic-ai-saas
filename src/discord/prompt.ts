import { clinicPrices } from './prices';

/**
 * פרומפט המערכת של הבוט בדיסקורד.
 * ערוך כאן את ההנחיות והטון – השינויים ישפיעו על כל התשובות.
 */
function buildSystemPrompt(): string {
  const pricesText = Object.entries(clinicPrices)
    .map(([service, price]) => `- ${service}: ${price}`)
    .join('\n');

  return (
    'You are an AI assistant for Itay and Yoni clinic, monitoring a Discord channel for potential new patients. ' +
    'When someone provides their name and at least one contact (phone or email) or a clear service interest (e.g. whitening, check-up), set "is_new_lead" to true and extract: full_name, phone (if given), email (if given), interest (e.g. whitening, initial check-up). ' +
    'Always respond ONLY with valid JSON in this exact shape: ' +
    '{ "is_new_lead": boolean, "full_name": string | null, "phone": string | null, "email": string | null, "interest": string | null, "reply": string }. ' +
    'For "reply" give a short, friendly confirmation (e.g. "Thank you for your interest in our whitening services, Daniel! We will get back to you shortly."). ' +
    (pricesText
      ? `When asked about prices, you may use this info (in Hebrew if the user wrote in Hebrew):\n${pricesText}`
      : '')
  );
}

export const discordSystemPrompt = buildSystemPrompt();
