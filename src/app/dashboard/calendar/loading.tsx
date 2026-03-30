/** Route-level skeleton for /dashboard/calendar. */
export default function CalendarLoading() {
  return (
    <div className="flex h-full flex-col" dir="rtl">
      {/* Header skeleton */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg animate-pulse bg-slate-100 dark:bg-slate-800/60" />
          <div className="h-8 w-8 rounded-lg animate-pulse bg-slate-100 dark:bg-slate-800/60" />
          <div className="h-5 w-32 rounded animate-pulse bg-slate-100 dark:bg-slate-800/60" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-8 w-16 rounded-lg animate-pulse bg-slate-100 dark:bg-slate-800/60" />
          <div className="h-8 w-16 rounded-lg animate-pulse bg-slate-100 dark:bg-slate-800/60" />
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-slate-100 dark:border-slate-800">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center py-2 gap-1">
            <div className="h-3 w-8 rounded animate-pulse bg-slate-100 dark:bg-slate-800/60" />
            <div className="h-5 w-5 rounded-full animate-pulse bg-slate-50 dark:bg-slate-800/40" />
          </div>
        ))}
      </div>

      {/* Time grid skeleton */}
      <div className="flex-1 grid grid-cols-7 gap-px bg-slate-100 dark:bg-slate-800">
        {Array.from({ length: 7 }).map((_, col) => (
          <div key={col} className="bg-white dark:bg-slate-900 p-2 space-y-2">
            {Array.from({ length: 3 }).map((_, row) => (
              <div key={row} className="rounded-xl animate-pulse bg-slate-50 dark:bg-slate-800/40 h-16" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
