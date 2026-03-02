import { redirect } from 'next/navigation';
import { getClinicUser } from '@/lib/auth-server';

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const row = await getClinicUser();
  if (!row || row.role !== 'SUPER_ADMIN') {
    redirect('/dashboard');
  }
  return <>{children}</>;
}
