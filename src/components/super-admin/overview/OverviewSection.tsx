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
    <section className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-start justify-between flex-row-reverse flex-wrap gap-4">
        <div className="text-right">
          <h2 className="text-xl font-bold text-zinc-100">סקירה כללית</h2>
          <p className="mt-0.5 text-sm text-zinc-400">
            מצב הפלטפורמה בזמן אמת — KPIs, מגמות, ושימוש AI.
          </p>
        </div>
        <TimeRangeSelector value={timeRange} onChange={handleTimeRangeChange} />
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
