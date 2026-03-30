import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import { getEffectiveClinicId } from '@/lib/auth-server';
import { CalendarPageClient } from './CalendarPageClient';
import { headers } from 'next/headers';

export const dynamic = 'force-dynamic';

export default async function CalendarPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // Resolve clinicId on server — skips redundant client-side auth waterfall
  const headersList = await headers();
  const fakeReq = new Request('http://localhost', { headers: headersList });
  const clinicId = await getEffectiveClinicId(fakeReq);

  return <CalendarPageClient serverClinicId={clinicId} />;
}
