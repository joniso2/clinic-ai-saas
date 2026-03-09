'use client';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center max-w-md mx-auto px-6">
        <div className="h-14 w-14 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
          <svg className="h-7 w-7 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">שגיאה בטעינת הדף</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          אירעה שגיאה. ניתן לנסות שוב — אם הבעיה חוזרת, פנה לתמיכה.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="h-10 px-5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-all duration-150 active:scale-[0.98]"
          >
            נסה שוב
          </button>
          <a
            href="/dashboard"
            className="h-10 px-5 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-sm font-medium inline-flex items-center transition-all duration-150 hover:bg-slate-50 dark:hover:bg-slate-700"
          >
            חזרה לדשבורד
          </a>
        </div>
      </div>
    </div>
  );
}
