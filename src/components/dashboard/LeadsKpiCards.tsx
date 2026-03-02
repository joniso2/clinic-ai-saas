'use client';

import {
  Users,
  UserPlus,
  AlertCircle,
  DollarSign,
  TrendingUp,
} from 'lucide-react';
import type { Lead } from '@/types/leads';
import { getDisplayPriority, formatCurrency } from '@/types/leads';

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  iconColor,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  iconColor: string;
}) {
  return (
    <div className="group relative rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {label}
          </p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            {value}
          </p>
          {sub != null && (
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{sub}</p>
          )}
        </div>
        <div className="shrink-0 rounded-xl bg-slate-50 dark:bg-slate-800 p-2.5">
          <Icon className={`h-5 w-5 ${iconColor}`} strokeWidth={2} />
        </div>
      </div>
    </div>
  );
}

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
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <KpiCard
        label="Total Leads"
        value={leads.length}
        sub="In pipeline"
        icon={Users}
        iconColor="text-slate-500 dark:text-slate-400"
      />
      <KpiCard
        label="New Today"
        value={newToday}
        sub="Last 24h"
        icon={UserPlus}
        iconColor="text-blue-500 dark:text-blue-400"
      />
      <KpiCard
        label="High Priority"
        value={highPriority}
        sub="Need attention"
        icon={AlertCircle}
        iconColor="text-amber-500 dark:text-amber-400"
      />
      <KpiCard
        label="Potential Revenue"
        value={totalRevenue > 0 ? formatCurrency(totalRevenue) : '—'}
        sub="Pipeline value"
        icon={DollarSign}
        iconColor="text-emerald-500 dark:text-emerald-400"
      />
      <KpiCard
        label="Conversion Rate"
        value={conversionRate}
        sub="Closed / total"
        icon={TrendingUp}
        iconColor="text-violet-500 dark:text-violet-400"
      />
    </div>
  );
}
