'use client';

import { useMemo, useState } from 'react';
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
    slate:   { bg: 'bg-white dark:bg-zinc-700 border-slate-200 dark:border-zinc-600',                   icon: 'bg-slate-100 dark:bg-zinc-600 text-slate-600 dark:text-zinc-300',             val: 'text-slate-900 dark:text-zinc-100',   bar: 'bg-slate-900 dark:bg-zinc-300' },
    blue:    { bg: 'bg-blue-50 dark:bg-blue-900/40 border-blue-100 dark:border-blue-800/50',             icon: 'bg-blue-100 dark:bg-blue-800/50 text-blue-600 dark:text-blue-300',           val: 'text-blue-900 dark:text-blue-100',    bar: 'bg-blue-500' },
    emerald: { bg: 'bg-emerald-50 dark:bg-emerald-900/40 border-emerald-100 dark:border-emerald-800/50', icon: 'bg-emerald-100 dark:bg-emerald-800/50 text-emerald-600 dark:text-emerald-300', val: 'text-emerald-900 dark:text-emerald-100', bar: 'bg-emerald-500' },
    violet:  { bg: 'bg-violet-50 dark:bg-violet-900/40 border-violet-100 dark:border-violet-800/50',     icon: 'bg-violet-100 dark:bg-violet-800/50 text-violet-600 dark:text-violet-300',   val: 'text-violet-900 dark:text-violet-100', bar: 'bg-violet-500' },
  };
  const c = colors[color];
  return (
    <div className={`relative overflow-hidden rounded-2xl border p-5 card-shadow ${c.bg}`}>
      <div className={`absolute inset-x-0 top-0 h-0.5 ${c.bar}`} />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">{label}</p>
          <p className={`mt-2 text-2xl font-bold tracking-tight ${c.val}`}>{value}</p>
          {sub && <p className="mt-0.5 text-xs text-slate-400 dark:text-zinc-500">{sub}</p>}
        </div>
        <div className={`rounded-xl p-2.5 ${c.icon}`}>
          <Icon className="h-5 w-5" strokeWidth={2} />
        </div>
      </div>
    </div>
  );
}

// Smooth cubic bezier path builder
function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return '';
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1];
    const curr = pts[i];
    const cpx = (prev.x + curr.x) / 2;
    d += ` C ${cpx} ${prev.y}, ${cpx} ${curr.y}, ${curr.x} ${curr.y}`;
  }
  return d;
}

// Simple SVG line chart — no external deps
function LeadsLineChart({ data }: { data: { label: string; count: number }[] }) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; label: string; count: number } | null>(null);

  // +1 headroom above peak so the line never clips at the top
  const dataMax = Math.max(...data.map((d) => d.count), 0);
  const max = dataMax + 1;

  const W = 600;
  const H = 160;
  // Left pad only for Y-axis labels; right pad matches spec (20px); line starts/ends at edges
  const PAD = { top: 20, right: 20, bottom: 32, left: 28 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const points = data.map((d, i) => ({
    x: PAD.left + (i / (data.length - 1)) * chartW,
    y: PAD.top + chartH - (d.count / max) * chartH,
    label: d.label,
    count: d.count,
  }));

  const linePath = smoothPath(points);
  const areaPath =
    linePath +
    ` L ${points[points.length - 1].x} ${PAD.top + chartH} L ${points[0].x} ${PAD.top + chartH} Z`;

  // Y-axis ticks: 0, 25%, 50%, 75%, 100% of scale
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => ({
    y: PAD.top + t * chartH,
    val: Math.round(max * (1 - t)),
  }));

  return (
    <div className="h-64 w-full">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        preserveAspectRatio="none"
        style={{ height: '100%' }}
      >
        <defs>
          <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6366F1" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
          </linearGradient>
        </defs>

        {/* Grid lines + Y-axis labels */}
        {yTicks.map(({ y, val }) => (
          <g key={y}>
            <line
              x1={PAD.left}
              y1={y}
              x2={PAD.left + chartW}
              y2={y}
              stroke="#e2e8f0"
              strokeWidth={1}
              strokeDasharray="3 3"
            />
            <text x={PAD.left - 6} y={y + 3.5} textAnchor="end" fontSize={8} fill="#94a3b8">
              {val}
            </text>
          </g>
        ))}

        {/* Gradient area fill */}
        <path d={areaPath} fill="url(#colorLeads)" />

        {/* Smooth line — stretches edge to edge within PAD */}
        <path
          d={linePath}
          fill="none"
          stroke="#6366f1"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Dots + hover targets */}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={4} fill="#6366f1" />
            <circle
              cx={p.x}
              cy={p.y}
              r={12}
              fill="transparent"
              onMouseEnter={() => setTooltip(p)}
              onMouseLeave={() => setTooltip(null)}
              style={{ cursor: 'pointer' }}
            />
          </g>
        ))}

        {/* X-axis labels — every 2nd, no tickLine */}
        {points.map((p, i) =>
          i % 2 === 0 ? (
            <text key={i} x={p.x} y={H - 8} textAnchor="middle" fontSize={9} fill="#94a3b8">
              {p.label}
            </text>
          ) : null,
        )}

        {/* Inline tooltip */}
        {tooltip && (() => {
          const tx = Math.min(Math.max(tooltip.x, 44), W - 44);
          const ty = tooltip.y - 14;
          const labelText = `${tooltip.label}: ${tooltip.count}`;
          const tw = labelText.length * 5.5 + 16;
          return (
            <g>
              <rect x={tx - tw / 2} y={ty - 17} width={tw} height={19} rx={4} fill="#1e293b" opacity={0.92} />
              <text x={tx} y={ty - 4} textAnchor="middle" fontSize={9} fill="#f8fafc" fontWeight="600">
                {labelText}
              </text>
            </g>
          );
        })()}
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
        <span className="font-medium text-slate-700 dark:text-zinc-300">{label}</span>
        <span className="font-semibold text-slate-900 dark:text-zinc-100">
          {count} <span className="font-normal text-slate-400 dark:text-zinc-500">({pct}%)</span>
        </span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-zinc-700">
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
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 dark:bg-zinc-800">
        <TrendingUp className="h-8 w-8 text-slate-400 dark:text-zinc-500" />
      </div>
      <h3 className="text-base font-semibold text-slate-800 dark:text-zinc-200">No data yet</h3>
      <p className="mt-1.5 max-w-xs text-sm text-slate-500 dark:text-zinc-400">
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
      <div className="rounded-2xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 card-shadow">
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
      <div className="rounded-2xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-5 card-shadow">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-100">Leads over time</h3>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-zinc-400">New leads added per day — last 14 days</p>
          </div>
          <span className="rounded-full bg-indigo-50 dark:bg-indigo-950/50 px-2.5 py-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
            {stats.leadsPerDay.reduce((s, d) => s + d.count, 0)} total
          </span>
        </div>
        <LeadsLineChart data={stats.leadsPerDay} />
      </div>

      {/* Funnel */}
      <div className="rounded-2xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-5 card-shadow">
        <div className="mb-5">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-100">Lead funnel</h3>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-zinc-400">Conversion stages across your pipeline</p>
        </div>
        <div className="space-y-4">
          <FunnelBar label="Total leads" count={stats.total} total={stats.total} color="bg-slate-400 dark:bg-zinc-500" />
          <div className="flex items-center gap-2 pl-2 text-xs text-slate-400 dark:text-zinc-500">
            <ArrowRight className="h-3 w-3" />
          </div>
          <FunnelBar label="Contacted" count={stats.contacted} total={stats.total} color="bg-amber-400" />
          <div className="flex items-center gap-2 pl-2 text-xs text-slate-400 dark:text-zinc-500">
            <ArrowRight className="h-3 w-3" />
          </div>
          <FunnelBar label="Appointment scheduled" count={stats.scheduled} total={stats.total} color="bg-blue-500" />
          <div className="flex items-center gap-2 pl-2 text-xs text-slate-400 dark:text-zinc-500">
            <ArrowRight className="h-3 w-3" />
          </div>
          <FunnelBar label="Closed / Converted" count={stats.closed} total={stats.total} color="bg-emerald-500" />
        </div>

        {/* Conversion summary */}
        <div className="mt-6 flex items-center gap-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/50 px-4 py-3">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <div>
            <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-300">
              {stats.conversionRate}% conversion rate
            </p>
            <p className="text-xs text-emerald-700 dark:text-emerald-400">
              {stats.closed} of {stats.total} leads converted to clients
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
