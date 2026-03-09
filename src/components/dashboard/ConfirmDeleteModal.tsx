'use client';

import { useEffect, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useFocusTrap } from '@/hooks/useFocusTrap';

export function ConfirmDeleteModal({
  open,
  title,
  message,
  confirmLabel = 'מחק',
  onConfirm,
  onCancel,
  loading,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(panelRef, open);

  useEffect(() => {
    if (open) {
      const handler = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onCancel();
      };
      document.addEventListener('keydown', handler);
      document.body.style.overflow = 'hidden';
      return () => {
        document.removeEventListener('keydown', handler);
        document.body.style.overflow = '';
      };
    }
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
      onClick={onCancel}
    >
      <div
        ref={panelRef}
        className="modal-enter max-w-sm w-full rounded-2xl bg-white dark:bg-slate-900 shadow-[0_10px_30px_rgba(0,0,0,0.12),0_4px_8px_rgba(0,0,0,0.06)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Body */}
        <div className="px-6 py-6 text-center">
          <div className="h-12 w-12 rounded-full bg-red-50 dark:bg-red-950/40 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>
          <h2
            id="delete-modal-title"
            className="text-[18px] font-semibold text-slate-900 dark:text-slate-50 mb-2"
          >
            {title}
          </h2>
          <p className="text-[14px] text-slate-500 dark:text-slate-400">{message}</p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-center gap-3 border-t border-slate-100 dark:border-slate-800 px-6 py-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="inline-flex items-center justify-center h-10 px-5 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[14px] font-semibold border border-slate-200 dark:border-slate-700 hover:bg-slate-50 transition-all duration-150"
          >
            ביטול
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="inline-flex items-center justify-center h-10 px-5 rounded-lg bg-red-600 text-white text-[14px] font-semibold hover:bg-red-700 transition-all duration-150 disabled:opacity-50"
          >
            {loading ? 'מוחק…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
