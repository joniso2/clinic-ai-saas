import { formatCurrencyILS, SOURCE_LABELS } from '@/lib/hebrew';
import type { Patient } from '@/types/patients';
import type { Lead } from '@/types/leads';

// ─── Types ────────────────────────────────────────────────────────────────────

export const STATUS_OPTIONS = ['active', 'dormant', 'inactive'] as const;
export type SortKey = 'date_desc' | 'date_asc' | 'value_desc' | 'value_asc' | 'name_az' | 'name_za';
export type RecallEntry = { active: boolean; reminderDate: string };

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'date_desc', label: 'תאריך סגירה (חדש לישן)' },
  { value: 'date_asc', label: 'תאריך סגירה (ישן לחדש)' },
  { value: 'value_desc', label: 'שווי (גבוה לנמוך)' },
  { value: 'value_asc', label: 'שווי (נמוך לגבוה)' },
  { value: 'name_az', label: 'שם א-ת' },
  { value: 'name_za', label: 'שם ת-א' },
];

// ─── Design helpers ───────────────────────────────────────────────────────────

const SOURCE_BADGE_STYLES: Record<string, { label: string; cls: string }> = {
  WhatsApp:    { label: 'וואטסאפ',  cls: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' },
  Instagram:   { label: 'אינסטגרם', cls: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400' },
  Referral:    { label: 'הפניה',     cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400' },
  'Google Ads':{ label: 'גוגל',      cls: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400' },
  Organic:     { label: 'אורגני',    cls: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400' },
  discord:     { label: 'דיסקורד',   cls: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400' },
  Discord:     { label: 'דיסקורד',   cls: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400' },
  Other:       { label: 'אחר',       cls: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400' },
};

export function getSourceBadgeStyle(source: string | null | undefined) {
  if (!source) return null;
  return SOURCE_BADGE_STYLES[source] ?? {
    label: SOURCE_LABELS[source] ?? source,
    cls: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
  };
}

export function getStatusBadgeStyle(status: string) {
  if (status === 'active')   return { label: 'פעיל',    cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' };
  if (status === 'dormant')  return { label: 'רדום',    cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' };
  if (status === 'inactive') return { label: 'לא פעיל', cls: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400' };
  if (status === 'Closed')   return { label: 'הושלם',   cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' };
  return { label: status, cls: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400' };
}

const AVATAR_COLORS = [
  'bg-violet-500','bg-indigo-500','bg-blue-500','bg-cyan-500',
  'bg-teal-500','bg-emerald-500','bg-rose-500','bg-orange-500',
];

export function getAvatarColor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

export function getInitials(name: string | null | undefined): string {
  if (!name) return '?';
  const p = name.trim().split(/\s+/);
  return p.length === 1 ? p[0].slice(0, 2) : (p[0][0] + p[p.length - 1][0]).toUpperCase();
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

export function formatDate(value: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function daysSince(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / 86_400_000);
}

export function isThisMonth(dateStr: string | null): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const n = new Date();
  return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
}

export function getCloseDatePatient(p: Patient): string | null {
  return p.last_visit_date ?? p.updated_at ?? p.created_at ?? null;
}
export function getCloseDateLead(l: Lead): string | null { return l.created_at ?? null; }
export function getValuePatient(p: Patient): number { return Number(p.total_revenue) || 0; }
export function getValueLead(l: Lead): number { return l.estimated_deal_value ?? 0; }
