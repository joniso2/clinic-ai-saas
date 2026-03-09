'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import { format, addDays, subDays, startOfDay, getDay, getDate, getMonth } from 'date-fns';
import { he } from 'date-fns/locale';
import { Plus, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import type { Appointment } from '@/types/appointments';
import type { Lead } from '@/types/leads';
import type { BillingSettings } from '@/types/billing';
import { WeekBoard } from './WeekBoard';
import { ISRAEL_TZ, getEventDateStr } from './calendar-helpers';
import type { CalendarEvent, DayColumn } from './calendar-helpers';

const LeadDetailDrawer = dynamic(
  () => import('@/components/dashboard/LeadDetailDrawer').then((m) => m.LeadDetailDrawer),
  { ssr: false },
);
const NewAppointmentForm = dynamic(
  () => import('./NewAppointmentForm').then((m) => m.NewAppointmentForm),
  { ssr: false },
);
const DayModal = dynamic(
  () => import('./DayModal').then((m) => m.DayModal),
  { ssr: false },
);
const AppointmentReceiptPrompt = dynamic(
  () => import('@/components/billing/AppointmentReceiptPrompt').then((m) => m.AppointmentReceiptPrompt),
  { ssr: false },
);
const CreateDocumentModal = dynamic(
  () => import('@/components/billing/CreateDocumentModal').then((m) => m.CreateDocumentModal),
  { ssr: false },
);

export function CalendarView({ initialDate, clinicId }: { initialDate?: string; clinicId?: string | null } = {}) {
  const today = useMemo(() => new Date(), []);

  const [currentDate, setCurrentDate] = useState<Date>(() => {
    if (initialDate && /^\d{4}-\d{2}-\d{2}$/.test(initialDate)) {
      return new Date(initialDate + 'T12:00:00');
    }
    return today;
  });
  const [currentView, setCurrentView] = useState<'week' | 'day'>('week');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drawerLead, setDrawerLead] = useState<Lead | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const [prefillDate, setPrefillDate] = useState<string | undefined>(undefined);
  const [prefillTime, setPrefillTime] = useState<string | undefined>(undefined);
  const [fetchedMonths, setFetchedMonths] = useState<Set<string>>(new Set());
  const [leadStatusByLeadId, setLeadStatusByLeadId] = useState<Record<string, string>>({});
  const leadStatusRef = useRef(leadStatusByLeadId);
  leadStatusRef.current = leadStatusByLeadId;
  const [leadStatusFetched, setLeadStatusFetched] = useState(false);
  const [selectedDay, setSelectedDay] = useState<{ day: number; month: number; year: number } | null>(null);
  const [receiptPromptApt, setReceiptPromptApt] = useState<Appointment | null>(null);
  const [receiptModalApt, setReceiptModalApt] = useState<Appointment | null>(null);
  const [billingSettings, setBillingSettings] = useState<BillingSettings | null | 'loading' | 'none'>(null);

  // On mobile, default to day view
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 640) {
      setCurrentView('day');
    }
  }, []);

  useEffect(() => {
    setFetchedMonths((prev) => (prev.size === 0 ? prev : new Set()));
  }, [clinicId]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        const y = currentDate.getFullYear();
        const m = currentDate.getMonth() + 1;
        const key = `${y}-${m}`;
        setFetchedMonths((prev) => (prev.has(key) ? new Set([...prev].filter((k) => k !== key)) : prev));
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [currentDate]);

  useEffect(() => {
    const leadIds = new Set(appointments.map((a) => a.lead_id).filter(Boolean) as string[]);
    if (leadIds.size === 0) {
      setLeadStatusFetched(true);
      return;
    }
    const current = leadStatusRef.current;
    const missing = [...leadIds].filter((id) => !(id in current));
    if (missing.length === 0) {
      setLeadStatusFetched(true);
      return;
    }
    setLeadStatusFetched(false);
    let cancelled = false;
    const leadsUrl = clinicId ? `/api/leads?clinic_id=${encodeURIComponent(clinicId)}` : '/api/leads';
    fetch(leadsUrl, { credentials: 'include' })
      .then((res) => res.json())
      .then((data: { leads?: Lead[] }) => {
        if (cancelled) return;
        const leads = data.leads ?? [];
        setLeadStatusByLeadId((prev) => {
          const next = { ...prev };
          for (const lead of leads) {
            if (lead.id && lead.status != null && lead.status !== '') next[lead.id] = lead.status;
          }
          return next;
        });
        setLeadStatusFetched(true);
      })
      .catch(() => setLeadStatusFetched(true));
    return () => { cancelled = true; };
  }, [appointments, clinicId]);

  const fetchAppointments = useCallback(async (y: number, m: number) => {
    const key = `${y}-${m}`;
    setLoading(true);
    setError(null);
    const base = `/api/appointments?month=${m}&year=${y}`;
    const url = clinicId ? `${base}&clinic_id=${encodeURIComponent(clinicId)}` : base;
    const res = await fetch(url, { credentials: 'include' });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? 'טעינת תורים נכשלה');
    } else {
      const fetched = (json.appointments ?? []) as Appointment[];
      setAppointments((prev) => {
        const ids = new Set(fetched.map((a) => a.id));
        const filtered = prev.filter((a) => !ids.has(a.id));
        return [...filtered, ...fetched];
      });
      setFetchedMonths((prev) => new Set([...prev, key]));
    }
    setLoading(false);
  }, [clinicId]);

  useEffect(() => {
    const m = currentDate.getMonth() + 1;
    const y = currentDate.getFullYear();
    const key = `${y}-${m}`;
    if (!fetchedMonths.has(key)) {
      fetchAppointments(y, m);
    }
  }, [currentDate, fetchedMonths, fetchAppointments]);

  const events = useMemo<CalendarEvent[]>(() => {
    return appointments.map((apt) => {
      const start = new Date(apt.datetime);
      const end = new Date(start.getTime() + (apt.duration_minutes ?? 30) * 60000);
      return {
        id: apt.id,
        title: apt.patient_name,
        start,
        end,
        resource: apt,
      };
    });
  }, [appointments]);

  const handleNavigate = useCallback((date: Date) => {
    setCurrentDate(date);
  }, []);

  const handleViewChange = useCallback((view: string) => {
    if (view === 'week' || view === 'day') setCurrentView(view);
  }, []);

  const handleSelectEvent = useCallback(async (event: object) => {
    const calEvent = event as CalendarEvent;
    const apt = calEvent.resource;
    if (!apt.lead_id) return;
    try {
      const res = await fetch(`/api/leads/${apt.lead_id}`, { credentials: 'include' });
      if (res.ok) {
        const json = await res.json();
        setDrawerLead(json.lead as Lead);
      } else {
        setDrawerLead({ id: apt.lead_id, full_name: apt.patient_name } as Lead);
      }
    } catch {
      setDrawerLead({ id: apt.lead_id, full_name: apt.patient_name } as Lead);
    }
    setDrawerOpen(true);
  }, []);

  const todayStr = useMemo(() => {
    const d = new Date(today.toLocaleString('en-US', { timeZone: ISRAEL_TZ }));
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, [today]);

  const dayColumns = useMemo<DayColumn[]>(() => {
    // Israeli week: Sunday (יום א') first, Saturday (יום ש') last
    const start = currentView === 'day'
      ? startOfDay(currentDate)
      : startOfDay(subDays(currentDate, getDay(currentDate)));
    const count = currentView === 'day' ? 1 : 7;
    const cols: DayColumn[] = [];
    for (let i = 0; i < count; i++) {
      const d = addDays(start, i);
      const dateStr = format(d, 'yyyy-MM-dd');
      const eventsForDay = events
        .filter((ev) => getEventDateStr(ev.start) === dateStr)
        .sort((a, b) => a.start.getTime() - b.start.getTime());
      cols.push({
        dateStr,
        dayLabel: format(d, 'EEEEEE', { locale: he }),
        dayNum: getDate(d),
        isToday: dateStr === todayStr,
        events: eventsForDay,
      });
    }
    return cols;
  }, [currentDate, currentView, events, todayStr]);

  const handleAddDay = useCallback((dateStr: string) => {
    setPrefillDate(dateStr);
    setPrefillTime(undefined);
    setShowNewForm(true);
  }, []);

  const handleDayClick = useCallback((dateStr: string) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    setSelectedDay({ day: d, month: m, year: y });
  }, []);

  const handleCompleteAppointment = useCallback(async (apt: Appointment) => {
    try {
      const res = await fetch(`/api/appointments/${apt.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: 'completed' }),
      });
      if (!res.ok) return;
      setAppointments((prev) =>
        prev.map((a) => a.id === apt.id ? { ...a, status: 'completed' } : a),
      );
      // Check if a receipt already exists for this appointment before prompting
      try {
        const checkRes = await fetch(`/api/billing-documents?appointment_id=${apt.id}&limit=1`, { credentials: 'include' });
        const checkData = checkRes.ok ? await checkRes.json() : null;
        const existing = (checkData?.documents ?? []).filter((d: { status: string }) => d.status !== 'cancelled');
        if (existing.length > 0) return; // Receipt already exists — skip prompt
      } catch { /* proceed to prompt on network error */ }
      setReceiptPromptApt(apt);
    } catch {}
  }, []);

  const handleIssueReceiptFromPrompt = useCallback(async (apt: Appointment) => {
    setReceiptPromptApt(null);
    if (billingSettings && billingSettings !== 'loading' && billingSettings !== 'none') {
      setReceiptModalApt(apt);
      return;
    }
    try {
      const res = await fetch('/api/billing-settings');
      const data = res.ok ? await res.json() : null;
      const s: BillingSettings | null = data?.settings ?? null;
      setBillingSettings(s ?? 'none');
      if (s) setReceiptModalApt(apt);
      else alert('נדרש להגדיר פרטי עסק תחילה');
    } catch {
      setBillingSettings('none');
    }
  }, [billingSettings]);

  const selectedDayAppointments = useMemo(() => {
    if (!selectedDay) return [];
    const dateStr = `${selectedDay.year}-${String(selectedDay.month).padStart(2, '0')}-${String(selectedDay.day).padStart(2, '0')}`;
    return appointments.filter((a) => getEventDateStr(new Date(a.datetime)) === dateStr);
  }, [selectedDay, appointments]);

  const todayCount = useMemo(() =>
    appointments.filter((a) => {
      const d = new Date(a.datetime);
      const israelDate = new Date(d.toLocaleString('en-US', { timeZone: ISRAEL_TZ }));
      const dateStr = `${israelDate.getFullYear()}-${String(israelDate.getMonth() + 1).padStart(2, '0')}-${String(israelDate.getDate()).padStart(2, '0')}`;
      return dateStr === todayStr;
    }).length,
    [appointments, todayStr]
  );

  const goToToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  const goPrev = useCallback(() => {
    setCurrentDate((d) => {
      const nd = new Date(d);
      nd.setDate(nd.getDate() - (currentView === 'week' ? 7 : 1));
      return nd;
    });
  }, [currentView]);

  const goNext = useCallback(() => {
    setCurrentDate((d) => {
      const nd = new Date(d);
      nd.setDate(nd.getDate() + (currentView === 'week' ? 7 : 1));
      return nd;
    });
  }, [currentView]);

  const noopHandler = useCallback(() => {}, []);
  const handleCloseDrawer = useCallback(() => setDrawerOpen(false), []);
  const handleCloseDayModal = useCallback(() => setSelectedDay(null), []);
  const handleCloseReceiptModal = useCallback(() => setReceiptModalApt(null), []);

  // ── Drag-to-trash ──
  const [draggingApt, setDraggingApt] = useState<Appointment | null>(null);
  const [pendingDeleteApt, setPendingDeleteApt] = useState<Appointment | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [hasFinePointer, setHasFinePointer] = useState(false);

  useEffect(() => {
    setHasFinePointer(window.matchMedia('(pointer: fine)').matches);
  }, []);

  const handleDragStart = useCallback((apt: Appointment) => setDraggingApt(apt), []);
  const handleDragEnd = useCallback(() => setDraggingApt(null), []);

  const handleTrashDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (draggingApt) setPendingDeleteApt(draggingApt);
    setDraggingApt(null);
  }, [draggingApt]);

  const handleDeleteAppointment = useCallback(async (id: string) => {
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/appointments?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) {
        setAppointments((prev) => prev.filter((a) => a.id !== id));
      }
    } catch { /* swallow — appointment stays in list */ }
    setDeleteLoading(false);
    setPendingDeleteApt(null);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (pendingDeleteApt) handleDeleteAppointment(pendingDeleteApt.id);
  }, [pendingDeleteApt, handleDeleteAppointment]);

  const headerTitle = useMemo(() => {
    if (currentView === 'day') {
      return format(currentDate, 'EEEE, d MMMM yyyy', { locale: he });
    }
    const weekStart = startOfDay(subDays(currentDate, getDay(currentDate)));
    const weekEnd = addDays(weekStart, 6);
    if (getMonth(weekStart) === getMonth(weekEnd)) {
      return `${getDate(weekStart)}–${format(weekEnd, 'd MMMM yyyy', { locale: he })}`;
    }
    return `${format(weekStart, 'd MMM', { locale: he })} – ${format(weekEnd, 'd MMM yyyy', { locale: he })}`;
  }, [currentDate, currentView]);

  return (
    <div
      className="rbc-rtl-wrapper rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden flex flex-col"
      dir="rtl"
      style={{ minHeight: '80vh' }}
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 px-5 py-3 border-b border-slate-200 dark:border-slate-800 shrink-0 flex-row-reverse">
        <div className="flex items-center gap-2 flex-row-reverse min-w-0">
          <CalendarIcon className="h-4 w-4 text-slate-400 dark:text-slate-500 shrink-0" />
          <span className="text-base font-semibold text-slate-900 dark:text-white truncate">{headerTitle}</span>
        </div>
        <div className="flex items-center gap-2 flex-row-reverse shrink-0">
          <button
            onClick={() => { setPrefillDate(undefined); setPrefillTime(undefined); setShowNewForm(true); }}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" /> חדש
          </button>
          <button
            onClick={goToToday}
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            היום
          </button>
          <button
            onClick={goNext}
            className="rounded-lg p-1.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="הבא"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={goPrev}
            className="rounded-lg p-1.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="הקודם"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <div className="flex rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setCurrentView('week')}
              className={`px-2.5 py-1.5 text-xs font-medium transition-colors ${currentView === 'week' ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
            >
              שבוע
            </button>
            <button
              onClick={() => setCurrentView('day')}
              className={`px-2.5 py-1.5 text-xs font-medium transition-colors ${currentView === 'day' ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
            >
              יום
            </button>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      {!loading && (
        <div className="px-5 py-2 border-b border-slate-100 dark:border-slate-800 text-right shrink-0">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            היום: {todayCount} תורים · {appointments.length} החודש
          </p>
        </div>
      )}

      {/* Loading / Error */}
      {loading && (
        <div className="px-4 py-6 space-y-3 shrink-0">
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-3 w-10 mx-auto rounded animate-pulse bg-slate-200/70 dark:bg-slate-800/60" />
                {Array.from({ length: 2 + (i % 3) }).map((_, j) => (
                  <div key={j} className="h-14 rounded-lg animate-pulse bg-slate-200/70 dark:bg-slate-800/60" />
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
      {error && (
        <div className="px-5 py-3 text-sm text-red-600 dark:text-red-400 shrink-0">{error}</div>
      )}

      {/* Card-based week board: show only after lead statuses are ready to avoid "ייעוץ" flash */}
      {!loading && (leadStatusFetched || !appointments.some((a) => a.lead_id)) && (
        <div className="relative flex-1 min-h-0 flex flex-col" style={{ minHeight: 480 }}>
          <WeekBoard
            dayColumns={dayColumns}
            todayStr={todayStr}
            onSelectEvent={handleSelectEvent}
            onAddDay={handleAddDay}
            onDayClick={handleDayClick}
            onComplete={handleCompleteAppointment}
            leadStatusByLeadId={leadStatusByLeadId}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            canDrag={hasFinePointer}
          />

          {/* Trash drop zone — visible only while dragging */}
          <div
            className={`absolute inset-x-0 bottom-0 z-20 flex items-center justify-center gap-2 py-3 border-t-2 border-dashed transition-all duration-200 ${
              draggingApt
                ? 'opacity-100 translate-y-0 border-red-400 dark:border-red-500 bg-red-50/90 dark:bg-red-950/60'
                : 'opacity-0 translate-y-2 pointer-events-none border-transparent bg-transparent'
            }`}
            onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
            onDrop={handleTrashDrop}
          >
            <Trash2 className="h-4 w-4 text-red-500 dark:text-red-400" />
            <span className="text-[13px] font-semibold text-red-600 dark:text-red-400">גרור לכאן למחיקה</span>
          </div>
        </div>
      )}
      {!loading && !leadStatusFetched && appointments.some((a) => a.lead_id) && (
        <div className="flex flex-1 min-h-0 items-center justify-center" style={{ minHeight: 480 }}>
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 dark:border-slate-700 border-t-slate-900 dark:border-t-slate-300" />
        </div>
      )}

      {/* LeadDetailDrawer */}
      <LeadDetailDrawer
        lead={drawerLead}
        open={drawerOpen}
        onClose={handleCloseDrawer}
        onStatusChange={noopHandler}
        onMarkContacted={noopHandler}
        onScheduleFollowUp={noopHandler}
        onEdit={noopHandler}
      />

      {/* Day Modal */}
      {selectedDay && (
        <DayModal
          day={selectedDay.day}
          month={selectedDay.month}
          year={selectedDay.year}
          appointments={selectedDayAppointments}
          onClose={handleCloseDayModal}
          onDelete={(id) => {
            const apt = appointments.find((a) => a.id === id);
            if (apt) setPendingDeleteApt(apt);
          }}
          onAdd={(day) => {
            const dateStr = `${selectedDay.year}-${String(selectedDay.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            setSelectedDay(null);
            handleAddDay(dateStr);
          }}
          onViewLead={(lead) => {
            setSelectedDay(null);
            setDrawerLead(lead);
            setDrawerOpen(true);
          }}
        />
      )}

      {/* Appointment completion receipt prompt */}
      {receiptPromptApt && (
        <AppointmentReceiptPrompt
          appointmentLabel={`${receiptPromptApt.patient_name} — ${format(new Date(receiptPromptApt.datetime), 'HH:mm')}`}
          onIssue={() => handleIssueReceiptFromPrompt(receiptPromptApt)}
          onDismiss={() => setReceiptPromptApt(null)}
        />
      )}

      {/* Receipt modal from completion prompt */}
      {receiptModalApt && billingSettings && billingSettings !== 'loading' && billingSettings !== 'none' && (
        <CreateDocumentModal
          settings={billingSettings}
          appointmentId={receiptModalApt.id}
          appointmentLabel={`${receiptModalApt.patient_name} — ${format(new Date(receiptModalApt.datetime), 'HH:mm')}`}
          prefillCustomerName={receiptModalApt.patient_name}
          prefillServiceName={receiptModalApt.service_name ?? undefined}
          prefillPrice={receiptModalApt.revenue ?? undefined}
          fromAppointment
          onClose={handleCloseReceiptModal}
          onIssued={handleCloseReceiptModal}
        />
      )}

      {/* New Appointment Form */}
      {showNewForm && (
        <NewAppointmentForm
          prefillDate={prefillDate}
          prefillTime={prefillTime}
          onClose={() => setShowNewForm(false)}
          onSuccess={(apt) => {
            setAppointments((prev) => [...prev, apt]);
            setShowNewForm(false);
          }}
        />
      )}

      {/* Delete confirmation dialog */}
      {pendingDeleteApt && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setPendingDeleteApt(null)} aria-hidden="true" />
          <div className="modal-enter relative w-full max-w-xs rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 p-5 shadow-xl text-right" dir="rtl">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div className="min-w-0">
                <p className="text-[15px] font-semibold text-slate-900 dark:text-slate-50">מחיקת תור</p>
                <p className="text-[13px] text-slate-500 dark:text-slate-400 truncate">
                  {pendingDeleteApt.patient_name} · {format(new Date(pendingDeleteApt.datetime), 'HH:mm')}
                </p>
              </div>
            </div>
            <p className="text-[13px] text-slate-600 dark:text-slate-400 mb-4">
              התור יימחק לצמיתות. פעולה זו אינה ניתנת לביטול.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleConfirmDelete}
                disabled={deleteLoading}
                className="flex-1 h-9 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[13px] font-semibold transition-colors disabled:opacity-60"
              >
                {deleteLoading ? 'מוחק…' : 'מחק תור'}
              </button>
              <button
                onClick={() => setPendingDeleteApt(null)}
                disabled={deleteLoading}
                className="flex-1 h-9 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[13px] font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
