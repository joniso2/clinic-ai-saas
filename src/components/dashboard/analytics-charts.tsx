'use client';

import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Info,
  CheckCircle2,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type {
  AnalyticsData,
  FunnelStage,
  Insight,
} from '@/services/analytics.service';
import { fmt, fmtHours, FUNNEL_LABELS, FUNNEL_COLORS, SERVICE_COLORS, INSIGHT_STYLES } from './analytics-helpers';
import type { Preset } from './analytics-helpers';

// ─── Trend badge (RTL: arrow on right) ───────────────────────────────────────

export function TrendBadge({ pct }: { pct: number | null }) {
  if (pct === null) return null;
  const positive = pct >= 0;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
        positive
          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
          : 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400'
      }`}
    >
      <span>{Math.abs(pct)}%</span>
      {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
    </span>
  );
}

// ─── Date Range Control ─────────────────────────────────────────────────────

import { PRESETS } from './analytics-helpers';

export function DateRangeControl({
  preset,
  customFrom,
  customTo,
  onPreset,
  onCustomChange,
}: {
  preset: Preset;
  customFrom: string;
  customTo: string;
  onPreset: (p: Preset) => void;
  onCustomChange: (from: string, to: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 flex-row-reverse justify-end">
      <div className="inline-flex items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-0.5">
        {PRESETS.map((p) => (
          <button
            key={p.value}
            onClick={() => onPreset(p.value)}
            className={`transition-all duration-150 ${
              preset === p.value
                ? 'rounded-md bg-white dark:bg-slate-700 shadow-sm px-3 py-1.5 text-[13px] font-semibold text-slate-900 dark:text-slate-100'
                : 'px-3 py-1.5 text-[13px] font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      {preset === 'custom' && (
        <div className="flex items-center gap-2 flex-row-reverse">
          <input
            type="date"
            value={customTo}
            onChange={(e) => onCustomChange(customFrom, e.target.value)}
            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-2 text-xs text-slate-700 dark:text-slate-300 text-right focus:outline-none focus:ring-2 focus:ring-slate-400/50 dark:focus:ring-slate-500/50"
          />
          <span className="text-xs text-slate-400 dark:text-slate-500">–</span>
          <input
            type="date"
            value={customFrom}
            onChange={(e) => onCustomChange(e.target.value, customTo)}
            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-2 text-xs text-slate-700 dark:text-slate-300 text-right focus:outline-none focus:ring-2 focus:ring-slate-400/50 dark:focus:ring-slate-500/50"
          />
        </div>
      )}
    </div>
  );
}

// ─── Chart Section Wrapper ──────────────────────────────────────────────────

export function ChartSection({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-950/80 p-6 shadow-sm">
      <div className="mb-5 text-right">
        <h3 className="text-[11px] font-semibold text-slate-400 uppercase tracking-[0.12em]">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

// ─── Actual Revenue Area Chart ───────────────────────────────────────────────

export function ActualRevenueChart({ data }: { data: { label: string; revenue: number }[] }) {
  const hasRevenue = data.some((d) => d.revenue > 0);
  if (data.length < 2 || !hasRevenue) {
    return <p className="text-center text-sm text-slate-400 py-8">אין נתוני הכנסה בפועל לתקופה זו</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
        <defs>
          <linearGradient id="actualRevGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity={0.2} />
            <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} reversed />
        <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} width={50} tickFormatter={(v: number) => v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)} />
        <Tooltip
          contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12, direction: 'rtl' }}
          formatter={(value) => [fmt(Number(value)), 'הכנסה בפועל']}
        />
        <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} fill="url(#actualRevGrad)" name="revenue" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ─── Leads Per Day Bar Chart ────────────────────────────────────────────────

export function LeadsPerDayChart({ data }: { data: { label: string; leads: number }[] }) {
  if (data.length < 2) {
    return <p className="text-center text-sm text-slate-400 py-8">אין מספיק נתונים לתרשים</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} reversed />
        <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} width={30} allowDecimals={false} />
        <Tooltip
          contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12, direction: 'rtl' }}
          formatter={(value) => [Number(value), 'לידים חדשים']}
        />
        <Bar dataKey="leads" fill="#6366f1" radius={[3, 3, 0, 0]} barSize={12} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── Funnel ─────────────────────────────────────────────────────────────────

export function FunnelChart({ stages }: { stages: FunnelStage[] }) {
  const max = stages[0]?.count ?? 1;
  return (
    <div className="space-y-0">
      {stages.map((stage, i) => {
        const pctVal = max > 0 ? Math.round((stage.count / max) * 100) : 0;
        const isHighDrop = stage.dropOffPct >= 50;
        const isLast = i === stages.length - 1;
        return (
          <div
            key={stage.name}
            className={`space-y-2 ${i > 0 ? 'border-t border-slate-100/60 dark:border-slate-800/60' : ''} ${!isLast ? 'pb-5' : ''}`}
          >
            <div className="flex items-center justify-between flex-row-reverse text-right gap-2">
              <div className="flex items-center gap-2 flex-row-reverse">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  {FUNNEL_LABELS[stage.name] ?? stage.name}
                </span>
                {stage.isWorstDropOff && (
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                      isHighDrop
                        ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-700/40'
                        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200/60 dark:border-slate-700/50 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <AlertTriangle className="h-2.5 w-2.5 opacity-60" aria-hidden />
                    נשירה {stage.dropOffPct}%
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 flex-row-reverse">
                <span className="text-sm font-semibold tracking-tight tabular-nums text-slate-900 dark:text-white">
                  {stage.count}
                </span>
                {i > 0 && (
                  <span className={`text-xs text-slate-400 dark:text-slate-500 ${stage.count === 0 ? 'opacity-70' : ''}`}>
                    {stage.fromPreviousPct}% מהשלב הקודם
                  </span>
                )}
              </div>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
              <div
                className={`h-full rounded-full transition-all duration-700 ease-out ${isHighDrop && stage.isWorstDropOff ? 'ring-2 ring-amber-400/50' : ''}`}
                style={{ width: `${pctVal}%`, background: FUNNEL_COLORS[i] ?? '#94a3b8' }}
              />
            </div>
            {i < stages.length - 1 && (
              <p className={`text-xs text-slate-400 dark:text-slate-500 text-right ${stages[i + 1].count === 0 ? 'opacity-70' : ''}`}>
                {stages[i + 1].dropOffPct}% נשירה לשלב הבא
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Top Services Bar Chart ─────────────────────────────────────────────────

export function TopServicesChart({ data }: { data: { serviceName: string; total: number; count: number }[] }) {
  if (data.length === 0) {
    return <p className="text-center text-sm text-slate-400 py-8">אין נתוני שירותים לתקופה זו</p>;
  }
  const top = data.slice(0, 5);
  return (
    <ResponsiveContainer width="100%" height={Math.max(top.length * 48, 120)}>
      <BarChart data={top} layout="vertical" margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={(v: number) => fmt(v)} />
        <YAxis type="category" dataKey="serviceName" tick={{ fontSize: 12, fill: '#64748b' }} tickLine={false} axisLine={false} width={120} />
        <Tooltip
          contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12, direction: 'rtl' }}
          formatter={(value) => [fmt(Number(value)), 'הכנסה']}
        />
        <Bar dataKey="total" radius={[0, 4, 4, 0]} barSize={24}>
          {top.map((_, idx) => (
            <Cell key={idx} fill={SERVICE_COLORS[idx] ?? '#e0e7ff'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── Appointment Status Breakdown ───────────────────────────────────────────

export function AppointmentBreakdown({ metrics }: { metrics: AnalyticsData['appointmentMetrics'] }) {
  const segments = [
    { label: 'הושלמו', count: metrics.completed, color: 'bg-emerald-500' },
    { label: 'מתוכננים', count: metrics.scheduled, color: 'bg-indigo-500' },
    { label: 'בוטלו', count: metrics.cancelled, color: 'bg-red-400' },
    { label: 'לא הופיעו', count: metrics.noShow, color: 'bg-amber-400' },
  ];
  const total = metrics.total || 1;

  return (
    <div className="space-y-4">
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        {segments.map((seg) => (
          seg.count > 0 && (
            <div
              key={seg.label}
              className={`${seg.color} transition-all duration-500`}
              style={{ width: `${(seg.count / total) * 100}%` }}
            />
          )
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {segments.map((seg) => (
          <div key={seg.label} className="flex items-center gap-2 flex-row-reverse text-right">
            <div className={`h-2.5 w-2.5 rounded-full ${seg.color}`} />
            <span className="text-[13px] text-slate-600 dark:text-slate-400">{seg.label}</span>
            <span className="text-[13px] font-semibold tabular-nums text-slate-900 dark:text-slate-100 me-auto">
              {seg.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Response Time Card + Trend ──────────────────────────────────────────────

export function ResponseTimeSection({ efficiency }: { efficiency: AnalyticsData['kpi']['efficiency'] }) {
  const avg = efficiency.avgResponseTimeHours;
  const med = efficiency.medianResponseTimeHours;
  const p30 = efficiency.pctWithin30Min;
  const p60 = efficiency.pctWithin1Hour;

  const stats = [
    { label: 'זמן תגובה ממוצע', value: avg !== null ? fmtHours(avg) : '—' },
    { label: 'זמן תגובה חציוני', value: med !== null ? fmtHours(med) : '—' },
    { label: 'מענה תוך 30 דקות', value: p30 !== null ? `${p30}%` : '—' },
    { label: 'מענה תוך שעה', value: p60 !== null ? `${p60}%` : '—' },
  ];

  const sparkline = efficiency.responseTimeSparkline;
  const trendData = sparkline.length >= 2
    ? sparkline.map((v, i) => ({ day: `יום ${i + 1}`, hours: Math.round(v * 10) / 10 }))
    : null;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl bg-slate-50/80 dark:bg-slate-800/60 px-3 py-3 text-right">
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{s.label}</p>
            <p className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-50">{s.value}</p>
          </div>
        ))}
      </div>
      {trendData && (
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
          <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 text-right mb-3">מגמת זמן תגובה (7 ימים אחרונים)</p>
          <ResponsiveContainer width="100%" height={120}>
            <LineChart data={trendData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} reversed />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} width={30} />
              <Tooltip
                contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12, direction: 'rtl' }}
                formatter={(value) => [`${Number(value)} שעות`, 'זמן תגובה ממוצע']}
              />
              <Line type="monotone" dataKey="hours" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3, fill: '#f59e0b' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

// ─── Appointments Utilization Chart ─────────────────────────────────────────

export function AppointmentsUtilizationChart({ data }: { data: { label: string; total: number; completed: number; cancelled: number }[] }) {
  if (data.length < 2) {
    return <p className="text-center text-sm text-slate-400 py-8">אין מספיק נתונים לתרשים</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} reversed />
        <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} width={25} allowDecimals={false} />
        <Tooltip
          contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12, direction: 'rtl' }}
          formatter={(value, name) => [
            Number(value),
            name === 'completed' ? 'הושלמו' : name === 'cancelled' ? 'בוטלו' : 'סה״כ',
          ]}
        />
        <Bar dataKey="total" fill="#c7d2fe" radius={[3, 3, 0, 0]} barSize={10} name="total" />
        <Bar dataKey="completed" fill="#10b981" radius={[3, 3, 0, 0]} barSize={10} name="completed" />
        <Bar dataKey="cancelled" fill="#f87171" radius={[3, 3, 0, 0]} barSize={10} name="cancelled" />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── Insights ───────────────────────────────────────────────────────────────

export function InsightRow({ insight }: { insight: Insight }) {
  const s = INSIGHT_STYLES[insight.type];
  const Icon = insight.type === 'warning' ? AlertTriangle : insight.type === 'success' ? CheckCircle2 : Info;
  return (
    <div dir="rtl" className={`flex items-start gap-3 rounded-xl border p-4 text-right ${s.wrap}`}>
      <Icon className={`h-4 w-4 shrink-0 mt-0.5 ${s.icon}`} aria-hidden />
      <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300 flex-1 min-w-0 text-right">{insight.message}</p>
    </div>
  );
}

// ─── Skeleton & Empty ────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800/60 ${className ?? ''}`} />;
}

export function AnalyticsSkeleton() {
  return (
    <div className="space-y-8">
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
      </div>
      <div className="grid gap-6 lg:grid-cols-5">
        <Skeleton className="lg:col-span-3 h-80" />
        <Skeleton className="lg:col-span-2 h-80" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
      <Skeleton className="h-40" />
    </div>
  );
}

export function AnalyticsEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
        <TrendingUp className="h-8 w-8 text-slate-400 dark:text-slate-500" />
      </div>
      <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">אין מספיק נתונים להצגת אנליטיקה</h3>
      <p className="mt-2 max-w-sm text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
        לאחר קבלת לידים ותורים, יוצגו נתונים כאן.
      </p>
    </div>
  );
}
