import { AnalyticsTab } from '@/components/dashboard/AnalyticsTab';

export default function AnalyticsPage() {
  return (
    <>
      <div className="mb-6 text-right" dir="rtl">
        <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em]">לוח בקרה</p>
        <h1 className="mt-1 text-[28px] font-bold text-slate-900 dark:text-slate-50 leading-tight tracking-tight">אנליטיקה</h1>
        <p className="mt-1.5 text-[15px] text-slate-500 dark:text-slate-400">מדדי ביצוע, משפך והמרות.</p>
      </div>
      <AnalyticsTab />
    </>
  );
}
