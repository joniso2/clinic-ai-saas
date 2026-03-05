import { notFound } from 'next/navigation';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { LandingView } from '@/components/booking/LandingView';

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
    title: clinic ? `${clinic.name} – הזמנת תור` : 'הזמנת תור',
  };
}

/** Landing page only: hero + CTA (navigates to /book/[slug]/booking) + Leading Products. No services. */
export default async function BookSlugPage({ params }: Props) {
  const { slug } = await params;
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
