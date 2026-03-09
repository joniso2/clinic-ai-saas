export interface DiscordMapping {
  id: string;
  guild_id: string;
  clinic_id: string;
  clinic_name: string;
}

export interface TenantOption {
  id: string;
  name: string | null;
}

export interface ClinicIntegration {
  id: string;
  clinic_id: string;
  type: string;
  provider: string;
  status: 'connected' | 'disconnected' | 'error';
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ClinicMetrics {
  messages_today: number;
  messages_this_month: number;
  last_message_at: string | null;
}

export interface WebhookLogEntry {
  readonly id: string;
  readonly tenantName: string;
  readonly event: string;
  readonly status: 'success' | 'failed' | 'pending';
  readonly timestamp: string;
  readonly responseMs: number;
}

export const MOCK_WEBHOOK_LOGS: WebhookLogEntry[] = [
  { id: '1', tenantName: 'קליניקת ד"ר לוי', event: 'lead.created', status: 'success', timestamp: new Date(Date.now() - 60_000).toISOString(), responseMs: 145 },
  { id: '2', tenantName: 'מרפאת שלום', event: 'appointment.booked', status: 'success', timestamp: new Date(Date.now() - 180_000).toISOString(), responseMs: 212 },
  { id: '3', tenantName: 'קליניקת חיוך', event: 'lead.created', status: 'failed', timestamp: new Date(Date.now() - 320_000).toISOString(), responseMs: 3010 },
  { id: '4', tenantName: 'מרפאת השיניים', event: 'appointment.cancelled', status: 'success', timestamp: new Date(Date.now() - 600_000).toISOString(), responseMs: 98 },
  { id: '5', tenantName: 'קליניקת ד"ר לוי', event: 'lead.updated', status: 'pending', timestamp: new Date(Date.now() - 30_000).toISOString(), responseMs: 0 },
];

export const CHANNEL_LABELS: Record<string, string> = { whatsapp: 'WhatsApp', sms: 'SMS', discord: 'Discord', webhook: 'Webhook' };
export const PROVIDERS: Record<string, string[]> = { whatsapp: ['twilio', '360dialog', 'vonage'], sms: ['twilio', 'vonage'], discord: ['discord'], webhook: ['generic'] };
