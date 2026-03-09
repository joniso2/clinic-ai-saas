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
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-5 py-4 flex-row-reverse">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 text-right">תור חדש</h2>
          <button type="button" onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" aria-label="סגור">
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
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300 text-right block">שם הלקוח</label>
            <input type="text" value={patientName} onChange={(e) => setPatientName(e.target.value)}
              required placeholder="שם מלא"
              className="block w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/50 focus:border-indigo-400 transition" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300 text-right block">תאריך (DD/MM/YYYY)</label>
            <input type="text" value={date} onChange={(e) => setDate(e.target.value)}
              placeholder="DD/MM/YYYY" required
              className="block w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/50 focus:border-indigo-400 transition" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300 text-right block">שעה</label>
            {[
              { label: 'בוקר', slots: ['08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30'] },
              { label: 'צהריים', slots: ['12:00','12:30','13:00','13:30','14:00','14:30','15:00','15:30'] },
              { label: 'ערב', slots: ['16:00','16:30','17:00','17:30','18:00','18:30','19:00'] },
            ].map((group) => (
              <div key={group.label}>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1 text-right">{group.label}</p>
                <div className="grid grid-cols-4 gap-1.5">
                  {group.slots.map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setTime(slot)}
                      className={`h-9 rounded-lg text-[12px] font-medium transition-all duration-100 ${
                        time === slot
                          ? 'bg-indigo-600 text-white border border-indigo-600 shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700'
                      }`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300 text-right block">סוג</label>
            <select value={type} onChange={(e) => setType(e.target.value as AppointmentType)}
              className="block w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/50 focus:border-indigo-400 transition text-right">
              <option value="new">תור חדש</option>
              <option value="follow_up">מעקב</option>
            </select>
          </div>
        </div>

        <div className="flex justify-start gap-3 border-t border-slate-100 dark:border-slate-800 px-5 py-3 flex-row-reverse">
          <button type="button" onClick={onClose} disabled={submitting}
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors">
            ביטול
          </button>
          <button type="submit" disabled={submitting}
            className="rounded-xl bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-700 px-4 py-2.5 text-sm font-semibold text-white dark:text-white disabled:opacity-50 transition-colors">
            {submitting ? 'קובע…' : 'קבע תור'}
          </button>
        </div>
      </form>
    </div>
  );
}
