'use client';

import { CalendarView } from '@/components/dashboard/CalendarView';

export function CalendarPageClient() {
  return (
    <>
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Dashboard</p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900 sm:text-3xl">Calendar</h1>
        <p className="mt-1 text-sm text-slate-500">View and manage appointments for your clinic.</p>
      </div>
      <CalendarView />
    </>
  );
}
