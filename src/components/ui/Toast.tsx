'use client';

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { CheckCircle, AlertCircle, X } from 'lucide-react';

/* ──────────────────────────── Types ─────────────────────────── */

type ToastVariant = 'success' | 'error' | 'undo';

interface ToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
  onUndo?: () => void;
}

interface ToastAPI {
  success: (message: string) => void;
  error: (message: string) => void;
  undo: (message: string, onUndo: () => void) => void;
}

/* ──────────────────────────── Context ───────────────────────── */

const ToastContext = createContext<ToastAPI | null>(null);

let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((message: string, variant: ToastVariant, onUndo?: () => void) => {
    const id = ++nextId;
    setToasts((prev) => [...prev, { id, message, variant, onUndo }]);
    const delay = variant === 'undo' ? 5000 : 3000;
    setTimeout(() => dismiss(id), delay);
  }, [dismiss]);

  const api: ToastAPI = {
    success: useCallback((msg: string) => push(msg, 'success'), [push]),
    error: useCallback((msg: string) => push(msg, 'error'), [push]),
    undo: useCallback((msg: string, onUndo: () => void) => push(msg, 'undo', onUndo), [push]),
  };

  return (
    <ToastContext.Provider value={api}>
      {children}

      {/* Toast container */}
      <div className="fixed bottom-6 start-1/2 -translate-x-1/2 z-[70] flex flex-col-reverse items-center gap-2 pointer-events-none" dir="rtl">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="alert"
            aria-live="polite"
            className={`pointer-events-auto flex items-center gap-2.5 rounded-xl border px-4 py-2.5 text-sm font-medium shadow-xl whitespace-nowrap animate-[slideUpFade_200ms_ease-out] ${
              t.variant === 'error'
                ? 'bg-red-600 border-red-500 text-white'
                : t.variant === 'undo'
                  ? 'bg-slate-800 border-slate-700 text-slate-100 dark:bg-slate-900 dark:border-slate-700'
                  : 'bg-emerald-600 border-emerald-500 text-white'
            }`}
          >
            {t.variant === 'error' && <AlertCircle className="h-4 w-4 shrink-0" />}
            {t.variant === 'success' && <CheckCircle className="h-4 w-4 shrink-0" />}
            <span>{t.message}</span>
            {t.variant === 'undo' && t.onUndo && (
              <button
                type="button"
                onClick={() => { t.onUndo!(); dismiss(t.id); }}
                className="ms-1 rounded-lg bg-white/20 px-2.5 py-0.5 text-xs font-semibold hover:bg-white/30 transition-colors"
              >
                ביטול
              </button>
            )}
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              className="ms-1 rounded-lg p-0.5 hover:bg-white/20 transition-colors"
              aria-label="סגור"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastAPI {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return ctx;
}
