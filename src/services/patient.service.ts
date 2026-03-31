import type { Patient } from '@/types/patients';
import * as patientRepository from '@/repositories/patient.repository';
import * as appointmentRepository from '@/repositories/appointment.repository';
import * as leadRepository from '@/repositories/lead.repository';
import { getSupabaseAdmin as getSupabaseAdminClient } from '@/lib/supabase-admin';

// ─── Types ──────────────────────────────────────────────────────────────────

export type CancellationRisk = 'low' | 'medium' | 'high';
export type PaymentStatusValue = 'up_to_date' | 'outstanding' | 'no_billing';

export type PatientCardData = {
  patient: Patient;
  nextAppointment: { datetime: string; service_name: string | null } | null;
  timeToAppointment: string | null;
  lastInteraction: string | null;
  cancellationRisk: CancellationRisk;
  paymentStatus: PaymentStatusValue;
  outstandingBalance: number;
  primaryTreatment: string | null;
  appointmentStats: { total: number; completed: number; cancelled: number; noShow: number };
  completedAppointments: { id: string; datetime: string; service_name: string | null; revenue: number | null; notes: string | null }[];
};

// ─── Derived Field Computation ──────────────────────────────────────────────

/** Cancellation risk — derived ONLY from appointments.status (cancelled + no_show). */
export function computeCancellationRisk(stats: {
  totalAppointments: number;
  cancelledCount: number;
  noShowCount: number;
  daysSinceLastVisit: number | null;
}): CancellationRisk {
  if (stats.totalAppointments === 0) return 'low';
  const negativeRate = (stats.cancelledCount + stats.noShowCount) / stats.totalAppointments;
  const dormant = stats.daysSinceLastVisit != null && stats.daysSinceLastVisit > 180;
  if (negativeRate > 0.4 || (dormant && negativeRate > 0)) return 'high';
  if (negativeRate > 0.2 || (stats.daysSinceLastVisit != null && stats.daysSinceLastVisit > 90)) return 'medium';
  return 'low';
}

/** Payment status from billing_documents total vs payments total. */
export function computePaymentStatus(totalBilled: number, totalPaid: number): {
  status: PaymentStatusValue;
  outstandingBalance: number;
} {
  if (totalBilled === 0) return { status: 'no_billing', outstandingBalance: 0 };
  const balance = totalBilled - totalPaid;
  return balance <= 0
    ? { status: 'up_to_date', outstandingBalance: 0 }
    : { status: 'outstanding', outstandingBalance: balance };
}

/**
 * Time to next appointment — Hebrew display string.
 * All datetime comparisons use UTC. Timezone conversion happens in UI only.
 */
export function computeTimeToAppointment(nextDatetime: string | null): string | null {
  if (!nextDatetime) return null;
  const diffMs = new Date(nextDatetime).getTime() - Date.now();
  if (diffMs < 0) return null;
  const hours = Math.floor(diffMs / 3_600_000);
  if (hours < 1) return 'בקרוב';
  if (hours < 24) {
    if (hours === 1) return 'בעוד שעה';
    if (hours === 2) return 'בעוד שעתיים';
    return `בעוד ${hours} שעות`;
  }
  const days = Math.floor(hours / 24);
  if (days === 1) return 'מחר';
  return `בעוד ${days} ימים`;
}

/**
 * Last interaction — explicit priority: completed appointment > last_visit_date > lead.last_contact_date.
 * Returns the most recent date across all sources.
 */
export function computeLastInteraction(
  latestCompletedAppointment: string | null,
  lastVisitDate: string | null,
  leadLastContactDate: string | null,
): string | null {
  const dates = [latestCompletedAppointment, lastVisitDate, leadLastContactDate]
    .filter(Boolean)
    .map((d) => new Date(d!).getTime())
    .filter((t) => !isNaN(t));
  if (dates.length === 0) return null;
  return new Date(Math.max(...dates)).toISOString();
}

// ─── Data Fetching Helpers ──────────────────────────────────────────────────

async function getBillingTotal(clinicId: string, patientId: string): Promise<number> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from('billing_documents')
    .select('total')
    .eq('clinic_id', clinicId)
    .eq('patient_id', patientId)
    .eq('status', 'issued');
  if (error || !data) return 0;
  return (data as { total: number }[]).reduce((sum, row) => sum + Number(row.total), 0);
}

async function getPaymentTotal(clinicId: string, patientId: string): Promise<number> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from('payments')
    .select('amount, is_refund')
    .eq('clinic_id', clinicId)
    .eq('patient_id', patientId)
    .eq('status', 'received');
  if (error || !data) return 0;
  return (data as { amount: number; is_refund: boolean }[]).reduce(
    (sum, row) => sum + (row.is_refund ? -Number(row.amount) : Number(row.amount)),
    0,
  );
}

// ─── Main Orchestrator ──────────────────────────────────────────────────────

/** Build the full enriched patient card data. All sub-queries run in parallel. */
export async function getPatientCardData(
  patientId: string,
  clinicId: string,
): Promise<{ data: PatientCardData | null; error: unknown }> {
  const { data: patient, error: patErr } = await patientRepository.getPatientById(patientId, clinicId);
  if (patErr || !patient) return { data: null, error: patErr ?? 'Not found' };

  const leadId = patient.lead_id;

  // All queries in parallel — no N+1
  const [
    nextApt,
    appointmentStats,
    billingTotal,
    paymentTotal,
    primaryTreatment,
    completedAppointments,
    leadData,
  ] = await Promise.all([
    appointmentRepository.getNextAppointmentForPatient(clinicId, patientId, leadId),
    appointmentRepository.getAppointmentStatsForPatient(clinicId, patientId, leadId),
    getBillingTotal(clinicId, patientId),
    getPaymentTotal(clinicId, patientId),
    appointmentRepository.getPrimaryTreatmentForPatient(clinicId, patientId, leadId),
    appointmentRepository.getCompletedAppointmentsByPatientId(patientId, clinicId),
    leadId ? leadRepository.getLeadById(leadId, clinicId) : Promise.resolve({ data: null }),
  ]);

  const daysSinceLastVisit = patient.last_visit_date
    ? Math.floor((Date.now() - new Date(patient.last_visit_date).getTime()) / 86_400_000)
    : null;

  const cancellationRisk = computeCancellationRisk({
    totalAppointments: appointmentStats.total,
    cancelledCount: appointmentStats.cancelled,
    noShowCount: appointmentStats.noShow,
    daysSinceLastVisit,
  });

  const { status: paymentStatus, outstandingBalance } = computePaymentStatus(billingTotal, paymentTotal);

  const latestCompleted = completedAppointments.data?.[0]?.datetime ?? null;
  const leadContact = leadData?.data?.last_contact_date ?? null;
  const lastInteraction = computeLastInteraction(latestCompleted, patient.last_visit_date, leadContact);

  const timeToAppointment = computeTimeToAppointment(nextApt?.datetime ?? null);

  return {
    data: {
      patient,
      nextAppointment: nextApt,
      timeToAppointment,
      lastInteraction,
      cancellationRisk,
      paymentStatus,
      outstandingBalance,
      primaryTreatment,
      appointmentStats,
      completedAppointments: completedAppointments.data ?? [],
    },
    error: null,
  };
}
