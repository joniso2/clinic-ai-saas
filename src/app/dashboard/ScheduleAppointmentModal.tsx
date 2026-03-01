'use client';

import { useState } from 'react';
import { X, Calendar as CalendarIcon } from 'lucide-react';
import type { Lead } from '@/types/leads';
import type { Appointment, AppointmentType } from '@/types/appointments';

type Props = {
  lead: Lead;
  onClose: () => void;
  onScheduled: (appointment: Appointment) => void;
};

export function ScheduleAppointmentModal({ lead, onClose, onScheduled }: Props) {
  const [patientName] = useState(lead.full_name ?? '');
  const [date, setDate] = useState(() => {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    return `${day}/${month}/${year}`; // stored as DD/MM/YYYY internally
  });
  const [time, setTime] = useState('08:00');
  const type: AppointmentType = 'new';
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!patientName.trim() || !date || !time) return;
    setSubmitting(true);
    setError(null);

    const parts = date.split('/');
    if (parts.length !== 3) {
      setError('Please use date format DD/MM/YYYY');
      setSubmitting(false);
      return;
    }
    const [dayStr, monthStr, yearStr] = parts;
    const day = parseInt(dayStr, 10);
    const month = parseInt(monthStr, 10);
    const year = parseInt(yearStr, 10);
    if (!day || !month || !year) {
      setError('Please use date format DD/MM/YYYY');
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

    const json = await res.json().catch(() => ({}));

    if (res.status === 201 && (json as any).appointment) {
      onScheduled((json as any).appointment as Appointment);
      onClose();
    } else if (res.status === 409 && (json as any).suggestions?.length) {
      const alts = ((json as any).suggestions as string[])
        .slice(0, 3)
        .join('\n');
      setError(`This slot is taken. Closest available:\n${alts}`);
    } else {
      setError(
        (json as any).message ??
          (json as any).error ??
          'Failed to schedule appointment',
      );
    }

    setSubmitting(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-slate-500" />
            <h2 className="text-base font-semibold text-slate-900">
              Schedule appointment
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          {error && (
            <div className="whitespace-pre-line rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700">
              Patient name
            </label>
            <input
              type="text"
              value={patientName}
              readOnly
              className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-600 cursor-default focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700">
                Date
              </label>
              <div className="relative">
                <div className="flex items-center rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus-within:ring-1 focus-within:ring-slate-900">
                  <span className="flex-1 tabular-nums">{date}</span>
                  <label className="cursor-pointer text-slate-400 hover:text-slate-700 transition-colors">
                    <CalendarIcon className="h-4 w-4" />
                    <input
                      type="date"
                      value={(() => {
                        const parts = date.split('/');
                        if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
                        return '';
                      })()}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val) {
                          const [y, m, d] = val.split('-');
                          setDate(`${d}/${m}/${y}`);
                        }
                      }}
                      required
                      className="sr-only"
                    />
                  </label>
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700">
                Time (08:00–16:00)
              </label>
              <input
                type="time"
                value={time}
                min="08:00"
                max="15:30"
                onChange={(e) => setTime(e.target.value)}
                required
                className="block w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>
          </div>

        </div>

        <div className="flex justify-end gap-3 border-t border-slate-100 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {submitting ? 'Scheduling…' : 'Schedule'}
          </button>
        </div>
      </form>
    </div>
  );
}

