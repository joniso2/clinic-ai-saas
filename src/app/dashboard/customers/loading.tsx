/** Route-level skeleton for /dashboard/customers. */
export default function CustomersLoading() {
  return (
    <div className="px-4 pt-2 pb-4 space-y-4" dir="rtl">
      {/* KPI cards skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl bg-white dark:bg-slate-900 p-4 space-y-2">
            <div className="h-3 w-16 rounded animate-pulse bg-slate-100 dark:bg-slate-800/60" />
            <div className="h-6 w-12 rounded animate-pulse bg-slate-100 dark:bg-slate-800/60" />
          </div>
        ))}
      </div>

      {/* Toolbar skeleton */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 p-3 h-12" />

      {/* Table skeleton */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={`flex items-center gap-4 px-5 py-3.5 ${i > 0 ? 'border-t border-slate-50 dark:border-slate-800/50' : ''}`}>
            <div className="h-10 w-10 rounded-full animate-pulse bg-slate-100 dark:bg-slate-800/60 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-28 rounded animate-pulse bg-slate-100 dark:bg-slate-800/60" />
              <div className="h-3 w-20 rounded animate-pulse bg-slate-50 dark:bg-slate-800/40" />
            </div>
            <div className="h-5 w-16 rounded-full animate-pulse bg-slate-100 dark:bg-slate-800/60" />
          </div>
        ))}
      </div>
    </div>
  );
}
