import * as leadRepository from '@/repositories/lead.repository';
import type { AnalyticsLeadRow } from '@/repositories/lead.repository';

// ─── Public Types ────────────────────────────────────────────────────────────

export type DateRange = {
  from: string; // ISO datetime string
  to: string;   // ISO datetime string
};

export type KPIDiscordRevenue = {
  current: number;
  previous: number;
  changePct: number | null;
  sparkline: number[]; // 7 data points (revenue per day for last 7 days of range)
};

export type KPIConversionBreakdown = {
  leadToContact: number;          // %
  contactToAppointment: number;   // %
  appointmentToClosed: number;    // %
};

export type KPIEfficiency = {
  avgResponseTimeHours: number | null;     // lead created → first contact
  avgTimeToAppointmentDays: number | null; // lead created → next_appointment
  avgCloseTimeDays: number | null;         // lead created → closed (via last_contact_date)
};

export type FunnelStage = {
  name: string;
  count: number;
  fromPreviousPct: number; // % retained from previous stage
  dropOffPct: number;      // % lost at this stage
  isWorstDropOff: boolean;
};

export type SourceTableRow = {
  source: string;
  leads: number;
  appointments: number;
  conversionPct: number;
  discordRevenue: number; // only non-zero for discord source
};

export type Insight = {
  type: 'warning' | 'info' | 'success';
  message: string;
};

export type AnalyticsData = {
  kpi: {
    discordRevenue: KPIDiscordRevenue;
    conversionBreakdown: KPIConversionBreakdown;
    efficiency: KPIEfficiency;
  };
  funnel: FunnelStage[];
  sourceTable: SourceTableRow[];
  insights: Insight[];
  leadsPerDay: { label: string; count: number }[];
  totalLeads: number;
};

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

function isConverted(status: string | null): boolean {
  return status === 'Closed' || status === 'Converted';
}

function isAppointmentStage(status: string | null): boolean {
  return status === 'Appointment scheduled' || isConverted(status);
}

function isContactedStage(status: string | null): boolean {
  return status === 'Contacted' || isAppointmentStage(status);
}

// ─── Discord Revenue ─────────────────────────────────────────────────────────

function computeDiscordRevenue(leads: AnalyticsLeadRow[]): number {
  return leads
    .filter((l) => l.source === 'discord')
    .reduce((sum, l) => sum + (l.estimated_deal_value ?? 0), 0);
}

/**
 * Build a 7-point sparkline of Discord revenue per day (most recent 7 days of range).
 */
function computeDiscordSparkline(leads: AnalyticsLeadRow[], toDate: Date): number[] {
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(toDate);
    day.setDate(day.getDate() - (6 - i));
    const dayStr = day.toDateString();
    return leads
      .filter((l) => l.source === 'discord' && new Date(l.created_at).toDateString() === dayStr)
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

// ─── Funnel ──────────────────────────────────────────────────────────────────

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

// ─── Source Table ─────────────────────────────────────────────────────────────

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

// ─── Efficiency ──────────────────────────────────────────────────────────────

function computeEfficiency(leads: AnalyticsLeadRow[]): KPIEfficiency {
  const responseTimes = leads
    .filter((l) => l.last_contact_date && l.created_at)
    .map((l) => hoursDiff(l.created_at, l.last_contact_date!))
    .filter((h) => h >= 0 && h < 720); // exclude outliers > 30 days

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
    avgTimeToAppointmentDays: average(timeToAppt),
    avgCloseTimeDays:         average(closeTimes),
  };
}

// ─── Insights (deterministic rule-based) ────────────────────────────────────

function computeInsights(
  funnel: FunnelStage[],
  efficiency: KPIEfficiency,
  convBreakdown: KPIConversionBreakdown,
  discordRevenue: KPIDiscordRevenue,
): Insight[] {
  const insights: Insight[] = [];

  // Revenue trend
  if (discordRevenue.changePct !== null) {
    if (discordRevenue.changePct >= 10) {
      insights.push({ type: 'success', message: `Discord revenue is up ${discordRevenue.changePct}% vs the previous period` });
    } else if (discordRevenue.changePct <= -10) {
      insights.push({ type: 'warning', message: `Discord revenue dropped ${Math.abs(discordRevenue.changePct)}% vs the previous period` });
    }
  }

  // Worst drop-off stage
  const worstStage = funnel.find((s) => s.isWorstDropOff);
  if (worstStage) {
    const stagePrev = funnel[funnel.indexOf(worstStage) - 1]?.name ?? 'previous stage';
    insights.push({
      type: 'warning',
      message: `Biggest drop-off is ${stagePrev} → ${worstStage.name} (${worstStage.dropOffPct}% drop-off)`,
    });
  }

  // Response time
  if (efficiency.avgResponseTimeHours !== null) {
    const h = Math.round(efficiency.avgResponseTimeHours * 10) / 10;
    insights.push({
      type: h > 4 ? 'warning' : 'info',
      message: `Average response time is ${h} hour${h === 1 ? '' : 's'}`,
    });
    if (h > 0.5) {
      insights.push({
        type: 'info',
        message: 'Improving response time under 30 minutes could significantly increase conversion',
      });
    }
  }

  // Contact → Appointment rate
  if (convBreakdown.contactToAppointment > 0 && convBreakdown.contactToAppointment < 40) {
    insights.push({
      type: 'warning',
      message: `Only ${convBreakdown.contactToAppointment}% of contacted leads book an appointment — refine your follow-up scripts`,
    });
  }

  // Appointment → Closed rate
  if (convBreakdown.appointmentToClosed > 0 && convBreakdown.appointmentToClosed < 60) {
    insights.push({
      type: 'info',
      message: `${convBreakdown.appointmentToClosed}% appointment-to-close rate — following up after visits can improve this`,
    });
  }

  if (insights.length === 0) {
    insights.push({
      type: 'success',
      message: 'Your pipeline is performing well across all conversion stages!',
    });
  }

  return insights;
}

// ─── Leads Per Day ───────────────────────────────────────────────────────────

function computeLeadsPerDay(leads: AnalyticsLeadRow[], from: string, to: string): { label: string; count: number }[] {
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
    return {
      label: `${d}/${m}`,
      count: leads.filter((l) => new Date(l.created_at).toDateString() === dayStr).length,
    };
  }).filter(Boolean) as { label: string; count: number }[];
}

// ─── Main Export ─────────────────────────────────────────────────────────────

export async function getAnalytics(
  clinicId: string,
  range: DateRange,
): Promise<{ data: AnalyticsData | null; error: unknown }> {
  const { data: currentLeads, error } = await leadRepository.getLeadsForAnalytics(
    clinicId,
    range.from,
    range.to,
  );
  if (error || !currentLeads) return { data: null, error };

  const prevRange = getPreviousPeriodRange(range.from, range.to);
  const { data: prevLeads } = await leadRepository.getLeadsForAnalytics(
    clinicId,
    prevRange.from,
    prevRange.to,
  );

  const currentDiscordRevenue  = computeDiscordRevenue(currentLeads);
  const previousDiscordRevenue = computeDiscordRevenue(prevLeads ?? []);
  const revenueChangePct =
    previousDiscordRevenue > 0
      ? Math.round(((currentDiscordRevenue - previousDiscordRevenue) / previousDiscordRevenue) * 100)
      : null;

  const total        = currentLeads.length;
  const contacted    = currentLeads.filter((l) => isContactedStage(l.status)).length;
  const appointments = currentLeads.filter((l) => isAppointmentStage(l.status)).length;
  const closed       = currentLeads.filter((l) => isConverted(l.status)).length;

  const conversionBreakdown: KPIConversionBreakdown = {
    leadToContact:        pct(contacted, total),
    contactToAppointment: pct(appointments, contacted),
    appointmentToClosed:  pct(closed, appointments),
  };

  const efficiency    = computeEfficiency(currentLeads);
  const funnel        = computeFunnel(currentLeads);
  const sourceTable   = computeSourceTable(currentLeads);
  const sparkline     = computeDiscordSparkline(currentLeads, new Date(range.to));
  const leadsPerDay   = computeLeadsPerDay(currentLeads, range.from, range.to);

  const discordRevenue: KPIDiscordRevenue = {
    current:   currentDiscordRevenue,
    previous:  previousDiscordRevenue,
    changePct: revenueChangePct,
    sparkline,
  };

  const insights = computeInsights(funnel, efficiency, conversionBreakdown, discordRevenue);

  return {
    data: {
      kpi: { discordRevenue, conversionBreakdown, efficiency },
      funnel,
      sourceTable,
      insights,
      leadsPerDay,
      totalLeads: total,
    },
    error: null,
  };
}
