'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Building2, MapPin, Phone } from 'lucide-react';
import type { Clinic } from '@/types/booking';
import type { BookingProduct } from '@/types/booking';

const PAGE_BG = '#FAFAFA';

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
};

interface Props {
  clinic: Clinic;
  products: BookingProduct[];
  slug: string;
}

export function LandingView({ clinic, products, slug }: Props) {
  const router = useRouter();
  const hasHeroVideo = Boolean(clinic.hero_video?.trim());
  const hasHeroImage = Boolean(clinic.hero_image?.trim());
  const hasLogo = Boolean(clinic.logo_url?.trim());
  const clinicName = clinic.name?.trim() || 'LULU';
  const hasAddress = Boolean(clinic.address?.trim());
  const hasPhone = Boolean(clinic.phone?.trim());

  const goToBooking = () => {
    router.push(`/book/${slug}/booking`);
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA]" dir="rtl" style={{ backgroundColor: PAGE_BG }}>
      {/* ─── Hero: full viewport, video, gradient overlay ─── */}
      <section className="relative min-h-[85vh] w-full overflow-hidden">
        {hasHeroVideo ? (
          <video
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 h-full w-full object-cover"
            src={clinic.hero_video!}
          />
        ) : hasHeroImage ? (
          <img
            src={clinic.hero_image!}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-neutral-900">
            <div
              className="absolute inset-0 opacity-[0.06]"
              style={{
                backgroundImage: `linear-gradient(rgba(255,255,255,.08) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(255,255,255,.08) 1px, transparent 1px)`,
                backgroundSize: '24px 24px',
              }}
            />
            <div className="relative">
              <div className="rounded-2xl bg-white/5 p-6 ring-1 ring-white/10 backdrop-blur-sm">
                <Building2 className="h-14 w-14 text-white/40" strokeWidth={1.2} />
              </div>
            </div>
          </div>
        )}

        {/* Sophisticated gradient: legible text + seamless blend into page */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `linear-gradient(to top, ${PAGE_BG} 0%, ${PAGE_BG} 12%, transparent 40%, rgba(0,0,0,0.35) 100%)`,
          }}
          aria-hidden
        />

        {/* Content over video: logo/name + compact CTA */}
        <div className="absolute inset-0 flex flex-col items-center justify-end px-5 pb-12 pt-16">
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            {hasLogo ? (
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden shadow-2xl ring-2 ring-white/20">
                <img src={clinic.logo_url!} alt={clinicName} className="w-full h-full object-cover" />
              </div>
            ) : null}
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-white drop-shadow-lg sm:text-3xl">
              {clinicName}
            </h1>
            <p className="mt-1 text-sm text-white/90 drop-shadow">ברוכים הבאים</p>
          </div>

          {/* Smart CTA: elegant, not full-width block */}
          <div className="relative z-10 w-full flex justify-center">
            <motion.button
              type="button"
              onClick={goToBooking}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.35 }}
              className="rounded-2xl px-8 py-3.5 text-base font-semibold text-neutral-900
                bg-white/92 backdrop-blur-md border border-white/60
                shadow-lg shadow-black/10 hover:shadow-xl hover:bg-white transition-all duration-200
                hover:scale-[1.02] active:scale-[0.98]"
            >
              הזמנת תור
            </motion.button>
          </div>
        </div>
      </section>

      {/* ─── About the Clinic ─── */}
      <motion.section
        className="px-5 py-12 max-w-md mx-auto"
        style={{ backgroundColor: PAGE_BG }}
        initial={fadeUp.initial}
        whileInView={fadeUp.animate}
        viewport={{ once: true, margin: '-40px' }}
        transition={fadeUp.transition}
      >
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">אודות</h2>
        <h3 className="text-xl font-bold text-gray-900 tracking-tight">{clinicName}</h3>
        <p className="mt-2 text-gray-600 text-sm leading-relaxed">
          {hasAddress ? clinic.address : 'קליניקת יופי וטיפוח. הזמינו תור בנוחות מהבית.'}
        </p>
      </motion.section>

      {/* ─── Leading Products carousel ─── */}
      <motion.section
        className="px-4 py-10 pb-14"
        style={{ backgroundColor: PAGE_BG }}
        initial={fadeUp.initial}
        whileInView={fadeUp.animate}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ ...fadeUp.transition, delay: 0.05 }}
      >
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">מוצרים מובילים</h2>
        {products.length === 0 ? (
          <p className="text-sm text-gray-400">אין מוצרים להצגה</p>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory scrollbar-hide">
            {products.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, x: 12 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.04, duration: 0.3 }}
                className="flex-shrink-0 w-[172px] snap-start rounded-2xl border border-gray-100 bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="aspect-square bg-gray-50">
                  {p.image_url ? (
                    <img src={p.image_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-gray-300 text-2xl">📦</div>
                  )}
                </div>
                <div className="p-3">
                  <p className="font-semibold text-gray-900 text-sm truncate">{p.name}</p>
                  <p className="mt-0.5 text-indigo-600 font-semibold text-sm">
                    {p.price != null ? `₪${p.price}` : '—'}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.section>

      {/* ─── Footer ─── */}
      <motion.footer
        className="border-t border-gray-100 bg-white px-5 py-8"
        initial={fadeUp.initial}
        whileInView={fadeUp.animate}
        viewport={{ once: true }}
        transition={fadeUp.transition}
      >
        <div className="max-w-md mx-auto text-right space-y-3">
          {hasAddress && (
            <a
              href={`https://maps.google.com/?q=${encodeURIComponent(clinic.address!)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-end gap-2 text-gray-600 text-sm hover:text-gray-900 transition-colors"
            >
              <MapPin className="h-4 w-4 shrink-0" />
              <span>{clinic.address}</span>
            </a>
          )}
          {hasPhone && (
            <a
              href={`tel:${clinic.phone!.replace(/\s/g, '')}`}
              className="flex items-center justify-end gap-2 text-gray-600 text-sm hover:text-gray-900 transition-colors"
            >
              <Phone className="h-4 w-4 shrink-0" />
              <span>{clinic.phone}</span>
            </a>
          )}
          {!hasAddress && !hasPhone && (
            <p className="text-sm text-gray-400">פרטי התקשורת יוצגו כאן</p>
          )}
        </div>
      </motion.footer>
    </div>
  );
}
