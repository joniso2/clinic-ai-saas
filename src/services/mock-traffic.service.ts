import type { TimeRange, TimeSeriesPoint } from '@/types/analytics';

function sr(seed: number): number {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

function buildDateLabels(days: number): string[] {
  return Array.from({ length: days }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (days - 1 - i));
    return d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' });
  });
}

export interface TrafficSnapshot {
  readonly requestsPerDay: TimeSeriesPoint[];
  readonly latencyMs: TimeSeriesPoint[];
  readonly errorRate: TimeSeriesPoint[];
  readonly webhookFailures: TimeSeriesPoint[];
  readonly tokensPerDay: TimeSeriesPoint[];
  readonly totals: {
    readonly requests: number;
    readonly avgLatencyMs: number;
    readonly errorRatePct: number;
    readonly webhookFailures: number;
    readonly tokens: number;
    readonly estimatedCostUsd: number;
  };
}

export function getMockTrafficData(range: TimeRange): TrafficSnapshot {
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  const seed = days * 31;
  const labels = buildDateLabels(days);

  const build = (base: number, variance: number, min = 0): TimeSeriesPoint[] =>
    labels.map((label, i) => ({
      label,
      value: Math.max(min, Math.round(base + sr(seed + i * 7) * variance - variance / 2)),
    }));

  const requestsPerDay = build(2800, 1200, 100);
  const latencyMs      = build(210, 80, 80);
  const errorRate      = build(1.8, 2.4, 0).map((p) => ({ ...p, value: Math.min(p.value, 12) }));
  const webhookFails   = build(4, 8, 0);
  const tokensPerDay   = build(85_000, 40_000, 0);

  const totalRequests = requestsPerDay.reduce((s, p) => s + p.value, 0);
  const avgLatency    = Math.round(latencyMs.reduce((s, p) => s + p.value, 0) / latencyMs.length);
  const avgError      = parseFloat((errorRate.reduce((s, p) => s + p.value, 0) / errorRate.length).toFixed(1));
  const totalFails    = webhookFails.reduce((s, p) => s + p.value, 0);
  const totalTokens   = tokensPerDay.reduce((s, p) => s + p.value, 0);

  return {
    requestsPerDay,
    latencyMs,
    errorRate,
    webhookFailures: webhookFails,
    tokensPerDay,
    totals: {
      requests: totalRequests,
      avgLatencyMs: avgLatency,
      errorRatePct: avgError,
      webhookFailures: totalFails,
      tokens: totalTokens,
      estimatedCostUsd: parseFloat((totalTokens * 0.000_02).toFixed(2)),
    },
  };
}
