import type { Clinic } from '@/types/booking';

interface Props {
  clinic: Pick<Clinic, 'name' | 'address' | 'phone'>;
}

export function TeamView({ clinic }: Props) {
  return (
    <div className="max-w-md mx-auto px-4 py-4 pb-24" dir="rtl">
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="font-semibold text-gray-900 text-base mb-2">אודות</h2>
        <p className="text-gray-600 text-sm leading-relaxed">
          {clinic.name}
          {clinic.address && (
            <>
              <br />
              {clinic.address}
            </>
          )}
          {clinic.phone && (
            <>
              <br />
              <a href={`tel:${clinic.phone}`} className="text-indigo-600 underline">
                {clinic.phone}
              </a>
            </>
          )}
        </p>
        <p className="text-gray-500 text-sm mt-3">
          פרטי צוות והמשך תיאור יופיעו כאן בעתיד.
        </p>
      </div>
    </div>
  );
}
