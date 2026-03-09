/**
 * Lightweight skeleton / shimmer placeholder for loading states.
 *
 * Usage:
 *   <Skeleton className="h-4 w-32" />           // single bar
 *   <Skeleton className="h-10 w-10 rounded-full" /> // avatar circle
 */
export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-slate-200/70 dark:bg-slate-800/60 ${className}`}
    />
  );
}

/** KPI card skeleton — matches kpiCardCls layout */
export function KpiCardSkeleton() {
  return (
    <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
      <Skeleton className="h-10 w-10 rounded-full" />
      <Skeleton className="h-7 w-20" />
      <Skeleton className="h-4 w-28" />
    </div>
  );
}

/** Table skeleton — header + N rows */
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  const headerWidths = ['w-28', 'w-20', 'w-24', 'w-16'];
  const rowWidths = ['w-32', 'w-24', 'w-28', 'w-20'];
  return (
    <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
      <div className="flex gap-4 px-4 py-3 bg-slate-50/70 dark:bg-slate-800/50">
        {headerWidths.map((w, i) => (
          <Skeleton key={i} className={`h-3 ${w}`} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 px-4 py-3.5 border-t border-slate-100 dark:border-slate-800">
          {rowWidths.map((w, j) => (
            <Skeleton key={j} className={`h-4 ${w}`} />
          ))}
        </div>
      ))}
    </div>
  );
}
