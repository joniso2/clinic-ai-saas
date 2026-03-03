'use client';

import { useMemo } from 'react';
import { Bot, Link2, TrendingUp } from 'lucide-react';
import SVGLineChart from '@/components/charts/SVGLineChart';
import HorizontalBars from '@/components/charts/HorizontalBars';
import EmptyState from '@/components/ui/EmptyState';
import type {
  TimeSeriesPoint,
  TenantMetricPoint,
  ConversionPoint,
  AiUsagePoint,
  IntegrationStatusRecord,
  TimeRange,
} from '@/types/analytics';

// ─── Chart card wrapper ───────────────────────────────────────────────────────
function ChartCard({
  title,
  subtitle,
  children,
  className = '',
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-8 ${className}`}>
      <div className="mb-6 text-right">
        <h3 className="text-2xl font-semibold text-slate-900 dark:text-zinc-100 mb-2">{title}</h3>
        {subtitle && (
          <p className="text-sm text-slate-500 dark:text-zinc-400">{subtitle}</p>
        )}
      </div>
      {children}
    </div>
  );
}

// ─── Integration status pill ──────────────────────────────────────────────────
function IntegrationRow({ record }: { record: IntegrationStatusRecord }) {
  const statusStyles: Record<IntegrationStatusRecord['status'], string> = {
    healthy: 'text-emerald-400 bg-emerald-400/10',
    warning: 'text-amber-400 bg-amber-400/10',
    critical: 'text-red-400 bg-red-400/10',
  };
  const statusLabels: Record<IntegrationStatusRecord['status'], string> = {
    healthy: 'תקין',
    warning: 'חלקי',
    critical: 'לא פעיל',
  };

  const pct = record.total > 0
    ? Math.round((record.connected / record.total) * 100)
    : 0;

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-slate-200 dark:border-zinc-800 last:border-0">
      <span
        className={`shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-md ${statusStyles[record.status]}`}
      >
        {statusLabels[record.status]}
      </span>

      <div className="flex-1 bg-slate-200 dark:bg-zinc-800 rounded-full overflow-hidden h-1.5">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${pct}%`,
            backgroundColor:
              record.status === 'healthy'
                ? '#34d399'
                : record.status === 'warning'
                ? '#fbbf24'
                : '#f87171',
          }}
        />
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-xs font-medium text-slate-700 dark:text-zinc-300">{record.label}</span>
        <span className="text-[11px] text-slate-500 dark:text-zinc-500 tabular-nums">
          {record.connected}/{record.total}
        </span>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
interface OverviewChartsSectionProps {
  revenueTrend: TimeSeriesPoint[];
  leadsPerTenant: TenantMetricPoint[];
  conversionTrend: ConversionPoint[];
  aiUsagePerTenant: AiUsagePoint[];
  integrationStatus: IntegrationStatusRecord[];
  timeRange: TimeRange;
}

export default function OverviewChartsSection({
  revenueTrend,
  leadsPerTenant,
  conversionTrend,
  aiUsagePerTenant,
  integrationStatus,
  timeRange,
}: OverviewChartsSectionProps) {
  // Conversion rate as line-chart series
  const conversionRateSeries: TimeSeriesPoint[] = useMemo(
    () => conversionTrend.map((p) => ({ label: p.label, value: p.rate })),
    [conversionTrend],
  );

  // Leads per tenant formatted for horizontal bars
  const leadsBarData = useMemo(
    () =>
      leadsPerTenant.map((t) => ({
        label: t.tenantName,
        value: t.value,
        secondaryValue: t.secondaryValue,
      })),
    [leadsPerTenant],
  );

  // AI usage formatted for horizontal bars
  const aiBarData = useMemo(
    () =>
      aiUsagePerTenant.map((t) => ({
        label: t.tenantName,
        value: t.tokens,
      })),
    [aiUsagePerTenant],
  );

  const rangeLabel = timeRange === '7d' ? '7 ימים' : timeRange === '30d' ? '30 ימים' : '90 ימים';

  return (
    <div className="space-y-8">
      {/* ── Row 1: Revenue trend (full-width) ── */}
      <ChartCard
        title="מגמת הכנסות"
        subtitle={`הכנסה יומית משוערת — ${rangeLabel} האחרונים`}
      >
        {revenueTrend.length >= 2 ? (
          <SVGLineChart
            data={revenueTrend}
            height={130}
            strokeColor="#818cf8"
            fillColor="#818cf8"
            gradientId="sa-revenue-grad"
            showXLabels
          />
        ) : (
          <EmptyState icon={TrendingUp} title="אין נתוני הכנסות" />
        )}
      </ChartCard>

      {/* ── Row 2: Conversion rate + Leads per tenant ── */}
      <div className="grid md:grid-cols-2 gap-6">
        <ChartCard
          title="שיעור המרה"
          subtitle={`לידים → תורים — ${rangeLabel} האחרונים`}
        >
          {conversionRateSeries.length >= 2 ? (
            <SVGLineChart
              data={conversionRateSeries}
              height={110}
              strokeColor="#34d399"
              fillColor="#34d399"
              gradientId="sa-conv-grad"
              showXLabels
            />
          ) : (
            <EmptyState icon={TrendingUp} title="אין נתוני המרה" />
          )}
          {/* Summary row */}
          {conversionTrend.length > 0 && (() => {
            const totLeads = conversionTrend.reduce((s, p) => s + p.leads, 0);
            const totAppts = conversionTrend.reduce((s, p) => s + p.appointments, 0);
            const avgRate = totLeads > 0 ? Math.round((totAppts / totLeads) * 100) : 0;
            return (
              <div className="mt-3 flex justify-end gap-4 text-right">
                <span className="text-[11px] text-slate-500 dark:text-zinc-500">
                  לידים: <span className="text-slate-700 dark:text-zinc-300 font-medium">{totLeads.toLocaleString('he-IL')}</span>
                </span>
                <span className="text-[11px] text-slate-500 dark:text-zinc-500">
                  תורים: <span className="text-slate-700 dark:text-zinc-300 font-medium">{totAppts.toLocaleString('he-IL')}</span>
                </span>
                <span className="text-[11px] text-slate-500 dark:text-zinc-500">
                  ממוצע: <span className="text-emerald-400 font-semibold">{avgRate}%</span>
                </span>
              </div>
            );
          })()}
        </ChartCard>

        <ChartCard
          title="לידים לפי לקוח"
          subtitle="לידים (כחול) ותורים (ירוק)"
        >
          {leadsBarData.length > 0 ? (
            <HorizontalBars
              data={leadsBarData}
              primaryColor="#6366f1"
              secondaryColor="#10b981"
            />
          ) : (
            <EmptyState icon={TrendingUp} title="אין לקוחות רשומים" />
          )}
        </ChartCard>
      </div>

      {/* ── Row 3: AI usage + Integration status ── */}
      <div className="grid md:grid-cols-2 gap-6">
        <ChartCard
          title="שימוש AI לפי לקוח"
          subtitle="טוקנים מצטברים (מוק)"
        >
          {aiBarData.length > 0 ? (
            <HorizontalBars
              data={aiBarData}
              primaryColor="#a78bfa"
              valueFormatter={(v) =>
                v >= 1_000_000
                  ? `${(v / 1_000_000).toFixed(1)}M`
                  : `${(v / 1_000).toFixed(0)}K`
              }
            />
          ) : (
            <EmptyState icon={Bot} title="אין נתוני AI" />
          )}
        </ChartCard>

        <ChartCard title="סטטוס אינטגרציות">
          {integrationStatus.length > 0 ? (
            <div className="divide-y divide-zinc-800 -mx-1 px-1">
              {integrationStatus.map((r) => (
                <IntegrationRow key={r.platform} record={r} />
              ))}
            </div>
          ) : (
            <EmptyState icon={Link2} title="אין אינטגרציות מוגדרות" />
          )}
        </ChartCard>
      </div>
    </div>
  );
}
