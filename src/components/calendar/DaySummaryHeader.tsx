'use client';

export type DaySummaryHeaderProps = {
  todayCount: number;
  weekCount: number;
  aiCreatedCount: number;
};

export function DaySummaryHeader({ todayCount, weekCount, aiCreatedCount }: DaySummaryHeaderProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-slate-100 dark:border-slate-700 px-5 py-2.5 text-right" dir="rtl">
      <span className="text-xs text-slate-500 dark:text-slate-400">
        היום: <span className="font-medium text-slate-700 dark:text-slate-300">{todayCount}</span> תורים
      </span>
      <span className="text-xs text-slate-400 dark:text-slate-500">|</span>
      <span className="text-xs text-slate-500 dark:text-slate-400">
        השבוע: <span className="font-medium text-slate-700 dark:text-slate-300">{weekCount}</span> תורים
      </span>
      <span className="text-xs text-slate-400 dark:text-slate-500">|</span>
      <span className="text-xs text-slate-500 dark:text-slate-400">
        נוצרו ב-AI: <span className="font-medium text-slate-700 dark:text-slate-300">{aiCreatedCount}</span>
      </span>
    </div>
  );
}
