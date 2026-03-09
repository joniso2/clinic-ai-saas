import type { ComponentType, SVGProps } from 'react';

export type KpiCardProps = {
  label: string;
  value: string | number;
  sub?: string;
  icon: ComponentType<SVGProps<SVGSVGElement> & { strokeWidth?: number }>;
  iconContainerClass: string;
  borderAccentClass: string;
};

export function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  iconContainerClass,
  borderAccentClass,
}: KpiCardProps) {
  return (
    <div
      className={`group relative rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-sm dark:shadow-none transition-all duration-300 hover:shadow-md dark:hover:bg-slate-800/60 hover:-translate-y-0.5 border-s-4 ${borderAccentClass}`}
    >
      <div className="flex items-center gap-4 flex-row-reverse text-right">
        <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-150 ${iconContainerClass}`}>
          <Icon className="h-5 w-5 shrink-0 text-current" strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] text-slate-500 dark:text-slate-400">
            {label}
          </p>
          <p className="mt-2 text-[30px] font-bold tabular-nums text-slate-900 dark:text-white">
            {value}
          </p>
          {sub != null && (
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{sub}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export const KPI_ACCENT = {
  slate: {
    icon: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300',
    border: 'border-s-slate-400 dark:border-s-slate-400',
  },
  blue: {
    icon: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
    border: 'border-s-blue-500 dark:border-s-blue-400',
  },
  amber: {
    icon: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400',
    border: 'border-s-amber-500 dark:border-s-amber-400',
  },
  emerald: {
    icon: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400',
    border: 'border-s-emerald-500 dark:border-s-emerald-400',
  },
  indigo: {
    icon: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400',
    border: 'border-s-indigo-500 dark:border-s-indigo-400',
  },
  purple: {
    icon: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
    border: 'border-s-purple-500 dark:border-s-purple-400',
  },
  red: {
    icon: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400',
    border: 'border-s-red-500 dark:border-s-red-400',
  },
} as const;
