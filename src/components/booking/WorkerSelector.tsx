import { User } from 'lucide-react';
import type { ClinicWorker } from '@/types/booking';

interface Props {
  workers: ClinicWorker[];
  onSelect: (worker: ClinicWorker) => void;
  selectedId?: string;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

const AVATAR_COLORS = [
  'bg-indigo-100 text-indigo-700',
  'bg-purple-100 text-purple-700',
  'bg-sky-100 text-sky-700',
  'bg-emerald-100 text-emerald-700',
  'bg-rose-100 text-rose-700',
  'bg-amber-100 text-amber-700',
];

export function WorkerSelector({ workers, onSelect, selectedId }: Props) {
  return (
    <div className="px-4 pt-5 pb-4">
      <h2 className="text-lg font-bold text-gray-800 mb-4">בחר מטפל</h2>
      <div className="grid grid-cols-2 gap-3">
        {workers.map((worker, idx) => {
          const isSelected = selectedId === worker.id;
          const colorClass = AVATAR_COLORS[idx % AVATAR_COLORS.length];

          return (
            <button
              key={worker.id}
              onClick={() => onSelect(worker)}
              className={`flex flex-col items-center gap-3 p-5 rounded-2xl border transition-all duration-150 active:scale-[0.97] touch-manipulation
                ${
                  isSelected
                    ? 'border-indigo-500 bg-indigo-50 shadow-md shadow-indigo-100'
                    : 'border-gray-200 bg-white hover:border-indigo-300 hover:shadow-md'
                }
              `}
            >
              <div
                className={`w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold ${colorClass}`}
              >
                {getInitials(worker.name) || <User className="w-6 h-6" />}
              </div>
              <span className="font-medium text-gray-800 text-sm text-center leading-tight">
                {worker.name}
              </span>
              {isSelected && (
                <span className="w-2 h-2 rounded-full bg-indigo-500" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
