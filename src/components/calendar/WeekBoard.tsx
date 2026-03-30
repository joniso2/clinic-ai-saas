'use client';

import { format } from 'date-fns';
import { Calendar as CalendarIcon, Check } from 'lucide-react';
import type { Appointment } from '@/types/appointments';
import { getLeadStatusDisplayHex, getAppointmentStatusBadgeClass, getAppointmentStatusLabel } from '@/lib/status-colors';
import type { CalendarEvent, DayColumn } from './calendar-helpers';
import { getServiceCategory, getAppointmentCardLabel, SERVICE_ACCENT_COLOR } from './calendar-helpers';

/** Appointment block for the week board: accent-bar approach with clean white card. Click opens LeadDetailDrawer. */
export function WeekBoardCard({ event, onClick, onComplete, leadStatusByLeadId, leadRiskByLeadId, serviceColorMap, onDragStart, onDragEnd, canDrag }: { event: CalendarEvent; onClick: () => void; onComplete?: (apt: Appointment) => void; leadStatusByLeadId: Record<string, string>; leadRiskByLeadId?: Record<string, 'high' | 'medium'>; serviceColorMap?: Record<string, string>; onDragStart?: (apt: Appointment) => void; onDragEnd?: () => void; canDrag?: boolean }) {
  const apt = event.resource;
  const category = getServiceCategory(apt);
  const cardLabel = getAppointmentCardLabel(apt, leadStatusByLeadId);
  const leadStatus = apt.lead_id ? leadStatusByLeadId[apt.lead_id] : null;
  const riskLevel = apt.lead_id ? leadRiskByLeadId?.[apt.lead_id] : undefined;
  // Card bg = service color from pricing. Label text = lead status color (matching leads page).
  const serviceColor = apt.service_name ? serviceColorMap?.[apt.service_name] : undefined;
  const cardBgColor = serviceColor ?? null;
  // When no lead status, color by appointment status (matching lead page palette)
  const aptStatusToLeadStatus: Record<string, string> = { scheduled: 'Appointment scheduled', completed: 'Closed', cancelled: 'Disqualified' };
  const labelColor = leadStatus
    ? getLeadStatusDisplayHex(leadStatus)
    : getLeadStatusDisplayHex(aptStatusToLeadStatus[apt.status ?? ''] ?? 'Pending');
  const startStr = format(event.start, 'HH:mm');
  const endStr = format(event.end, 'HH:mm');
  const canComplete = apt.status !== 'completed' && apt.status !== 'cancelled';

  const statusBadge = getAppointmentStatusBadgeClass(apt.status);
  const statusLbl = getAppointmentStatusLabel(apt.status);

  return (
    <div
      className="relative overflow-hidden rounded-xl group hover:shadow-md hover:-translate-y-px transition-all duration-150"
      draggable={canDrag}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', apt.id);
        onDragStart?.(apt);
      }}
      onDragEnd={() => onDragEnd?.()}
    >
      <button
        type="button"
        onClick={onClick}
        className={`w-full min-w-0 text-right rounded-xl px-3 pt-2 pb-3 sm:px-5 sm:pt-3 sm:pb-4 cursor-pointer flex flex-col ${cardBgColor ? '' : 'border border-slate-100 dark:border-slate-700/60 bg-white dark:bg-slate-800/80'}`}
        dir="rtl"
        style={cardBgColor ? { background: cardBgColor + '60', boxShadow: `inset 0 0 0 1.5px ${cardBgColor}90` } : undefined}
      >
        <p className="text-[11px] sm:text-[14px] font-bold text-slate-900 dark:text-slate-100 tabular-nums leading-tight">{startStr} – {endStr}</p>
        <p className="text-[14px] sm:text-[19px] font-bold text-slate-900 dark:text-slate-100 truncate leading-snug mt-0.5 sm:mt-1">{apt.patient_name}</p>
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap mt-1.5 sm:mt-2.5">
          <p className="text-[11px] sm:text-[14.5px] font-semibold truncate leading-tight" style={{ color: labelColor }}>{cardLabel}</p>
          {apt.service_name && cardLabel !== apt.service_name && (
            <>
              <span className="h-1 w-1 sm:h-[6px] sm:w-[6px] rounded-full shrink-0 bg-slate-900 dark:bg-white" />
              <p className="text-[11px] sm:text-[14.5px] font-semibold truncate leading-tight" style={{ color: cardBgColor ?? '#94a3b8' }}>{apt.service_name}</p>
            </>
          )}
          {riskLevel && (
            <span className={`rounded-full px-1.5 py-0.5 text-[9px] sm:text-[11px] sm:px-2 font-bold ${
              riskLevel === 'high'
                ? 'bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400'
                : 'bg-orange-100 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400'
            }`}>
              {riskLevel === 'high' ? 'סיכון גבוה' : 'סיכון בינוני'}
            </span>
          )}
        </div>
      </button>
      {canComplete && onComplete && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onComplete(apt); }}
          title="סמן כהושלם"
          className="absolute top-1.5 start-1.5 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity rounded-full bg-emerald-500 text-white p-0.5 hover:bg-emerald-600 z-10"
        >
          <Check className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

/** Card-based week board: day columns with stacked appointment cards, no time grid */
export function WeekBoard({
  dayColumns,
  todayStr,
  onSelectEvent,
  onAddDay,
  onDayClick,
  onComplete,
  leadStatusByLeadId,
  leadRiskByLeadId,
  serviceColorMap,
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
  leadRiskByLeadId?: Record<string, 'high' | 'medium'>;
  serviceColorMap?: Record<string, string>;
  onDragStart?: (apt: Appointment) => void;
  onDragEnd?: () => void;
  canDrag?: boolean;
}) {
  return (
    <div className="flex w-full flex-1 min-h-0 flex-row-reverse overflow-x-auto overflow-y-hidden scrollbar-hide" dir="ltr">
      {dayColumns.map((col) => (
        <div
          key={col.dateStr}
          className={`flex min-w-[144px] sm:min-w-[200px] flex-1 flex-col border-s border-slate-200/60 dark:border-slate-700 last:border-s-0 ${col.isToday ? 'bg-indigo-50/60 dark:bg-indigo-950/25' : 'bg-slate-50/70 dark:bg-slate-900/40'}`}
        >
          <div className={`sticky top-0 z-10 flex flex-col items-center justify-center h-[58px] border-b border-slate-200 dark:border-slate-700 px-2 ${col.isToday ? 'bg-indigo-50 dark:bg-indigo-950/40' : 'bg-white dark:bg-slate-900'}`}>
            <p className={`text-[13px] font-semibold uppercase tracking-[0.06em] leading-tight ${col.isToday ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'}`}>
              {col.dayLabel}
            </p>
            <button
              type="button"
              onClick={() => onDayClick(col.dateStr)}
              className={`h-9 w-9 rounded-full flex items-center justify-center text-[18px] font-bold tabular-nums cursor-pointer border-0 transition-colors mt-0.5 ${col.isToday ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'text-slate-900 dark:text-slate-50 hover:bg-slate-100 dark:hover:bg-slate-800 bg-transparent'}`}
            >
              {col.dayNum}
            </button>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-hide space-y-1.5 p-1.5 sm:space-y-2.5 sm:p-2.5 min-h-[180px]">
            {col.events.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full min-h-[120px] opacity-40">
                <CalendarIcon className="h-6 w-6 text-slate-300 dark:text-slate-600" />
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">אין תורים</p>
              </div>
            ) : (
              col.events.map((ev) => (
                <WeekBoardCard key={ev.id} event={ev} onClick={() => onSelectEvent(ev)} onComplete={onComplete} leadStatusByLeadId={leadStatusByLeadId} leadRiskByLeadId={leadRiskByLeadId} serviceColorMap={serviceColorMap} onDragStart={onDragStart} onDragEnd={onDragEnd} canDrag={canDrag} />
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
