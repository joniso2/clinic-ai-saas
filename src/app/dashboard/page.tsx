import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import { getEffectiveClinicId } from '@/lib/auth-server';
import DashboardClient from './DashboardClient';
import { headers } from 'next/headers';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Resolve clinicId on server — skips client-side auth waterfall
  const headersList = await headers();
  const fakeReq = new Request('http://localhost', { headers: headersList });
  const clinicId = await getEffectiveClinicId(fakeReq);

  return <DashboardClient serverClinicId={clinicId} />;
}
