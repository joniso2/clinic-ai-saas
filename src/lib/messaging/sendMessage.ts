export type MessageChannel = 'sms' | 'whatsapp';

export type SendResult = { success: boolean; error?: string };

/**
 * Sends a single message to a recipient.
 *
 * Currently a MOCK implementation — logs to console and returns success.
 * Replace the body below with your real provider when ready.
 *
 * ─── Twilio SMS ────────────────────────────────────────────────────────────
 *
 *   import Twilio from 'twilio';
 *   const client = Twilio(
 *     process.env.TWILIO_ACCOUNT_SID!,
 *     process.env.TWILIO_AUTH_TOKEN!,
 *   );
 *   await client.messages.create({
 *     body: message,
 *     from: process.env.TWILIO_FROM_NUMBER!,
 *     to: `+972${phone.replace(/\D/g, '').replace(/^0/, '')}`,
 *   });
 *
 * ─── WhatsApp Business API (Meta Cloud API) ────────────────────────────────
 *
 *   const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID!;
 *   const token   = process.env.WHATSAPP_ACCESS_TOKEN!;
 *   await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
 *     method: 'POST',
 *     headers: {
 *       'Content-Type': 'application/json',
 *       Authorization: `Bearer ${token}`,
 *     },
 *     body: JSON.stringify({
 *       messaging_product: 'whatsapp',
 *       to: `972${phone.replace(/\D/g, '').replace(/^0/, '')}`,
 *       type: 'text',
 *       text: { body: message },
 *     }),
 *   });
 *
 * ─── Notes ─────────────────────────────────────────────────────────────────
 *
 *   Variables like {שם} must be resolved before calling this function.
 *   The caller is responsible for substituting template variables.
 */
export async function sendMessage(
  phone: string,
  message: string,
  channel: MessageChannel,
): Promise<SendResult> {
  // ── Mock implementation ────────────────────────────────────────────────────
  console.log(`[sendMessage] channel=${channel} to=${phone} message="${message.slice(0, 60)}..."`);
  await new Promise((r) => setTimeout(r, 30)); // simulate I/O
  return { success: true };
}
