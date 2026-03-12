'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { CLICA_HERO_VIDEO, CLICA_HERO_IMAGE_FALLBACK } from '@/lib/clica-media';

interface ClicaHeroProps {
  heroVideoUrl?: string | null;
  heroImageUrl?: string | null;
  /** Optional: image for the top-left corner (logo or accent). When set, shows there; otherwise the corner is empty. */
  hero3DSlotImageUrl?: string | null;
  onBookClick: () => void;
}

export function ClicaHero({ heroVideoUrl, heroImageUrl, hero3DSlotImageUrl, onBookClick }: ClicaHeroProps) {
  const videoSrc = heroVideoUrl?.trim() || CLICA_HERO_VIDEO;
  const imageSrc = heroImageUrl?.trim() || CLICA_HERO_IMAGE_FALLBACK;
  const [videoError, setVideoError] = useState(false);
  const useVideo = !videoError;

  return (
    <section className="relative min-h-[100dvh] w-full overflow-hidden bg-neutral-950">
      {/* Background media */}
      <div className="absolute inset-0">
        {useVideo ? (
          <video
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 h-full w-full object-cover"
            src={videoSrc}
            onError={() => setVideoError(true)}
          />
        ) : imageSrc ? (
          <img
            src={imageSrc}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-neutral-900" />
        )}
        {/* Gradient overlay */}
        <div
          className="absolute inset-0 z-[1]"
          style={{
            background:
              'linear-gradient(to top, rgba(10,10,10,0.92) 0%, transparent 45%, rgba(0,0,0,0.4) 100%)',
          }}
          aria-hidden
        />
      </div>

      {/* Top-left slot: only when you set an image URL in dashboard (Settings → Landing hero media) */}
      {hero3DSlotImageUrl?.trim() ? (
        <div className="absolute inset-0 z-[2] pointer-events-none">
          <div className="absolute top-[18%] left-[8%] w-[140px] h-[140px] sm:w-[200px] sm:h-[200px] rounded-full overflow-hidden">
            <img src={hero3DSlotImageUrl} alt="" className="w-full h-full object-cover" />
          </div>
        </div>
      ) : null}

      {/* Content */}
      <div className="absolute inset-0 z-10 flex flex-col justify-end px-6 pb-12 pt-20 sm:pb-16 sm:pt-24">
        <div className="mx-auto w-full max-w-md text-center">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="text-xs font-medium uppercase tracking-[0.35em] text-amber-200/90"
          >
            Premium Beauty & Wellness
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.5 }}
            className="mt-2 text-4xl font-light tracking-tight text-white drop-shadow-lg sm:text-5xl"
          >
            Clica
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="mt-2 text-sm text-white/80"
          >
            הזמנת תור — ללא הרשמה
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.4 }}
            className="mt-8 flex justify-center"
          >
            <button
              type="button"
              onClick={onBookClick}
              className="group relative rounded-full bg-white px-10 py-4 text-base font-semibold text-neutral-900 shadow-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl active:scale-[0.98]"
            >
              <span className="relative z-10">Book Appointment</span>
              <span className="absolute inset-0 rounded-full bg-amber-100 opacity-0 transition-opacity group-hover:opacity-20" />
            </button>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
