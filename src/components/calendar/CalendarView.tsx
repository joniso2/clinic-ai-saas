'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Plus, Calendar } from 'lucide-react';
import type { Appointment } from '@/types/appointments';
import type { Lead } from '@/types/leads';
import { LeadDetailDrawer } from '@/components/dashboard/LeadDetailDrawer';
import { toIsraelDateString, formatDayLong } from '@/lib/calendar/time.utils';
import {
  addDays,
  buildCalendarGrid,
  getWeekStart,
  DAY_NAMES,
  WEEK_END_HOUR,
  WEEK_START_HOUR,
  SLOT_MINUTES,
} from '@/lib/calendar/calendar.utils';
import { WeekView } from './WeekView';
import { MonthView } from './MonthView';
import { DaySummaryHeader } from './DaySummaryHeader';
import { HoverPopover } from './HoverPopover';
import { DayModal } from './DayModal';
import { TodaySidebar } from './TodaySidebar';
import { NewAppointmentForm } from './NewAppointmentForm';

const ISRAEL_TZ = 'Asia/Jerusalem';

export function CalendarView({ initialDate }: { initialDate?: string } = {}) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [prefillDate, setPrefillDate] = useState<string | undefined>(undefined);
  const [drawerLead, setDrawerLead] = useState<Lead | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'month' | 'week'>('week');
  const [weekStart, setWeekStart] = useState<string>(() =>
    getWeekStart(today.getFullYear(), today.getMonth() + 1, today.getDate()),
  );
  const [hoveredApt, setHoveredApt] = useState<{ apt: Appointment; anchor: HTMLElement } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const todayStr = toIsraelDateString(today.toISOString());

  useEffect(() => {
    if (!initialDate || !/^\d{4}-\d{2}-\d{2}$/.test(initialDate)) return;
    const [y, m, d] = initialDate.split('-').map(Number);
    if (!d || d < 1 || d > 31 || !m || m < 1 || m > 12) return;
    setYear(y);
    setMonth(m);
    setSelectedDay(d);
    setWeekStart(getWeekStart(y, m, d));
  }, [initialDate]);

  const fetchAppointments = useCallback(async (y: number, m: number) => {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/appointments?month=${m}&year=${y}`, { credentials: 'include' });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? 'טעינת תורים נכשלה');
      setAppointments([]);
    } else {
      setAppointments((json.appointments ?? []) as Appointment[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAppointments(year, month);
  }, [year, month, fetchAppointments]);

  function prevMonth() {
    if (month === 1) {
      setMonth(12);
      setYear((y) => y - 1);
    } else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 12) {
      setMonth(1);
      setYear((y) => y + 1);
    } else setMonth((m) => m + 1);
  }
  function prevWeek() {
    const prev = addDays(weekStart, -7);
    setWeekStart(prev);
    const [y, m] = prev.split('-').map(Number);
    setYear(y);
    setMonth(m);
  }
  function nextWeek() {
    const next = addDays(weekStart, 7);
    setWeekStart(next);
    const [y, m] = next.split('-').map(Number);
    setYear(y);
    setMonth(m);
  }

  const focusedDateStr = selectedDay
    ? `${year}-${String(month).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`
    : weekStart;

  function prevDay() {
    const prev = addDays(focusedDateStr, -1);
    const [y, m, d] = prev.split('-').map(Number);
    setYear(y);
    setMonth(m);
    setSelectedDay(d);
    setWeekStart(getWeekStart(y, m, d));
  }
  function nextDay() {
    const next = addDays(focusedDateStr, 1);
    const [y, m, d] = next.split('-').map(Number);
    setYear(y);
    setMonth(m);
    setSelectedDay(d);
    setWeekStart(getWeekStart(y, m, d));
  }

  function appointmentsForDay(day: number): Appointment[] {
    const dayStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return appointments.filter((a) => toIsraelDateString(a.datetime) === dayStr);
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/appointments?id=${id}`, { method: 'DELETE', credentials: 'include' });
    if (res.ok) {
      setAppointments((prev) => prev.filter((a) => a.id !== id));
      setSelectedDay(null);
    }
  }

  function handleAddFromDay(day: number) {
    setPrefillDate(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
    setShowNewForm(true);
  }

  const grid = buildCalendarGrid(year, month);

  const now = new Date();
  const israelNow = new Date(now.toLocaleString('en-US', { timeZone: ISRAEL_TZ }));
  const dayOfWeek = israelNow.getDay();
  const todayWeekStart = new Date(israelNow);
  todayWeekStart.setDate(todayWeekStart.getDate() - dayOfWeek);
  todayWeekStart.setHours(0, 0, 0, 0);
  const todayWeekEnd = new Date(todayWeekStart);
  todayWeekEnd.setDate(todayWeekEnd.getDate() + 7);
  const todayWeekStartStr = toIsraelDateString(todayWeekStart.toISOString());
  const todayWeekEndStr = toIsraelDateString(todayWeekEnd.toISOString());

  const todayCount = appointments.filter((a) => toIsraelDateString(a.datetime) === todayStr).length;
  const weekCount = appointments.filter((a) => {
    const d = toIsraelDateString(a.datetime);
    return d >= todayWeekStartStr && d < todayWeekEndStr;
  }).length;
  const aiCreatedCount = appointments.filter((a) => a.is_ai_created === true).length;
  const totalThisMonth = appointments.length;
  const followUpCount = appointments.filter((a) => a.type === 'follow_up').length;
  const newCount = appointments.filter((a) => a.type === 'new').length;
  const appointmentsForWeek = appointments.filter((a) => {
    const d = toIsraelDateString(a.datetime);
    return d >= weekStart && d < addDays(weekStart, 7);
  });
  const todayAppointments = appointments.filter((a) => toIsraelDateString(a.datetime) === todayStr);

  return (
    <div
      className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm dark:shadow overflow-hidden flex flex-col"
      dir="rtl"
    >
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0">
        <div className="flex items-center justify-between gap-4 px-5 py-3 flex-row-reverse">
          <div className="flex items-center gap-3 flex-row-reverse min-w-0">
            <p className="text-lg font-semibold text-slate-900 dark:text-white truncate">{formatDayLong(focusedDateStr)}</p>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 dark:text-slate-400">
              <Calendar className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-center gap-2 flex-row-reverse shrink-0">
            <button
              onClick={() => { setPrefillDate(undefined); setShowNewForm(true); }}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" /> חדש
            </button>
            <button
              onClick={() => {
                setYear(today.getFullYear());
                setMonth(today.getMonth() + 1);
                setWeekStart(getWeekStart(today.getFullYear(), today.getMonth() + 1, today.getDate()));
                setSelectedDay(today.getDate());
              }}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              היום
            </button>
            <button onClick={nextDay} className="rounded-lg p-1.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" aria-label="יום הבא" title="יום הבא">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button onClick={prevDay} className="rounded-lg p-1.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" aria-label="יום קודם" title="יום קודם">
              <ChevronRight className="h-4 w-4" />
            </button>
            {viewMode === 'week' ? (
              <>
                <button onClick={nextWeek} className="rounded-lg p-1.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" aria-label="שבוע הבא">
                  <ChevronRight className="h-4 w-4" />
                </button>
                <button onClick={prevWeek} className="rounded-lg p-1.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" aria-label="שבוע שעבר">
                  <ChevronLeft className="h-4 w-4" />
                </button>
              </>
            ) : (
              <>
                <button onClick={nextMonth} className="rounded-lg p-1.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" aria-label="חודש הבא">
                  <ChevronRight className="h-4 w-4" />
                </button>
                <button onClick={prevMonth} className="rounded-lg p-1.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" aria-label="חודש שעבר">
                  <ChevronLeft className="h-4 w-4" />
                </button>
              </>
            )}
            <div className="flex rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => { setViewMode('week'); setWeekStart(getWeekStart(year, month, selectedDay || 1)); }}
                className={`px-2.5 py-1.5 text-xs font-medium transition-colors ${viewMode === 'week' ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
              >
                שבוע
              </button>
              <button
                onClick={() => setViewMode('month')}
                className={`px-2.5 py-1.5 text-xs font-medium transition-colors ${viewMode === 'month' ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
              >
                חודש
              </button>
            </div>
          </div>
        </div>
        {!loading && (
          <div className="px-5 pb-2 pt-0 text-right" dir="rtl">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              היום: {todayCount} תורים
              {todayAppointments.filter((a) => (a.status ?? '') === 'cancelled').length > 0 && (
                <> | {todayAppointments.filter((a) => (a.status ?? '') === 'cancelled').length} בוטלו</>
              )}
              {(() => {
                const slotsTotal = (WEEK_END_HOUR - WEEK_START_HOUR) * (60 / SLOT_MINUTES);
                const occupied = todayAppointments.reduce((s, a) => s + Math.ceil((a.duration_minutes ?? 30) / SLOT_MINUTES), 0);
                const free = Math.max(0, slotsTotal - occupied);
                return free > 0 ? <> | {free} פנויים</> : null;
              })()}
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-1 min-h-0 flex-row-reverse">
        <div className="flex-1 min-w-0 flex flex-col">
          {!loading && <DaySummaryHeader todayCount={todayCount} weekCount={weekCount} aiCreatedCount={aiCreatedCount} />}
          {!loading && totalThisMonth > 0 && (
            <div className="flex items-center gap-4 border-b border-slate-100 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-5 py-2.5 flex-row-reverse justify-end">
              <div className="flex items-center gap-1.5 flex-row-reverse">
                <span className="h-2.5 w-2.5 rounded-full bg-blue-400" />
                <span className="text-xs text-slate-600 dark:text-zinc-400">{newCount} חדש</span>
              </div>
              <div className="flex items-center gap-1.5 flex-row-reverse">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                <span className="text-xs text-slate-600 dark:text-zinc-400">{followUpCount} מעקב</span>
              </div>
            </div>
          )}
          {viewMode === 'month' && (
            <div className="grid grid-cols-7 border-b border-slate-100 dark:border-zinc-700 bg-slate-50/40 dark:bg-zinc-700/60" dir="rtl">
              {DAY_NAMES.map((d) => (
                <div key={d} className="py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                  {d}
                </div>
              ))}
            </div>
          )}
          {error && <div className="px-5 py-3 text-sm text-red-600 dark:text-red-400">{error}</div>}
          {loading && (
            <div className="flex justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 dark:border-zinc-700 border-t-slate-900 dark:border-t-zinc-300" />
            </div>
          )}
          {!loading && viewMode === 'week' && (
            <WeekView
              weekStartStr={weekStart}
              appointments={appointmentsForWeek}
              onSlotClick={(_, dayStr) => {
                const [y, m, d] = dayStr.split('-').map(Number);
                setYear(y);
                setMonth(m);
                setSelectedDay(d);
              }}
              onAppointmentHover={(apt, el) => setHoveredApt({ apt, anchor: el })}
              onAppointmentHoverEnd={() => setHoveredApt(null)}
              todayStr={todayStr}
            />
          )}
          {!loading && viewMode === 'month' && (
            <MonthView
              year={year}
              month={month}
              grid={grid}
              appointmentsForDay={appointmentsForDay}
              onSelectDay={(d) => setSelectedDay(d)}
              todayStr={todayStr}
              onAppointmentHoverStart={(apt, el) => setHoveredApt({ apt, anchor: el })}
              onAppointmentHoverEnd={() => setHoveredApt(null)}
            />
          )}
        </div>

        <TodaySidebar open={sidebarOpen} onToggle={() => setSidebarOpen((o) => !o)} appointments={todayAppointments} />
      </div>

      {hoveredApt && <HoverPopover appointment={hoveredApt.apt} phone={null} anchor={hoveredApt.anchor} />}

      {selectedDay !== null && (
        <DayModal
          day={selectedDay}
          month={month}
          year={year}
          appointments={appointmentsForDay(selectedDay)}
          onClose={() => setSelectedDay(null)}
          onDelete={handleDelete}
          onAdd={handleAddFromDay}
          onViewLead={(lead) => { setDrawerLead(lead); setDrawerOpen(true); }}
        />
      )}

      <LeadDetailDrawer
        lead={drawerLead}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onStatusChange={() => {}}
        onMarkContacted={() => {}}
        onScheduleFollowUp={() => {}}
        onEdit={() => {}}
      />

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
