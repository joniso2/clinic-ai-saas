'use client';

import {
  Users,
  UserPlus,
  AlertCircle,
  DollarSign,
  TrendingUp,
} from 'lucide-react';
import type { Lead } from '@/types/leads';
import { getDisplayPriority } from '@/types/leads';
import { formatCurrencyILS } from '@/lib/hebrew';

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  iconContainerClass,
  borderAccentClass,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  iconContainerClass: string;
  borderAccentClass: string;
}) {
  return (
    <div
      className={`group relative rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 sm:p-6 shadow-sm dark:shadow-none transition-all duration-300 hover:shadow-md dark:hover:bg-zinc-800/60 hover:-translate-y-0.5 border-s-4 ${borderAccentClass}`}
    >
      <div className="flex items-center gap-4 flex-row-reverse text-right">
        <div className={`shrink-0 rounded-xl p-2 ${iconContainerClass}`}>
          <Icon className="h-5 w-5 shrink-0 text-current" strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
            {label}
          </p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white tabular-nums">
            {value}
          </p>
          {sub != null && (
            <p className="mt-1 text-xs text-slate-400 dark:text-zinc-500">{sub}</p>
          )}
        </div>
      </div>
    </div>
  );
}

const ACCENT = {
  slate: {
    icon: 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300',
    border: 'border-s-slate-400/40 dark:border-s-zinc-500/40',
  },
  blue: {
    icon: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
    border: 'border-s-blue-500/40 dark:border-s-blue-400/40',
  },
  amber: {
    icon: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400',
    border: 'border-s-amber-500/40 dark:border-s-amber-400/40',
  },
  emerald: {
    icon: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400',
    border: 'border-s-emerald-500/40 dark:border-s-emerald-400/40',
  },
  indigo: {
    icon: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400',
    border: 'border-s-indigo-500/40 dark:border-s-indigo-400/40',
  },
};

export function LeadsKpiCards({ leads }: { leads: Lead[] }) {
  const today = new Date().toDateString();
  const newToday = leads.filter(
    (l) => new Date(l.created_at).toDateString() === today
  ).length;
  const highPriority = leads.filter(
    (l) =>
      getDisplayPriority(l) === 'High' || getDisplayPriority(l) === 'Urgent'
  ).length;
  const totalRevenue = leads.reduce(
    (sum, l) => sum + (l.estimated_deal_value ?? 0),
    0
  );
  const closed = leads.filter(
    (l) => l.status === 'Closed' || l.status === 'Converted'
  ).length;
  const conversionRate =
    leads.length > 0
      ? `${Math.round((closed / leads.length) * 100)}%`
      : '0%';

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5" dir="rtl">
      <KpiCard
        label="סה״כ לידים"
        value={leads.length}
        sub="במעקב"
        icon={Users}
        iconContainerClass={ACCENT.slate.icon}
        borderAccentClass={ACCENT.slate.border}
      />
      <KpiCard
        label="חדשים היום"
        value={newToday}
        sub="24 השעות האחרונות"
        icon={UserPlus}
        iconContainerClass={ACCENT.blue.icon}
        borderAccentClass={ACCENT.blue.border}
      />
      <KpiCard
        label="עדיפות גבוהה"
        value={highPriority}
        sub="דורש טיפול"
        icon={AlertCircle}
        iconContainerClass={ACCENT.amber.icon}
        borderAccentClass={ACCENT.amber.border}
      />
      <KpiCard
        label="הכנסה פוטנציאלית"
        value={totalRevenue > 0 ? formatCurrencyILS(totalRevenue) : '—'}
        sub="שווי צינור"
        icon={DollarSign}
        iconContainerClass={ACCENT.emerald.icon}
        borderAccentClass={ACCENT.emerald.border}
      />
      <KpiCard
        label="אחוז המרה"
        value={conversionRate}
        sub="נסגרו / סה״כ"
        icon={TrendingUp}
        iconContainerClass={ACCENT.indigo.icon}
        borderAccentClass={ACCENT.indigo.border}
      />
    </div>
  );
}
