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
  CalendarX2,
} from 'lucide-react';
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
  const res = await fetch(url, { credentials: 'include' });
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

function fmtDays(d: number): string {
  if (d < 1) return `${Math.round(d * 24)} שעות`;
  const fixed = Math.round(d * 10) / 10;
  return fixed === 1 ? 'יום' : `${fixed} ימים`;
}

// ─── Sparkline ──────────────────────────────────────────────────────────────

function Sparkline({ data, color = '#6366f1', invert }: { data: number[]; color?: string; invert?: boolean }) {
  if (!data || data.length < 2) return <div className="w-full h-10 min-w-[80px]" />;
  const max = Math.max(...data, 0.01);
  const W = 120;
  const H = 36;
  const points = data.map((v, i) => ({
    x: (i / (data.length - 1)) * W,
    y: H - Math.max((v / max) * H * (invert ? -1 : 1), 0),
  }));
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cpx = (prev.x + curr.x) / 2;
    d += ` C ${cpx} ${prev.y}, ${cpx} ${curr.y}, ${curr.x} ${curr.y}`;
  }
  const area = d + ` L ${points[points.length - 1].x} ${H} L ${points[0].x} ${H} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-10 min-w-[80px] shrink-0" aria-hidden="true">
      <defs>
        <linearGradient id={`sg-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.2} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#sg-${color.replace('#', '')})`} />
      <path d={d} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
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

// ─── KPI Strip Card (Executive Summary) ───────────────────────────────────────

function KpiStripCard({
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
    <div className="rounded-xl border border-slate-200/80 dark:border-zinc-700/80 bg-white dark:bg-zinc-900/80 p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3 flex-row-reverse text-right">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-zinc-400">
            {label}
          </p>
          <p className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900 dark:text-zinc-100">{value}</p>
          {sub && <p className="mt-0.5 text-[11px] text-slate-400 dark:text-zinc-500">{sub}</p>}
          {trend && <div className="mt-1.5">{trend}</div>}
        </div>
        <div className={`shrink-0 rounded-lg p-2 ${iconBg}`}>
          <Icon className="h-4 w-4 text-slate-600 dark:text-zinc-300" strokeWidth={2} />
        </div>
      </div>
    </div>
  );
}

// ─── Date Range Control (Segmented, RTL) ─────────────────────────────────────

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
      <div className="flex rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50/80 dark:bg-zinc-800/80 p-1 gap-0.5">
        {PRESETS.map((p) => (
          <button
            key={p.value}
            onClick={() => onPreset(p.value)}
            className={`rounded-lg px-3 py-2 text-xs font-medium transition-all duration-150 ${
              preset === p.value
                ? 'bg-white dark:bg-zinc-700 text-slate-900 dark:text-zinc-100 shadow-sm ring-1 ring-slate-200/80 dark:ring-zinc-600'
                : 'text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200'
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
            className="rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2.5 py-2 text-xs text-slate-700 dark:text-zinc-300 text-right focus:outline-none focus:ring-2 focus:ring-slate-400/50 dark:focus:ring-zinc-500/50"
          />
          <span className="text-xs text-slate-400 dark:text-zinc-500">–</span>
          <input
            type="date"
            value={customFrom}
            onChange={(e) => onCustomChange(e.target.value, customTo)}
            className="rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2.5 py-2 text-xs text-slate-700 dark:text-zinc-300 text-right focus:outline-none focus:ring-2 focus:ring-slate-400/50 dark:focus:ring-zinc-500/50"
          />
        </div>
      )}
    </div>
  );
}

// ─── Funnel (ליד → קשר → תור → סגור) ───────────────────────────────────────

const FUNNEL_LABELS: Record<string, string> = { Leads: 'ליד', Contacted: 'קשר', Appointments: 'תור', Closed: 'סגור' };
const FUNNEL_BAR_GRADIENTS = [
  'bg-gradient-to-l from-slate-400 to-slate-300 dark:from-slate-500 dark:to-slate-400',
  'bg-gradient-to-l from-indigo-400 to-indigo-300 dark:from-indigo-500 dark:to-indigo-400',
  'bg-gradient-to-l from-indigo-500 to-indigo-400 dark:from-indigo-600 dark:to-indigo-500',
  'bg-gradient-to-l from-emerald-500 to-emerald-400 dark:from-emerald-500 dark:to-emerald-400',
];

function FunnelSection({ stages }: { stages: FunnelStage[] }) {
  const max = stages[0]?.count ?? 1;
  return (
    <div className="space-y-0">
      {stages.map((stage, i) => {
        const pct = max > 0 ? Math.round((stage.count / max) * 100) : 0;
        const isHighDrop = stage.dropOffPct >= 50;
        const isLast = i === stages.length - 1;
        const isZero = stage.count === 0;
        return (
          <div
            key={stage.name}
            className={`space-y-2 ${i > 0 ? 'border-t border-slate-100/60 dark:border-zinc-800/60' : ''} ${!isLast ? 'pb-5' : ''}`}
          >
            <div className="flex items-center justify-between flex-row-reverse text-right gap-2">
              <div className="flex items-center gap-2 flex-row-reverse">
                <span className="text-sm font-medium text-slate-700 dark:text-zinc-200">
                  {FUNNEL_LABELS[stage.name] ?? stage.name}
                </span>
                {stage.isWorstDropOff && (
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                      isHighDrop
                        ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-700/40'
                        : 'bg-slate-50 dark:bg-zinc-800/60 border-slate-200/60 dark:border-zinc-700/50 text-slate-600 dark:text-zinc-400'
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
                  <span className={`text-xs text-slate-400 dark:text-zinc-500 ${isZero ? 'opacity-70' : ''}`}>
                    {stage.fromPreviousPct}% מהשלב הקודם
                  </span>
                )}
              </div>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-zinc-800">
              <div
                className={`h-full rounded-full transition-all duration-700 ease-out shadow-[0_0_6px_rgba(99,102,241,0.18)] ${FUNNEL_BAR_GRADIENTS[i] ?? 'bg-slate-400 dark:bg-slate-500'} ${isHighDrop && stage.isWorstDropOff ? 'ring-2 ring-amber-400/50' : ''}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            {i < stages.length - 1 && (
              <p className={`text-xs text-slate-400 dark:text-zinc-500 text-right ${stages[i + 1].count === 0 ? 'opacity-70' : ''}`}>
                {stages[i + 1].dropOffPct}% נשירה לשלב הבא
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Response Time & Performance Card ────────────────────────────────────────

function ResponseTimeCard({
  efficiency,
  sparkline,
}: {
  efficiency: AnalyticsData['kpi']['efficiency'];
  sparkline: number[];
}) {
  const avg = efficiency.avgResponseTimeHours;
  const med = efficiency.medianResponseTimeHours;
  const p30 = efficiency.pctWithin30Min;
  const p60 = efficiency.pctWithin1Hour;
  return (
    <div className="rounded-2xl border border-slate-200/80 dark:border-zinc-700/80 bg-white dark:bg-zinc-900/80 p-6 shadow-sm">
      <div className="mb-5 flex items-center justify-end gap-3 flex-row-reverse text-right">
        <div className="w-full min-w-0">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-100 text-right">זמן תגובה וביצועים</h3>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-zinc-400 text-right">ממוצע וחציון, אחוז מענה מהיר</p>
        </div>
        <div className="rounded-lg bg-slate-50 dark:bg-zinc-800 p-2.5 shrink-0">
          <Clock className="h-4 w-4 text-slate-600 dark:text-zinc-400" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl bg-slate-50/80 dark:bg-zinc-800/60 px-3 py-3 text-right">
          <p className="text-[11px] font-medium text-slate-500 dark:text-zinc-400">זמן תגובה ממוצע</p>
          <p className="mt-1 text-lg font-bold text-slate-900 dark:text-zinc-100">
            {avg !== null ? fmtHours(avg) : '—'}
          </p>
        </div>
        <div className="rounded-xl bg-slate-50/80 dark:bg-zinc-800/60 px-3 py-3 text-right">
          <p className="text-[11px] font-medium text-slate-500 dark:text-zinc-400">זמן תגובה חציוני</p>
          <p className="mt-1 text-lg font-bold text-slate-900 dark:text-zinc-100">
            {med !== null ? fmtHours(med) : '—'}
          </p>
        </div>
        <div className="rounded-xl bg-slate-50/80 dark:bg-zinc-800/60 px-3 py-3 text-right">
          <p className="text-[11px] font-medium text-slate-500 dark:text-zinc-400">מענה תוך 30 דקות</p>
          <p className="mt-1 text-lg font-bold text-slate-900 dark:text-zinc-100">
            {p30 !== null ? `${p30}%` : '—'}
          </p>
        </div>
        <div className="rounded-xl bg-slate-50/80 dark:bg-zinc-800/60 px-3 py-3 text-right">
          <p className="text-[11px] font-medium text-slate-500 dark:text-zinc-400">מענה תוך שעה</p>
          <p className="mt-1 text-lg font-bold text-slate-900 dark:text-zinc-100">
            {p60 !== null ? `${p60}%` : '—'}
          </p>
        </div>
      </div>
      {sparkline.length >= 2 && (
        <div className="mt-5 pt-5 border-t border-slate-100 dark:border-zinc-800">
          <p className="text-[11px] font-medium text-slate-500 dark:text-zinc-400 text-right mb-2">מגמת זמן תגובה (7 ימים)</p>
          <Sparkline data={sparkline} color="#64748b" />
        </div>
      )}
    </div>
  );
}

// ─── Insights (תובנות מערכת) ──────────────────────────────────────────────────

const INSIGHT_STYLES = {
  warning: { wrap: 'bg-amber-50/80 dark:bg-amber-900/20 border-amber-200/80 dark:border-amber-800/40', icon: 'text-amber-600 dark:text-amber-400' },
  info:    { wrap: 'bg-slate-50/80 dark:bg-zinc-800/50 border-slate-200/80 dark:border-zinc-700/50', icon: 'text-slate-600 dark:text-zinc-400' },
  success: { wrap: 'bg-emerald-50/80 dark:bg-emerald-900/20 border-emerald-200/80 dark:border-emerald-800/40', icon: 'text-emerald-600 dark:text-emerald-400' },
};

function InsightRow({ insight }: { insight: Insight }) {
  const s = INSIGHT_STYLES[insight.type];
  const Icon = insight.type === 'warning' ? AlertTriangle : insight.type === 'success' ? CheckCircle2 : Info;
  return (
    <div dir="rtl" className={`flex items-start gap-3 rounded-xl border p-4 text-right ${s.wrap}`}>
      <Icon className={`h-4 w-4 shrink-0 mt-0.5 ${s.icon}`} aria-hidden />
      <p className="text-sm leading-relaxed text-slate-700 dark:text-zinc-300 flex-1 min-w-0 text-right">{insight.message}</p>
    </div>
  );
}

// ─── Skeleton & Empty ────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-slate-100 dark:bg-zinc-800/60 ${className ?? ''}`} />;
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-8">
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
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
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 dark:bg-zinc-800">
        <TrendingUp className="h-8 w-8 text-slate-400 dark:text-zinc-500" />
      </div>
      <h3 className="text-lg font-semibold text-slate-800 dark:text-zinc-200">אין מספיק נתונים להצגת אנליטיקה</h3>
      <p className="mt-2 max-w-sm text-sm text-slate-500 dark:text-zinc-400 leading-relaxed">
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
        <div className="rounded-2xl border border-slate-200 dark:border-zinc-700/80 bg-white dark:bg-zinc-900/80 shadow-sm">
          <AnalyticsEmptyState />
        </div>
      )}

      {!loading && !error && data && data.totalLeads > 0 && (
        <>
          {/* 1️⃣ KPI Strip — 6 cards */}
          <section className="rounded-2xl bg-slate-50/50 dark:bg-zinc-900/30 p-6 border border-slate-200/60 dark:border-zinc-800/60">
            <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
              <KpiStripCard
                label={`לידים חדשים (${periodLabel})`}
                value={data.kpi.leadsCount.current}
                sub={data.kpi.leadsCount.previous > 0 ? `לעומת ${data.kpi.leadsCount.previous} בתקופה קודמת` : undefined}
                icon={Users}
                iconBg="bg-slate-100 dark:bg-zinc-800"
                trend={<TrendBadge pct={data.kpi.leadsCount.changePct} />}
              />
              <KpiStripCard
                label="אחוז סגירה"
                value={`${data.kpi.closeRate.current}%`}
                sub={data.kpi.closeRate.previous > 0 ? `לעומת ${data.kpi.closeRate.previous}% קודם` : undefined}
                icon={Percent}
                iconBg="bg-indigo-100 dark:bg-indigo-900/40"
                trend={<TrendBadge pct={data.kpi.closeRate.changePct} />}
              />
              <KpiStripCard
                label="זמן תגובה ממוצע"
                value={data.kpi.efficiency.avgResponseTimeHours !== null ? fmtHours(data.kpi.efficiency.avgResponseTimeHours) : '—'}
                sub="מיצירת ליד ליצירת קשר"
                icon={Clock}
                iconBg="bg-amber-100 dark:bg-amber-900/30"
              />
              <KpiStripCard
                label="הכנסה פוטנציאלית"
                value={fmt(data.kpi.discordRevenue.current)}
                sub={data.kpi.discordRevenue.previous > 0 ? `לעומת ${fmt(data.kpi.discordRevenue.previous)} קודם` : undefined}
                icon={Banknote}
                iconBg="bg-emerald-100 dark:bg-emerald-900/30"
                trend={<TrendBadge pct={data.kpi.discordRevenue.changePct} />}
              />
              <KpiStripCard
                label="תורים שנקבעו"
                value={data.kpi.appointmentsCount.current}
                sub={data.kpi.appointmentsCount.previous > 0 ? `לעומת ${data.kpi.appointmentsCount.previous} קודם` : undefined}
                icon={Calendar}
                iconBg="bg-blue-100 dark:bg-blue-900/30"
                trend={<TrendBadge pct={data.kpi.appointmentsCount.changePct} />}
              />
              <KpiStripCard
                label="תורים שבוטלו"
                value={data.kpi.cancelledAppointments}
                sub="לא מדוד במערכת"
                icon={CalendarX2}
                iconBg="bg-slate-100 dark:bg-zinc-800"
              />
            </div>
          </section>

          {/* 2️⃣ Funnel + 3️⃣ Response Time — two columns */}
          <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-2xl border border-slate-200/80 dark:border-zinc-700/80 bg-white dark:bg-zinc-900/80 p-6 shadow-sm">
              <div className="mb-5 flex items-center justify-end text-right">
                <div className="w-full min-w-0">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-100 text-right">משפך המרות</h3>
                </div>
              </div>
              <FunnelSection stages={data.funnel} />
            </section>
            <ResponseTimeCard efficiency={data.kpi.efficiency} sparkline={data.kpi.efficiency.responseTimeSparkline} />
          </div>

          {/* 4️⃣ תובנות מערכת */}
          <section className="rounded-2xl border border-slate-200/80 dark:border-zinc-700/80 bg-white dark:bg-zinc-900/80 p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-end gap-3 flex-row-reverse text-right">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 dark:bg-zinc-800 shrink-0">
                <Target className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
              </div>
              <div className="w-full min-w-0">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-100 text-right">תובנות מערכת</h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 text-right">נוצרו אוטומטית מנתוני הצינור</p>
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
