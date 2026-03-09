import type { Priority, LeadStatus } from '@/types/leads';
import { STATUS_LABELS, PRIORITY_LABELS, SOURCE_LABELS, formatCurrencyILS } from '@/lib/hebrew';

export function toWaHref(phone: string): string {
  const d = phone.replace(/\D/g, '');
  return `https://wa.me/${d.startsWith('0') ? '972' + d.slice(1) : d}`;
}

export const PRIORITY_STYLES: Record<Priority, string> = {
  Low: 'bg-slate-50 text-slate-600 border border-slate-200/30 dark:bg-slate-950/20 dark:text-slate-300 dark:border-slate-700/40',
  Medium: 'bg-amber-50 text-amber-600 border border-amber-200/30 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-700/40',
  High: 'bg-orange-50 text-orange-600 border border-orange-200/30 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-700/40',
  Urgent: 'bg-red-50 text-red-600 border border-red-200/30 dark:bg-red-900/20 dark:text-red-300 dark:border-red-700/40',
};

export const STATUS_BADGE_STYLES: Record<string, string> = {
  Pending: 'bg-amber-50 text-amber-600 border border-amber-200/30 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-700/40',
  Contacted: 'bg-sky-50 text-sky-600 border border-sky-200/30 dark:bg-sky-900/20 dark:text-sky-300 dark:border-sky-700/40',
  'Appointment scheduled': 'bg-blue-50 text-blue-600 border border-blue-200/30 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-700/40',
  Closed: 'bg-emerald-50 text-emerald-600 border border-emerald-200/30 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-700/40',
  Converted: 'bg-emerald-50 text-emerald-600 border border-emerald-200/30 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-700/40',
  Disqualified: 'bg-slate-50 text-slate-600 border border-slate-200/30 dark:bg-slate-950/20 dark:text-slate-300 dark:border-slate-700/40',
};

export const STATUS_OPTIONS: LeadStatus[] = ['Pending', 'Contacted', 'Appointment scheduled', 'Closed', 'Disqualified'];

export type SortKey = 'revenue' | 'created' | 'name';

export const SORT_LABELS: Record<SortKey, string> = {
  created: 'תאריך יצירה',
  revenue: 'הכנסה',
  name: 'שם',
};

export function formatDateDDMMYYYY(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export function formatDateTime(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-GB', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export const REJECT_REASONS = [
  'פנייה לא רלוונטית',
  'מחיר לא מתאים',
  'ליד כפול',
  'אין תגובה מלקוח',
  'מחוץ לאזור שירות',
] as const;

export type RejectReason = typeof REJECT_REASONS[number];

export const OTHER_SERVICE = 'אחר';
