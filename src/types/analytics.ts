// ─── Core time-range ─────────────────────────────────────────────────────────
export type TimeRange = '7d' | '30d' | '90d';

// ─── KPI card ────────────────────────────────────────────────────────────────
export interface KPIMetric {
  readonly id: string;
  readonly label: string;
  readonly value: number | string;
  readonly change?: number;          // % change vs previous period; positive = growth
  readonly trend?: 'up' | 'down' | 'neutral';
  readonly prefix?: string;          // e.g. '₪'
  readonly suffix?: string;          // e.g. '%'
  readonly highlight?: boolean;      // visually emphasised card (e.g. MRR)
}

// ─── Charts ───────────────────────────────────────────────────────────────────
export interface TimeSeriesPoint {
  readonly label: string;  // x-axis label (formatted date, etc.)
  readonly value: number;
}

export interface TenantMetricPoint {
  readonly tenantId: string;
  readonly tenantName: string;
  readonly value: number;
  readonly secondaryValue?: number;  // e.g. appointments alongside leads
}

export interface ConversionPoint {
  readonly label: string;
  readonly leads: number;
  readonly appointments: number;
  readonly rate: number;  // 0–100
}

export interface AiUsagePoint {
  readonly tenantId: string;
  readonly tenantName: string;
  readonly tokens: number;
  readonly costUsd: number;
  readonly percentage: number;  // 0–100 share of total
}

export interface IntegrationStatusRecord {
  readonly platform: 'discord' | 'whatsapp' | 'webhook';
  readonly label: string;
  readonly connected: number;
  readonly total: number;
  readonly status: 'healthy' | 'warning' | 'critical';
}

// ─── Aggregate passed from Server Component → OverviewSection ─────────────────
export interface OverviewPageData {
  readonly kpis: KPIMetric[];
  readonly revenueTrend: TimeSeriesPoint[];
  readonly leadsPerTenant: TenantMetricPoint[];
  readonly conversionTrend: ConversionPoint[];
  readonly aiUsagePerTenant: AiUsagePoint[];
  readonly integrationStatus: IntegrationStatusRecord[];
}
