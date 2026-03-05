'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import type { GalleryImage } from '@/types/booking';

function isVideoUrl(url: string) {
  return /\.(mp4|webm|mov)(\?|$)/i.test(url);
}

function GalleryVideo({ src, className }: { src: string; className?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) el.play().catch(() => {});
        else el.pause();
      },
      { rootMargin: '50px', threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <video
      ref={videoRef}
      src={src}
      autoPlay
      loop
      muted
      playsInline
      className={className}
    />
  );
}

interface Props {
  images: GalleryImage[];
}

export function GalleryView({ images }: Props) {
  const [preview, setPreview] = useState<string | null>(null);

  const open = useCallback((url: string) => setPreview(url), []);
  const close = useCallback(() => setPreview(null), []);

  if (images.length === 0) {
    return (
      <div className="py-16 text-center text-gray-500" dir="rtl">
        <p className="text-base">אין תמונות או סרטונים בגלריה</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto w-full p-0 pb-24" dir="rtl">
      <div className="grid grid-cols-2 gap-0 p-0 m-0">
        {images.map((img) => {
          const video = isVideoUrl(img.image_url);
          return (
            <button
              key={img.id}
              type="button"
              onClick={() => open(img.image_url)}
              className="aspect-square overflow-hidden relative w-full min-w-0 bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 touch-manipulation block m-0"
            >
              {video ? (
                <GalleryVideo src={img.image_url} className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <img src={img.image_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
              )}
            </button>
          );
        })}
      </div>

      {preview !== null && (
        <div
          className="fixed inset-0 z-50 bg-black flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="תצוגה מלאה"
        >
          <button
            type="button"
            onClick={close}
            className="absolute top-4 left-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors z-10 touch-manipulation"
            aria-label="סגור"
          >
            <X className="w-6 h-6" />
          </button>
          {isVideoUrl(preview) ? (
            <video src={preview} controls className="max-w-full max-h-full object-contain" playsInline />
          ) : (
            <img src={preview} alt="" className="max-w-full max-h-full object-contain" />
          )}
        </div>
      )}
    </div>
  );
}
