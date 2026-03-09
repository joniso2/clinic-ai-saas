'use client';

import { motion } from 'framer-motion';
import { Clock } from 'lucide-react';
import type { ClinicService } from '@/types/booking';

interface Props {
  services: ClinicService[];
  onSelect: (service: ClinicService) => void;
  selectedId?: string;
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} דק'`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h} שע׳ ${m} דק׳` : `${h} שע׳`;
}

function formatPrice(price: number | null): string {
  if (price == null) return '—';
  return `₪${price.toLocaleString('he-IL')}`;
}

export function ServiceList({ services, onSelect, selectedId }: Props) {
  if (services.length === 0) {
    return (
      <div className="py-12 text-center text-slate-500">
        <p className="text-lg">אין שירותים זמינים כרגע</p>
      </div>
    );
  }

  return (
    <div className="pt-6 pb-4">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-5">בחר שירות</h2>
      <div className="flex flex-col gap-3">
        {services.map((service, i) => {
          const isSelected = selectedId === service.id;
          return (
            <motion.button
              key={service.id}
              type="button"
              onClick={() => onSelect(service)}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.3 }}
              className={`w-full rounded-2xl overflow-hidden text-right transition-all duration-200 active:scale-[0.99] touch-manipulation
                shadow-[0_1px_3px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]
                ${isSelected
                  ? 'ring-2 ring-indigo-500 ring-offset-2 bg-white'
                  : 'bg-white border border-slate-100/80 hover:border-slate-200'
                }`}
            >
              <div className="flex flex-row-reverse items-center gap-4 px-5 py-4">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 text-base tracking-tight">
                    {service.service_name}
                  </p>
                  <div className="flex items-center justify-end gap-1.5 mt-1 text-sm text-slate-500">
                    <Clock className="h-4 w-4 text-slate-400 shrink-0" />
                    <span>{formatDuration(service.duration_minutes)}</span>
                  </div>
                </div>
                <div className="shrink-0 rounded-xl bg-neutral-900 px-4 py-2.5">
                  <span className="font-bold text-white text-sm">
                    {formatPrice(service.price)}
                  </span>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
