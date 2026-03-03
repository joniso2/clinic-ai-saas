import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import { SuperAdminCustomersClient } from '@/components/super-admin/customers/SuperAdminCustomersClient';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ id: string }> };

export default async function SuperAdminClinicCustomersPage({ params }: Props) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: roleRow } = await supabase
    .from('clinic_users')
    .select('role')
    .eq('user_id', user.id)
    .eq('role', 'SUPER_ADMIN')
    .maybeSingle();
  if (!roleRow) redirect('/dashboard');

  const { id: clinicId } = await params;
  const { data: clinic } = await supabase
    .from('clinics')
    .select('id, name')
    .eq('id', clinicId)
    .maybeSingle();
  if (!clinic) redirect('/dashboard/super-admin');

  return (
    <SuperAdminCustomersClient
      clinicId={clinic.id}
      clinicName={clinic.name ?? 'קליניקה'}
    />
  );
}
