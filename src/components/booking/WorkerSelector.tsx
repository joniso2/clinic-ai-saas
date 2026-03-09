'use client';

import { motion } from 'framer-motion';
import type { ClinicWorker } from '@/types/booking';

interface Props {
  workers: ClinicWorker[];
  onSelect: (worker: ClinicWorker) => void;
  selectedId?: string;
}

export function WorkerSelector({ workers, onSelect, selectedId }: Props) {
  return (
    <div className="px-4 pt-5 pb-4">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-5">בחר מטפל</h2>
      <div className="flex flex-col gap-3">
        {workers.map((worker, i) => {
          const isSelected = selectedId === worker.id;
          return (
            <motion.button
              key={worker.id}
              onClick={() => onSelect(worker)}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.3 }}
              className={`w-full rounded-2xl px-5 py-4 text-right transition-all duration-200 active:scale-[0.99] touch-manipulation
                shadow-[0_1px_3px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]
                ${isSelected
                  ? 'border-2 border-indigo-500 bg-indigo-50/50'
                  : 'border border-slate-100 bg-white hover:border-slate-200'
                }`}
            >
              <span className="font-semibold text-slate-900 text-base tracking-tight block">
                {worker.name}
              </span>
              {isSelected && (
                <span className="mt-1 inline-block text-xs font-medium text-indigo-600">נבחר</span>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
