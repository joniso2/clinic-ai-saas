import { getClinicUser, getSessionUser } from '@/lib/auth-server';
import { DashboardLayoutClient } from './DashboardLayoutClient';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [clinicUser, sessionUser] = await Promise.all([
    getClinicUser(),
    getSessionUser(),
  ]);
  const initialRole = clinicUser?.role ?? null;
  const initialUserEmail = sessionUser?.email ?? null;

  return (
    <DashboardLayoutClient
      initialRole={initialRole}
      initialUserEmail={initialUserEmail}
    >
      {children}
    </DashboardLayoutClient>
  );
}
