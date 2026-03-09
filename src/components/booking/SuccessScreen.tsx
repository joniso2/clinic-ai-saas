import { CheckCircle, Calendar, Clock, User, Navigation } from 'lucide-react';
import { format, getDay, getDate, getMonth, getYear } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import type { Appointment, ClinicService, ClinicWorker, Clinic } from '@/types/booking';

const TZ = 'Asia/Jerusalem';

const HEBREW_DAYS_FULL = [
  'ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת',
];
const HEBREW_MONTHS_FULL = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
];

interface Props {
  appointment: Appointment;
  service: ClinicService;
  worker: ClinicWorker | null;
  clinic: Clinic;
}

function formatDateTime(iso: string) {
  const d = toZonedTime(new Date(iso), TZ);
  const day = HEBREW_DAYS_FULL[getDay(d)];
  const date = `${getDate(d)} ב${HEBREW_MONTHS_FULL[getMonth(d)]} ${getYear(d)}`;
  const time = format(d, 'HH:mm');
  return { day, date, time };
}

function wazeUrl(lat: number | null, lng: number | null, address: string | null): string {
  if (lat && lng) return `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
  if (address) return `https://waze.com/ul?q=${encodeURIComponent(address)}&navigate=yes`;
  return 'https://waze.com';
}

function googleMapsUrl(lat: number | null, lng: number | null, address: string | null): string {
  if (lat && lng) return `https://maps.google.com/maps?q=${lat},${lng}`;
  if (address) return `https://maps.google.com/maps?q=${encodeURIComponent(address)}`;
  return 'https://maps.google.com';
}

export function SuccessScreen({ appointment, service, worker, clinic }: Props) {
  const { day, date, time } = formatDateTime(appointment.start_time);

  const endTime = format(toZonedTime(new Date(appointment.end_time), TZ), 'HH:mm');
  const hasLocation = clinic.lat || clinic.address;

  return (
    <div className="px-4 pt-8 pb-10">
      <div className="flex flex-col items-center mb-8">
        <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mb-4">
          <CheckCircle className="w-10 h-10 text-green-500" strokeWidth={1.8} />
        </div>
        <h2 className="text-2xl font-bold text-slate-800">התור אושר!</h2>
        <p className="text-slate-500 text-sm mt-1">נשמח לראות אותך</p>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden mb-5">
        <div className="bg-indigo-600 px-5 py-4">
          <p className="text-indigo-100 text-xs font-medium">שירות</p>
          <p className="text-white text-lg font-bold mt-0.5">
            {service.service_name}
          </p>
          {service.price != null && (
            <p className="text-indigo-200 text-sm mt-0.5">
              ₪{service.price.toLocaleString('he-IL')}
            </p>
          )}
        </div>

        <div className="divide-y divide-slate-50">
          <div className="flex items-center gap-3 px-5 py-4">
            <Calendar className="w-5 h-5 text-indigo-400 flex-shrink-0" />
            <div>
              <p className="text-xs text-slate-400">תאריך</p>
              <p className="font-semibold text-slate-800">
                יום {day}, {date}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 px-5 py-4">
            <Clock className="w-5 h-5 text-indigo-400 flex-shrink-0" />
            <div>
              <p className="text-xs text-slate-400">שעה</p>
              <p className="font-semibold text-slate-800">
                {time} – {endTime}
              </p>
            </div>
          </div>

          {worker && (
            <div className="flex items-center gap-3 px-5 py-4">
              <User className="w-5 h-5 text-indigo-400 flex-shrink-0" />
              <div>
                <p className="text-xs text-slate-400">מטפל/ת</p>
                <p className="font-semibold text-slate-800">{worker.name}</p>
              </div>
            </div>
          )}

          {clinic.address && (
            <div className="flex items-center gap-3 px-5 py-4">
              <Navigation className="w-5 h-5 text-indigo-400 flex-shrink-0" />
              <div>
                <p className="text-xs text-slate-400">כתובת</p>
                <p className="font-semibold text-slate-800">{clinic.address}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {hasLocation && (
        <div className="grid grid-cols-2 gap-3">
          <a
            href={wazeUrl(clinic.lat, clinic.lng, clinic.address)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-[#05c8f7] text-white font-bold text-sm transition-all active:scale-[0.97] touch-manipulation shadow-md"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
              <path d="M20.54 6.63C19.3 4.19 16.93 2.5 14.1 2.07c-.36-.06-.73-.09-1.1-.09-4.42 0-8 3.58-8 8 0 1.48.41 2.87 1.12 4.07L4 22l8.17-2.12c1.1.57 2.36.9 3.69.9 4.42 0 8-3.58 8-8 0-2.26-.94-4.3-2.32-5.75zm-7.54 12.4c-1.2 0-2.34-.33-3.3-.9l-3.6.94.95-3.5c-.63-1-1-2.18-1-3.43 0-3.53 2.87-6.4 6.4-6.4 1.77 0 3.37.71 4.54 1.86 1.17 1.16 1.86 2.77 1.86 4.54 0 3.53-2.87 6.4-6.4 6.4zm3.5-4.8c-.19-.1-1.13-.56-1.3-.62-.18-.06-.31-.1-.44.1-.13.19-.5.62-.61.75-.11.13-.23.14-.42.05-.19-.1-.81-.3-1.54-.96-.57-.5-.96-1.12-1.07-1.31-.11-.19-.01-.29.08-.39.09-.09.19-.23.29-.35.1-.12.13-.2.19-.33.06-.14.03-.25-.02-.35-.05-.1-.44-1.07-.6-1.46-.16-.38-.32-.33-.44-.34-.11 0-.24-.01-.37-.01-.13 0-.34.05-.52.24-.18.19-.68.67-.68 1.63 0 .96.7 1.89.79 2.02.1.13 1.37 2.09 3.32 2.93.46.2.82.32 1.1.41.46.15.88.13 1.21.08.37-.06 1.13-.46 1.29-.91.16-.45.16-.84.11-.91-.05-.08-.18-.13-.37-.22z" />
            </svg>
            Waze
          </a>

          <a
            href={googleMapsUrl(clinic.lat, clinic.lng, clinic.address)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-white border-2 border-slate-200 text-slate-700 font-bold text-sm transition-all active:scale-[0.97] touch-manipulation"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5">
              <path fill="#4285F4" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
              <circle fill="white" cx="12" cy="9" r="2.5" />
            </svg>
            Google Maps
          </a>
        </div>
      )}

      <p className="text-xs text-slate-400 text-center mt-6 leading-relaxed">
        לביטול התור ניתן לפנות ישירות ל{clinic.name}
        {clinic.phone && (
          <>
            {' '}או להתקשר ל
            <a href={`tel:${clinic.phone}`} className="text-indigo-500 underline">
              {clinic.phone}
            </a>
          </>
        )}
      </p>
    </div>
  );
}
