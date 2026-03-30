/** Route-level skeleton for /dashboard (leads page). */
export default function DashboardLoading() {
  return (
    <div className="px-3 pt-1 pb-3 lg:px-5 lg:pt-1 lg:pb-4 space-y-3" dir="rtl">
      {/* KPI row skeleton */}
      <div className="flex items-stretch rounded-2xl bg-white dark:bg-slate-900 overflow-hidden h-16">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={`flex-1 flex flex-col items-center justify-center gap-1.5 ${i > 0 ? 'border-s border-slate-100 dark:border-slate-800' : ''}`}>
            <div className="h-5 w-10 rounded animate-pulse bg-slate-100 dark:bg-slate-800/60" />
            <div className="h-2.5 w-14 rounded animate-pulse bg-slate-50 dark:bg-slate-800/40" />
          </div>
        ))}
      </div>

      {/* Toolbar skeleton */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 p-2.5 h-11" />

      {/* Card feed skeleton */}
      <div className="space-y-2.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl bg-white dark:bg-slate-900 overflow-hidden">
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-3 flex-row-reverse">
                <div className="h-11 w-11 rounded-xl animate-pulse bg-slate-100 dark:bg-slate-800/60" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-28 rounded animate-pulse bg-slate-100 dark:bg-slate-800/60" />
                  <div className="h-3 w-20 rounded animate-pulse bg-slate-50 dark:bg-slate-800/40" />
                </div>
                <div className="h-5 w-14 rounded-full animate-pulse bg-slate-100 dark:bg-slate-800/60" />
              </div>
              <div className="grid grid-cols-2 gap-px rounded-xl overflow-hidden">
                <div className="h-[52px] bg-slate-50/80 dark:bg-slate-800/30" />
                <div className="h-[52px] bg-slate-50/80 dark:bg-slate-800/30" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
