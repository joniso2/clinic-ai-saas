'use client';

import { useSearchParams } from 'next/navigation';
import { CalendarView } from '@/components/calendar/CalendarView';

export function CalendarPageClient({ serverClinicId }: { serverClinicId?: string | null }) {
  const searchParams = useSearchParams();
  const dateParam = searchParams.get('date'); // YYYY-MM-DD

  return (
    <div className="-mx-4 -mt-5 md:-mx-8 md:-mt-8 md:pb-0 pb-0">
      <CalendarView initialDate={dateParam ?? undefined} clinicId={serverClinicId ?? null} />
    </div>
  );
}
