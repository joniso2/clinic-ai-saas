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
    <div>
      {/* Day name header row */}
      <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/50">
        {DAY_NAMES.map((name) => (
          <div key={name} className="py-2 text-center text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
            {name}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {grid.map((week, wi) =>
          week.map((day, di) => {
            if (!day) {
              return (
                <div
                  key={`empty-${wi}-${di}`}
                  className="min-h-[100px] border-b border-r border-slate-100 dark:border-slate-700/60 bg-slate-50/30 dark:bg-slate-950/40"
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
                className={`group relative min-h-[100px] cursor-pointer flex flex-col border-b border-r border-slate-100 dark:border-slate-700/60 transition-all hover:bg-slate-50/80 dark:hover:bg-slate-800/60 ${di === 6 ? 'border-r-0' : ''} ${dayLoadTint}`}
              >
                <div className="flex shrink-0 items-center justify-center py-1.5">
                  {isToday ? (
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-[12px] font-bold text-white">
                      {day}
                    </span>
                  ) : (
                    <span className="text-[12px] font-medium text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200 transition-colors">
                      {day}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-h-0 px-1.5 pb-1.5 space-y-0.5 overflow-hidden">
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
                    <div className="rounded-md bg-slate-100 dark:bg-slate-700/50 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 dark:text-slate-400 text-center">
                      +{dayApts.length - 2} נוספים
                    </div>
                  )}
                </div>
              </button>
            );
          }),
        )}
      </div>
    </div>
  );
}
