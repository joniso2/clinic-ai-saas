import { createClient } from '@supabase/supabase-js';
import * as leadRepository from '@/repositories/lead.repository';
import type { AnalyticsLeadRow } from '@/repositories/lead.repository';

// Re-export all types from the dedicated types file
export type {
  DateRange,
  KPICountWithTrend,
  KPIConversionBreakdown,
  KPIEfficiency,
  FunnelStage,
  SourceTableRow,
  Insight,
  AppointmentMetrics,
  RevenueMetrics,
  RevenueByService,
  CustomerMetrics,
  RevenueOverTimePoint,
  AppointmentsPerDayPoint,
  KPIDiscordRevenue,
  AnalyticsData,
} from './analytics.types';

import type {
  DateRange,
  KPICountWithTrend,
  KPIConversionBreakdown,
  KPIEfficiency,
  FunnelStage,
  SourceTableRow,
  Insight,
  AppointmentMetrics,
  RevenueMetrics,
  RevenueByService,
  CustomerMetrics,
  RevenueOverTimePoint,
  AppointmentsPerDayPoint,
  KPIDiscordRevenue,
  AnalyticsData,
} from './analytics.types';

// ─── Supabase Admin ─────────────────────────────────────────────────────────

function getSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase server environment variables are not configured.');
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
}

// ─── Internal Helpers ────────────────────────────────────────────────────────

function pct(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;
  return Math.round((numerator / denominator) * 100);
}

function hoursDiff(from: string, to: string): number {
  return (new Date(to).getTime() - new Date(from).getTime()) / 3_600_000;
}

function daysDiff(from: string, to: string): number {
  return (new Date(to).getTime() - new Date(from).getTime()) / 86_400_000;
}

function average(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function median(nums: number[]): number | null {
  if (nums.length === 0) return null;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

function isConverted(status: string | null): boolean {
  return status === 'Closed' || status === 'Converted';
}

function isAppointmentStage(status: string | null): boolean {
  return status === 'Appointment scheduled' || isConverted(status);
}

function isContactedStage(status: string | null): boolean {
  return status === 'Contacted' || isAppointmentStage(status);
}

function trendPct(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

// ─── New Data Fetchers ──────────────────────────────────────────────────────

type AppointmentRow = { id: string; status: string | null; datetime: string; revenue: number | null; service_name: string | null };

async function getAppointmentsForAnalytics(
  clinicId: string,
  from: string,
  to: string,
): Promise<AppointmentRow[]> {
  const supabase = getSupabaseAdminClient();
  const { data } = await supabase
    .from('appointments')
    .select('id, status, datetime, revenue, service_name')
    .eq('clinic_id', clinicId)
    .gte('datetime', from)
    .lte('datetime', to)
    .order('datetime', { ascending: true });
  return (data ?? []) as AppointmentRow[];
}

type BillingDocRow = { id: string; total: number; issued_at: string; status: string };
type BillingItemRow = { document_id: string; service_id: string | null; description: string; line_total: number; resolved_service_name?: string };

async function getBillingForAnalytics(
  clinicId: string,
  from: string,
  to: string,
): Promise<{ docs: BillingDocRow[]; items: BillingItemRow[] }> {
  const supabase = getSupabaseAdminClient();
  const { data: docs } = await supabase
    .from('billing_documents')
    .select('id, total, issued_at, status')
    .eq('clinic_id', clinicId)
    .eq('status', 'issued')
    .gte('issued_at', from)
    .lte('issued_at', to);

  const issuedDocs = (docs ?? []) as BillingDocRow[];
  if (issuedDocs.length === 0) return { docs: issuedDocs, items: [] };

  const docIds = issuedDocs.map((d) => d.id);
  const { data: items } = await supabase
    .from('billing_document_items')
    .select('document_id, service_id, description, line_total')
    .in('document_id', docIds);

  const rawItems = (items ?? []) as BillingItemRow[];

  // Resolve service_id → service_name from clinic_services when available
  const serviceIds = [...new Set(rawItems.map((i) => i.service_id).filter(Boolean) as string[])];
  let serviceNameMap: Record<string, string> = {};
  if (serviceIds.length > 0) {
    const { data: services } = await supabase
      .from('clinic_services')
      .select('id, service_name')
      .in('id', serviceIds);
    for (const svc of (services ?? []) as { id: string; service_name: string }[]) {
      serviceNameMap[svc.id] = svc.service_name;
    }
  }

  // Attach resolved name
  const enrichedItems = rawItems.map((item) => ({
    ...item,
    resolved_service_name: item.service_id ? serviceNameMap[item.service_id] : undefined,
  }));

  return { docs: issuedDocs, items: enrichedItems };
}

type PatientRow = { id: string; visits_count: number | null; created_at: string; status: string | null };

async function getCustomersForAnalytics(
  clinicId: string,
  from: string,
  to: string,
): Promise<{ current: PatientRow[]; all: PatientRow[] }> {
  const supabase = getSupabaseAdminClient();

  // New customers in range
  const { data: newCustomers } = await supabase
    .from('patients')
    .select('id, visits_count, created_at, status')
    .eq('clinic_id', clinicId)
    .is('deleted_at', null)
    .gte('created_at', from)
    .lte('created_at', to);

  // All active customers (for total count)
  const { data: allCustomers } = await supabase
    .from('patients')
    .select('id, visits_count, created_at, status')
    .eq('clinic_id', clinicId)
    .is('deleted_at', null)
    .in('status', ['active', 'dormant']);

  return {
    current: (newCustomers ?? []) as PatientRow[],
    all: (allCustomers ?? []) as PatientRow[],
  };
}

// ─── Compute Functions (existing) ────────────────────────────────────────────

function computeClosedRevenue(leads: AnalyticsLeadRow[]): number {
  return leads
    .filter((l) => isConverted(l.status))
    .reduce((sum, l) => sum + (l.estimated_deal_value ?? 0), 0);
}

function computeClosedRevenueSparkline(leads: AnalyticsLeadRow[], toDate: Date): number[] {
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(toDate);
    day.setDate(day.getDate() - (6 - i));
    const dayStr = day.toDateString();
    return leads
      .filter((l) => isConverted(l.status) && new Date(l.created_at).toDateString() === dayStr)
      .reduce((sum, l) => sum + (l.estimated_deal_value ?? 0), 0);
  });
}

function getPreviousPeriodRange(from: string, to: string): DateRange {
  const fromMs = new Date(from).getTime();
  const toMs = new Date(to).getTime();
  const rangeMs = toMs - fromMs;
  return {
    from: new Date(fromMs - rangeMs).toISOString(),
    to: new Date(fromMs).toISOString(),
  };
}

function computeFunnel(leads: AnalyticsLeadRow[]): FunnelStage[] {
  const total       = leads.length;
  const contacted   = leads.filter((l) => isContactedStage(l.status)).length;
  const appointments = leads.filter((l) => isAppointmentStage(l.status)).length;
  const closed       = leads.filter((l) => isConverted(l.status)).length;

  const counts = [total, contacted, appointments, closed];
  const names  = ['Leads', 'Contacted', 'Appointments', 'Closed'];

  const dropOffs = counts.slice(1).map((c, i) => (counts[i] > 0 ? 100 - pct(c, counts[i]) : 0));
  const maxDropOff = dropOffs.length > 0 ? Math.max(...dropOffs) : 0;

  return counts.map((count, i) => ({
    name: names[i],
    count,
    fromPreviousPct: i === 0 ? 100 : pct(count, counts[i - 1]),
    dropOffPct: i === 0 ? 0 : dropOffs[i - 1],
    isWorstDropOff: i > 0 && dropOffs[i - 1] === maxDropOff && maxDropOff > 0,
  }));
}

function computeSourceTable(leads: AnalyticsLeadRow[]): SourceTableRow[] {
  const sources = [...new Set(leads.map((l) => l.source ?? 'manual'))];
  return sources
    .map((source) => {
      const sl = leads.filter((l) => (l.source ?? 'manual') === source);
      const appts  = sl.filter((l) => isAppointmentStage(l.status)).length;
      const closed = sl.filter((l) => isConverted(l.status)).length;
      return {
        source,
        leads: sl.length,
        appointments: appts,
        conversionPct: pct(closed, sl.length),
        discordRevenue: source === 'discord'
          ? sl.reduce((s, l) => s + (l.estimated_deal_value ?? 0), 0)
          : 0,
      };
    })
    .sort((a, b) => b.leads - a.leads);
}

function computeResponseTimeSparkline(leads: AnalyticsLeadRow[], toDate: Date): number[] {
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(toDate);
    day.setDate(day.getDate() - (6 - i));
    const dayStr = day.toDateString();
    const dayLeads = leads.filter(
      (l) => l.last_contact_date && l.created_at && new Date(l.created_at).toDateString() === dayStr
    );
    const hours = dayLeads
      .map((l) => hoursDiff(l.created_at, l.last_contact_date!))
      .filter((h) => h >= 0 && h < 720);
    return hours.length > 0 ? hours.reduce((a, b) => a + b, 0) / hours.length : 0;
  });
}

function computeEfficiency(leads: AnalyticsLeadRow[], rangeTo: string): KPIEfficiency {
  const responseTimes = leads
    .filter((l) => l.last_contact_date && l.created_at)
    .map((l) => hoursDiff(l.created_at, l.last_contact_date!))
    .filter((h) => h >= 0 && h < 720);

  const totalWithContact = responseTimes.length;
  const pct30 = totalWithContact > 0 ? pct(responseTimes.filter((h) => h <= 0.5).length, totalWithContact) : null;
  const pct60 = totalWithContact > 0 ? pct(responseTimes.filter((h) => h <= 1).length, totalWithContact) : null;

  const timeToAppt = leads
    .filter((l) => l.next_appointment && l.created_at)
    .map((l) => daysDiff(l.created_at, l.next_appointment!))
    .filter((d) => d >= 0 && d < 365);

  const closeTimes = leads
    .filter((l) => isConverted(l.status) && l.last_contact_date && l.created_at)
    .map((l) => daysDiff(l.created_at, l.last_contact_date!))
    .filter((d) => d >= 0);

  return {
    avgResponseTimeHours:     average(responseTimes),
    medianResponseTimeHours:  median(responseTimes),
    pctWithin30Min:          pct30,
    pctWithin1Hour:          pct60,
    avgTimeToAppointmentDays: average(timeToAppt),
    avgCloseTimeDays:         average(closeTimes),
    responseTimeSparkline:    computeResponseTimeSparkline(leads, new Date(rangeTo)),
  };
}

// ─── New Compute Functions ──────────────────────────────────────────────────

function computeAppointmentMetrics(appointments: AppointmentRow[]): AppointmentMetrics {
  const total = appointments.length;
  const scheduled = appointments.filter((a) => a.status === 'scheduled').length;
  const completed = appointments.filter((a) => a.status === 'completed').length;
  const cancelled = appointments.filter((a) => a.status === 'cancelled').length;
  const noShow = appointments.filter((a) => a.status === 'no_show').length;

  return {
    total,
    scheduled,
    completed,
    cancelled,
    noShow,
    completionRate: pct(completed, total),
    cancellationRate: pct(cancelled, total),
  };
}

function computeRevenueMetrics(docs: BillingDocRow[], potentialRevenue: number): RevenueMetrics {
  const actual = docs.reduce((sum, d) => sum + Number(d.total), 0);
  return {
    actual,
    potential: potentialRevenue,
    documentCount: docs.length,
    avgDocumentValue: docs.length > 0 ? actual / docs.length : null,
  };
}

function computeRevenueByService(items: BillingItemRow[]): RevenueByService[] {
  const map = new Map<string, { total: number; count: number }>();
  for (const item of items) {
    // Use normalized service name when available, fall back to description
    const key = item.resolved_service_name || item.description || 'ללא שם';
    const existing = map.get(key);
    if (existing) {
      existing.total += Number(item.line_total);
      existing.count += 1;
    } else {
      map.set(key, { total: Number(item.line_total), count: 1 });
    }
  }
  return Array.from(map.entries())
    .map(([serviceName, { total, count }]) => ({ serviceName, total, count }))
    .sort((a, b) => b.total - a.total);
}

function computeCustomerMetrics(current: PatientRow[], all: PatientRow[]): CustomerMetrics {
  return {
    totalActive: all.length,
    newThisPeriod: current.length,
    returning: all.filter((p) => (p.visits_count ?? 0) > 1).length,
  };
}

// ─── Revenue Over Time (merged leads + billing per day) ─────────────────────

function computeRevenueOverTime(
  leads: AnalyticsLeadRow[],
  docs: BillingDocRow[],
  from: string,
  to: string,
): RevenueOverTimePoint[] {
  const fromDate = new Date(from);
  const toDate   = new Date(to);
  const dayCount = Math.min(Math.ceil(daysDiff(from, toDate.toISOString())), 90);

  return Array.from({ length: dayCount }, (_, i) => {
    const day = new Date(fromDate);
    day.setDate(day.getDate() + i);
    if (day > toDate) return null;
    const dayStr = day.toDateString();
    const d = day.getDate();
    const m = day.getMonth() + 1;

    const dayRevenue = docs
      .filter((doc) => new Date(doc.issued_at).toDateString() === dayStr)
      .reduce((sum, doc) => sum + Number(doc.total), 0);

    const dayLeads = leads.filter((l) => new Date(l.created_at).toDateString() === dayStr).length;

    return {
      label: `${d}/${m}`,
      revenue: dayRevenue,
      leads: dayLeads,
    };
  }).filter(Boolean) as RevenueOverTimePoint[];
}

// ─── Appointments Per Day (utilization) ──────────────────────────────────────

function computeAppointmentsPerDay(
  appointments: AppointmentRow[],
  from: string,
  to: string,
): AppointmentsPerDayPoint[] {
  const fromDate = new Date(from);
  const toDate   = new Date(to);
  const dayCount = Math.min(Math.ceil(daysDiff(from, toDate.toISOString())), 90);

  return Array.from({ length: dayCount }, (_, i) => {
    const day = new Date(fromDate);
    day.setDate(day.getDate() + i);
    if (day > toDate) return null;
    const dayStr = day.toDateString();
    const d = day.getDate();
    const m = day.getMonth() + 1;

    const dayApts = appointments.filter((a) => new Date(a.datetime).toDateString() === dayStr);
    return {
      label: `${d}/${m}`,
      total: dayApts.length,
      completed: dayApts.filter((a) => a.status === 'completed').length,
      cancelled: dayApts.filter((a) => a.status === 'cancelled').length,
    };
  }).filter(Boolean) as AppointmentsPerDayPoint[];
}

// ─── Insights (Hebrew, actionable) ────────────────────────────────────────────

const STAGE_NAMES_HE: Record<string, string> = {
  Leads: 'ליד',
  Contacted: 'קשר',
  Appointments: 'תור',
  Closed: 'סגור',
};

function computeInsights(
  funnel: FunnelStage[],
  efficiency: KPIEfficiency,
  convBreakdown: KPIConversionBreakdown,
  discordRevenue: KPIDiscordRevenue,
  appointmentMetrics: AppointmentMetrics,
): Insight[] {
  const insights: Insight[] = [];

  if (discordRevenue.changePct !== null) {
    if (discordRevenue.changePct >= 10) {
      insights.push({ type: 'success', message: `הכנסה פוטנציאלית עלתה ב־${discordRevenue.changePct}% לעומת התקופה הקודמת.` });
    } else if (discordRevenue.changePct <= -10) {
      insights.push({ type: 'warning', message: `הכנסה פוטנציאלית ירדה ב־${Math.abs(discordRevenue.changePct)}% לעומת התקופה הקודמת.` });
    }
  }

  const worstStage = funnel.find((s) => s.isWorstDropOff);
  if (worstStage) {
    const idx = funnel.indexOf(worstStage);
    const prevName = idx > 0 ? (STAGE_NAMES_HE[funnel[idx - 1]!.name] ?? funnel[idx - 1]!.name) : 'השלב הקודם';
    const currName = STAGE_NAMES_HE[worstStage.name] ?? worstStage.name;
    if (worstStage.name === 'Closed') {
      insights.push({
        type: 'warning',
        message: `הירידה הגדולה ביותר מתרחשת בין תור לסגירה (${worstStage.dropOffPct}% נשירה) — כדאי לבדוק תהליך פולואפ לאחר קביעת תור.`,
      });
    } else {
      insights.push({
        type: 'warning',
        message: `הירידה הגדולה ביותר מתרחשת בין ${prevName} ל־${currName} (${worstStage.dropOffPct}% נשירה) — מומלץ לחזק את השלב הזה.`,
      });
    }
  }

  if (efficiency.avgResponseTimeHours !== null) {
    const h = Math.round(efficiency.avgResponseTimeHours * 10) / 10;
    const hoursText = h < 1 ? `${Math.round(h * 60)} דקות` : `${h} שעות`;
    insights.push({
      type: h > 4 ? 'warning' : 'info',
      message: `זמן התגובה הממוצע עומד על ${hoursText} — מומלץ לשפר מתחת לשעה אחת לשיפור אחוזי הסגירה.`,
    });
    if (h > 0.5) {
      insights.push({
        type: 'info',
        message: 'מענה תוך 30 דקות עשוי להעלות משמעותית את אחוזי ההמרה.',
      });
    }
  }

  if (convBreakdown.contactToAppointment > 0 && convBreakdown.contactToAppointment < 40) {
    insights.push({
      type: 'warning',
      message: `רק ${convBreakdown.contactToAppointment}% מלידים שנוצר איתם קשר קבעו תור — כדאי לשפר סקריפטים ופולואפ.`,
    });
  }

  if (convBreakdown.appointmentToClosed > 0 && convBreakdown.appointmentToClosed < 60) {
    insights.push({
      type: 'info',
      message: `אחוז המרה מתור לסגירה עומד על ${convBreakdown.appointmentToClosed}% — פולואפ אחרי ביקור יכול לשפר.`,
    });
  }

  if (appointmentMetrics.cancellationRate > 20) {
    insights.push({
      type: 'warning',
      message: `שיעור ביטול תורים גבוה (${appointmentMetrics.cancellationRate}%) — כדאי לשקול תזכורות אוטומטיות.`,
    });
  }

  if (appointmentMetrics.total > 0 && appointmentMetrics.completionRate >= 80) {
    insights.push({
      type: 'success',
      message: `שיעור הגעה לתורים גבוה (${appointmentMetrics.completionRate}%) — ביצוע מעולה.`,
    });
  }

  if (insights.length === 0) {
    insights.push({
      type: 'success',
      message: 'צינור הלידים מתפקד טוב בכל שלבי ההמרה. המשך כך.',
    });
  }

  return insights;
}

// ─── Main Export ─────────────────────────────────────────────────────────────

export async function getAnalytics(
  clinicId: string,
  range: DateRange,
): Promise<{ data: AnalyticsData | null; error: unknown }> {
  // Fetch all data sources in parallel
  const [leadsResult, prevLeadsResult, appointments, prevAppointments, billing, prevBilling, customers, prevCustomers] = await Promise.all([
    leadRepository.getLeadsForAnalytics(clinicId, range.from, range.to),
    leadRepository.getLeadsForAnalytics(clinicId, ...Object.values(getPreviousPeriodRange(range.from, range.to)) as [string, string]),
    getAppointmentsForAnalytics(clinicId, range.from, range.to),
    getAppointmentsForAnalytics(clinicId, ...Object.values(getPreviousPeriodRange(range.from, range.to)) as [string, string]),
    getBillingForAnalytics(clinicId, range.from, range.to),
    getBillingForAnalytics(clinicId, ...Object.values(getPreviousPeriodRange(range.from, range.to)) as [string, string]),
    getCustomersForAnalytics(clinicId, range.from, range.to),
    getCustomersForAnalytics(clinicId, ...Object.values(getPreviousPeriodRange(range.from, range.to)) as [string, string]),
  ]);

  const currentLeads = leadsResult.data;
  if (leadsResult.error || !currentLeads) return { data: null, error: leadsResult.error };
  const prevLeads = prevLeadsResult.data ?? [];

  // ── Lead metrics ──
  const total        = currentLeads.length;
  const contacted    = currentLeads.filter((l) => isContactedStage(l.status)).length;
  const leadsAppts   = currentLeads.filter((l) => isAppointmentStage(l.status)).length;
  const closed       = currentLeads.filter((l) => isConverted(l.status)).length;

  const prevTotal        = prevLeads.length;
  const prevLeadsAppts   = prevLeads.filter((l) => isAppointmentStage(l.status)).length;
  const prevClosed       = prevLeads.filter((l) => isConverted(l.status)).length;
  const prevCloseRate    = prevTotal > 0 ? pct(prevClosed, prevTotal) : 0;
  const closeRatePct     = total > 0 ? pct(closed, total) : 0;

  // ── Revenue ──
  const currentPotentialRevenue  = computeClosedRevenue(currentLeads);
  const previousPotentialRevenue = computeClosedRevenue(prevLeads);
  const sparkline = computeClosedRevenueSparkline(currentLeads, new Date(range.to));

  const discordRevenue: KPIDiscordRevenue = {
    current:   currentPotentialRevenue,
    previous:  previousPotentialRevenue,
    changePct: trendPct(currentPotentialRevenue, previousPotentialRevenue),
    sparkline,
  };

  // ── Actual revenue from billing ──
  const currentActualRevenue = billing.docs.reduce((s, d) => s + Number(d.total), 0);
  const prevActualRevenue = prevBilling.docs.reduce((s, d) => s + Number(d.total), 0);

  // ── Appointment metrics ──
  const appointmentMetrics = computeAppointmentMetrics(appointments);
  const prevAppointmentMetrics = computeAppointmentMetrics(prevAppointments);

  // ── Customer metrics ──
  const customerMetrics = computeCustomerMetrics(customers.current, customers.all);
  const prevCustomerCount = prevCustomers.current.length;

  // ── Conversion breakdown ──
  const conversionBreakdown: KPIConversionBreakdown = {
    leadToContact:        pct(contacted, total),
    contactToAppointment: pct(leadsAppts, contacted),
    appointmentToClosed:  pct(closed, leadsAppts),
  };

  const efficiency = computeEfficiency(currentLeads, range.to);
  const funnel     = computeFunnel(currentLeads);
  const sourceTable = computeSourceTable(currentLeads);
  const revenueMetrics = computeRevenueMetrics(billing.docs, currentPotentialRevenue);
  const revenueByService = computeRevenueByService(billing.items);
  const leadsPerDay = computeRevenueOverTime(currentLeads, billing.docs, range.from, range.to);
  const appointmentsPerDay = computeAppointmentsPerDay(appointments, range.from, range.to);

  const insights = computeInsights(funnel, efficiency, conversionBreakdown, discordRevenue, appointmentMetrics);

  return {
    data: {
      kpi: {
        discordRevenue,
        conversionBreakdown,
        efficiency,
        leadsCount:            { current: total, previous: prevTotal, changePct: trendPct(total, prevTotal) },
        closeRate:             { current: closeRatePct, previous: prevCloseRate, changePct: trendPct(closeRatePct, prevCloseRate) },
        appointmentsCount:     { current: appointmentMetrics.total, previous: prevAppointmentMetrics.total, changePct: trendPct(appointmentMetrics.total, prevAppointmentMetrics.total) },
        cancelledAppointments: appointmentMetrics.cancelled,
        actualRevenue:         { current: currentActualRevenue, previous: prevActualRevenue, changePct: trendPct(currentActualRevenue, prevActualRevenue) },
        customersCount:        { current: customerMetrics.newThisPeriod, previous: prevCustomerCount, changePct: trendPct(customerMetrics.newThisPeriod, prevCustomerCount) },
      },
      funnel,
      sourceTable,
      insights,
      leadsPerDay,
      totalLeads: total,
      appointmentMetrics,
      revenueMetrics,
      revenueByService,
      customerMetrics,
      appointmentsPerDay,
    },
    error: null,
  };
}
