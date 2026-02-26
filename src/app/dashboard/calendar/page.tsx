import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import { CalendarPageClient } from './CalendarPageClient';

export const dynamic = 'force-dynamic';

export default async function CalendarPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  return <CalendarPageClient />;
}
