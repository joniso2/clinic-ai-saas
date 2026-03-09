import type { Appointment } from '@/types/appointments';
import { STATUS_LABELS } from '@/lib/hebrew';

export const ISRAEL_TZ = 'Asia/Jerusalem';

export type CalendarEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: Appointment;
};

/** Service category for color + icon. Consultation → yellow, Treatment → blue, Beauty → pink, Follow-up → green, Default → gray */
export type ServiceCategory = 'consultation' | 'treatment' | 'beauty' | 'follow_up' | 'default';

export function getServiceCategory(apt: Appointment): ServiceCategory {
  if (apt.status === 'cancelled') return 'default';
  if (apt.type === 'follow_up') return 'follow_up';
  const sn = (apt.service_name ?? '').toLowerCase();
  const he = (apt.service_name ?? '').replace(/\s/g, '');
  if (/\b(beauty|meeting|יופי|עיצוב|טיפוח|פגישה)\b/.test(sn) || /יופי|עיצוב|טיפוח|פגישה/.test(he)) return 'beauty';
  if (/\b(treatment|טיפול|טיפולים)\b/.test(sn) || /טיפול/.test(he)) return 'treatment';
  if (/\b(consultation|ייעוץ|התייעצות)\b/.test(sn) || /ייעוץ|התייעצות/.test(he)) return 'consultation';
  return apt.type === 'new' ? 'consultation' : 'default';
}

export const SERVICE_DISPLAY: Record<ServiceCategory, string> = {
  consultation: 'ייעוץ',
  treatment: 'טיפול',
  beauty: 'יופי',
  follow_up: 'מעקב',
  default: 'תור',
};

export const SERVICE_ICON: Record<ServiceCategory, string> = {
  consultation: '💬',
  treatment: '🦷',
  beauty: '💅',
  follow_up: '🔁',
  default: '📋',
};

/** Accent bar colors by category */
export const SERVICE_ACCENT_COLOR: Record<ServiceCategory, string> = {
  consultation: '#f59e0b',
  treatment: '#38bdf8',
  beauty: '#f472b6',
  follow_up: '#34d399',
  default: '#94a3b8',
};

export function getServiceLabel(apt: Appointment): string {
  return apt.service_name ?? SERVICE_DISPLAY[getServiceCategory(apt)] ?? 'תור';
}

/** Label for appointment card: lead status (Hebrew) if available, else service/category label. */
export function getAppointmentCardLabel(apt: Appointment, leadStatusByLeadId: Record<string, string>): string {
  if (apt.lead_id && leadStatusByLeadId[apt.lead_id]) {
    const status = leadStatusByLeadId[apt.lead_id];
    return STATUS_LABELS[status] ?? status ?? 'תור';
  }
  return getServiceLabel(apt);
}

/** Get YYYY-MM-DD for an event start in Israel timezone */
export function getEventDateStr(start: Date): string {
  return new Date(start).toLocaleDateString('en-CA', { timeZone: ISRAEL_TZ });
}

export type DayColumn = {
  dateStr: string;
  dayLabel: string;
  dayNum: number;
  isToday: boolean;
  events: CalendarEvent[];
};
