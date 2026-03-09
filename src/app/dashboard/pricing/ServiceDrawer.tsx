'use client';

import { useEffect } from 'react';
import { Pencil, Trash2, Power, PowerOff, X, Package, CheckCircle2, XCircle } from 'lucide-react';
import { formatCurrencyILS } from '@/lib/hebrew';
import type { ClinicService } from './pricing-types';

export function ServiceDrawer({
  service, canEdit, onClose, onEdit, onToggle, onDelete,
}: {
  service: ClinicService;
  canEdit: boolean;
  onClose: () => void;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  const isPopular = (service.aliases?.length ?? 0) >= 3;

  return (
    <div className="fixed inset-0 z-40 flex" dir="rtl">
      <div className="absolute inset-0 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-[2px]" onClick={onClose} />
      <div
        className="relative mr-auto w-full max-w-sm bg-white dark:bg-slate-950 border-l border-slate-200 dark:border-slate-700 shadow-2xl flex flex-col"
        style={{ animation: 'slideInDrawer 200ms ease-out forwards' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-5 py-4 shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            {isPopular && (
              <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800/40 px-2 py-0.5 text-[11px] font-semibold text-orange-700 dark:text-orange-400">
                פופולרי
              </span>
            )}
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              service.is_active
                ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
            }`}>
              {service.is_active ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
              {service.is_active ? 'פעיל' : 'מושבת'}
            </span>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Name + icon */}
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/20">
              <Package className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50 leading-tight">{service.service_name}</h2>
              {service.description && (
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{service.description}</p>
              )}
            </div>
          </div>

          {/* Category */}
          {service.category && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1.5">קטגוריה</p>
              <span className="inline-flex items-center rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-300">
                {service.category}
              </span>
            </div>
          )}

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">מחיר</p>
              <p className="text-xl font-bold text-slate-900 dark:text-slate-50 tabular-nums">{formatCurrencyILS(service.price)}</p>
            </div>
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">משך טיפול</p>
              <p className="text-xl font-bold text-slate-900 dark:text-slate-50 tabular-nums">{service.duration_minutes} דק׳</p>
            </div>
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">תורים</p>
              <p className="text-xl font-bold text-slate-900 dark:text-slate-50 tabular-nums">{service.bookings_count ?? 0}</p>
            </div>
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">הכנסות</p>
              <p className="text-xl font-bold text-slate-900 dark:text-slate-50 tabular-nums">{formatCurrencyILS(service.total_revenue ?? 0)}</p>
            </div>
          </div>

          {/* Aliases */}
          {Array.isArray(service.aliases) && service.aliases.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">כינויים לבוט</p>
              <div className="flex flex-wrap gap-1.5">
                {service.aliases.map((a) => (
                  <span key={a} className="rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/30 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:text-indigo-300">
                    {a}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Meta */}
          {service.created_at && (
            <p className="text-xs text-slate-400 dark:text-slate-500">
              נוסף: {new Date(service.created_at).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' })}
            </p>
          )}
        </div>

        {/* Actions */}
        {canEdit && (
          <div className="border-t border-slate-100 dark:border-slate-800 p-4 space-y-2 shrink-0">
            <button type="button" onClick={onEdit}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition">
              <Pencil className="h-4 w-4" /> ערוך שירות
            </button>
            <button type="button" onClick={onToggle}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition">
              {service.is_active
                ? <><PowerOff className="h-4 w-4" /> השבת שירות</>
                : <><Power className="h-4 w-4" /> הפעל שירות</>}
            </button>
            <button type="button" onClick={onDelete}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 dark:border-red-800/40 px-4 py-2.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition">
              <Trash2 className="h-4 w-4" /> מחק שירות
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideInDrawer {
          from { transform: translateX(-20px); opacity: 0; }
          to   { transform: translateX(0);     opacity: 1; }
        }
      `}</style>
    </div>
  );
}
