'use client';

import { ChevronRight } from 'lucide-react';
import type { Appointment } from '@/types/appointments';
import { formatTime } from '@/lib/calendar/time.utils';
import { getServiceLabel } from '@/lib/calendar/calendar.utils';

export type TodaySidebarProps = {
  open: boolean;
  onToggle: () => void;
  appointments: Appointment[];
};

export function TodaySidebar({ open, onToggle, appointments }: TodaySidebarProps) {
  return (
    <div className={`shrink-0 border-s border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col min-h-0 ${open ? 'w-52' : 'w-10'}`}>
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center justify-between gap-2 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        aria-expanded={open}
      >
        {open && <span>תורים להיום</span>}
        <ChevronRight className={`h-4 w-4 shrink-0 transition-transform duration-150 ${open ? '' : 'rotate-180'}`} />
      </button>
      {open && (
        <div className="flex-1 min-h-0 overflow-y-auto p-2">
          {appointments.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400 py-2">אין תורים היום</p>
          ) : (
            <ul className="space-y-2">
              {appointments.map((apt) => {
                const status = apt.status ?? 'scheduled';
                const dotClass = status === 'completed' ? 'bg-emerald-500' : status === 'cancelled' ? 'bg-slate-400 dark:bg-slate-500' : (status as string) === 'no_show' || status === 'ai_failed' ? 'bg-rose-500' : 'bg-indigo-500';
                return (
                  <li key={apt.id} className="flex gap-2 text-xs border-b border-slate-100 dark:border-slate-800 pb-2 last:border-0">
                    <span className={`shrink-0 mt-1.5 h-2 w-2 rounded-full ${dotClass}`} aria-hidden />
                    <div className="min-w-0 flex-1">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{formatTime(apt.datetime)}</span>
                      <p className="font-semibold text-slate-900 dark:text-white mt-0.5">{apt.patient_name}</p>
                      <p className="text-slate-500 dark:text-slate-400 mt-0.5">{getServiceLabel(apt)}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
