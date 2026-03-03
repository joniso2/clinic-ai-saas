'use client';

import type { Appointment } from '@/types/appointments';
import { DAY_NAMES, getDayLoadTint } from '@/lib/calendar/calendar.utils';
import { AppointmentBlock } from './AppointmentBlock';

export type MonthViewProps = {
  year: number;
  month: number;
  grid: (number | null)[][];
  appointmentsForDay: (day: number) => Appointment[];
  onSelectDay: (day: number) => void;
  todayStr: string;
  onAppointmentHoverStart: (apt: Appointment, el: HTMLElement) => void;
  onAppointmentHoverEnd: () => void;
};

export function MonthView({
  year,
  month,
  grid,
  appointmentsForDay,
  onSelectDay,
  todayStr,
  onAppointmentHoverStart,
  onAppointmentHoverEnd,
}: MonthViewProps) {
  return (
    <div className="grid grid-cols-7">
      {grid.map((week, wi) =>
        week.map((day, di) => {
          if (!day) {
            return (
              <div
                key={`empty-${wi}-${di}`}
                className="min-h-[96px] border-b border-r border-slate-100 dark:border-zinc-700/60 bg-slate-50/30 dark:bg-zinc-900/40"
              />
            );
          }
          const dayStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const isToday = dayStr === todayStr;
          const dayApts = appointmentsForDay(day);
          const dayLoadTint = getDayLoadTint(dayApts.length);

          return (
            <button
              key={dayStr}
              onClick={() => onSelectDay(day)}
              className={`group relative min-h-[96px] cursor-pointer flex flex-col border-b border-r border-slate-100 dark:border-zinc-700/60 transition-all hover:bg-slate-50 dark:hover:bg-zinc-700/80 ${di === 6 ? 'border-r-0' : ''} ${dayLoadTint}`}
            >
              <div
                className={`flex shrink-0 items-center justify-center border-b border-slate-100 dark:border-zinc-700/80 py-1 text-[11px] font-medium transition-colors ${
                  isToday
                    ? 'bg-slate-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-slate-900 dark:border-zinc-100'
                    : 'bg-slate-50 dark:bg-zinc-800/80 text-slate-600 dark:text-zinc-400 group-hover:bg-slate-100 dark:group-hover:bg-zinc-700/80'
                }`}
                aria-label={`יום ${day}`}
              >
                {day}
              </div>
              <div className="flex-1 min-h-0 p-2 pt-1 space-y-0.5 overflow-hidden">
                {dayApts.slice(0, 2).map((apt) => (
                  <AppointmentBlock
                    key={apt.id}
                    apt={apt}
                    variant="month"
                    onHoverStart={onAppointmentHoverStart}
                    onHoverEnd={onAppointmentHoverEnd}
                  />
                ))}
                {dayApts.length > 2 && (
                  <div className="px-1 text-[10px] font-medium text-slate-500 dark:text-zinc-400">
                    +{dayApts.length - 2} נוספים
                  </div>
                )}
              </div>
            </button>
          );
        }),
      )}
    </div>
  );
}
