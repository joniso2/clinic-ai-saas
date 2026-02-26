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
  gradient,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  gradient: string;
}) {
  return (
    <div
      className={
        'group relative overflow-hidden rounded-2xl border border-white/20 bg-white/70 p-5 shadow-lg shadow-slate-200/50 backdrop-blur-sm transition-all duration-300 hover:shadow-xl hover:shadow-slate-200/60 ' +
        gradient
      }
    >
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {label}
          </p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
            {value}
          </p>
          {sub != null && (
            <p className="mt-0.5 text-xs text-slate-500">{sub}</p>
          )}
        </div>
        <div className="rounded-xl bg-slate-900/5 p-2.5 transition-colors group-hover:bg-slate-900/10">
          <Icon className="h-5 w-5 text-slate-600" strokeWidth={2} />
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
        gradient=""
      />
      <KpiCard
        label="New Today"
        value={newToday}
        sub="Last 24h"
        icon={UserPlus}
        gradient=""
      />
      <KpiCard
        label="High Priority"
        value={highPriority}
        sub="Need attention"
        icon={AlertCircle}
        gradient=""
      />
      <KpiCard
        label="Potential Revenue"
        value={totalRevenue > 0 ? formatCurrency(totalRevenue) : '—'}
        sub="Pipeline value"
        icon={DollarSign}
        gradient=""
      />
      <KpiCard
        label="Conversion Rate"
        value={conversionRate}
        sub="Closed / total"
        icon={TrendingUp}
        gradient=""
      />
    </div>
  );
}
