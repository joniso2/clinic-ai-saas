'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { X, Calendar as CalendarIcon, Clock } from 'lucide-react';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import type { Lead } from '@/types/leads';
import type { Appointment, AppointmentType } from '@/types/appointments';
import { DatePicker } from '@/components/ui/DatePicker';

type WorkingHoursDay = {
  day: number;
  enabled: boolean;
  open: string;
  close: string;
};

type Props = {
  lead: Lead;
  onClose: () => void;
  onScheduled: (appointment: Appointment) => void;
};

const DAY_LABELS_HE = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

const DEFAULT_HOURS: WorkingHoursDay[] = Array.from({ length: 7 }, (_, i) => ({
  day: i,
  enabled: i < 6,
  open: '08:00',
  close: '16:00',
}));

export function ScheduleAppointmentModal({ lead, onClose, onScheduled }: Props) {
  const panelRef = useRef<HTMLFormElement>(null);
  useFocusTrap(panelRef, true);
  useEscapeKey(true, onClose);

  const [patientName] = useState(lead.full_name ?? '');
  const [date, setDate] = useState(() => {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    return `${day}/${month}/${year}`;
  });
  const [time, setTime] = useState('');
  const type: AppointmentType = 'new';
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [workingHours, setWorkingHours] = useState<WorkingHoursDay[]>(DEFAULT_HOURS);
  const [showCalendar, setShowCalendar] = useState(false);

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((d) => {
        const wh = d?.settings?.working_hours;
        if (Array.isArray(wh) && wh.length === 7) {
          setWorkingHours(wh);
        }
      })
      .catch((err) => console.error('Failed to load working hours:', err));
  }, []);

  // Set default time to the opening hour of today when hours load
  useEffect(() => {
    if (!time) {
      const jsDay = new Date().getDay();
      const dayConfig = workingHours.find((d) => d.day === jsDay);
      if (dayConfig?.enabled) {
        setTime(dayConfig.open);
      } else {
        setTime(workingHours.find((d) => d.enabled)?.open ?? '08:00');
      }
    }
  }, [workingHours, time]);

  function getSelectedDayConfig(): WorkingHoursDay | undefined {
    const parts = date.split('/');
    if (parts.length !== 3) return undefined;
    const [dayStr, monthStr, yearStr] = parts;
    const d = new Date(
      parseInt(yearStr, 10),
      parseInt(monthStr, 10) - 1,
      parseInt(dayStr, 10),
    );
    if (isNaN(d.getTime())) return undefined;
    return workingHours.find((w) => w.day === d.getDay());
  }

  const dayConfig = getSelectedDayConfig();
  const isDayClosed = dayConfig ? !dayConfig.enabled : false;

  function getDateValidation(): string | null {
    if (isDayClosed) {
      const parts = date.split('/');
      if (parts.length === 3) {
        const d = new Date(
          parseInt(parts[2], 10),
          parseInt(parts[1], 10) - 1,
          parseInt(parts[0], 10),
        );
        const dayName = DAY_LABELS_HE[d.getDay()] ?? '';
        return `העסק סגור ביום ${dayName}`;
      }
      return 'העסק סגור ביום זה';
    }
    return null;
  }

  function getTimeValidation(): string | null {
    if (!dayConfig?.enabled || !time) return null;
    if (time < dayConfig.open || time > dayConfig.close) {
      return `השעה חייבת להיות בין ${dayConfig.open} ל-${dayConfig.close}`;
    }
    return null;
  }

  const dateError = getDateValidation();
  const timeError = getTimeValidation();
  const hasValidationError = !!dateError || !!timeError;

  const timeSlots = useMemo(() => {
    if (!dayConfig?.enabled) return [];
    const slots: string[] = [];
    const [startH, startM] = dayConfig.open.split(':').map(Number);
    const [endH, endM] = dayConfig.close.split(':').map(Number);
    const startMin = startH * 60 + startM;
    const endMin = endH * 60 + endM;
    for (let m = startMin; m <= endMin; m += 15) {
      const h = Math.floor(m / 60);
      const min = m % 60;
      slots.push(`${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`);
    }
    return slots;
  }, [dayConfig]);

  const slotSections = useMemo(() => {
    const sections: { label: string; slots: string[] }[] = [];
    const morning = timeSlots.filter(t => t < '12:00');
    const afternoon = timeSlots.filter(t => t >= '12:00' && t < '17:00');
    const evening = timeSlots.filter(t => t >= '17:00');
    if (morning.length) sections.push({ label: 'בוקר', slots: morning });
    if (afternoon.length) sections.push({ label: 'צהריים', slots: afternoon });
    if (evening.length) sections.push({ label: 'ערב', slots: evening });
    return sections;
  }, [timeSlots]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!patientName.trim() || !date || !time) return;
    if (hasValidationError) return;
    setSubmitting(true);
    setError(null);

    const parts = date.split('/');
    if (parts.length !== 3) {
      setError('השתמש בפורמט תאריך DD/MM/YYYY');
      setSubmitting(false);
      return;
    }
    const [dayStr, monthStr, yearStr] = parts;
    const day = parseInt(dayStr, 10);
    const month = parseInt(monthStr, 10);
    const year = parseInt(yearStr, 10);
    if (!day || !month || !year) {
      setError('השתמש בפורמט תאריך DD/MM/YYYY');
      setSubmitting(false);
      return;
    }
    const isoDate = `${year.toString().padStart(4, '0')}-${month
      .toString()
      .padStart(2, '0')}-${day.toString().padStart(2, '0')}`;

    const datetimeRaw = `${isoDate}T${time}:00+02:00`;

    const res = await fetch('/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        patient_name: patientName.trim(),
        datetime: datetimeRaw,
        type,
        lead_id: lead.id,
      }),
    });

    const json: { appointment?: Appointment; suggestions?: string[]; message?: string; error?: string } =
      await res.json().catch(() => ({}));

    if (res.status === 201 && json.appointment) {
      onScheduled(json.appointment);
      onClose();
    } else if (res.status === 409 && json.suggestions?.length) {
      const alts = json.suggestions
        .slice(0, 3)
        .join('\n');
      setError(`המועד תפוס. המועדים הפנויים הקרובים:\n${alts}`);
    } else {
      setError(
        json.message ??
          json.error ??
          'לא ניתן לקבוע תור',
      );
    }

    setSubmitting(false);
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 px-4 backdrop-blur-sm">
      <form
        ref={panelRef}
        onSubmit={handleSubmit}
        className="modal-enter w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden"
        dir="rtl"
        role="dialog"
        aria-modal="true"
        aria-label="קביעת תור"
      >
        {/* Header */}
        <div className="bg-slate-900 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
                <CalendarIcon className="h-4 w-4 text-white" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-white">קביעת תור</h2>
                <p className="text-xs text-slate-400">{patientName}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
              aria-label="סגור"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="space-y-4 px-6 py-5">
          {error && (
            <div className="whitespace-pre-line rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700 leading-relaxed">
              {error}
            </div>
          )}

          {/* Date field */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-600 block">
              תאריך
            </label>
            <button
              type="button"
              onClick={() => setShowCalendar((v) => !v)}
              className={`relative flex w-full items-center gap-2 rounded-xl border px-3.5 py-3 text-sm transition-colors text-right
                ${dateError
                  ? 'border-red-300 bg-red-50 hover:border-red-400'
                  : 'border-slate-200 bg-white hover:border-slate-300 focus-within:ring-2 focus-within:ring-slate-900/10 focus-within:border-slate-400'
                }`}
            >
              <CalendarIcon className="h-4 w-4 text-slate-400 shrink-0" />
              <span className="flex-1 tabular-nums text-slate-900">{date}</span>
              {dayConfig?.enabled && (
                <span className="text-xs text-slate-400">
                  {DAY_LABELS_HE[dayConfig.day]}
                </span>
              )}
            </button>
            {showCalendar && (
              <DatePicker
                value={(() => {
                  const parts = date.split('/');
                  if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
                  return null;
                })()}
                onChange={(isoDate) => {
                  const [y, m, d] = isoDate.split('-');
                  setDate(`${d}/${m}/${y}`);
                  setShowCalendar(false);
                }}
              />
            )}
            {dateError && (
              <p className="text-xs text-red-600 mt-1">{dateError}</p>
            )}
          </div>

          {/* Time slots */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-600 block">
              שעה
              {dayConfig?.enabled && (
                <span className="text-slate-400 font-normal me-1">
                  ({dayConfig.open}–{dayConfig.close})
                </span>
              )}
            </label>
            {isDayClosed ? (
              <p className="text-xs text-slate-400 py-2">בחר יום פתוח כדי לראות שעות</p>
            ) : slotSections.length > 0 ? (
              <div className="space-y-2.5 max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/50 p-3">
                {slotSections.map(section => (
                  <div key={section.label}>
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-[0.08em] mb-1.5">{section.label}</p>
                    <div className="grid grid-cols-4 gap-1.5">
                      {section.slots.map(slot => (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => setTime(slot)}
                          className={`rounded-lg px-2 py-1.5 text-xs tabular-nums font-medium transition-colors
                            ${time === slot
                              ? 'bg-indigo-600 text-white shadow-sm'
                              : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
                            }`}
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-2">אין שעות פנויות ליום זה</p>
            )}
            {timeError && (
              <p className="text-xs text-red-600 mt-1">{timeError}</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4 bg-slate-50/50">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-white hover:border-slate-300 disabled:opacity-50 transition-colors"
          >
            ביטול
          </button>
          <button
            type="submit"
            disabled={submitting || hasValidationError || isDayClosed}
            className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? 'קובע…' : 'קבע תור'}
          </button>
        </div>
      </form>
    </div>
  );
}
