import { redirect } from 'next/navigation';
import { getClinicUser } from '@/lib/auth-server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { BookingSitePageClient } from '@/components/super-admin/booking-site/BookingSitePageClient';

export const dynamic = 'force-dynamic';

export default async function BookingSitePage() {
  const row = await getClinicUser();
  if (!row || row.role !== 'SUPER_ADMIN') redirect('/dashboard');

  const supabase = getSupabaseAdmin();
  const { data: allServices, error } = await supabase
    .from('clinic_services')
    .select('id, clinic_id, service_name, price, duration_minutes, is_active')
    .order('service_name');

  type ServiceRow = { id: string; clinic_id: string; service_name: string; price: number; duration_minutes: number; description?: string | null; is_active: boolean };
  const servicesByClinic: Record<string, ServiceRow[]> = {};
  const initialServicesList: { clinicId: string; services: ServiceRow[] }[] = [];
  if (!error && allServices && allServices.length > 0) {
    for (const s of allServices) {
      const cid = String(s.clinic_id);
      if (!servicesByClinic[cid]) servicesByClinic[cid] = [];
      servicesByClinic[cid].push(s);
    }
    for (const [cid, list] of Object.entries(servicesByClinic)) {
      initialServicesList.push({ clinicId: cid, services: list });
    }
  }

  const totalServices = initialServicesList.reduce((sum, x) => sum + x.services.length, 0);

  return (
    <div dir="rtl" className="min-h-full">
      <BookingSitePageClient
        initialServicesByClinic={servicesByClinic}
        initialServicesList={initialServicesList}
        initialServicesMeta={{ clinicCount: initialServicesList.length, totalServices, error: error?.message ?? null }}
      />
    </div>
  );
}
