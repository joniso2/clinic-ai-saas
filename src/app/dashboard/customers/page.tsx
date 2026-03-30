import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import { CustomersTab } from '@/components/dashboard/customers/CustomersTab';

export const dynamic = 'force-dynamic';

export default async function CustomersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return <CustomersTab />;
}
