/**
 * Mock Analytics Service
 *
 * Isolated source of synthetic data for metrics not yet wired to the real
 * Supabase schema (MRR, token usage, revenue trends, AI cost).
 *
 * Contract: all functions are pure, deterministic (seeded), and synchronous.
 * Replace individual return values with real API calls as backend matures.
 */

import type {
  TimeRange,
  TimeSeriesPoint,
  ConversionPoint,
  AiUsagePoint,
} from '@/types/analytics';

// ─── Seeded pseudo-random (deterministic per seed) ───────────────────────────
function sr(seed: number): number {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

// ─── Date label helpers ───────────────────────────────────────────────────────
function buildDateLabels(days: number): string[] {
  return Array.from({ length: days }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (days - 1 - i));
    return d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' });
  });
}

// ─── Mock tenant names (generic SaaS context) ────────────────────────────────
const MOCK_TENANT_NAMES: readonly string[] = [
  'קליניקת ד"ר לוי',
  'מרפאת שלום',
  'קליניקת חיוך',
  'מרפאת השיניים',
  'מרכז בריאות כרמל',
  'קליניקת אורנים',
];

// ─── Public interface ─────────────────────────────────────────────────────────
export interface MockOverviewAnalytics {
  readonly mrr: number;
  readonly mrrChange: number;     // % change vs. previous period
  readonly revenueTrend: TimeSeriesPoint[];
  readonly conversionTrend: ConversionPoint[];
  readonly aiUsagePerTenant: AiUsagePoint[];
  readonly totalTokens: number;
  readonly estimatedCostUsd: number;
}

/**
 * Returns a fully typed mock analytics payload for the given time range.
 * Safe to call on the server (no browser APIs used).
 */
export function getMockOverviewAnalytics(range: TimeRange): MockOverviewAnalytics {
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  const seed = days * 17; // different seed per range → stable-but-varied output

  const mrr = 47_800;
  const mrrChange = range === '7d' ? 3.2 : range === '30d' ? 8.4 : 22.1;

  const labels = buildDateLabels(days);

  // Revenue trend (daily approximation of MRR / 30)
  const revenueTrend: TimeSeriesPoint[] = labels.map((label, i) => ({
    label,
    value: Math.round(mrr / 30 + sr(seed + i * 3) * 900 - 200 + i * 4),
  }));

  // Conversion trend (leads → appointments)
  const conversionTrend: ConversionPoint[] = labels.map((label, i) => {
    const leads = Math.round(12 + sr(seed + i * 7) * 18);
    const appointments = Math.round(leads * (0.28 + sr(seed + i * 11) * 0.26));
    return {
      label,
      leads,
      appointments,
      rate: leads > 0 ? Math.round((appointments / leads) * 100) : 0,
    };
  });

  // AI token usage per tenant
  const rawUsage = MOCK_TENANT_NAMES.map((tenantName, i) => ({
    tenantId: `mock-tenant-${i}`,
    tenantName,
    tokens: Math.round(40_000 + sr(seed + i * 13) * 220_000),
    costUsd: 0,
    percentage: 0,
  }));

  const totalTokens = rawUsage.reduce((sum, t) => sum + t.tokens, 0);
  const costPerToken = 0.000_02; // GPT-4o average estimate

  const aiUsagePerTenant: AiUsagePoint[] = rawUsage
    .map((t) => ({
      ...t,
      costUsd: parseFloat((t.tokens * costPerToken).toFixed(2)),
      percentage: totalTokens > 0 ? Math.round((t.tokens / totalTokens) * 100) : 0,
    }))
    .sort((a, b) => b.tokens - a.tokens);

  return {
    mrr,
    mrrChange,
    revenueTrend,
    conversionTrend,
    aiUsagePerTenant,
    totalTokens,
    estimatedCostUsd: parseFloat((totalTokens * costPerToken).toFixed(2)),
  };
}
