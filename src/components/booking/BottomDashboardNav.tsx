'use client';

import { Calendar, Image, ShoppingBag, Users } from 'lucide-react';
import type { Clinic } from '@/types/booking';

export type DashboardTab = 'booking' | 'gallery' | 'products' | 'team';

interface Props {
  activeTab: DashboardTab;
  onTabChange: (tab: DashboardTab) => void;
  clinic: Pick<Clinic, 'logo_url' | 'name'>;
}

const TABS: { tab: DashboardTab; label: string; icon: typeof Calendar }[] = [
  { tab: 'gallery', label: 'גלריה', icon: Image },
  { tab: 'products', label: 'מוצרים', icon: ShoppingBag },
  { tab: 'team', label: 'צוות', icon: Users },
  { tab: 'booking', label: 'תור', icon: Calendar },
];

export function BottomDashboardNav({ activeTab, onTabChange, clinic }: Props) {
  const leftTabs = TABS.slice(0, 2);
  const rightTabs = TABS.slice(2, 4);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 h-[70px] backdrop-blur bg-black/80 rounded-t-2xl shadow-lg flex items-center justify-between gap-0 px-1 pb-safe"
      dir="rtl"
      aria-label="ניווט"
    >
      <div className="flex items-center justify-end flex-1 min-w-0 gap-0.5">
        {leftTabs.map(({ tab, label, icon: Icon }) => (
          <button
            key={tab}
            type="button"
            onClick={() => onTabChange(tab)}
            className={`flex flex-col items-center justify-center flex-1 min-w-0 py-2 gap-0.5 rounded-xl transition-colors touch-manipulation max-w-[72px]
              ${activeTab === tab ? 'text-white' : 'text-white/60 hover:text-white/80'}`}
            aria-pressed={activeTab === tab}
            aria-label={label}
          >
            <Icon className="w-5 h-5 shrink-0" strokeWidth={2} />
            <span className="text-[10px] font-medium truncate max-w-full">{label}</span>
          </button>
        ))}
      </div>

      <div className="flex-shrink-0 w-12 h-12 -mt-6 rounded-full shadow-lg border-2 border-white/20 bg-gray-800 overflow-hidden flex items-center justify-center mx-0.5">
        {clinic.logo_url?.trim() ? (
          <img
            src={clinic.logo_url}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-white text-lg font-semibold">
            {(clinic.name ?? 'ק').charAt(0)}
          </span>
        )}
      </div>

      <div className="flex items-center justify-start flex-1 min-w-0 gap-0.5">
        {rightTabs.map(({ tab, label, icon: Icon }) => (
          <button
            key={tab}
            type="button"
            onClick={() => onTabChange(tab)}
            className={`flex flex-col items-center justify-center flex-1 min-w-0 py-2 gap-0.5 rounded-xl transition-colors touch-manipulation max-w-[72px]
              ${activeTab === tab ? 'text-white' : 'text-white/60 hover:text-white/80'}`}
            aria-pressed={activeTab === tab}
            aria-label={label}
          >
            <Icon className="w-5 h-5 shrink-0" strokeWidth={2} />
            <span className="text-[10px] font-medium truncate max-w-full">{label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
