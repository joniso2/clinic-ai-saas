'use client';

import { useState, useEffect, useRef } from 'react';
import { Phone } from 'lucide-react';
import type { Appointment } from '@/types/appointments';
import { getServiceLabel, STATUS_LABEL } from '@/lib/calendar/calendar.utils';

export type HoverPopoverProps = {
  appointment: Appointment;
  phone?: string | null;
  anchor: HTMLElement | null;
};

export function HoverPopover({ appointment, phone, anchor }: HoverPopoverProps) {
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const popRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    setPos({
      top: rect.top - 4,
      left: rect.left,
    });
  }, [anchor]);

  const status = appointment.status ?? 'scheduled';
  const serviceLabel = getServiceLabel(appointment);
  const isAi = appointment.is_ai_created ?? false;

  return (
    <div
      ref={popRef}
      className="fixed z-[60] w-48 rounded-xl border border-slate-200 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2.5 shadow-lg"
      style={{ top: pos.top, left: pos.left, transform: 'translateY(-100%)' }}
      dir="rtl"
    >
      <p className="text-xs font-semibold text-slate-900 dark:text-zinc-100 truncate">{appointment.patient_name}</p>
      {phone != null && phone !== '' && (
        <p className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-500 dark:text-zinc-400">
          <Phone className="h-2.5 w-2.5 shrink-0" /> {phone}
        </p>
      )}
      <p className="mt-0.5 text-[11px] text-slate-600 dark:text-zinc-300">{serviceLabel}</p>
      <p className="text-[11px] text-slate-500 dark:text-zinc-400">{appointment.duration_minutes} דק׳</p>
      {appointment.revenue != null && (
        <p className="text-[11px] text-slate-600 dark:text-zinc-300">₪{appointment.revenue}</p>
      )}
      <p className="mt-0.5 text-[10px] text-slate-400 dark:text-zinc-500">
        {isAi ? 'נוצר ב-AI' : 'ידני'} · {STATUS_LABEL[status] ?? status}
      </p>
    </div>
  );
}
