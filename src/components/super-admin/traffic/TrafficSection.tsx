'use client';

/**
 * Section 5 — Traffic & Performance
 * Real-time system metrics using mock data (replace with real API per spec).
 */

import { useState, useMemo } from 'react';
import { Activity, Zap, AlertTriangle, Clock, Cpu, DollarSign } from 'lucide-react';
import SVGLineChart from '@/components/charts/SVGLineChart';
import TimeRangeSelector from '@/components/super-admin/overview/TimeRangeSelector';
import { getMockTrafficData } from '@/services/mock-traffic.service';
import type { TimeRange } from '@/types/analytics';

// ─── KPI card ─────────────────────────────────────────────────────────────────
interface StatCardProps {
  label: string;
  value: string;
  icon: React.ElementType;
  trend?: 'good' | 'bad' | 'neutral';
  sub?: string;
}

function StatCard({ label, value, icon: Icon, trend = 'neutral', sub }: StatCardProps) {
  const trendColor = trend === 'good' ? 'text-emerald-400' : trend === 'bad' ? 'text-red-400' : 'text-zinc-400';
  return (
    <div className="rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4 text-right">
      <div className="flex items-center justify-between flex-row-reverse mb-2">
        <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{label}</p>
        <div className="rounded-lg bg-slate-100 dark:bg-slate-800 p-2">
          <Icon className="h-4 w-4 text-slate-500 dark:text-slate-400" />
        </div>
      </div>
      <p className={`text-2xl font-bold tabular-nums leading-none ${trendColor}`}>{value}</p>
      {sub && <p className="text-[11px] text-zinc-500 mt-1">{sub}</p>}
    </div>
  );
}

// ─── Chart card ───────────────────────────────────────────────────────────────
function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-5" dir="rtl">
      <div className="mb-3 text-right">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">{title}</h3>
        {subtitle && <p className="text-[11px] text-slate-500 dark:text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function TrafficSection() {
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');

  const data = useMemo(() => getMockTrafficData(timeRange), [timeRange]);

  const { totals } = data;

  return (
    <div dir="rtl" className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 p-8">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="min-w-0 flex-1 text-right">
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-50 text-right">תעבורה וביצועים</h2>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400 text-right">מדדי מערכת בזמן אמת — קריאות, זמן תגובה, שגיאות, טוקנים ועלות (מוק).</p>
          </div>
          <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
        </div>
      </div>

      {/* System health banner */}
      <div className="flex items-center gap-3 flex-row-reverse rounded-xl bg-emerald-400/5 border border-emerald-500/20 px-5 py-3">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
        </span>
        <span className="text-sm font-medium text-emerald-300">מערכת פעילה</span>
        <span className="text-xs text-zinc-500 ms-auto">עדכון אחרון: עכשיו</span>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <StatCard label="סך קריאות" value={totals.requests.toLocaleString('he-IL')} icon={Activity} trend="neutral" sub="בתקופה" />
        <StatCard label="זמן תגובה ממוצע" value={`${totals.avgLatencyMs}ms`} icon={Clock} trend={totals.avgLatencyMs < 300 ? 'good' : 'bad'} />
        <StatCard label="שיעור שגיאות" value={`${totals.errorRatePct}%`} icon={AlertTriangle} trend={totals.errorRatePct < 2 ? 'good' : 'bad'} />
        <StatCard label="כשלוני Webhook" value={String(totals.webhookFailures)} icon={Zap} trend={totals.webhookFailures < 5 ? 'good' : 'bad'} />
        <StatCard label="צריכת טוקנים" value={totals.tokens >= 1_000_000 ? `${(totals.tokens / 1_000_000).toFixed(1)}M` : `${(totals.tokens / 1_000).toFixed(0)}K`} icon={Cpu} trend="neutral" />
        <StatCard label="עלות משוערת" value={`$${totals.estimatedCostUsd}`} icon={DollarSign} trend="neutral" sub="USD" />
      </div>

      {/* Charts row 1 */}
      <div className="grid md:grid-cols-2 gap-4">
        <ChartCard title="קריאות API ליום" subtitle="סך בקשות שהתקבלו במערכת">
          <SVGLineChart
            data={data.requestsPerDay}
            height={120}
            strokeColor="#818cf8"
            fillColor="#818cf8"
            gradientId="traffic-req"
            showXLabels
          />
        </ChartCard>

        <ChartCard title="זמן תגובה ממוצע (ms)" subtitle="latency בצד שרת">
          <SVGLineChart
            data={data.latencyMs}
            height={120}
            strokeColor="#34d399"
            fillColor="#34d399"
            gradientId="traffic-lat"
            showXLabels
          />
        </ChartCard>
      </div>

      {/* Charts row 2 */}
      <div className="grid md:grid-cols-2 gap-4">
        <ChartCard title="שיעור שגיאות (%)" subtitle="4xx + 5xx responses">
          <SVGLineChart
            data={data.errorRate}
            height={110}
            strokeColor="#f87171"
            fillColor="#f87171"
            gradientId="traffic-err"
            showXLabels
          />
          {/* Error rate threshold line annotation */}
          <p className="text-[11px] text-zinc-500 text-right mt-2">
            סף אזהרה: 3% · סף קריטי: 5%
          </p>
        </ChartCard>

        <ChartCard title="טוקני AI ליום" subtitle="סך צריכת tokens מכלל הלקוחות">
          <SVGLineChart
            data={data.tokensPerDay}
            height={110}
            strokeColor="#a78bfa"
            fillColor="#a78bfa"
            gradientId="traffic-tok"
            showXLabels
          />
        </ChartCard>
      </div>

      {/* Webhook failures */}
      <ChartCard title="כשלוני Webhook ליום" subtitle="בקשות שלא קיבלו תגובה תקינה">
        <SVGLineChart
          data={data.webhookFailures}
          height={90}
          strokeColor="#fb923c"
          fillColor="#fb923c"
          gradientId="traffic-wh"
          showXLabels
        />
      </ChartCard>
    </div>
  );
}
