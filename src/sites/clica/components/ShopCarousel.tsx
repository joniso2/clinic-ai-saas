'use client';

import { useRef } from 'react';
import { motion } from 'framer-motion';
import type { BookingProduct } from '@/types/booking';

interface ShopCarouselProps {
  products: BookingProduct[];
}

export function ShopCarousel({ products }: ShopCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  if (products.length === 0) return null;

  return (
    <section className="bg-neutral-50 py-14 px-4" dir="rtl">
      <div className="mx-auto max-w-2xl">
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-400"
        >
          Shop
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.05 }}
          className="mt-1 text-2xl font-light tracking-tight text-neutral-900 sm:text-3xl"
        >
          מוצרים מובילים
        </motion.h2>

        <div
          ref={scrollRef}
          className="mt-6 flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory scrollbar-hide"
        >
          {products.map((p, i) => (
            <motion.article
              key={p.id}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05, duration: 0.35 }}
              className="flex-shrink-0 w-[180px] snap-start rounded-2xl overflow-hidden bg-white border border-neutral-100 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="aspect-square bg-neutral-100">
                {p.image_url ? (
                  <img
                    src={p.image_url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-neutral-300 text-3xl">
                    —
                  </div>
                )}
              </div>
              <div className="p-4">
                <p className="font-medium text-neutral-900 text-sm line-clamp-2">
                  {p.name}
                </p>
                <p className="mt-1 text-amber-700 font-semibold text-sm">
                  {p.price != null ? `₪${p.price.toLocaleString('he-IL')}` : '—'}
                </p>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
