'use client';

import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { ClicaHero } from './ClicaHero';
import { ClicaBookingDrawer } from './ClicaBookingDrawer';
import { ShopCarousel } from './ShopCarousel';
import type { ClinicPageData } from '@/types/booking';

interface ClicaLandingClientProps {
  data: ClinicPageData;
}

export function ClicaLandingClient({ data }: ClicaLandingClientProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { clinic, services, workers, workingHours, products } = data;

  return (
    <div className="min-h-screen bg-neutral-950" dir="rtl">
      <ClicaHero
        heroVideoUrl={clinic.hero_video}
        heroImageUrl={clinic.hero_image}
        hero3DSlotImageUrl={clinic.hero_3d_slot_image_url}
        onBookClick={() => setDrawerOpen(true)}
      />
      <ShopCarousel products={products} />
      <AnimatePresence>
        <ClicaBookingDrawer
          isOpen={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          clinic={clinic}
          services={services}
          workers={workers}
          workingHours={workingHours}
        />
      </AnimatePresence>
    </div>
  );
}
