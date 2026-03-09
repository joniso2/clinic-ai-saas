'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Users,
  CheckCircle2,
  Calendar,
  Clock,
  AlertTriangle,
  Info,
  Target,
  Percent,
  Banknote,
  UsersRound,
  ReceiptText,
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

// ─── Date Range Types ────────────────────────────────────────────────────────

type Preset = '7d' | '30d' | '90d' | 'custom';

function getPresetRange(preset: Preset): { from: string; to: string } | null {
  if (preset === 'custom') return null;
  const to   = new Date();
  const days = preset === '7d' ? 7 : preset === '90d' ? 90 : 30;
  const from = new Date(to.getTime() - days * 86_400_000);
  return { from: from.toISOString(), to: to.toISOString() };
}

function toInputDate(iso: string): string {
  return iso.slice(0, 10);
}

async function fetchAnalytics(
  preset: Preset,
  customFrom: string,
  customTo: string,
): Promise<AnalyticsData | null> {
  let url: string;
  if (preset === 'custom' && customFrom && customTo) {
    url = `/api/analytics?from=${encodeURIComponent(customFrom)}&to=${encodeURIComponent(customTo)}`;
  } else {
    url = `/api/analytics?preset=${preset}`;
  }
  const res = await fetch(url, { credentials: 'include', cache: 'no-store' });
  if (!res.ok) return null;
  const json = await res.json() as { analytics?: AnalyticsData };
  return json.analytics ?? null;
}

// ─── Formatting (Hebrew) ─────────────────────────────────────────────────────

function fmt(n: number): string {
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtHours(h: number): string {
  if (h < 1) return `${Math.round(h * 60)} דקות`;
  const fixed = Math.round(h * 10) / 10;
  return fixed === 1 ? 'שעה' : `${fixed} שעות`;
}

// ─── Trend badge (RTL: arrow on right) ───────────────────────────────────────

function TrendBadge({ pct }: { pct: number | null }) {
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

// ─── KPI Card ────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  iconBg,
  trend,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  iconBg: string;
  trend?: React.ReactNode;
}) {
  return (
    <div className="group rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-950/80 p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3 flex-row-reverse text-right">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
            {label}
          </p>
          <p className="mt-1.5 text-[28px] font-bold tabular-nums tracking-tight text-slate-900 dark:text-slate-50">{value}</p>
          {sub && <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">{sub}</p>}
          {trend && <div className="mt-1.5">{trend}</div>}
        </div>
        <div className={`shrink-0 h-10 w-10 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform ${iconBg}`}>
          <Icon className="h-4 w-4" strokeWidth={2} />
        </div>
      </div>
    </div>
  );
}

// ─── Date Range Control ─────────────────────────────────────────────────────

const PRESETS: { label: string; value: Preset }[] = [
  { label: '7 ימים', value: '7d' },
  { label: '30 יום', value: '30d' },
  { label: '90 יום', value: '90d' },
  { label: 'מותאם אישית', value: 'custom' },
];

function DateRangeControl({
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

function ChartSection({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
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

function ActualRevenueChart({ data }: { data: { label: string; revenue: number }[] }) {
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

function LeadsPerDayChart({ data }: { data: { label: string; leads: number }[] }) {
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

const FUNNEL_LABELS: Record<string, string> = { Leads: 'ליד', Contacted: 'קשר', Appointments: 'תור', Closed: 'סגור' };
const FUNNEL_COLORS = ['#94a3b8', '#818cf8', '#6366f1', '#10b981'];

function FunnelChart({ stages }: { stages: FunnelStage[] }) {
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

const SERVICE_COLORS = ['#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe', '#e0e7ff'];

function TopServicesChart({ data }: { data: { serviceName: string; total: number; count: number }[] }) {
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

function AppointmentBreakdown({ metrics }: { metrics: AnalyticsData['appointmentMetrics'] }) {
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
            <span className="text-[13px] font-semibold tabular-nums text-slate-900 dark:text-slate-100 mr-auto">
              {seg.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Response Time Card + Trend ──────────────────────────────────────────────

function ResponseTimeSection({ efficiency }: { efficiency: AnalyticsData['kpi']['efficiency'] }) {
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

  // Convert sparkline (7 values) to chart data
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

function AppointmentsUtilizationChart({ data }: { data: { label: string; total: number; completed: number; cancelled: number }[] }) {
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

const INSIGHT_STYLES = {
  warning: { wrap: 'bg-amber-50/80 dark:bg-amber-900/20 border-amber-200/80 dark:border-amber-800/40', icon: 'text-amber-600 dark:text-amber-400' },
  info:    { wrap: 'bg-slate-50/80 dark:bg-slate-800/50 border-slate-200/80 dark:border-slate-700/50', icon: 'text-slate-600 dark:text-slate-400' },
  success: { wrap: 'bg-emerald-50/80 dark:bg-emerald-900/20 border-emerald-200/80 dark:border-emerald-800/40', icon: 'text-emerald-600 dark:text-emerald-400' },
};

function InsightRow({ insight }: { insight: Insight }) {
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

function AnalyticsSkeleton() {
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

function AnalyticsEmptyState() {
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

// ─── Main Component ───────────────────────────────────────────────────────────

export function AnalyticsTab() {
  const [preset, setPreset] = useState<Preset>('30d');
  const [customFrom, setCustomFrom] = useState<string>(toInputDate(new Date(Date.now() - 30 * 86_400_000).toISOString()));
  const [customTo, setCustomTo] = useState<string>(toInputDate(new Date().toISOString()));
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async (p: Preset, from: string, to: string) => {
    setLoading(true);
    setError(false);
    try {
      const result = await fetchAnalytics(p, from, to);
      setData(result);
      if (!result) setError(true);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(preset, customFrom, customTo);
  }, [load, preset, customFrom, customTo]);

  const handlePreset = (p: Preset) => {
    setPreset(p);
    if (p !== 'custom') {
      const range = getPresetRange(p);
      if (range) {
        setCustomFrom(toInputDate(range.from));
        setCustomTo(toInputDate(range.to));
      }
    }
  };

  const handleCustomChange = (from: string, to: string) => {
    setCustomFrom(from);
    setCustomTo(to);
    if (from && to) setPreset('custom');
  };

  const periodLabel = preset === '7d' ? '7 ימים' : preset === '90d' ? '90 יום' : preset === 'custom' ? 'מותאם' : '30 יום';

  return (
    <div className="space-y-8" dir="rtl">
      {/* Date Range */}
      <div className="flex flex-wrap items-center justify-end gap-4">
        <DateRangeControl
          preset={preset}
          customFrom={customFrom}
          customTo={customTo}
          onPreset={handlePreset}
          onCustomChange={handleCustomChange}
        />
      </div>

      {loading && <AnalyticsSkeleton />}

      {!loading && error && (
        <div className="rounded-2xl border border-red-200 dark:border-red-900/40 bg-red-50/50 dark:bg-red-950/20 p-6 text-center text-sm text-red-600 dark:text-red-400">
          טעינת אנליטיקה נכשלה. נסה לרענן את הדף.
        </div>
      )}

      {!loading && !error && data?.totalLeads === 0 && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-950/80 shadow-sm">
          <AnalyticsEmptyState />
        </div>
      )}

      {!loading && !error && data && data.totalLeads > 0 && (
        <>
          {/* Row 1: 5 KPI Cards */}
          <section className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
            <KpiCard
              label={`לידים חדשים (${periodLabel})`}
              value={data.kpi.leadsCount.current}
              sub={data.kpi.leadsCount.previous > 0 ? `לעומת ${data.kpi.leadsCount.previous} בתקופה קודמת` : undefined}
              icon={Users}
              iconBg="bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400"
              trend={<TrendBadge pct={data.kpi.leadsCount.changePct} />}
            />
            <KpiCard
              label="אחוז סגירה"
              value={`${data.kpi.closeRate.current}%`}
              sub={data.kpi.closeRate.previous > 0 ? `לעומת ${data.kpi.closeRate.previous}% קודם` : undefined}
              icon={Percent}
              iconBg="bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400"
              trend={<TrendBadge pct={data.kpi.closeRate.changePct} />}
            />
            <KpiCard
              label="זמן תגובה ממוצע"
              value={data.kpi.efficiency.avgResponseTimeHours !== null ? fmtHours(data.kpi.efficiency.avgResponseTimeHours) : '—'}
              sub="מיצירת ליד ליצירת קשר (משוער)"
              icon={Clock}
              iconBg="bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
            />
            <KpiCard
              label="הכנסה בפועל"
              value={fmt(data.kpi.actualRevenue.current)}
              sub={data.revenueMetrics.documentCount > 0 ? `${data.revenueMetrics.documentCount} מסמכים` : 'ללא מסמכי חיוב'}
              icon={Banknote}
              iconBg="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
              trend={<TrendBadge pct={data.kpi.actualRevenue.changePct} />}
            />
            <KpiCard
              label="תורים"
              value={data.kpi.appointmentsCount.current}
              sub={data.kpi.cancelledAppointments > 0 ? `${data.kpi.cancelledAppointments} בוטלו` : undefined}
              icon={Calendar}
              iconBg="bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400"
              trend={<TrendBadge pct={data.kpi.appointmentsCount.changePct} />}
            />
          </section>

          {/* Row 2: Actual Revenue (wide) + Funnel (narrow) */}
          <div className="grid gap-6 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <ChartSection title="הכנסה בפועל לאורך זמן" subtitle="מבוסס על מסמכי חיוב שהופקו">
                <ActualRevenueChart data={data.leadsPerDay} />
              </ChartSection>
            </div>
            <div className="lg:col-span-2">
              <ChartSection title="משפך המרות" subtitle="ליד → קשר → תור → סגור">
                <FunnelChart stages={data.funnel} />
              </ChartSection>
            </div>
          </div>

          {/* Row 3: Leads Per Day + Top Services */}
          <div className="grid gap-6 lg:grid-cols-2">
            <ChartSection title="לידים חדשים לאורך זמן">
              <LeadsPerDayChart data={data.leadsPerDay} />
            </ChartSection>
            <ChartSection title="הכנסה לפי שירות" subtitle="מבוסס על מסמכי חיוב שהופקו">
              <TopServicesChart data={data.revenueByService} />
            </ChartSection>
          </div>

          {/* Row 4: Appointment Status + Utilization */}
          <div className="grid gap-6 lg:grid-cols-2">
            <ChartSection title="תורים — פילוח סטטוס">
              <AppointmentBreakdown metrics={data.appointmentMetrics} />
            </ChartSection>
            <ChartSection title="ניצולת תורים לאורך זמן" subtitle="תורים ליום — סה״כ, הושלמו, בוטלו">
              <AppointmentsUtilizationChart data={data.appointmentsPerDay} />
            </ChartSection>
          </div>

          {/* Row 5: Response Time (with trend) + Customer KPIs */}
          <div className="grid gap-6 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <ChartSection title="זמן תגובה וביצועים" subtitle="ממוצע וחציון, אחוז מענה מהיר (משוער)">
                <ResponseTimeSection efficiency={data.kpi.efficiency} />
              </ChartSection>
            </div>
            <div className="lg:col-span-2 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <KpiCard
                  label="לקוחות חדשים"
                  value={data.kpi.customersCount.current}
                  icon={UsersRound}
                  iconBg="bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400"
                  trend={<TrendBadge pct={data.kpi.customersCount.changePct} />}
                />
                <KpiCard
                  label="לקוחות חוזרים"
                  value={data.customerMetrics.returning}
                  sub={`מתוך ${data.customerMetrics.totalActive} פעילים`}
                  icon={ReceiptText}
                  iconBg="bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400"
                />
              </div>
              <KpiCard
                label="הכנסה פוטנציאלית"
                value={fmt(data.kpi.discordRevenue.current)}
                sub="מלידים שנסגרו (estimated_deal_value)"
                icon={Target}
                iconBg="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                trend={<TrendBadge pct={data.kpi.discordRevenue.changePct} />}
              />
            </div>
          </div>

          {/* Row 5: AI Insights */}
          <section className="border border-purple-200/60 dark:border-purple-800/40 bg-gradient-to-br from-purple-50 to-indigo-50/40 dark:from-purple-950/30 dark:to-indigo-950/30 rounded-xl p-4">
            <div className="mb-5 flex items-center justify-end gap-3 flex-row-reverse text-right">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-100 dark:bg-purple-900/40 shrink-0">
                <Target className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
              </div>
              <div className="w-full min-w-0">
                <h3 className="text-[11px] font-semibold text-slate-400 uppercase tracking-[0.12em] text-right">תובנות מערכת</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 text-right mt-0.5">נוצרו אוטומטית מנתוני הצינור</p>
              </div>
            </div>
            <div className="space-y-3">
              {data.insights.map((insight, i) => (
                <InsightRow key={i} insight={insight} />
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
