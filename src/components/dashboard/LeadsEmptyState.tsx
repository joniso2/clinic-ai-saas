'use client';

import { Users } from 'lucide-react';

export function LeadsEmptyState({ onAddLead }: { onAddLead: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-gradient-to-b from-slate-50/80 to-white px-6 py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 transition group-hover:bg-slate-200">
        <Users className="h-8 w-8" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-zinc-100">
        עדיין אין לידים
      </h3>
      <p className="mt-2 max-w-sm text-sm text-slate-500 dark:text-zinc-400 text-center">
        הוסף את הליד הראשון כדי להתחיל. פניות חדשות יופיעו כאן אוטומטית.
      </p>
      <button
        type="button"
        onClick={onAddLead}
        className="mt-6 rounded-xl bg-slate-900 dark:bg-zinc-100 px-5 py-2.5 text-sm font-semibold text-white dark:text-zinc-900 shadow-sm transition hover:bg-slate-800 dark:hover:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2"
      >
        הוסף ליד ראשון
      </button>
    </div>
  );
}
