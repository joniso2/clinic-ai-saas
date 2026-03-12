import { notFound } from 'next/navigation';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { LandingView } from '@/components/booking/LandingView';
import { ClicaLandingClient } from '@/sites/clica/components/ClicaLandingClient';
import { CLICA_PLACEHOLDER_PRODUCTS } from '@/lib/clica-media';
import type { ClinicPageData } from '@/types/booking';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  if (slug === 'clica') {
    return { title: 'Clica – Premium Beauty & Wellness', description: 'Book your appointment. No sign-up required.' };
  }
  const supabase = getSupabaseAdmin();
  const { data: clinic } = await supabase
    .from('clinics')
    .select('name')
    .eq('slug', slug)
    .single();

  return {
    title: clinic ? `${clinic.name} – הזמנת תור` : 'הזמנת תור',
  };
}

/** When slug is "clica", render premium Clica app (hero + 3D + booking drawer). Otherwise landing + products. */
async function getClicaPageData(): Promise<ClinicPageData> {
  const supabase = getSupabaseAdmin();
  const slug = 'clica';
  const { data: clinic } = await supabase.from('clinics').select('*').eq('slug', slug).single();

  if (clinic) {
    const [
      { data: services },
      { data: workers },
      { data: workingHoursFromTable },
      { data: clinicSettings },
      { data: products },
    ] = await Promise.all([
      supabase.from('clinic_services').select('*').eq('clinic_id', clinic.id).eq('is_active', true).order('created_at'),
      supabase.from('clinic_workers').select('*').eq('clinic_id', clinic.id).eq('active', true).order('name'),
      supabase.from('working_hours').select('*').eq('clinic_id', clinic.id),
      supabase.from('clinic_settings').select('working_hours, address').eq('clinic_id', clinic.id).maybeSingle(),
      supabase.from('booking_products').select('id, name, price, image_url, description').eq('clinic_id', clinic.id).order('sort_order'),
    ]);
    const clinicWithAddress = {
      ...clinic,
      address: (clinicSettings as { address?: string } | null)?.address ?? (clinic as { address?: string }).address ?? null,
    };
    let workingHours = workingHoursFromTable ?? [];
    if (workingHours.length === 0 && clinicSettings?.working_hours?.length === 7) {
      const hours = clinicSettings.working_hours as Array<{ day: number; enabled: boolean; open: string; close: string }>;
      workingHours = hours.filter((h) => h.enabled).map((h) => ({
        id: `settings-${h.day}`,
        clinic_id: clinic.id,
        worker_id: null as string | null,
        day_of_week: h.day,
        start_time: h.open,
        end_time: h.close,
      }));
    }
    return {
      clinic: clinicWithAddress,
      services: services ?? [],
      workers: workers ?? [],
      gallery: [],
      workingHours,
      products: products ?? [],
    };
  }
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
  return {
    clinic: mockClinic,
    services: [],
    workers: [],
    gallery: [],
    workingHours: [],
    products: CLICA_PLACEHOLDER_PRODUCTS,
  };
}

/** Landing page: for "clica" → premium Clica app; else hero + CTA + products (requires clinic in DB). */
export default async function BookSlugPage({ params }: Props) {
  const { slug } = await params;

  if (slug === 'clica') {
    const data = await getClicaPageData();
    return <ClicaLandingClient data={data} />;
  }

  const supabase = getSupabaseAdmin();
  const { data: clinic } = await supabase
    .from('clinics')
    .select('id, name, slug, logo_url, hero_image, hero_video, address, phone')
    .eq('slug', slug)
    .single();

  if (!clinic) notFound();

  const { data: products } = await supabase
    .from('booking_products')
    .select('id, name, price, image_url, description')
    .eq('clinic_id', clinic.id)
    .order('sort_order');

  return (
    <LandingView
      clinic={clinic}
      products={products ?? []}
      slug={slug}
    />
  );
}
