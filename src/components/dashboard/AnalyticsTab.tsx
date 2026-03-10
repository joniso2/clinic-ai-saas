'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Users,
  Calendar,
  Clock,
  Target,
  Percent,
  Banknote,
  UsersRound,
  ReceiptText,
} from 'lucide-react';
import { KpiCard, KPI_ACCENT } from '@/components/ui/KpiCard';
import type { AnalyticsData } from '@/services/analytics.service';
import type { Preset } from './analytics-helpers';
import { getPresetRange, toInputDate, fetchAnalytics, fmt, fmtHours } from './analytics-helpers';
import {
  DateRangeControl,
  ChartSection,
  ActualRevenueChart,
  LeadsPerDayChart,
  FunnelChart,
  TopServicesChart,
  AppointmentBreakdown,
  ResponseTimeSection,
  AppointmentsUtilizationChart,
  InsightRow,
  AnalyticsSkeleton,
  AnalyticsEmptyState,
} from './analytics-charts';

// ─── Main Component ───────────────────────────────────────────────────────────

export function AnalyticsTab() {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const [preset, setPreset] = useState<Preset>('1d');
  const [customFrom, setCustomFrom] = useState<string>(todayStr);
  const [customTo, setCustomTo] = useState<string>(todayStr);
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

  const periodLabel = preset === '1d' ? 'היום' : preset === '7d' ? '7 ימים' : preset === '90d' ? '90 יום' : preset === 'custom' ? 'מותאם' : '30 יום';

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
              iconContainerClass={KPI_ACCENT.blue.icon}
              borderAccentClass={KPI_ACCENT.blue.border}
            />
            <KpiCard
              label="אחוז סגירה"
              value={`${data.kpi.closeRate.current}%`}
              sub={data.kpi.closeRate.previous > 0 ? `לעומת ${data.kpi.closeRate.previous}% קודם` : undefined}
              icon={Percent}
              iconContainerClass={KPI_ACCENT.indigo.icon}
              borderAccentClass={KPI_ACCENT.indigo.border}
            />
            <KpiCard
              label="זמן תגובה ממוצע"
              value={data.kpi.efficiency.avgResponseTimeHours !== null ? fmtHours(data.kpi.efficiency.avgResponseTimeHours) : '—'}
              sub="מיצירת ליד ליצירת קשר (משוער)"
              icon={Clock}
              iconContainerClass={KPI_ACCENT.amber.icon}
              borderAccentClass={KPI_ACCENT.amber.border}
            />
            <KpiCard
              label="הכנסה בפועל"
              value={fmt(data.kpi.actualRevenue.current)}
              sub={data.revenueMetrics.documentCount > 0 ? `${data.revenueMetrics.documentCount} מסמכים` : 'ללא מסמכי חיוב'}
              icon={Banknote}
              iconContainerClass={KPI_ACCENT.emerald.icon}
              borderAccentClass={KPI_ACCENT.emerald.border}
            />
            <KpiCard
              label="תורים"
              value={data.kpi.appointmentsCount.current}
              sub={data.kpi.cancelledAppointments > 0 ? `${data.kpi.cancelledAppointments} בוטלו` : undefined}
              icon={Calendar}
              iconContainerClass={KPI_ACCENT.purple.icon}
              borderAccentClass={KPI_ACCENT.purple.border}
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
                  iconContainerClass="bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400"
                  borderAccentClass="border-s-teal-500 dark:border-s-teal-400"
                />
                <KpiCard
                  label="לקוחות חוזרים"
                  value={data.customerMetrics.returning}
                  sub={`מתוך ${data.customerMetrics.totalActive} פעילים`}
                  icon={ReceiptText}
                  iconContainerClass="bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400"
                  borderAccentClass="border-s-violet-500 dark:border-s-violet-400"
                />
              </div>
              <KpiCard
                label="הכנסה פוטנציאלית"
                value={fmt(data.kpi.discordRevenue.current)}
                sub="מלידים שנסגרו (estimated_deal_value)"
                icon={Target}
                iconContainerClass={KPI_ACCENT.slate.icon}
                borderAccentClass={KPI_ACCENT.slate.border}
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
