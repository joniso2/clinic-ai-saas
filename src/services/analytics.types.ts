// ─── Public Types for Analytics Service ──────────────────────────────────────

export type DateRange = {
  from: string; // ISO datetime string
  to: string;   // ISO datetime string
};

export type KPICountWithTrend = {
  current: number;
  previous: number;
  changePct: number | null;
};

export type KPIConversionBreakdown = {
  leadToContact: number;          // %
  contactToAppointment: number;   // %
  appointmentToClosed: number;    // %
};

export type KPIEfficiency = {
  avgResponseTimeHours: number | null;
  medianResponseTimeHours: number | null;
  pctWithin30Min: number | null;
  pctWithin1Hour: number | null;
  avgTimeToAppointmentDays: number | null;
  avgCloseTimeDays: number | null;
  responseTimeSparkline: number[];
};

export type FunnelStage = {
  name: string;
  count: number;
  fromPreviousPct: number;
  dropOffPct: number;
  isWorstDropOff: boolean;
};

export type SourceTableRow = {
  source: string;
  leads: number;
  appointments: number;
  conversionPct: number;
  discordRevenue: number;
};

export type Insight = {
  type: 'warning' | 'info' | 'success';
  message: string;
};

export type AppointmentMetrics = {
  total: number;
  scheduled: number;
  completed: number;
  cancelled: number;
  noShow: number;
  completionRate: number;    // %
  cancellationRate: number;  // %
};

export type RevenueMetrics = {
  actual: number;            // from billing_documents (issued)
  potential: number;         // from leads estimated_deal_value (closed)
  documentCount: number;
  avgDocumentValue: number | null;
};

export type RevenueByService = {
  serviceName: string;
  total: number;
  count: number;
};

export type CustomerMetrics = {
  totalActive: number;
  newThisPeriod: number;
  returning: number;         // visits_count > 1
};

export type RevenueOverTimePoint = {
  label: string;
  revenue: number;
  leads: number;
};

export type AppointmentsPerDayPoint = {
  label: string;
  total: number;
  completed: number;
  cancelled: number;
};

export type KPIDiscordRevenue = {
  current: number;
  previous: number;
  changePct: number | null;
  sparkline: number[];
};

export type AnalyticsData = {
  kpi: {
    discordRevenue: KPIDiscordRevenue;
    conversionBreakdown: KPIConversionBreakdown;
    efficiency: KPIEfficiency;
    leadsCount: KPICountWithTrend;
    closeRate: KPICountWithTrend;
    appointmentsCount: KPICountWithTrend;
    cancelledAppointments: number;
    actualRevenue: KPICountWithTrend;
    customersCount: KPICountWithTrend;
  };
  funnel: FunnelStage[];
  sourceTable: SourceTableRow[];
  insights: Insight[];
  leadsPerDay: RevenueOverTimePoint[];
  totalLeads: number;
  appointmentMetrics: AppointmentMetrics;
  revenueMetrics: RevenueMetrics;
  revenueByService: RevenueByService[];
  customerMetrics: CustomerMetrics;
  appointmentsPerDay: AppointmentsPerDayPoint[];
};
