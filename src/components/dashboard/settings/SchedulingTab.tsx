'use client';

import { useState } from 'react';
import { CalendarDays, Clock, Coffee, Save, CheckCircle2, AlertCircle, Loader2, Plus, X } from 'lucide-react';
import type { ClinicSettings, WorkingHoursDay, BreakSlot } from '@/repositories/settings.repository';

const DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DURATION_OPTIONS = [15, 20, 30, 45, 60, 90];

function NumberInput({ value, onChange, min = 0, max, unit }: { value: number; onChange: (v: number) => void; min?: number; max?: number; unit?: string }) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(Math.max(min, parseInt(e.target.value, 10) || 0))}
        className="w-24 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-700/50 px-3 py-2 text-sm text-slate-900 dark:text-zinc-100 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/40 transition-colors"
      />
      {unit && <span className="text-sm text-slate-500 dark:text-zinc-400">{unit}</span>}
    </div>
  );
}

function TimeInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="time"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-700/50 px-2.5 py-1.5 text-sm text-slate-900 dark:text-zinc-100 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-100 dark:focus:ring-indigo-900/40"
    />
  );
}

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-1 ${enabled ? 'bg-slate-900 dark:bg-zinc-100' : 'bg-slate-200 dark:bg-zinc-600'}`}
      aria-pressed={enabled}
    >
      <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white dark:bg-zinc-900 shadow transition-transform ${enabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
    </button>
  );
}

export function SchedulingTab({ settings }: { settings: ClinicSettings }) {
  const [hours, setHours] = useState<WorkingHoursDay[]>(
    settings.working_hours?.length === 7
      ? settings.working_hours
      : Array.from({ length: 7 }, (_, i) => ({
          day: i,
          enabled: i >= 1 && i <= 5,
          open: '08:00',
          close: i === 5 ? '14:00' : '16:00',
        })),
  );
  const [slotMinutes, setSlotMinutes] = useState(settings.slot_minutes ?? 30);
  const [bufferMinutes, setBufferMinutes] = useState(settings.buffer_minutes ?? 0);
  const [maxPerDay, setMaxPerDay] = useState<string>(
    settings.max_appointments_per_day != null ? String(settings.max_appointments_per_day) : '',
  );
  const [minNotice, setMinNotice] = useState(settings.min_booking_notice_hours ?? 0);
  const [maxWindow, setMaxWindow] = useState(settings.max_booking_window_days ?? 60);
  const [breaks, setBreaks] = useState<BreakSlot[]>(settings.break_slots ?? []);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  function updateHour(idx: number, field: keyof WorkingHoursDay, value: string | boolean) {
    setHours((prev) => prev.map((h, i) => (i === idx ? { ...h, [field]: value } : h)));
    setStatus('idle');
  }

  function addBreak() {
    setBreaks((b) => [...b, { start: '12:00', end: '13:00', label: 'Lunch' }]);
    setStatus('idle');
  }

  function updateBreak(idx: number, field: keyof BreakSlot, value: string) {
    setBreaks((prev) => prev.map((b, i) => (i === idx ? { ...b, [field]: value } : b)));
    setStatus('idle');
  }

  function removeBreak(idx: number) {
    setBreaks((prev) => prev.filter((_, i) => i !== idx));
    setStatus('idle');
  }

  async function handleSave() {
    setSaving(true);
    setStatus('idle');
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          working_hours:            hours,
          slot_minutes:             slotMinutes,
          buffer_minutes:           bufferMinutes,
          max_appointments_per_day: maxPerDay !== '' ? parseInt(maxPerDay, 10) : null,
          min_booking_notice_hours: minNotice,
          max_booking_window_days:  maxWindow,
          break_slots:              breaks,
        }),
      });
      if (!res.ok) throw new Error();
      setStatus('success');
      setTimeout(() => setStatus('idle'), 3000);
    } catch {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Working hours */}
      <div className="rounded-2xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 overflow-hidden">
        <div className="border-b border-slate-100 dark:border-zinc-700 bg-slate-50/60 dark:bg-zinc-700/60 px-5 py-4 flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 dark:bg-zinc-100 text-white dark:text-zinc-900">
            <Clock className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-100">Working hours</h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400">Set the days and hours your clinic is open.</p>
          </div>
        </div>
        <div className="px-5 py-5 space-y-3">
          {DAY_LABELS.map((day, i) => (
            <div
              key={day}
              className={`flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3 transition-colors ${
                hours[i]?.enabled
                  ? 'border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-700/50'
                  : 'border-slate-100 dark:border-zinc-700/60 bg-slate-50/60 dark:bg-zinc-700/20'
              }`}
            >
              <Toggle enabled={!!hours[i]?.enabled} onChange={(v) => updateHour(i, 'enabled', v)} />
              <span className={`w-24 text-sm font-medium ${hours[i]?.enabled ? 'text-slate-900 dark:text-zinc-100' : 'text-slate-400 dark:text-zinc-500'}`}>
                {day}
              </span>
              {hours[i]?.enabled ? (
                <div className="flex items-center gap-2">
                  <TimeInput value={hours[i]?.open ?? '08:00'} onChange={(v) => updateHour(i, 'open', v)} />
                  <span className="text-xs text-slate-400 dark:text-zinc-500">to</span>
                  <TimeInput value={hours[i]?.close ?? '16:00'} onChange={(v) => updateHour(i, 'close', v)} />
                </div>
              ) : (
                <span className="text-xs text-slate-400 dark:text-zinc-500 italic">Closed</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Slot + buffer */}
      <div className="rounded-2xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 overflow-hidden">
        <div className="border-b border-slate-100 dark:border-zinc-700 bg-slate-50/60 dark:bg-zinc-700/60 px-5 py-4 flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 dark:bg-zinc-100 text-white dark:text-zinc-900">
            <CalendarDays className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-100">Appointment rules</h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400">Slot length, capacity, and booking window constraints.</p>
          </div>
        </div>
        <div className="px-5 py-5 space-y-5">
          {/* Slot duration */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">Appointment slot length</p>
            <div className="flex flex-wrap gap-2">
              {DURATION_OPTIONS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => { setSlotMinutes(d); setStatus('idle'); }}
                  className={`rounded-xl border px-4 py-2 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-1 ${
                    slotMinutes === d
                      ? 'border-slate-900 dark:border-zinc-100 bg-slate-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-sm'
                      : 'border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:border-slate-300 dark:hover:border-zinc-600'
                  }`}
                >
                  {d} min
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">Buffer between appointments</p>
              <NumberInput value={bufferMinutes} onChange={(v) => { setBufferMinutes(v); setStatus('idle'); }} unit="minutes" />
              <p className="text-xs text-slate-400 dark:text-zinc-500">Added after each slot to prevent back-to-back bookings.</p>
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">Max appointments per day</p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={maxPerDay}
                  min={1}
                  onChange={(e) => { setMaxPerDay(e.target.value); setStatus('idle'); }}
                  placeholder="Unlimited"
                  className="w-28 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-700/50 px-3 py-2 text-sm text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/40 transition-colors"
                />
                <span className="text-sm text-slate-500 dark:text-zinc-400">/ day</span>
              </div>
              <p className="text-xs text-slate-400 dark:text-zinc-500">Leave empty for unlimited.</p>
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">Minimum booking notice</p>
              <NumberInput value={minNotice} onChange={(v) => { setMinNotice(v); setStatus('idle'); }} unit="hours" />
              <p className="text-xs text-slate-400 dark:text-zinc-500">Earliest a patient can book before the appointment time.</p>
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">Maximum booking window</p>
              <NumberInput value={maxWindow} onChange={(v) => { setMaxWindow(v); setStatus('idle'); }} unit="days" />
              <p className="text-xs text-slate-400 dark:text-zinc-500">How far ahead a patient can book.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Break slots */}
      <div className="rounded-2xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 overflow-hidden">
        <div className="border-b border-slate-100 dark:border-zinc-700 bg-slate-50/60 dark:bg-zinc-700/60 px-5 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 dark:bg-zinc-100 text-white dark:text-zinc-900">
              <Coffee className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-100">Break slots</h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400">Daily time blocks unavailable for booking.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={addBreak}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-700/50 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-700 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" /> Add break
          </button>
        </div>
        <div className="px-5 py-5">
          {breaks.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-zinc-500 italic">No break slots configured.</p>
          ) : (
            <div className="space-y-3">
              {breaks.map((b, i) => (
                <div key={i} className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50/60 dark:bg-zinc-700/20 px-4 py-3">
                  <input
                    type="text"
                    value={b.label ?? ''}
                    onChange={(e) => updateBreak(i, 'label', e.target.value)}
                    placeholder="Label (e.g. Lunch)"
                    className="w-32 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-700/50 px-2.5 py-1.5 text-sm text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none"
                  />
                  <TimeInput value={b.start} onChange={(v) => updateBreak(i, 'start', v)} />
                  <span className="text-xs text-slate-400 dark:text-zinc-500">to</span>
                  <TimeInput value={b.end} onChange={(v) => updateBreak(i, 'end', v)} />
                  <button
                    type="button"
                    onClick={() => removeBreak(i)}
                    className="ml-auto rounded-lg p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Save */}
      <div className="flex items-center justify-end gap-3">
        {status === 'success' && <span className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400"><CheckCircle2 className="h-4 w-4" /> Saved</span>}
        {status === 'error' && <span className="flex items-center gap-1.5 text-sm text-red-500 dark:text-red-400"><AlertCircle className="h-4 w-4" /> Failed to save</span>}
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 dark:bg-zinc-100 px-5 py-2.5 text-sm font-semibold text-white dark:text-zinc-900 shadow-sm hover:bg-slate-800 dark:hover:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </div>
  );
}
