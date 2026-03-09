'use client';

import { useRef } from 'react';
import type { Appointment } from '@/types/appointments';
import { formatTimeRange } from '@/lib/calendar/time.utils';
import {
  getStatusCardClass,
  getStatusAccentClass,
  getServiceLabel,
} from '@/lib/calendar/calendar.utils';
import {
  getAppointmentStatusBadgeClass,
  getAppointmentStatusLabel,
} from '@/lib/status-colors';

export type AppointmentBlockProps = {
  apt: Appointment;
  variant: 'week' | 'month';
  style?: React.CSSProperties;
  className?: string;
  onMouseEnter?: (e: React.MouseEvent<HTMLDivElement>) => void;
  onMouseLeave?: () => void;
  onHoverStart?: (apt: Appointment, el: HTMLElement) => void;
  onHoverEnd?: () => void;
};

export function AppointmentBlock({
  apt,
  variant,
  style,
  className = '',
  onMouseEnter,
  onMouseLeave,
  onHoverStart,
  onHoverEnd,
}: AppointmentBlockProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const statusClass = getStatusCardClass(apt);
  const accentClass = getStatusAccentClass(apt);
  const serviceLabel = getServiceLabel(apt);
  const status = apt.status ?? 'scheduled';
  const badgeClass = getAppointmentStatusBadgeClass(status);
  const duration = apt.duration_minutes ?? 30;

  const isWeek = variant === 'week';
  const baseClass = isWeek
    ? `absolute inset-x-0 z-10 rounded-md border border-slate-200 dark:border-slate-700 px-2 py-1 overflow-hidden ${statusClass} ${accentClass}`
    : `relative w-full rounded-md border border-slate-200 dark:border-slate-700 px-1.5 py-1 text-right shadow-sm transition-all duration-150 cursor-pointer ${statusClass} ${accentClass}`;

  return (
    <div
      ref={cardRef}
      className={`${baseClass} ${className}`}
      style={style}
      dir="rtl"
      onMouseEnter={(e) => {
        if (isWeek) onMouseEnter?.(e);
        else if (cardRef.current) onHoverStart?.(apt, cardRef.current);
      }}
      onMouseLeave={() => {
        if (isWeek) onMouseLeave?.();
        else onHoverEnd?.();
      }}
    >
      {(apt.is_ai_created === true) && (
        <span className="absolute top-1 end-1 h-1.5 w-1.5 rounded-full bg-violet-500" aria-hidden />
      )}
      <div className="flex items-start justify-between gap-1 min-w-0">
        <span className="text-xs font-medium text-slate-600 dark:text-slate-400 opacity-90">{formatTimeRange(apt.datetime, duration)}</span>
        {isWeek && status !== 'scheduled' && (
          <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${badgeClass}`}>{getAppointmentStatusLabel(status)}</span>
        )}
      </div>
      <p className="text-sm font-semibold text-slate-900 dark:text-white truncate mt-0.5">{apt.patient_name}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">{serviceLabel}</p>
      {variant === 'month' && apt.revenue != null && apt.revenue > 0 && (
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">₪{apt.revenue}</p>
      )}
    </div>
  );
}
