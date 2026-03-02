'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  TrendingUp,
  Users,
  CheckCircle2,
  Calendar,
  Clock,
  Zap,
  Target,
  ArrowRight,
  AlertTriangle,
  Info,
  ChevronDown,
  BotMessageSquare,
  Percent,
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

// ─── Fetch Helper ────────────────────────────────────────────────────────────

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

// ─── Number Format Helpers ───────────────────────────────────────────────────

function fmt(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtHours(h: number): string {
  if (h < 1) return `${Math.round(h * 60)}m`;
  return `${(Math.round(h * 10) / 10)}h`;
}

function fmtDays(d: number): string {
  if (d < 1) return `${Math.round(d * 24)}h`;
  return `${(Math.round(d * 10) / 10)}d`;
}

// ─── Sparkline SVG ───────────────────────────────────────────────────────────

function Sparkline({ data, color = '#6366f1' }: { data: number[]; color?: string }) {
  if (!data || data.length < 2) return <div className="w-20 h-7" />;
  const max = Math.max(...data, 1);
  const W = 80;
  const H = 28;
  const points = data.map((v, i) => ({
    x: (i / (data.length - 1)) * W,
    y: H - Math.max((v / max) * H, 0),
  }));
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cpx = (prev.x + curr.x) / 2;
    d += ` C ${cpx} ${prev.y}, ${cpx} ${curr.y}, ${curr.x} ${curr.y}`;
  }
  const area =
    d +
    ` L ${points[points.length - 1].x} ${H} L ${points[0].x} ${H} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-20 h-7" aria-hidden="true">
      <defs>
        <linearGradient id={`sg-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.18} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#sg-${color.replace('#', '')})`} />
      <path d={d} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Badge ───────────────────────────────────────────────────────────────────

function ChangeBadge({ pct }: { pct: number | null }) {
  if (pct === null) return null;
  const positive = pct >= 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold ${
        positive
          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
          : 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400'
      }`}
    >
      {positive ? '↑' : '↓'} {Math.abs(pct)}%
    </span>
  );
}

// ─── Tooltip ─────────────────────────────────────────────────────────────────

function Tooltip({ text }: { text: string }) {
  return (
    <span className="group relative ml-1 cursor-help">
      <Info className="inline h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
      <span className="pointer-events-none absolute bottom-5 left-1/2 -translate-x-1/2 z-20 w-52 rounded-xl bg-slate-900 dark:bg-slate-800 px-3 py-2 text-xs text-slate-100 opacity-0 shadow-xl ring-1 ring-white/10 transition-opacity group-hover:opacity-100">
        {text}
        <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900 dark:border-t-slate-800" />
      </span>
    </span>
  );
}

// ─── KPI Card ────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  tooltip,
  icon: Icon,
  iconColor,
  badge,
  sparkline,
  sparkColor,
}: {
  label: string;
  value: string | number;
  sub?: string;
  tooltip?: string;
  icon: React.ElementType;
  iconColor: string;
  badge?: React.ReactNode;
  sparkline?: number[];
  sparkColor?: string;
}) {
  return (
    <div className="group relative rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {label}
            {tooltip && <Tooltip text={tooltip} />}
          </p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{value}</p>
          {sub && <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{sub}</p>}
          {badge && <div className="mt-2">{badge}</div>}
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-2.5">
            <Icon className={`h-5 w-5 ${iconColor}`} strokeWidth={2} />
          </div>
          {sparkline && <Sparkline data={sparkline} color={sparkColor} />}
        </div>
      </div>
    </div>
  );
}

// ─── Mini KPI (for inside grouped cards) ────────────────────────────────────

function MiniKpi({ label, value, tooltip }: { label: string; value: string; tooltip?: string }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 px-3 py-2.5">
      <span className="text-xs text-slate-500 dark:text-slate-400">
        {label}
        {tooltip && <Tooltip text={tooltip} />}
      </span>
      <span className="text-sm font-bold text-slate-900 dark:text-white">{value}</span>
    </div>
  );
}

// ─── Minimal Funnel ──────────────────────────────────────────────────────────

const FUNNEL_FILLS = [
  'bg-slate-300 dark:bg-slate-600',
  'bg-indigo-300 dark:bg-indigo-500/70',
  'bg-indigo-500 dark:bg-indigo-400',
  'bg-indigo-700 dark:bg-indigo-300',
];

function FunnelChart({ stages }: { stages: FunnelStage[] }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const max = stages[0]?.count ?? 1;

  return (
    <div className="space-y-4">
      {stages.map((stage, i) => {
        const pct = max > 0 ? Math.round((stage.count / max) * 100) : 0;
        return (
          <div key={stage.name}>
            <div
              className="cursor-default"
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            >
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium transition-colors duration-150 ${hovered === i ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                    {stage.name}
                  </span>
                  {stage.isWorstDropOff && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                      <AlertTriangle className="h-2.5 w-2.5" />
                      highest drop-off
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-900 dark:text-white">{stage.count}</span>
                  {i > 0 && (
                    <span className="text-xs text-slate-400 dark:text-slate-500">{stage.fromPreviousPct}%</span>
                  )}
                </div>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${FUNNEL_FILLS[i] ?? 'bg-slate-400'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
            {i < stages.length - 1 && (
              <div className="flex items-center gap-1 pt-2 pb-0.5 pl-1 text-xs text-slate-400 dark:text-slate-500">
                <ArrowRight className="h-3 w-3" />
                <span>{stages[i + 1].dropOffPct}% drop-off to next stage</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Insights Panel ──────────────────────────────────────────────────────────

const INSIGHT_STYLES = {
  warning: {
    wrap: 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/50',
    icon: 'text-amber-500 dark:text-amber-400',
    text: 'text-slate-700 dark:text-slate-300',
  },
  info: {
    wrap: 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/50',
    icon: 'text-blue-500 dark:text-blue-400',
    text: 'text-slate-700 dark:text-slate-300',
  },
  success: {
    wrap: 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/50',
    icon: 'text-emerald-500 dark:text-emerald-400',
    text: 'text-slate-700 dark:text-slate-300',
  },
};

function InsightCard({ insight }: { insight: Insight }) {
  const s = INSIGHT_STYLES[insight.type];
  const Icon =
    insight.type === 'warning' ? AlertTriangle : insight.type === 'success' ? CheckCircle2 : Info;
  return (
    <div className={`flex items-start gap-3 rounded-xl border p-3.5 ${s.wrap}`}>
      <div className="mt-0.5 shrink-0 rounded-lg bg-white dark:bg-slate-900 p-1.5 shadow-sm">
        <Icon className={`h-3.5 w-3.5 ${s.icon}`} />
      </div>
      <p className={`text-sm leading-relaxed ${s.text}`}>{insight.message}</p>
    </div>
  );
}

// ─── Loading Skeleton ────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800/60 ${className ?? ''}`} />;
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}
      </div>
      <Skeleton className="h-52" />
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function AnalyticsEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
        <TrendingUp className="h-8 w-8 text-slate-400 dark:text-slate-500" />
      </div>
      <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">No data yet</h3>
      <p className="mt-1.5 max-w-xs text-sm text-slate-500 dark:text-slate-400">
        Add leads to your pipeline to start seeing analytics and conversion metrics.
      </p>
    </div>
  );
}

// ─── Date Range Filter Bar ───────────────────────────────────────────────────

const PRESETS: { label: string; value: Preset }[] = [
  { label: '7 days',   value: '7d' },
  { label: '30 days',  value: '30d' },
  { label: '90 days',  value: '90d' },
  { label: 'Custom',   value: 'custom' },
];

function DateRangeBar({
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
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-1 gap-0.5">
        {PRESETS.map((p) => (
          <button
            key={p.value}
            onClick={() => onPreset(p.value)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-150 ${
              preset === p.value
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm ring-1 ring-slate-200 dark:ring-slate-700'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {preset === 'custom' && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={customFrom}
            onChange={(e) => onCustomChange(e.target.value, customTo)}
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          />
          <span className="text-xs text-slate-300 dark:text-slate-600">→</span>
          <input
            type="date"
            value={customTo}
            onChange={(e) => onCustomChange(customFrom, e.target.value)}
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          />
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function AnalyticsTab() {
  const [preset, setPreset]           = useState<Preset>('30d');
  const [customFrom, setCustomFrom]   = useState<string>(toInputDate(new Date(Date.now() - 30 * 86_400_000).toISOString()));
  const [customTo, setCustomTo]       = useState<string>(toInputDate(new Date().toISOString()));
  const [data, setData]               = useState<AnalyticsData | null>(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(false);

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

  const kpi = data?.kpi;

  return (
    <div className="space-y-8">
      {/* Date Range Filter */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <DateRangeBar
          preset={preset}
          customFrom={customFrom}
          customTo={customTo}
          onPreset={handlePreset}
          onCustomChange={handleCustomChange}
        />
        {data && !loading && (
          <span className="text-xs text-slate-400 dark:text-slate-500">
            {data.totalLeads} lead{data.totalLeads !== 1 ? 's' : ''} in range
          </span>
        )}
      </div>

      {loading && <AnalyticsSkeleton />}

      {!loading && error && (
        <div className="rounded-2xl border border-red-100 dark:border-red-900/30 bg-red-50/50 dark:bg-red-950/10 p-6 text-center text-sm text-red-600 dark:text-red-400">
          Failed to load analytics. Please refresh the page.
        </div>
      )}

      {!loading && !error && data?.totalLeads === 0 && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <AnalyticsEmptyState />
        </div>
      )}

      {!loading && !error && data && data.totalLeads > 0 && (
        <>
          {/* ── KPI Cards Row 1 ── */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Discord Revenue */}
            <KpiCard
              label="Discord Revenue"
              value={fmt(kpi!.discordRevenue.current)}
              sub={kpi!.discordRevenue.previous > 0 ? `vs ${fmt(kpi!.discordRevenue.previous)} prev period` : 'Discord bot appointments'}
              tooltip="Sum of estimated deal value for leads created via the Discord bot"
              icon={BotMessageSquare}
              iconColor="text-indigo-500 dark:text-indigo-400"
              badge={<ChangeBadge pct={kpi!.discordRevenue.changePct} />}
              sparkline={kpi!.discordRevenue.sparkline}
              sparkColor="#6366f1"
            />

            {/* Conversion Breakdown */}
            <div className="relative rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Conversion Breakdown
                  <Tooltip text="Step-by-step conversion rates through the lead pipeline" />
                </p>
                <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-2.5">
                  <Percent className="h-4 w-4 text-violet-500 dark:text-violet-400" />
                </div>
              </div>
              <div className="space-y-2">
                <MiniKpi
                  label="Lead → Contact"
                  value={`${kpi!.conversionBreakdown.leadToContact}%`}
                  tooltip="Percentage of leads that were contacted"
                />
                <MiniKpi
                  label="Contact → Appointment"
                  value={`${kpi!.conversionBreakdown.contactToAppointment}%`}
                  tooltip="Percentage of contacted leads that booked an appointment"
                />
                <MiniKpi
                  label="Appointment → Closed"
                  value={`${kpi!.conversionBreakdown.appointmentToClosed}%`}
                  tooltip="Percentage of appointments that converted to closed deals"
                />
              </div>
            </div>

            {/* Efficiency Metrics */}
            <div className="relative rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Efficiency
                  <Tooltip text="Time-based efficiency metrics across the lead lifecycle" />
                </p>
                <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-2.5">
                  <Zap className="h-4 w-4 text-amber-500 dark:text-amber-400" />
                </div>
              </div>
              <div className="space-y-2">
                <MiniKpi
                  label="Avg response time"
                  value={kpi!.efficiency.avgResponseTimeHours !== null ? fmtHours(kpi!.efficiency.avgResponseTimeHours) : '—'}
                  tooltip="Average time from lead creation to first contact"
                />
                <MiniKpi
                  label="Avg time to appt"
                  value={kpi!.efficiency.avgTimeToAppointmentDays !== null ? fmtDays(kpi!.efficiency.avgTimeToAppointmentDays) : '—'}
                  tooltip="Average time from lead creation to scheduled appointment"
                />
                <MiniKpi
                  label="Avg close time"
                  value={kpi!.efficiency.avgCloseTimeDays !== null ? fmtDays(kpi!.efficiency.avgCloseTimeDays) : '—'}
                  tooltip="Average time from lead creation to closed deal"
                />
              </div>
            </div>
          </div>

          {/* ── KPI Cards Row 2 ── */}
          <div className="grid gap-4 sm:grid-cols-3">
            <KpiCard
              label="Total Leads"
              value={data.totalLeads}
              sub="In selected period"
              tooltip="Total leads created in the selected date range"
              icon={Users}
              iconColor="text-slate-500 dark:text-slate-400"
            />
            <KpiCard
              label="Appointments"
              value={data.funnel.find((s) => s.name === 'Appointments')?.count ?? 0}
              sub={`${data.funnel.find((s) => s.name === 'Appointments')?.fromPreviousPct ?? 0}% of contacted`}
              tooltip="Leads that reached the appointment stage"
              icon={Calendar}
              iconColor="text-blue-500 dark:text-blue-400"
            />
            <KpiCard
              label="Closed Deals"
              value={data.funnel.find((s) => s.name === 'Closed')?.count ?? 0}
              sub={`${kpi!.conversionBreakdown.leadToContact > 0 ? Math.round((( data.funnel.find((s) => s.name === 'Closed')?.count ?? 0) / data.totalLeads) * 100) : 0}% overall conversion`}
              tooltip="Leads marked as Closed or Converted"
              icon={CheckCircle2}
              iconColor="text-emerald-500 dark:text-emerald-400"
            />
          </div>

          {/* ── Conversion Funnel ── */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Conversion Funnel</h3>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Drop-off at each pipeline stage</p>
              </div>
              {data.funnel.find((s) => s.isWorstDropOff) && (
                <span className="flex items-center gap-1.5 rounded-full border border-amber-200 dark:border-amber-800/30 bg-amber-50 dark:bg-amber-900/20 px-2.5 py-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="h-3 w-3" />
                  Biggest drop: {data.funnel.find((s) => s.isWorstDropOff)?.name}
                </span>
              )}
            </div>
            <FunnelChart stages={data.funnel} />
          </div>

          {/* ── Insights Panel ── */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800">
                <Target className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Insights</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Automatically generated from your pipeline data</p>
              </div>
            </div>
            <div className="space-y-2.5">
              {data.insights.map((insight, i) => (
                <InsightCard key={i} insight={insight} />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
