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
  avgResponseTimeHours: number | null;
  medianResponseTimeHours: number | null;
  pctWithin30Min: number | null;   // % of leads with first contact within 30 min
  pctWithin1Hour: number | null;
  avgTimeToAppointmentDays: number | null;
  avgCloseTimeDays: number | null;
  responseTimeSparkline: number[]; // 7 points: avg response hours per day (recent 7 days)
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

export type KPICountWithTrend = {
  current: number;
  previous: number;
  changePct: number | null;
};

export type AnalyticsData = {
  kpi: {
    discordRevenue: KPIDiscordRevenue;
    conversionBreakdown: KPIConversionBreakdown;
    efficiency: KPIEfficiency;
    leadsCount: KPICountWithTrend;
    closeRate: KPICountWithTrend;       // current/previous are percentages
    appointmentsCount: KPICountWithTrend;
    cancelledAppointments: number;      // not tracked yet, always 0
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

// ─── Revenue (closed leads — all sources) ───────────────────────────────────

/** Total revenue from all closed/converted leads in the period (for "הכנסה פוטנציאלית" KPI). */
function computeClosedRevenue(leads: AnalyticsLeadRow[]): number {
  return leads
    .filter((l) => isConverted(l.status))
    .reduce((sum, l) => sum + (l.estimated_deal_value ?? 0), 0);
}

function computeDiscordRevenue(leads: AnalyticsLeadRow[]): number {
  return leads
    .filter((l) => l.source === 'discord')
    .reduce((sum, l) => sum + (l.estimated_deal_value ?? 0), 0);
}

/**
 * Build a 7-point sparkline of closed revenue per day (most recent 7 days of range).
 * Uses created_at for day assignment; value from closed leads in that period.
 */
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
): Insight[] {
  const insights: Insight[] = [];

  if (discordRevenue.changePct !== null) {
    if (discordRevenue.changePct >= 10) {
      insights.push({ type: 'success', message: `הכנסה פוטנציאלית מדיסקורד עלתה ב־${discordRevenue.changePct}% לעומת התקופה הקודמת.` });
    } else if (discordRevenue.changePct <= -10) {
      insights.push({ type: 'warning', message: `הכנסה פוטנציאלית מדיסקורד ירדה ב־${Math.abs(discordRevenue.changePct)}% לעומת התקופה הקודמת.` });
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

  if (insights.length === 0) {
    insights.push({
      type: 'success',
      message: 'צינור הלידים מתפקד טוב בכל שלבי ההמרה. המשך כך.',
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

  const currentDiscordRevenue  = computeClosedRevenue(currentLeads);
  const previousDiscordRevenue = computeClosedRevenue(prevLeads ?? []);
  const revenueChangePct =
    previousDiscordRevenue > 0
      ? Math.round(((currentDiscordRevenue - previousDiscordRevenue) / previousDiscordRevenue) * 100)
      : null;

  const total        = currentLeads.length;
  const contacted    = currentLeads.filter((l) => isContactedStage(l.status)).length;
  const appointments = currentLeads.filter((l) => isAppointmentStage(l.status)).length;
  const closed       = currentLeads.filter((l) => isConverted(l.status)).length;

  const prevTotal        = (prevLeads ?? []).length;
  const prevAppointments = (prevLeads ?? []).filter((l) => isAppointmentStage(l.status)).length;
  const prevClosed       = (prevLeads ?? []).filter((l) => isConverted(l.status)).length;
  const prevCloseRate    = prevTotal > 0 ? pct(prevClosed, prevTotal) : 0;
  const closeRatePct     = total > 0 ? pct(closed, total) : 0;

  const leadsChangePct     = prevTotal > 0 ? Math.round(((total - prevTotal) / prevTotal) * 100) : null;
  const appointmentsChange = prevAppointments > 0 ? Math.round(((appointments - prevAppointments) / prevAppointments) * 100) : null;
  const closeRateChange    = prevCloseRate > 0 ? Math.round(((closeRatePct - prevCloseRate) / prevCloseRate) * 100) : null;

  const conversionBreakdown: KPIConversionBreakdown = {
    leadToContact:        pct(contacted, total),
    contactToAppointment: pct(appointments, contacted),
    appointmentToClosed:  pct(closed, appointments),
  };

  const efficiency    = computeEfficiency(currentLeads, range.to);
  const funnel        = computeFunnel(currentLeads);
  const sourceTable   = computeSourceTable(currentLeads);
  const sparkline     = computeClosedRevenueSparkline(currentLeads, new Date(range.to));
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
      kpi: {
        discordRevenue,
        conversionBreakdown,
        efficiency,
        leadsCount:        { current: total, previous: prevTotal, changePct: leadsChangePct },
        closeRate:         { current: closeRatePct, previous: prevCloseRate, changePct: closeRateChange },
        appointmentsCount: { current: appointments, previous: prevAppointments, changePct: appointmentsChange },
        cancelledAppointments: 0,
      },
      funnel,
      sourceTable,
      insights,
      leadsPerDay,
      totalLeads: total,
    },
    error: null,
  };
}
