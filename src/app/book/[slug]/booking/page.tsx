import { notFound } from 'next/navigation';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { BookingFlow } from '../BookingFlow';
import { BookingPageTransition } from './BookingPageTransition';
import type { ClinicPageData } from '@/types/booking';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const supabase = getSupabaseAdmin();
  const { data: clinic } = await supabase
    .from('clinics')
    .select('name')
    .eq('slug', slug)
    .single();

  return {
    title: clinic ? `הזמנת תור – ${clinic.name}` : 'הזמנת תור',
  };
}

/** Booking flow only: services list → worker → date → time → phone → OTP → success. No landing hero. */
export default async function BookingFlowPage({ params }: Props) {
  const { slug } = await params;
  const supabase = getSupabaseAdmin();

  const { data: clinic } = await supabase
    .from('clinics')
    .select('*')
    .eq('slug', slug)
    .single();

  if (!clinic) notFound();

  const [
    { data: services },
    { data: workers },
    { data: gallery },
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
    supabase
      .from('clinic_gallery_images')
      .select('*')
      .eq('clinic_id', clinic.id)
      .order('sort_order'),
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

  const data: ClinicPageData = {
    clinic: clinicWithAddress,
    services: services ?? [],
    workers: workers ?? [],
    gallery: gallery ?? [],
    workingHours,
    products: products ?? [],
  };

  return (
    <BookingPageTransition>
      <BookingFlow data={data} />
    </BookingPageTransition>
  );
}
