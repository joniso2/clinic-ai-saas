'use client';

import { useSearchParams } from 'next/navigation';
import { CalendarView } from '@/components/dashboard/CalendarView';

export function CalendarPageClient() {
  const searchParams = useSearchParams();
  const dateParam = searchParams.get('date'); // YYYY-MM-DD

  return (
    <>
      <div className="mb-6 text-right">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-zinc-500">לוח בקרה</p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900 dark:text-zinc-100 sm:text-3xl">תורים</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">צפייה וניהול תורים במרפאה.</p>
      </div>
      <CalendarView initialDate={dateParam ?? undefined} />
    </>
  );
}
