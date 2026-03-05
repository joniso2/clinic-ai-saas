import { Clock } from 'lucide-react';
import type { ClinicService } from '@/types/booking';

interface Props {
  services: ClinicService[];
  onSelect: (service: ClinicService) => void;
  selectedId?: string;
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} דקות`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h} שעה ${m} דקות` : `${h} שעה`;
}

function formatPrice(price: number | null): string {
  if (price == null) return '';
  return `₪${price.toLocaleString('he-IL')}`;
}

export function ServiceList({ services, onSelect, selectedId }: Props) {
  if (services.length === 0) {
    return (
      <div className="py-12 text-center text-gray-500">
        <p className="text-lg">אין שירותים זמינים כרגע</p>
      </div>
    );
  }

  return (
    <div className="pt-5 pb-4">
      <h2 className="text-sm font-medium text-gray-600 mb-2">בחר שירות</h2>
      <div className="flex flex-col space-y-2">
        {services.map((service) => {
          const isSelected = selectedId === service.id;
          return (
            <button
              key={service.id}
              type="button"
              onClick={() => onSelect(service)}
              className={`w-full rounded-full overflow-hidden flex flex-row-reverse transition-all duration-150 active:scale-[0.98] cursor-pointer touch-manipulation text-right
                ${isSelected
                  ? 'ring-2 ring-indigo-500 ring-offset-1'
                  : 'shadow-sm'}
              `}
            >
              <div className="bg-black text-white font-semibold text-sm px-3 py-2 flex items-center justify-center flex-shrink-0 rounded-s-full min-w-[3.5rem]">
                {service.price != null ? formatPrice(service.price) : '—'}
              </div>
              <div className="flex-1 min-w-0 px-3 py-2 border border-gray-200 border-e-0 bg-white hover:bg-gray-50 rounded-e-full">
                <p className="font-semibold text-sm text-gray-900 truncate">
                  {service.service_name}
                </p>
                <div className="flex items-center justify-end gap-1 mt-px text-xs text-gray-500">
                  <Clock className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  <span>{formatDuration(service.duration_minutes)}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
