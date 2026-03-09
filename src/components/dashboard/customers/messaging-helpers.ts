import type { Campaign } from '@/types/campaigns';

export type Channel = 'sms' | 'whatsapp';
export type AudienceType = 'all' | 'custom' | 'last_visit_filter';
export type ScheduleType = 'now' | 'weekly' | 'monthly' | 'auto_days_after';

export const DAYS_HE = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

export const VARIABLES = [
  { label: '{שם}',        value: '{שם}',        title: 'שם הלקוח' },
  { label: '{תאריך תור}', value: '{תאריך תור}', title: 'תאריך הפגישה הבאה' },
  { label: '{שם מרפאה}',  value: '{שם מרפאה}',  title: 'שם העסק' },
  { label: '{שם העסק}',  value: '{שם העסק}',  title: 'שם העסק (חלופי)' },
];

export function daysSince(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / 86_400_000);
}

export function formatDate(value: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function getStatusBadge(status: Campaign['status']) {
  switch (status) {
    case 'sent':      return { label: 'נשלח',    cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' };
    case 'sending':   return { label: 'שולח...',  cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' };
    case 'scheduled': return { label: 'מתוזמן',  cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' };
    default:          return { label: 'טיוטה',   cls: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400' };
  }
}

export function getChannelBadge(channel: Campaign['channel']) {
  return channel === 'whatsapp'
    ? { label: 'WhatsApp', cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' }
    : { label: 'SMS',       cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' };
}
