'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { CalendarView } from '@/components/calendar/CalendarView';

export function CalendarPageClient() {
  const searchParams = useSearchParams();
  const dateParam = searchParams.get('date'); // YYYY-MM-DD
  const [clinicId, setClinicId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id || cancelled) return;
      const { data: clinicRows } = await supabase
        .from('clinic_users')
        .select('clinic_id, role')
        .eq('user_id', session.user.id);
      const rows = (Array.isArray(clinicRows) ? clinicRows : []) as { clinic_id: string | null; role?: string }[];
      const clinicRow = rows.find((r) => r?.clinic_id && r.role !== 'SUPER_ADMIN') ?? rows.find((r) => r?.clinic_id);
      const id = clinicRow?.clinic_id ?? null;
      if (!cancelled) setClinicId(id);
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="-mx-4 -mt-5 md:-mx-8 md:-mt-8 md:pb-0 pb-0">
      <CalendarView initialDate={dateParam ?? undefined} clinicId={clinicId} />
    </div>
  );
}
