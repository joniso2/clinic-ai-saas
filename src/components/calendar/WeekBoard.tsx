'use client';

import { memo } from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Check } from 'lucide-react';
import type { Appointment } from '@/types/appointments';
import { getLeadStatusAccentHex, getAppointmentStatusBadgeClass, getAppointmentStatusLabel } from '@/lib/status-colors';
import type { CalendarEvent, DayColumn } from './calendar-helpers';
import { getServiceCategory, getAppointmentCardLabel, SERVICE_ACCENT_COLOR } from './calendar-helpers';

/** Appointment block for the week board: accent-bar approach with clean white card. Click opens LeadDetailDrawer. */
export const WeekBoardCard = memo(function WeekBoardCard({ event, onClick, onComplete, leadStatusByLeadId, onDragStart, onDragEnd, canDrag }: { event: CalendarEvent; onClick: () => void; onComplete?: (apt: Appointment) => void; leadStatusByLeadId: Record<string, string>; onDragStart?: (apt: Appointment) => void; onDragEnd?: () => void; canDrag?: boolean }) {
  const apt = event.resource;
  const category = getServiceCategory(apt);
  const cardLabel = getAppointmentCardLabel(apt, leadStatusByLeadId);
  const leadStatus = apt.lead_id ? leadStatusByLeadId[apt.lead_id] : null;
  const accentColor = leadStatus
    ? getLeadStatusAccentHex(leadStatus)
    : SERVICE_ACCENT_COLOR[category];
  const startStr = format(event.start, 'HH:mm');
  const endStr = format(event.end, 'HH:mm');
  const canComplete = apt.status !== 'completed' && apt.status !== 'cancelled';

  const statusBadge = getAppointmentStatusBadgeClass(apt.status);
  const statusLbl = getAppointmentStatusLabel(apt.status);

  return (
    <div
      className="relative overflow-hidden rounded-lg group hover:shadow-md hover:-translate-y-px transition-all duration-150"
      draggable={canDrag}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', apt.id);
        onDragStart?.(apt);
      }}
      onDragEnd={() => onDragEnd?.()}
    >
      <div
        className="absolute start-0 top-0 bottom-0 w-1 rounded-s-lg"
        style={{ background: accentColor }}
      />
      <button
        type="button"
        onClick={onClick}
        className="w-full min-w-0 text-right bg-white dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/60 rounded-lg px-3 py-2 ps-4 cursor-pointer flex flex-col gap-0.5"
        dir="rtl"
      >
        <div className="flex items-center justify-between gap-1 min-w-0">
          <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 tabular-nums leading-tight">{startStr} – {endStr}</p>
          {apt.status && apt.status !== 'scheduled' && (
            <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold leading-tight ${statusBadge}`}>{statusLbl}</span>
          )}
        </div>
        <p className="text-[13px] font-semibold text-slate-900 dark:text-slate-100 truncate leading-tight">{apt.patient_name}</p>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate leading-tight">{cardLabel}</p>
      </button>
      {canComplete && onComplete && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onComplete(apt); }}
          title="סמן כהושלם"
          className="absolute top-1.5 end-1.5 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity rounded-full bg-emerald-500 text-white p-0.5 hover:bg-emerald-600 z-10"
        >
          <Check className="h-3 w-3" />
        </button>
      )}
    </div>
  );
});

/** Card-based week board: day columns with stacked appointment cards, no time grid */
export function WeekBoard({
  dayColumns,
  todayStr,
  onSelectEvent,
  onAddDay,
  onDayClick,
  onComplete,
  leadStatusByLeadId,
  onDragStart,
  onDragEnd,
  canDrag,
}: {
  dayColumns: DayColumn[];
  todayStr: string;
  onSelectEvent: (event: CalendarEvent) => void;
  onAddDay: (dateStr: string) => void;
  onDayClick: (dateStr: string) => void;
  onComplete: (apt: Appointment) => void;
  leadStatusByLeadId: Record<string, string>;
  onDragStart?: (apt: Appointment) => void;
  onDragEnd?: () => void;
  canDrag?: boolean;
}) {
  return (
    <div className="flex w-full flex-1 min-h-0 flex-row-reverse overflow-x-auto overflow-y-hidden" dir="ltr">
      {dayColumns.map((col) => (
        <div
          key={col.dateStr}
          className={`flex min-w-[100px] sm:min-w-[140px] flex-1 flex-col border-s border-slate-200 dark:border-slate-700 last:border-s-0 ${col.isToday ? 'bg-indigo-50/60 dark:bg-indigo-950/25 ring-1 ring-indigo-400/40 dark:ring-indigo-500/30' : 'bg-slate-50/70 dark:bg-slate-900/40'}`}
        >
          <div className={`sticky top-0 z-10 flex flex-col items-center gap-0.5 border-b border-slate-200 dark:border-slate-700 px-2 py-2 ${col.isToday ? 'bg-indigo-50 dark:bg-indigo-950/40' : 'bg-white dark:bg-slate-900'}`}>
            <p className={`text-[11px] font-semibold uppercase tracking-[0.06em] leading-tight ${col.isToday ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'}`}>
              {col.dayLabel}
            </p>
            <button
              type="button"
              onClick={() => onDayClick(col.dateStr)}
              className={`h-8 w-8 rounded-full flex items-center justify-center text-[15px] font-bold tabular-nums cursor-pointer border-0 transition-colors ${col.isToday ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'text-slate-900 dark:text-slate-50 hover:bg-slate-100 dark:hover:bg-slate-800 bg-transparent'}`}
            >
              {col.dayNum}
            </button>
            <p className={`text-[10px] tabular-nums ${col.isToday ? 'text-indigo-500 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`}>
              {col.events.length > 0 ? `${col.events.length} תורים` : ''}
            </p>
          </div>
          <div className="flex-1 overflow-y-auto space-y-1.5 p-2 min-h-[180px]">
            {col.events.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full min-h-[120px] opacity-40">
                <CalendarIcon className="h-6 w-6 text-slate-300 dark:text-slate-600" />
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">אין תורים</p>
              </div>
            ) : (
              col.events.map((ev) => (
                <WeekBoardCard key={ev.id} event={ev} onClick={() => onSelectEvent(ev)} onComplete={onComplete} leadStatusByLeadId={leadStatusByLeadId} onDragStart={onDragStart} onDragEnd={onDragEnd} canDrag={canDrag} />
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
