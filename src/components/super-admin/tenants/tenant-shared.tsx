'use client';

import { useState, useCallback } from 'react';

// ─── Status badge ─────────────────────────────────────────────────────────────
export function StatusBadge({ status }: { status: string }) {
  const isActive = status !== 'inactive';
  return (
    <span className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold ${
      isActive
        ? 'bg-emerald-400/10 text-emerald-400'
        : 'bg-slate-700 text-slate-400'
    }`}>
      <span className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-emerald-400' : 'bg-slate-500'}`} />
      {isActive ? 'פעיל' : 'מושבת'}
    </span>
  );
}

// ─── Health dot ───────────────────────────────────────────────────────────────
export function HealthDot({ status, discord }: { status: string; discord: boolean }) {
  const color = status === 'inactive' ? 'bg-red-500' : discord ? 'bg-emerald-500' : 'bg-amber-500';
  const label = status === 'inactive' ? 'מושבת' : discord ? 'תקין' : 'חלקי';
  return <span className={`inline-flex h-2.5 w-2.5 rounded-full ${color}`} title={label} />;
}

// ─── Shared toast ─────────────────────────────────────────────────────────────
export function useToast() {
  const [toast, setToast] = useState<string | null>(null);
  const show = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);
  return { toast, show };
}
