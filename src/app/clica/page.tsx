import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { ClicaLandingClient } from '@/components/clica/ClicaLandingClient';
import { CLICA_PLACEHOLDER_PRODUCTS } from '@/lib/clica-media';
import type { ClinicPageData } from '@/types/booking';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Clica – Premium Beauty & Wellness',
  description: 'Book your appointment. No sign-up required.',
};

/** Clica premium client-facing app: hero with video + 3D, booking drawer, shop carousel. */
export default async function ClicaPage() {
  const supabase = getSupabaseAdmin();
  const slug = 'clica';

  const { data: clinic } = await supabase
    .from('clinics')
    .select('*')
    .eq('slug', slug)
    .single();

  let data: ClinicPageData;

  if (clinic) {
    const [
      { data: services },
      { data: workers },
      { data: workingHoursFromTable },
      { data: clinicSettings },
      { data: products },
    ] = await Promise.all([
      supabase
        .from('clinic_services')
        .select('*')
        .eq('clinic_id', clinic.id)
        .eq('is_active', true)
        .order('created_at'),
      supabase
        .from('clinic_workers')
        .select('*')
        .eq('clinic_id', clinic.id)
        .eq('active', true)
        .order('name'),
      supabase.from('working_hours').select('*').eq('clinic_id', clinic.id),
      supabase
        .from('clinic_settings')
        .select('working_hours, address')
        .eq('clinic_id', clinic.id)
        .maybeSingle(),
      supabase
        .from('booking_products')
        .select('id, name, price, image_url, description')
        .eq('clinic_id', clinic.id)
        .order('sort_order'),
    ]);

    const clinicWithAddress = {
      ...clinic,
      address:
        (clinicSettings as { address?: string } | null)?.address ??
        (clinic as { address?: string }).address ??
        null,
    };

    let workingHours = workingHoursFromTable ?? [];
    if (workingHours.length === 0 && clinicSettings?.working_hours?.length === 7) {
      const hours = clinicSettings.working_hours as Array<{
        day: number;
        enabled: boolean;
        open: string;
        close: string;
      }>;
      workingHours = hours
        .filter((h) => h.enabled)
        .map((h) => ({
          id: `settings-${h.day}`,
          clinic_id: clinic.id,
          worker_id: null as string | null,
          day_of_week: h.day,
          start_time: h.open,
          end_time: h.close,
        }));
    }

    data = {
      clinic: clinicWithAddress,
      services: services ?? [],
      workers: workers ?? [],
      gallery: [],
      workingHours,
      products: products ?? [],
    };
  } else {
    const mockClinic = {
      id: 'clica-mock',
      name: 'Clica',
      slug: 'clica',
      logo_url: null as string | null,
      hero_image: null as string | null,
      hero_video: null as string | null,
      address: null as string | null,
      lat: null as number | null,
      lng: null as number | null,
      phone: null as string | null,
      created_at: new Date().toISOString(),
    };
    data = {
      clinic: mockClinic,
      services: [],
      workers: [],
      gallery: [],
      workingHours: [],
      products: CLICA_PLACEHOLDER_PRODUCTS,
    };
  }

  return <ClicaLandingClient data={data} />;
}
