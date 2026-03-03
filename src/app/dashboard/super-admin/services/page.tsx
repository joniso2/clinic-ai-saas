import { redirect } from 'next/navigation';

/** Route /dashboard/super-admin/services — show Section 9 in shell (hash). Layout enforces SUPER_ADMIN. */
export default function SuperAdminServicesPage() {
  redirect('/dashboard/super-admin#services');
}
