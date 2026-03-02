import { AnalyticsTab } from '@/components/dashboard/AnalyticsTab';

export default function AnalyticsPage() {
  return (
    <>
      <div className="mb-6 text-right">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-zinc-500">לוח בקרה</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-zinc-100 sm:text-3xl">אנליטיקה</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">מדדי ביצוע, משפך והמרות.</p>
      </div>
      <AnalyticsTab />
    </>
  );
}
