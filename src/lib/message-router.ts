/**
 * Central message router: incoming → save → (AI) → CRM → response.
 * All channels (WhatsApp, SMS, Discord, Webchat) pass through here.
 */

import { getSupabaseAdmin } from '@/lib/supabase-admin';

export type IncomingChannel = 'whatsapp' | 'sms' | 'discord' | 'webchat';

export interface IncomingPayload {
  channel: IncomingChannel;
  clinic_id: string;
  phone?: string;
  message: string;
  external_id?: string;
}

export interface RouterResult {
  ok: boolean;
  messageId?: string;
  error?: string;
}

/**
 * 1. Validate clinic exists
 * 2. Save incoming message to messages table
 * 3. Return message id for caller to optionally trigger AI + send reply
 */
export async function routeIncoming(payload: IncomingPayload): Promise<RouterResult> {
  const supabase = getSupabaseAdmin();
  const { channel, clinic_id, phone, message, external_id } = payload;

  const { data: clinic } = await supabase.from('clinics').select('id').eq('id', clinic_id).maybeSingle();
  if (!clinic) return { ok: false, error: 'Clinic not found' };

  const { data: row, error } = await supabase
    .from('messages')
    .insert({
      clinic_id,
      channel,
      direction: 'incoming',
      phone: phone ?? null,
      content: message,
      status: 'delivered',
      external_id: external_id ?? null,
    })
    .select('id')
    .single();

  if (error) return { ok: false, error: error.message };
  return { ok: true, messageId: row.id };
}

/**
 * Resolve clinic integration by clinic_id and channel, then send.
 * Caller should build the outbound payload; this only persists the outgoing record.
 */
export async function recordOutgoing(params: {
  clinic_id: string;
  channel: IncomingChannel;
  phone?: string;
  content: string;
  status: 'sent' | 'failed' | 'pending';
  external_id?: string;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('messages')
    .insert({
      clinic_id: params.clinic_id,
      channel: params.channel,
      direction: 'outgoing',
      phone: params.phone ?? null,
      content: params.content,
      status: params.status,
      external_id: params.external_id ?? null,
    })
    .select('id')
    .single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, id: data.id };
}

/**
 * Get clinic integration config for a channel (whatsapp, sms, etc.).
 */
export async function getClinicIntegration(
  clinicId: string,
  type: 'whatsapp' | 'sms' | 'discord' | 'webhook'
): Promise<{ config: Record<string, unknown>; provider: string } | null> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from('clinic_integrations')
    .select('config, provider')
    .eq('clinic_id', clinicId)
    .eq('type', type)
    .eq('status', 'connected')
    .maybeSingle();
  return data ? { config: (data.config as Record<string, unknown>) ?? {}, provider: data.provider } : null;
}
