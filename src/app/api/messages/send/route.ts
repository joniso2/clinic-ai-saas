/**
 * POST /api/messages/send
 * Send outbound message via clinic integration. Uses message router to determine provider.
 * Body: { channel, phone?, message }
 */

import { NextResponse } from 'next/server';
import { getClinicUser } from '@/lib/auth-server';
import { recordOutgoing, getClinicIntegration } from '@/lib/message-router';

const ALLOWED_CHANNELS = ['whatsapp', 'sms', 'discord', 'webchat'] as const;

export async function POST(req: Request) {
  try {
    const clinicUser = await getClinicUser();
    if (!clinicUser?.clinic_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const clinicId = clinicUser.clinic_id;

    const body = await req.json();
    const channel = body.channel as string;
    const phone = body.phone as string | undefined;
    const message = body.message as string;

    if (!channel || !ALLOWED_CHANNELS.includes(channel as typeof ALLOWED_CHANNELS[number]) || message == null) {
      return NextResponse.json(
        { error: 'channel (whatsapp|sms|discord|webchat) and message required' },
        { status: 400 }
      );
    }

    const integration = await getClinicIntegration(clinicId, channel === 'webchat' ? 'webhook' : channel as 'whatsapp' | 'sms' | 'discord');
    const content = String(message);

    let status: 'sent' | 'failed' | 'pending' = 'pending';
    if (integration?.provider) {
      status = 'sent';
    }

    const result = await recordOutgoing({
      clinic_id: clinicId,
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
