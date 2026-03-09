/** Skeleton components for the Overview section's loading states. */

function Pulse({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-md bg-slate-200 dark:bg-slate-800 ${className}`} />
  );
}

/** 8-card KPI grid skeleton */
export function KPISectionSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4 space-y-3">
          <Pulse className="h-3 w-24" />
          <Pulse className="h-6 w-16" />
          <Pulse className="h-4 w-12" />
        </div>
      ))}
    </div>
  );
}

/** Single chart card skeleton */
export function ChartCardSkeleton({ tall = false }: { tall?: boolean }) {
  return (
    <div className={`rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-5 space-y-4 ${tall ? 'min-h-[200px]' : 'min-h-[160px]'}`}>
      <Pulse className="h-3.5 w-32" />
      <Pulse className={`w-full ${tall ? 'h-28' : 'h-20'} rounded-lg`} />
    </div>
  );
}

/** Full overview skeleton (used before server data arrives — edge case only) */
export function OverviewSkeleton() {
  return (
    <div className="space-y-6 text-right" dir="rtl">
      <div className="flex items-center justify-between flex-row-reverse">
        <div className="space-y-2">
          <Pulse className="h-5 w-32" />
          <Pulse className="h-3 w-52" />
        </div>
        <Pulse className="h-9 w-48 rounded-xl" />
      </div>

      <KPISectionSkeleton />

      {/* Wide chart */}
      <ChartCardSkeleton tall />

      {/* 2-column charts */}
      <div className="grid md:grid-cols-2 gap-4">
        <ChartCardSkeleton />
        <ChartCardSkeleton />
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <ChartCardSkeleton />
        <ChartCardSkeleton />
      </div>
    </div>
  );
}
