// ─── Date Range Types ────────────────────────────────────────────────────────

export type Preset = '1d' | '7d' | '30d' | '90d' | 'custom';

export function getPresetRange(preset: Preset): { from: string; to: string } | null {
  if (preset === 'custom') return null;
  const to = new Date();
  if (preset === '1d') {
    const from = new Date(to.getFullYear(), to.getMonth(), to.getDate(), 0, 0, 0, 0);
    return { from: from.toISOString(), to: to.toISOString() };
  }
  const days = preset === '7d' ? 7 : preset === '90d' ? 90 : 30;
  const from = new Date(to.getTime() - days * 86_400_000);
  return { from: from.toISOString(), to: to.toISOString() };
}

export function toInputDate(iso: string): string {
  return iso.slice(0, 10);
}

export async function fetchAnalytics(
  preset: Preset,
  customFrom: string,
  customTo: string,
): Promise<import('@/services/analytics.service').AnalyticsData | null> {
  let url: string;
  if (preset === 'custom' && customFrom && customTo) {
    url = `/api/analytics?from=${encodeURIComponent(customFrom)}&to=${encodeURIComponent(customTo)}`;
  } else {
    url = `/api/analytics?preset=${preset}`;
  }
  const res = await fetch(url, { credentials: 'include', cache: 'no-store' });
  if (!res.ok) return null;
  const json = await res.json() as { analytics?: import('@/services/analytics.service').AnalyticsData };
  return json.analytics ?? null;
}

// ─── Formatting (Hebrew) ─────────────────────────────────────────────────────

export function fmt(n: number): string {
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

export function fmtHours(h: number): string {
  if (h < 1) return `${Math.round(h * 60)} דקות`;
  const fixed = Math.round(h * 10) / 10;
  return fixed === 1 ? 'שעה' : `${fixed} שעות`;
}

export const PRESETS: { label: string; value: Preset }[] = [
  { label: 'יומי', value: '1d' },
  { label: '7 ימים', value: '7d' },
  { label: '30 יום', value: '30d' },
  { label: '90 יום', value: '90d' },
  { label: 'מותאם אישית', value: 'custom' },
];

export const FUNNEL_LABELS: Record<string, string> = { Leads: 'ליד', Contacted: 'קשר', Appointments: 'תור', Closed: 'סגור' };
export const FUNNEL_COLORS = ['#94a3b8', '#818cf8', '#6366f1', '#10b981'];
export const SERVICE_COLORS = ['#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe', '#e0e7ff'];

export const INSIGHT_STYLES = {
  warning: { wrap: 'bg-amber-50/80 dark:bg-amber-900/20 border-amber-200/80 dark:border-amber-800/40', icon: 'text-amber-600 dark:text-amber-400' },
  info:    { wrap: 'bg-slate-50/80 dark:bg-slate-800/50 border-slate-200/80 dark:border-slate-700/50', icon: 'text-slate-600 dark:text-slate-400' },
  success: { wrap: 'bg-emerald-50/80 dark:bg-emerald-900/20 border-emerald-200/80 dark:border-emerald-800/40', icon: 'text-emerald-600 dark:text-emerald-400' },
};
