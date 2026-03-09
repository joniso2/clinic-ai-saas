import type { Appointment } from '@/types/appointments';
import { toIsraelDateString, getMinutesFromMidnightIsrael } from './time.utils';
import {
  APPOINTMENT_STATUS,
  APPOINTMENT_TYPE_PILL,
  getAppointmentStatusBadgeClass,
  getAppointmentStatusAccent,
  getAppointmentStatusLabel,
  type AppointmentStatusKey,
} from '@/lib/status-colors';

export const DAY_NAMES = ['א\'', 'ב\'', 'ג\'', 'ד\'', 'ה\'', 'ו\'', 'ש\''];
export const MONTH_NAMES = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
];

export const WEEK_START_HOUR = 8;
export const WEEK_END_HOUR = 18;
export const SLOT_MINUTES = 30;
export const SLOT_HEIGHT_PX = 32;
export const MINUTES_PER_DAY = (WEEK_END_HOUR - WEEK_START_HOUR) * 60;

export function buildCalendarGrid(year: number, month: number): (number | null)[][] {
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const grid: (number | null)[][] = [];
  let week: (number | null)[] = Array(firstDayOfWeek).fill(null);

  for (let d = 1; d <= daysInMonth; d++) {
    week.push(d);
    if (week.length === 7) { grid.push(week); week = []; }
  }
  while (week.length > 0 && week.length < 7) week.push(null);
  if (week.length) grid.push(week);
  return grid;
}

export function getWeekStart(year: number, month: number, day: number): string {
  const d = new Date(year, month - 1, day);
  const sun = new Date(d);
  sun.setDate(d.getDate() - d.getDay());
  const y = sun.getFullYear(), m = sun.getMonth() + 1, dayNum = sun.getDate();
  return `${y}-${String(m).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
}

export function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function getDayLoadTint(count: number): string {
  if (count <= 4) return '';
  return 'bg-slate-100/60 dark:bg-slate-700/30';
}

export function getServiceLabel(apt: Appointment): string {
  return apt.service_name?.trim() || (apt.type === 'follow_up' ? 'מעקב' : 'חדש');
}

/** Accent bar class from centralized status-colors. */
export function getStatusAccentClass(apt: Appointment): string {
  return getAppointmentStatusAccent(apt.status);
}

export function getStatusCardClass(_apt: Appointment): string {
  return 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-lg hover:scale-[1.01] transition-all duration-150 cursor-pointer';
}

/** Re-export centralized badge classes keyed by DB status string. */
export const STATUS_BADGE_CLASS: Record<string, string> = Object.fromEntries(
  Object.entries(APPOINTMENT_STATUS).map(([key, val]) => [key, val.badge]),
);

/** Re-export centralized labels keyed by DB status string. */
export const STATUS_LABEL: Record<string, string> = Object.fromEntries(
  Object.entries(APPOINTMENT_STATUS).map(([key, val]) => [key, val.label]),
);

/** Re-export centralized appointment type pills. */
export const TYPE_PILL: Record<string, string> = { ...APPOINTMENT_TYPE_PILL };

export function getAppointmentSlot(apt: Appointment, weekStartStr: string): { dayIndex: number; topMinutes: number; durationMinutes: number } | null {
  const dateStr = toIsraelDateString(apt.datetime);
  const weekStart = new Date(weekStartStr + 'T12:00:00');
  for (let i = 0; i < 7; i++) {
    const day = new Date(weekStart);
    day.setDate(weekStart.getDate() + i);
    const ds = day.getFullYear() + '-' + String(day.getMonth() + 1).padStart(2, '0') + '-' + String(day.getDate()).padStart(2, '0');
    if (ds === dateStr) {
      const minutesFromMidnight = getMinutesFromMidnightIsrael(apt.datetime);
      const startMinutes = WEEK_START_HOUR * 60;
      const endMinutes = WEEK_END_HOUR * 60;
      if (minutesFromMidnight < startMinutes || minutesFromMidnight >= endMinutes) return null;
      const topMinutes = minutesFromMidnight - startMinutes;
      const dur = apt.duration_minutes ?? 30;
      if (topMinutes + dur > MINUTES_PER_DAY) return null;
      return { dayIndex: i, topMinutes, durationMinutes: dur };
    }
  }
  return null;
}
