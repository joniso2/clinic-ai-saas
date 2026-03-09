'use client';

import type { Appointment } from '@/types/appointments';
import {
  DAY_NAMES,
  SLOT_HEIGHT_PX,
  SLOT_MINUTES,
  WEEK_END_HOUR,
  WEEK_START_HOUR,
  getAppointmentSlot,
} from '@/lib/calendar/calendar.utils';
import { AppointmentBlock } from './AppointmentBlock';

export type WeekViewProps = {
  weekStartStr: string;
  appointments: Appointment[];
  onSlotClick: (dayIndex: number, dayStr: string) => void;
  onAppointmentHover: (apt: Appointment, el: HTMLElement) => void;
  onAppointmentHoverEnd: () => void;
  todayStr: string;
};

export function WeekView({ weekStartStr, appointments, onSlotClick, onAppointmentHover, onAppointmentHoverEnd, todayStr }: WeekViewProps) {
  const slotsPerDay = (WEEK_END_HOUR - WEEK_START_HOUR) * (60 / SLOT_MINUTES);
  const totalHeight = slotsPerDay * SLOT_HEIGHT_PX;
  const dayStrs: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStartStr + 'T12:00:00');
    d.setDate(d.getDate() + i);
    dayStrs.push(d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'));
  }

  const timeLabels: string[] = [];
  for (let h = WEEK_START_HOUR; h < WEEK_END_HOUR; h++) {
    for (let m = 0; m < 60; m += SLOT_MINUTES) {
      timeLabels.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }

  const blocks: { apt: Appointment; dayIndex: number; topPx: number; heightPx: number }[] = [];
  appointments.forEach((apt) => {
    const slot = getAppointmentSlot(apt, weekStartStr);
    if (!slot) return;
    blocks.push({
      apt,
      dayIndex: slot.dayIndex,
      topPx: (slot.topMinutes / SLOT_MINUTES) * SLOT_HEIGHT_PX,
      heightPx: (slot.durationMinutes / SLOT_MINUTES) * SLOT_HEIGHT_PX,
    });
  });

  return (
    <div className="flex border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950" dir="rtl">
      <div className="w-12 shrink-0 border-s border-slate-200 dark:border-slate-800 bg-transparent">
        {timeLabels.map((t) => (
          <div key={t} className="flex items-start justify-end pe-1.5 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 first:border-t-0" style={{ height: SLOT_HEIGHT_PX }}>
            {t}
          </div>
        ))}
      </div>
      <div className="flex-1 grid grid-cols-7 min-w-0">
        {dayStrs.map((dayStr, colIndex) => {
          const isToday = dayStr === todayStr;
          const dayNum = parseInt(dayStr.split('-')[2], 10);
          const dayName = DAY_NAMES[colIndex];
          const evenColumn = colIndex % 2 === 0;
          const altTint = evenColumn ? 'bg-slate-50 dark:bg-slate-900/40' : '';
          const todayClass = isToday ? 'bg-indigo-50 dark:bg-indigo-500/10 border-t-2 border-t-indigo-400 dark:border-t-indigo-500/40' : '';
          return (
            <div
              key={dayStr}
              className={`relative border-s border-slate-200 dark:border-slate-800 ${altTint} ${todayClass}`}
              style={{ minHeight: totalHeight }}
            >
              <button
                type="button"
                onClick={() => onSlotClick(colIndex, dayStr)}
                className={`w-full sticky top-0 z-10 border-b border-slate-200 dark:border-slate-800 py-1 text-center text-xs font-medium cursor-pointer transition-colors ${isToday ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-800 dark:text-indigo-200' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
              >
                <span className="block">{dayName}</span>
                <span className="block">{dayNum}</span>
              </button>
              <div className="relative w-full" style={{ height: totalHeight }}>
                {blocks
                  .filter((b) => b.dayIndex === colIndex)
                  .map(({ apt, topPx, heightPx }) => (
                    <AppointmentBlock
                      key={apt.id}
                      apt={apt}
                      variant="week"
                      style={{ top: topPx + 1, height: Math.max(heightPx - 2, 28), width: '100%' }}
                      onMouseEnter={(e) => onAppointmentHover(apt, e.currentTarget)}
                      onMouseLeave={onAppointmentHoverEnd}
                    />
                  ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
