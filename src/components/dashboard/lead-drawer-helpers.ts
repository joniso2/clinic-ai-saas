import type { Priority } from '@/types/leads';

export const PRIORITY_STYLES: Record<Priority, string> = {
  Low: 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300',
  Medium: 'bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-400',
  High: 'bg-orange-100 dark:bg-orange-950/50 text-orange-800 dark:text-orange-400',
  Urgent: 'bg-red-100 dark:bg-red-950/50 text-red-800 dark:text-red-400',
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

export const URGENCY_STYLES: Record<string, string> = {
  high:   'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900/50',
  medium: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50',
  low:    'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50',
};

export const PRIORITY_LEVEL_STYLES: Record<string, string> = {
  high:   'bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400',
  medium: 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400',
  low:    'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-400',
};
