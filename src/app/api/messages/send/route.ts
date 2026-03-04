/**
 * POST /api/messages/send
 * Send outbound message via clinic integration. Uses message router to determine provider.
 * Body: { clinic_id, channel, phone?, message }
 * For now: records outgoing in DB; actual provider send (Twilio/360dialog/Vonage) can be wired here.
 */

import { NextResponse } from 'next/server';
import { recordOutgoing, getClinicIntegration } from '@/lib/message-router';

const ALLOWED_CHANNELS = ['whatsapp', 'sms', 'discord', 'webchat'] as const;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const clinic_id = body.clinic_id as string;
    const channel = body.channel as string;
    const phone = body.phone as string | undefined;
    const message = body.message as string;

    if (!clinic_id || !channel || !ALLOWED_CHANNELS.includes(channel as typeof ALLOWED_CHANNELS[number]) || message == null) {
      return NextResponse.json(
        { error: 'clinic_id, channel (whatsapp|sms|discord|webchat), and message required' },
        { status: 400 }
      );
    }

    const integration = await getClinicIntegration(clinic_id, channel === 'webchat' ? 'webhook' : channel as 'whatsapp' | 'sms' | 'discord');
    const content = String(message);

    // Record outgoing; actual send via provider (Twilio etc.) can be added here
    let status: 'sent' | 'failed' | 'pending' = 'pending';
    if (integration?.provider) {
      // Placeholder: in production call Twilio / 360dialog / Vonage based on integration.provider and integration.config
      status = 'sent';
    }

    const result = await recordOutgoing({
      clinic_id,
      channel: channel as 'whatsapp' | 'sms' | 'discord' | 'webchat',
      phone,
      content,
      status,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
    return NextResponse.json({ ok: true, message_id: result.id, status });
  } catch (e) {
    console.error('POST /api/messages/send error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
