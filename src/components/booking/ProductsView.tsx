import type { BookingProduct } from '@/types/booking';

interface Props {
  products: BookingProduct[];
}

export function ProductsView({ products }: Props) {
  if (!products.length) {
    return (
      <div className="max-w-md mx-auto px-4 py-8 pb-24 text-center" dir="rtl">
        <p className="text-gray-500 text-sm">אין מוצרים להצגה</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-4 pb-24" dir="rtl">
      <div className="grid grid-cols-2 gap-3">
        {products.map((p) => (
          <div
            key={p.id}
            className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm flex flex-col"
          >
            <div className="aspect-square bg-gray-100 flex items-center justify-center">
              {p.image_url ? (
                <img src={p.image_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-gray-300 text-4xl">📦</span>
              )}
            </div>
            <div className="p-3 flex flex-col flex-1">
              <p className="font-semibold text-gray-900 text-sm truncate">{p.name}</p>
              {p.description ? (
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{p.description}</p>
              ) : null}
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="font-semibold text-indigo-600">
                  {p.price != null ? `₪${p.price}` : '—'}
                </span>
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-full bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700 active:scale-[0.98] transition-colors touch-manipulation"
                >
                  קנה
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
