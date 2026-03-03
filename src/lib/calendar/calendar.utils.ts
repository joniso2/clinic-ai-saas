import type { Appointment } from '@/types/appointments';
import { toIsraelDateString, getMinutesFromMidnightIsrael } from './time.utils';

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
  return 'bg-slate-100/60 dark:bg-zinc-700/30';
}

export function getServiceLabel(apt: Appointment): string {
  return apt.service_name?.trim() || (apt.type === 'follow_up' ? 'מעקב' : 'חדש');
}

export function getStatusAccentClass(apt: Appointment): string {
  const status = apt.status ?? 'scheduled';
  if (status === 'completed') return 'border-s-4 border-emerald-500';
  if (status === 'cancelled') return 'border-s-4 border-slate-400 dark:border-slate-500';
  if ((status as string) === 'no_show' || status === 'ai_failed') return 'border-s-4 border-rose-500';
  return 'border-s-4 border-indigo-500';
}

export function getStatusCardClass(_apt: Appointment): string {
  return 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-lg hover:scale-[1.01] transition-all duration-150 cursor-pointer';
}

export const STATUS_BADGE_CLASS: Record<string, string> = {
  scheduled: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300',
  completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
  cancelled: 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  no_show: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300',
  ai_failed: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300',
};

export const STATUS_LABEL: Record<string, string> = {
  scheduled: 'מתוכנן',
  completed: 'הושלם',
  cancelled: 'בוטל',
  ai_failed: 'AI נכשל',
  no_show: 'לא הופיע',
};

export const TYPE_PILL: Record<string, string> = {
  follow_up: 'bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60',
  new: 'bg-blue-100 dark:bg-blue-950/50 text-blue-800 dark:text-blue-400 border border-blue-200 dark:border-blue-800/60',
};

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
