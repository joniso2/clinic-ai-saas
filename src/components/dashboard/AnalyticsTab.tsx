'use client';

import { useMemo } from 'react';
import { TrendingUp, Users, CheckCircle2, Calendar, ArrowRight } from 'lucide-react';
import type { Lead } from '@/types/leads';
import { formatCurrency } from '@/types/leads';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getLast14Days(): string[] {
  const days: string[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toDateString());
  }
  return days;
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MetricCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  color: 'slate' | 'blue' | 'emerald' | 'violet';
}) {
  const colors = {
    slate: { bg: 'bg-slate-50 border-slate-200', icon: 'bg-slate-100 text-slate-600', val: 'text-slate-900', bar: 'bg-slate-900' },
    blue:  { bg: 'bg-blue-50 border-blue-100',   icon: 'bg-blue-100 text-blue-600',   val: 'text-blue-900',  bar: 'bg-blue-500' },
    emerald: { bg: 'bg-emerald-50 border-emerald-100', icon: 'bg-emerald-100 text-emerald-600', val: 'text-emerald-900', bar: 'bg-emerald-500' },
    violet: { bg: 'bg-violet-50 border-violet-100', icon: 'bg-violet-100 text-violet-600', val: 'text-violet-900', bar: 'bg-violet-500' },
  };
  const c = colors[color];
  return (
    <div className={`relative overflow-hidden rounded-2xl border p-5 ${c.bg}`}>
      <div className={`absolute inset-x-0 top-0 h-0.5 ${c.bar}`} />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
          <p className={`mt-2 text-2xl font-bold tracking-tight ${c.val}`}>{value}</p>
          {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
        </div>
        <div className={`rounded-xl p-2.5 ${c.icon}`}>
          <Icon className="h-5 w-5" strokeWidth={2} />
        </div>
      </div>
    </div>
  );
}

// Simple SVG line chart — no external deps
function LeadsLineChart({ data }: { data: { label: string; count: number }[] }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  const W = 600;
  const H = 120;
  const PAD = { top: 12, right: 16, bottom: 28, left: 28 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const points = data.map((d, i) => ({
    x: PAD.left + (i / (data.length - 1)) * chartW,
    y: PAD.top + chartH - (d.count / max) * chartH,
    label: d.label,
    count: d.count,
  }));

  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ');

  const areaD =
    pathD +
    ` L ${points[points.length - 1].x} ${PAD.top + chartH} L ${points[0].x} ${PAD.top + chartH} Z`;

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full min-w-[320px]"
        preserveAspectRatio="none"
        style={{ height: 140 }}
      >
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0.01" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const y = PAD.top + t * chartH;
          return (
            <line
              key={t}
              x1={PAD.left}
              y1={y}
              x2={PAD.left + chartW}
              y2={y}
              stroke="#e2e8f0"
              strokeWidth={1}
            />
          );
        })}

        {/* Area fill */}
        <path d={areaD} fill="url(#areaGrad)" />

        {/* Line */}
        <path d={pathD} fill="none" stroke="#6366f1" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

        {/* Dots */}
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={3} fill="#6366f1" />
        ))}

        {/* X-axis labels — show every 2nd */}
        {points.map((p, i) =>
          i % 2 === 0 ? (
            <text
              key={i}
              x={p.x}
              y={H - 4}
              textAnchor="middle"
              fontSize={9}
              fill="#94a3b8"
            >
              {p.label}
            </text>
          ) : null,
        )}
      </svg>
    </div>
  );
}

// Funnel bar
function FunnelBar({
  label,
  count,
  total,
  color,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="font-semibold text-slate-900">
          {count} <span className="font-normal text-slate-400">({pct}%)</span>
        </span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// Empty state
function AnalyticsEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
        <TrendingUp className="h-8 w-8 text-slate-400" />
      </div>
      <h3 className="text-base font-semibold text-slate-800">No data yet</h3>
      <p className="mt-1.5 max-w-xs text-sm text-slate-500">
        Add leads to your pipeline to start seeing analytics and conversion metrics.
      </p>
    </div>
  );
}

// ─── Main AnalyticsTab ─────────────────────────────────────────────────────────

export function AnalyticsTab({ leads }: { leads: Lead[] }) {
  const stats = useMemo(() => {
    const total = leads.length;
    const contacted = leads.filter((l) => l.status === 'Contacted').length;
    const scheduled = leads.filter((l) => l.status === 'Appointment scheduled').length;
    const closed = leads.filter((l) => l.status === 'Closed' || l.status === 'Converted').length;
    const conversionRate = total > 0 ? Math.round((closed / total) * 100) : 0;
    const totalRevenue = leads.reduce((s, l) => s + (l.estimated_deal_value ?? 0), 0);

    // Leads per day for last 14 days
    const days = getLast14Days();
    const leadsPerDay = days.map((dayStr) => ({
      label: formatShortDate(dayStr),
      count: leads.filter((l) => new Date(l.created_at).toDateString() === dayStr).length,
    }));

    return { total, contacted, scheduled, closed, conversionRate, totalRevenue, leadsPerDay };
  }, [leads]);

  if (leads.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <AnalyticsEmptyState />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Total Leads" value={stats.total} sub="In pipeline" icon={Users} color="slate" />
        <MetricCard label="Conversion Rate" value={`${stats.conversionRate}%`} sub="Closed / total" icon={TrendingUp} color="violet" />
        <MetricCard label="Appointments" value={stats.scheduled} sub="Scheduled" icon={Calendar} color="blue" />
        <MetricCard
          label="Pipeline Value"
          value={stats.totalRevenue > 0 ? formatCurrency(stats.totalRevenue) : '—'}
          sub="Estimated revenue"
          icon={CheckCircle2}
          color="emerald"
        />
      </div>

      {/* Line chart */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Leads over time</h3>
            <p className="mt-0.5 text-xs text-slate-500">New leads added per day — last 14 days</p>
          </div>
          <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-600">
            {stats.leadsPerDay.reduce((s, d) => s + d.count, 0)} total
          </span>
        </div>
        <LeadsLineChart data={stats.leadsPerDay} />
      </div>

      {/* Funnel */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-5">
          <h3 className="text-sm font-semibold text-slate-900">Lead funnel</h3>
          <p className="mt-0.5 text-xs text-slate-500">Conversion stages across your pipeline</p>
        </div>
        <div className="space-y-4">
          <FunnelBar label="Total leads" count={stats.total} total={stats.total} color="bg-slate-400" />
          <div className="flex items-center gap-2 pl-2 text-xs text-slate-400">
            <ArrowRight className="h-3 w-3" />
          </div>
          <FunnelBar label="Contacted" count={stats.contacted} total={stats.total} color="bg-amber-400" />
          <div className="flex items-center gap-2 pl-2 text-xs text-slate-400">
            <ArrowRight className="h-3 w-3" />
          </div>
          <FunnelBar label="Appointment scheduled" count={stats.scheduled} total={stats.total} color="bg-blue-500" />
          <div className="flex items-center gap-2 pl-2 text-xs text-slate-400">
            <ArrowRight className="h-3 w-3" />
          </div>
          <FunnelBar label="Closed / Converted" count={stats.closed} total={stats.total} color="bg-emerald-500" />
        </div>

        {/* Conversion summary */}
        <div className="mt-6 flex items-center gap-3 rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
          <div>
            <p className="text-sm font-semibold text-emerald-900">
              {stats.conversionRate}% conversion rate
            </p>
            <p className="text-xs text-emerald-700">
              {stats.closed} of {stats.total} leads converted to clients
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
