'use client';

import { CheckCircle2 } from 'lucide-react';

type Props = {
  appointmentLabel?: string;
  onIssue: () => void;
  onDismiss: () => void;
};

export function AppointmentReceiptPrompt({ appointmentLabel, onIssue, onDismiss }: Props) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div
        className="w-full max-w-[420px] bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl p-6 flex flex-col items-center gap-5 text-center"
        dir="rtl"
      >
        <div className="h-14 w-14 rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
          <CheckCircle2 className="h-8 w-8 text-emerald-500 dark:text-emerald-400" />
        </div>

        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-zinc-100">תור נסגר בהצלחה</h2>
          {appointmentLabel && (
            <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">{appointmentLabel}</p>
          )}
          <p className="mt-2 text-sm text-slate-600 dark:text-zinc-300">להפיק קבלה עכשיו?</p>
        </div>

        <div className="flex gap-3 w-full">
          <button
            onClick={onIssue}
            className="flex-1 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
          >
            הפק קבלה
          </button>
          <button
            onClick={onDismiss}
            className="flex-1 rounded-xl border border-slate-200 dark:border-zinc-700 px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors"
          >
            אחר כך
          </button>
        </div>
      </div>
    </div>
  );
}
