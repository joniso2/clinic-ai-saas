/**
 * POST /api/messages/incoming
 * Webhook endpoint for all incoming messages (WhatsApp, SMS, Discord, Webchat).
 * Flow: save message → generate AI response (per-clinic ai_models) → save reply → return.
 * Payload: { channel, clinic_id, phone?, message, external_id? }
 */

import { NextRequest, NextResponse } from 'next/server';
import { routeIncoming, recordOutgoing } from '@/lib/message-router';
import { generateAIResponse } from '@/lib/ai-router';

const CHANNELS = ['whatsapp', 'sms', 'discord', 'webchat'] as const;
type Channel = (typeof CHANNELS)[number];

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.MESSAGES_WEBHOOK_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const channel = body.channel as string;
    const clinic_id = body.clinic_id as string;
    const phone = body.phone as string | undefined;
    const message = body.message as string;
    const external_id = body.external_id as string | undefined;

    if (!channel || !CHANNELS.includes(channel as Channel) || !clinic_id || message == null) {
      return NextResponse.json(
        { error: 'channel, clinic_id, and message required; channel one of: ' + CHANNELS.join(', ') },
        { status: 400 }
      );
    }

    const result = await routeIncoming({
      channel: channel as Channel,
      clinic_id,
      phone,
      message: String(message),
      external_id,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    let replyMessageId: string | undefined;
    try {
      const aiReply = await generateAIResponse({
        clinicId: clinic_id,
        message: String(message),
      });
      if (aiReply.trim()) {
        const out = await recordOutgoing({
          clinic_id,
          channel: channel as Channel,
          phone,
          content: aiReply.trim(),
          status: 'sent',
        });
        replyMessageId = out.id;
      }
    } catch (aiErr) {
      console.error('Incoming: AI or recordOutgoing failed', aiErr);
    }

    return NextResponse.json({
      ok: true,
      message_id: result.messageId,
      reply_message_id: replyMessageId,
    });
  } catch (e) {
    console.error('POST /api/messages/incoming error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
