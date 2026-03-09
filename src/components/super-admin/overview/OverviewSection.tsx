'use client';

import { useState, useCallback, useMemo } from 'react';
import type { OverviewPageData, TimeRange } from '@/types/analytics';
import { getMockOverviewAnalytics } from '@/services/mock-analytics.service';
import TimeRangeSelector from './TimeRangeSelector';
import OverviewKPISection from './OverviewKPISection';
import OverviewChartsSection from './OverviewChartsSection';

interface OverviewSectionProps {
  /** Pre-fetched real data from the Server Component */
  initialData: OverviewPageData;
}

/**
 * Orchestrates the Global Overview tab.
 *
 * - KPIs come from real server-fetched data (initialData.kpis) and never change
 *   when the time range is toggled (real API would filter by date; mock doesn't).
 * - Chart data re-derives from the mock service when time range changes.
 *   Swap getMockOverviewAnalytics() calls with real API calls once the backend
 *   supports time-filtered endpoints.
 */
export default function OverviewSection({ initialData }: OverviewSectionProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');

  const handleTimeRangeChange = useCallback((range: TimeRange) => {
    setTimeRange(range);
  }, []);

  // Chart data re-derives synchronously from the mock service on range change.
  const chartData = useMemo(() => {
    const mock = getMockOverviewAnalytics(timeRange);
    return {
      revenueTrend: mock.revenueTrend,
      conversionTrend: mock.conversionTrend,
      aiUsagePerTenant: mock.aiUsagePerTenant,
    };
  }, [timeRange]);

  return (
    <section className="space-y-8">
      {/* Header */}
      <div className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 p-8">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="mb-0 min-w-0 flex-1 text-right">
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-50 text-right mb-2">סקירה כללית</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 text-right mb-6">
              מצב הפלטפורמה בזמן אמת — KPIs, מגמות, ושימוש AI.
            </p>
          </div>
          <TimeRangeSelector value={timeRange} onChange={handleTimeRangeChange} />
        </div>
      </div>

      {/* KPI cards (real data, static) */}
      <OverviewKPISection kpis={initialData.kpis} />

      {/* Charts (mock-driven, reactive to time range) */}
      <OverviewChartsSection
        revenueTrend={chartData.revenueTrend}
        leadsPerTenant={initialData.leadsPerTenant}
        conversionTrend={chartData.conversionTrend}
        aiUsagePerTenant={chartData.aiUsagePerTenant}
        integrationStatus={initialData.integrationStatus}
        timeRange={timeRange}
      />
    </section>
  );
}
