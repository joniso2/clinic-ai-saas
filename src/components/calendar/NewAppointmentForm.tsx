'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import type { Appointment, AppointmentType } from '@/types/appointments';
import { formatFullDateTime } from '@/lib/calendar/time.utils';

export type NewAppointmentFormProps = {
  prefillDate?: string;
  prefillTime?: string;
  onClose: () => void;
  onSuccess: (apt: Appointment) => void;
};

export function NewAppointmentForm({ prefillDate, prefillTime, onClose, onSuccess }: NewAppointmentFormProps) {
  const [patientName, setPatientName] = useState('');
  const [date, setDate] = useState(() => {
    if (prefillDate) {
      const [y, m, d] = prefillDate.split('-');
      return `${d}/${m}/${y}`;
    }
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    return `${day}/${month}/${year}`;
  });
  const [time, setTime] = useState(() => prefillTime ?? '08:00');
  const [type, setType] = useState<AppointmentType>('new');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!patientName.trim() || !date || !time) return;
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
    const isoDate = `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    const datetimeRaw = `${isoDate}T${time}:00+02:00`;
    const res = await fetch('/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ patient_name: patientName.trim(), datetime: datetimeRaw, type }),
    });
    const json = await res.json();

    if (res.status === 201 && json.appointment) {
      onSuccess(json.appointment as Appointment);
    } else if (res.status === 409 && json.suggestions?.length) {
      const alts = (json.suggestions as string[]).slice(0, 3).map(formatFullDateTime).join('\n');
      setError(`המועד תפוס. המועדים הפנויים הקרובים:\n${alts}`);
    } else {
      setError(json.message ?? json.error ?? 'לא ניתן לקבוע תור');
    }
    setSubmitting(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-2xl bg-white dark:bg-zinc-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 px-5 py-4 flex-row-reverse">
          <h2 className="text-base font-semibold text-slate-900 dark:text-zinc-100 text-right">תור חדש</h2>
          <button type="button" onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 dark:text-zinc-500 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors" aria-label="סגור">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          {error && (
            <div className="whitespace-pre-line rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-3 py-2 text-xs text-red-700 dark:text-red-400">
              {error}
            </div>
          )}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700 dark:text-zinc-300 text-right block">שם המטופל</label>
            <input type="text" value={patientName} onChange={(e) => setPatientName(e.target.value)}
              required placeholder="שם מלא"
              className="block w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2.5 text-sm text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/50 focus:border-indigo-400 transition" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700 dark:text-zinc-300 text-right block">תאריך (DD/MM/YYYY)</label>
              <input type="text" value={date} onChange={(e) => setDate(e.target.value)}
                placeholder="DD/MM/YYYY" required
                className="block w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2.5 text-sm text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/50 focus:border-indigo-400 transition" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700 dark:text-zinc-300 text-right block">שעה (08:00–16:00)</label>
              <input type="time" value={time} min="08:00" max="15:30"
                onChange={(e) => setTime(e.target.value)} required
                className="block w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2.5 text-sm text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/50 focus:border-indigo-400 transition" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700 dark:text-zinc-300 text-right block">סוג</label>
            <select value={type} onChange={(e) => setType(e.target.value as AppointmentType)}
              className="block w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2.5 text-sm text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/50 focus:border-indigo-400 transition text-right">
              <option value="new">תור חדש</option>
              <option value="follow_up">מעקב</option>
            </select>
          </div>
        </div>

        <div className="flex justify-start gap-3 border-t border-slate-100 dark:border-zinc-800 px-5 py-3 flex-row-reverse">
          <button type="button" onClick={onClose} disabled={submitting}
            className="rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-700 disabled:opacity-50 transition-colors">
            ביטול
          </button>
          <button type="submit" disabled={submitting}
            className="rounded-xl bg-slate-900 dark:bg-zinc-100 px-4 py-2.5 text-sm font-semibold text-white dark:text-zinc-900 hover:bg-slate-800 dark:hover:bg-white disabled:opacity-50 transition-colors">
            {submitting ? 'קובע…' : 'קבע תור'}
          </button>
        </div>
      </form>
    </div>
  );
}
