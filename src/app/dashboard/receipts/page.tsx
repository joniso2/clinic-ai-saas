import { getClinicUser } from '@/lib/auth-server';
import { redirect } from 'next/navigation';
import { ReceiptsPageClient } from '@/components/billing/ReceiptsPageClient';

export default async function ReceiptsPage() {
  const row = await getClinicUser();
  if (!row?.clinic_id) redirect('/login');

  return <ReceiptsPageClient />;
}
