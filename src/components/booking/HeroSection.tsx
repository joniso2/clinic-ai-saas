'use client';

import { MapPin, Building2 } from 'lucide-react';
import type { Clinic } from '@/types/booking';

interface Props {
  clinic: Clinic;
  onBookClick?: () => void;
}

export function HeroSection({ clinic, onBookClick }: Props) {
  const hasHeroVideo = Boolean(clinic.hero_video?.trim());
  const hasHeroImage = Boolean(clinic.hero_image?.trim());
  const hasName = Boolean(clinic.name?.trim());
  const hasAddress = Boolean(clinic.address?.trim());
  const greeting = hasName ? `ברוכים הבאים ל־${clinic.name}` : 'ברוכים הבאים';

  return (
    <div className="relative w-full overflow-hidden bg-neutral-900">
      {/* Full-width hero media: video first, then image fallback */}
      <div className="relative aspect-[4/5] min-h-[70vh] max-h-[85vh] w-full sm:aspect-video sm:min-h-[420px] sm:max-h-[55vh]">
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
            <div className="relative flex items-center justify-center">
              <div className="rounded-2xl bg-white/5 p-6 ring-1 ring-white/10 backdrop-blur-sm">
                <Building2 className="h-14 w-14 text-white/40" strokeWidth={1.2} />
              </div>
            </div>
          </div>
        )}
        {/* Gradient overlay for readability */}
        <div
          className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"
          aria-hidden
        />
        {/* Logo (top corner) */}
        {clinic.logo_url?.trim() && (
          <div className="absolute top-4 right-4 z-10 h-12 w-12 overflow-hidden rounded-xl shadow-lg ring-2 ring-white/30 sm:right-5 sm:h-14 sm:w-14">
            <img src={clinic.logo_url} alt="" className="h-full w-full object-cover" />
          </div>
        )}
        {/* CTA + greeting floating over bottom of hero */}
        <div className="absolute bottom-0 left-0 right-0 z-10 px-5 pb-6 pt-12 sm:pb-8 sm:pt-16">
          <p className="text-sm font-medium text-white/95 sm:text-base">{greeting}</p>
          <button
            type="button"
            onClick={onBookClick ?? undefined}
            className="mt-3 w-full rounded-xl bg-white py-3.5 text-base font-semibold text-neutral-900 shadow-lg transition-all hover:bg-white/95 active:scale-[0.98] sm:max-w-[280px] sm:rounded-2xl sm:py-4 sm:text-lg"
          >
            הזמנת תור
          </button>
        </div>
      </div>

      {/* About / Clinic info — elegant card below hero */}
      <div className="border-t border-white/10 bg-white px-5 py-5 shadow-[0_-4px_24px_rgba(0,0,0,0.06)] sm:py-6">
        <div className="mx-auto max-w-md text-right">
          {hasName && (
            <h1 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">
              {clinic.name}
            </h1>
          )}
          {hasAddress && (
            <div className="mt-2 flex items-center justify-end gap-1.5 text-gray-500">
              <MapPin className="h-4 w-4 shrink-0 text-gray-400" />
              <span className="text-sm leading-relaxed">{clinic.address}</span>
            </div>
          )}
          {!hasName && !hasAddress && (
            <p className="text-sm text-gray-400">הגדר שם וכתובת בהגדרות</p>
          )}
        </div>
      </div>
    </div>
  );
}
