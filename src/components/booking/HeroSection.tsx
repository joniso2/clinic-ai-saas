import { MapPin, Building2 } from 'lucide-react';
import type { Clinic } from '@/types/booking';

interface Props {
  clinic: Clinic;
}

export function HeroSection({ clinic }: Props) {
  const hasHeroImage = Boolean(clinic.hero_image?.trim());
  const hasName = Boolean(clinic.name?.trim());
  const hasAddress = Boolean(clinic.address?.trim());

  return (
    <div className="rounded-b-2xl overflow-hidden bg-white shadow-sm">
      {/* תמונת רקע / פлейסהולדר */}
      <div className="relative w-full h-52 sm:h-56 overflow-hidden">
        {hasHeroImage ? (
          <img
            src={clinic.hero_image!}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 w-full h-full bg-zinc-900">
            <div
              className="absolute inset-0 opacity-[0.06]"
              style={{
                backgroundImage: `linear-gradient(rgba(255,255,255,.08) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(255,255,255,.08) 1px, transparent 1px)`,
                backgroundSize: '24px 24px',
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="rounded-2xl bg-white/5 p-6 ring-1 ring-white/10 backdrop-blur-sm">
                <Building2 className="w-14 h-14 text-white/40" strokeWidth={1.2} />
              </div>
            </div>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        {clinic.logo_url?.trim() && (
          <div className="absolute bottom-3 right-3 w-14 h-14 rounded-xl overflow-hidden shadow-lg ring-2 ring-white/30">
            <img src={clinic.logo_url} alt="" className="w-full h-full object-cover" />
          </div>
        )}
      </div>

      {/* שם העסק וכתובת מתחת לתמונה — כמו בדוגמה */}
      <div className="px-5 py-4 text-right">
        {hasName && (
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            {clinic.name}
          </h1>
        )}
        {hasAddress && (
          <div className="flex items-center gap-1.5 mt-1.5 text-gray-500 text-sm">
            <MapPin className="w-4 h-4 flex-shrink-0 text-gray-400" />
            <span className="leading-relaxed">{clinic.address}</span>
          </div>
        )}
        {!hasName && !hasAddress && (
          <p className="text-gray-400 text-sm">הגדר שם וכתובת בהגדרות</p>
        )}
      </div>
    </div>
  );
}
