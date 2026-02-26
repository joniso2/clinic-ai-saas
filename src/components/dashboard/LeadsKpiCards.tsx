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
  colorScheme,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  colorScheme: 'slate' | 'blue' | 'amber' | 'emerald' | 'violet';
}) {
  const schemes = {
    slate: {
      card: 'bg-white border-slate-200',
      iconBg: 'bg-slate-100',
      iconColor: 'text-slate-600',
      accent: 'bg-slate-900',
      label: 'text-slate-500',
      value: 'text-slate-900',
    },
    blue: {
      card: 'bg-blue-50 border-blue-100',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      accent: 'bg-blue-600',
      label: 'text-blue-600',
      value: 'text-blue-900',
    },
    amber: {
      card: 'bg-amber-50 border-amber-100',
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      accent: 'bg-amber-500',
      label: 'text-amber-700',
      value: 'text-amber-900',
    },
    emerald: {
      card: 'bg-emerald-50 border-emerald-100',
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
      accent: 'bg-emerald-600',
      label: 'text-emerald-700',
      value: 'text-emerald-900',
    },
    violet: {
      card: 'bg-violet-50 border-violet-100',
      iconBg: 'bg-violet-100',
      iconColor: 'text-violet-600',
      accent: 'bg-violet-600',
      label: 'text-violet-700',
      value: 'text-violet-900',
    },
  };

  const s = schemes[colorScheme];

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${s.card}`}
    >
      {/* Top accent bar */}
      <div className={`absolute inset-x-0 top-0 h-0.5 ${s.accent}`} />

      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className={`text-xs font-semibold uppercase tracking-wider ${s.label}`}>
            {label}
          </p>
          <p className={`mt-2 text-2xl font-bold tracking-tight ${s.value}`}>
            {value}
          </p>
          {sub != null && (
            <p className={`mt-0.5 text-xs ${s.label} opacity-70`}>{sub}</p>
          )}
        </div>
        <div className={`shrink-0 rounded-xl p-2.5 ${s.iconBg}`}>
          <Icon className={`h-5 w-5 ${s.iconColor}`} strokeWidth={2} />
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
        colorScheme="slate"
      />
      <KpiCard
        label="New Today"
        value={newToday}
        sub="Last 24h"
        icon={UserPlus}
        colorScheme="blue"
      />
      <KpiCard
        label="High Priority"
        value={highPriority}
        sub="Need attention"
        icon={AlertCircle}
        colorScheme="amber"
      />
      <KpiCard
        label="Potential Revenue"
        value={totalRevenue > 0 ? formatCurrency(totalRevenue) : '—'}
        sub="Pipeline value"
        icon={DollarSign}
        colorScheme="emerald"
      />
      <KpiCard
        label="Conversion Rate"
        value={conversionRate}
        sub="Closed / total"
        icon={TrendingUp}
        colorScheme="violet"
      />
    </div>
  );
}
