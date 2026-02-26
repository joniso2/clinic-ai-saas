'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, X, Plus, Calendar } from 'lucide-react';
import type { Appointment, AppointmentType } from '@/types/appointments';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ISRAEL_TZ = 'Asia/Jerusalem';
const DAY_NAMES  = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function toIsraelDateString(utcIso: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: ISRAEL_TZ, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date(utcIso));
}

function formatTime(utcIso: string): string {
  return new Intl.DateTimeFormat('he-IL', {
    timeZone: ISRAEL_TZ, hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(new Date(utcIso));
}

function formatFullDateTime(utcIso: string): string {
  return new Intl.DateTimeFormat('he-IL', {
    timeZone: ISRAEL_TZ, weekday: 'long', year: 'numeric',
    month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(new Date(utcIso));
}

function buildCalendarGrid(year: number, month: number): (number | null)[][] {
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay();
  const daysInMonth    = new Date(year, month, 0).getDate();
  const grid: (number | null)[][] = [];
  let week: (number | null)[] = Array(firstDayOfWeek).fill(null);

  for (let d = 1; d <= daysInMonth; d++) {
    week.push(d);
    if (week.length === 7) { grid.push(week); week = []; }
  }
  while (week.length > 0 && week.length < 7) week.push(null);
  if (week.length) grid.push(week);
  return grid;
}

// Density color: 0 = none, 1-2 = light, 3-4 = medium, 5+ = heavy
function getDensityStyle(count: number): string {
  if (count === 0) return '';
  if (count <= 2) return 'ring-1 ring-blue-200 bg-blue-50/30';
  if (count <= 4) return 'ring-1 ring-blue-300 bg-blue-50/50';
  return 'ring-2 ring-blue-400 bg-blue-50/70';
}

const TYPE_PILL: Record<string, string> = {
  follow_up: 'bg-amber-100 text-amber-800 border border-amber-200',
  new: 'bg-blue-100 text-blue-800 border border-blue-200',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

type AppointmentModalProps = {
  day: number; month: number; year: number;
  appointments: Appointment[];
  onClose: () => void;
  onDelete: (id: string) => void;
  onAdd: (day: number) => void;
};

function AppointmentDayModal({
  day, month, year, appointments, onClose, onDelete, onAdd,
}: AppointmentModalProps) {
  const dateLabel = new Intl.DateTimeFormat('he-IL', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  }).format(new Date(year, month - 1, day));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Appointments</p>
            <h2 className="mt-0.5 text-base font-semibold text-slate-900">{dateLabel}</h2>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-72 overflow-y-auto px-5 py-3 space-y-2">
          {appointments.length === 0 && (
            <p className="py-6 text-center text-sm text-slate-400">No appointments on this day.</p>
          )}
          {appointments.map((apt) => (
            <div key={apt.id}
              className="flex items-start justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 transition-colors hover:bg-slate-100/70">
              <div>
                <p className="text-sm font-semibold text-slate-900">{apt.patient_name}</p>
                <p className="mt-0.5 text-xs font-medium text-slate-500">{formatTime(apt.datetime)}</p>
                <span className={`mt-1.5 inline-block rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                  TYPE_PILL[apt.type] ?? TYPE_PILL['new']
                }`}>
                  {apt.type === 'follow_up' ? 'Follow-up' : 'New Patient'}
                </span>
              </div>
              <button onClick={() => onDelete(apt.id)}
                className="ml-3 mt-0.5 rounded-full p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>

        <div className="border-t border-slate-100 px-5 py-3">
          <button onClick={() => { onClose(); onAdd(day); }}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 transition-colors">
            <Plus className="h-4 w-4" /> Add Appointment
          </button>
        </div>
      </div>
    </div>
  );
}

type NewAppointmentFormProps = {
  prefillDate?: string; // YYYY-MM-DD
  onClose: () => void;
  onSuccess: (apt: Appointment) => void;
};

function NewAppointmentForm({ prefillDate, onClose, onSuccess }: NewAppointmentFormProps) {
  const [patientName, setPatientName] = useState('');
  const [date, setDate]               = useState(() => {
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
  const [time, setTime]               = useState('08:00');
  const [type, setType]               = useState<AppointmentType>('new');
  const [submitting, setSubmitting]   = useState(false);
  const [error, setError]             = useState<string | null>(null);

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
      body: JSON.stringify({ patient_name: patientName.trim(), datetime: datetimeRaw, type }),
    });
    const json = await res.json();

    if (res.status === 201 && json.appointment) {
      onSuccess(json.appointment as Appointment);
    } else if (res.status === 409 && json.suggestions?.length) {
      const alts = (json.suggestions as string[])
        .slice(0, 3)
        .map(formatFullDateTime)
        .join('\n');
      setError(`This slot is taken. Closest available:\n${alts}`);
    } else {
      setError(json.message ?? json.error ?? 'Failed to schedule');
    }
    setSubmitting(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-900">New Appointment</h2>
          <button type="button" onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 transition-colors">
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
            <label className="text-xs font-medium text-slate-700">Patient name</label>
            <input type="text" value={patientName} onChange={(e) => setPatientName(e.target.value)}
              required placeholder="Full name"
              className="block w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700">Date (DD/MM/YYYY)</label>
            <input
              type="text"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              placeholder="DD/MM/YYYY"
              required
                className="block w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700">Time (08:00–16:00)</label>
              <input type="time" value={time} min="08:00" max="15:30"
                onChange={(e) => setTime(e.target.value)} required
                className="block w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700">Type</label>
            <select value={type} onChange={(e) => setType(e.target.value as AppointmentType)}
              className="block w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition">
              <option value="new">New appointment</option>
              <option value="follow_up">Follow-up</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-100 px-5 py-3">
          <button type="button" onClick={onClose} disabled={submitting}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={submitting}
            className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50 transition-colors">
            {submitting ? 'Scheduling…' : 'Schedule'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Main CalendarView ────────────────────────────────────────────────────────

export function CalendarView() {
  const today = new Date();
  const [year,  setYear]  = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);

  const [selectedDay,  setSelectedDay]  = useState<number | null>(null);
  const [showNewForm,  setShowNewForm]  = useState(false);
  const [prefillDate,  setPrefillDate]  = useState<string | undefined>(undefined);

  const todayStr = toIsraelDateString(today.toISOString());

  const fetchAppointments = useCallback(async (y: number, m: number) => {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/appointments?month=${m}&year=${y}`, { credentials: 'include' });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? 'Failed to load appointments');
      setAppointments([]);
    } else {
      setAppointments((json.appointments ?? []) as Appointment[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAppointments(year, month); }, [year, month, fetchAppointments]);

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 12) { setMonth(1); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  }

  function appointmentsForDay(day: number): Appointment[] {
    const dayStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return appointments.filter((a) => toIsraelDateString(a.datetime) === dayStr);
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/appointments?id=${id}`, {
      method: 'DELETE', credentials: 'include',
    });
    if (res.ok) {
      setAppointments((prev) => prev.filter((a) => a.id !== id));
      setSelectedDay(null);
    }
  }

  function handleAddFromDay(day: number) {
    setPrefillDate(
      `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    );
    setShowNewForm(true);
  }

  const grid = buildCalendarGrid(year, month);

  // Total appointments this month for the legend
  const totalThisMonth = appointments.length;
  const followUpCount = appointments.filter((a) => a.type === 'follow_up').length;
  const newCount = appointments.filter((a) => a.type === 'new').length;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white">
            <Calendar className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              {MONTH_NAMES[month - 1]} {year}
            </h2>
            {!loading && (
              <p className="text-xs text-slate-500">
                {totalThisMonth} appointment{totalThisMonth !== 1 ? 's' : ''} this month
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={prevMonth}
            className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-colors">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth() + 1); }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-colors">
            Today
          </button>
          <button onClick={nextMonth}
            className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-colors">
            <ChevronRight className="h-4 w-4" />
          </button>
          <button onClick={() => { setPrefillDate(undefined); setShowNewForm(true); }}
            className="ml-1 flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors shadow-sm">
            <Plus className="h-3.5 w-3.5" /> New
          </button>
        </div>
      </div>

      {/* Legend */}
      {!loading && totalThisMonth > 0 && (
        <div className="flex items-center gap-4 border-b border-slate-100 bg-white px-5 py-2.5">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-blue-400" />
            <span className="text-xs text-slate-600">{newCount} New</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
            <span className="text-xs text-slate-600">{followUpCount} Follow-up</span>
          </div>
        </div>
      )}

      {/* Day header row */}
      <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/40">
        {DAY_NAMES.map((d) => (
          <div key={d} className="py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            {d}
          </div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="px-5 py-3 text-sm text-red-600">{error}</div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900" />
        </div>
      )}

      {/* Calendar grid */}
      {!loading && (
        <div className="grid grid-cols-7">
          {grid.map((week, wi) =>
            week.map((day, di) => {
              if (!day) {
                return (
                  <div key={`empty-${wi}-${di}`}
                    className="min-h-[96px] border-b border-r border-slate-100 bg-slate-50/30" />
                );
              }
              const dayStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const isToday = dayStr === todayStr;
              const dayApts = appointmentsForDay(day);
              const densityStyle = getDensityStyle(dayApts.length);

              return (
                <button
                  key={dayStr}
                  onClick={() => setSelectedDay(day)}
                  className={`group relative min-h-[96px] cursor-pointer border-b border-r border-slate-100 p-2 text-left transition-all hover:bg-slate-50 ${
                    di === 6 ? 'border-r-0' : ''
                  } ${densityStyle}`}
                >
                  {/* Day number */}
                  <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                    isToday
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-700 group-hover:bg-slate-200'
                  }`}>
                    {day}
                  </span>

                  {/* Density dot indicator */}
                  {dayApts.length > 0 && (
                    <span className="absolute top-2 right-2 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-slate-900 px-1 text-[9px] font-bold text-white">
                      {dayApts.length}
                    </span>
                  )}

                  {/* Appointment pills */}
                  <div className="mt-1 space-y-0.5">
                    {dayApts.slice(0, 2).map((apt) => (
                      <div key={apt.id}
                        className={`truncate rounded-md px-1.5 py-0.5 text-[10px] font-medium ${
                          apt.type === 'follow_up'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                        {formatTime(apt.datetime)} {apt.patient_name}
                      </div>
                    ))}
                    {dayApts.length > 2 && (
                      <div className="px-1 text-[10px] font-medium text-slate-500">
                        +{dayApts.length - 2} more
                      </div>
                    )}
                  </div>
                </button>
              );
            }),
          )}
        </div>
      )}

      {/* Modals */}
      {selectedDay !== null && (
        <AppointmentDayModal
          day={selectedDay} month={month} year={year}
          appointments={appointmentsForDay(selectedDay)}
          onClose={() => setSelectedDay(null)}
          onDelete={handleDelete}
          onAdd={handleAddFromDay}
        />
      )}

      {showNewForm && (
        <NewAppointmentForm
          prefillDate={prefillDate}
          onClose={() => setShowNewForm(false)}
          onSuccess={(apt) => {
            setAppointments((prev) => [...prev, apt]);
            setShowNewForm(false);
          }}
        />
      )}
    </div>
  );
}
