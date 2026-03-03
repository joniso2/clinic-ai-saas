'use client';

import { PackageOpen } from 'lucide-react';

interface EmptyStateProps {
  /** Tenant (clinic) not selected yet */
  noTenant?: boolean;
  /** Tenant selected but no services */
  noServices?: boolean;
  onAdd?: () => void;
}

export function EmptyState({ noTenant, noServices, onAdd }: EmptyStateProps) {
  if (noTenant) {
    return (
      <div dir="rtl" className="rounded-xl border border-zinc-800 bg-zinc-900/50 py-16 text-center">
        <PackageOpen className="mx-auto h-12 w-12 text-zinc-600" aria-hidden />
        <p className="mt-3 text-sm font-medium text-zinc-400">בחר קליניקה למעלה כדי לערוך שירותים</p>
      </div>
    );
  }
  if (noServices) {
    return (
      <div dir="rtl" className="rounded-xl border border-zinc-800 bg-zinc-900/50 py-16 text-center">
        <PackageOpen className="mx-auto h-12 w-12 text-zinc-600" aria-hidden />
        <p className="mt-3 text-sm font-medium text-zinc-400">אין שירותים — הוסף שירות ראשון</p>
        {onAdd && (
          <button
            type="button"
            onClick={onAdd}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
          >
            הוסף שירות
          </button>
        )}
      </div>
    );
  }
  return null;
}
