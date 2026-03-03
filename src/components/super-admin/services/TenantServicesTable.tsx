'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import type { ServiceRow } from './types';

interface TenantServicesTableProps {
  services: ServiceRow[];
  loading: boolean;
  onAdd: () => void;
  onEdit: (s: ServiceRow) => void;
  onDelete: (id: string) => void;
  onToggle: (s: ServiceRow) => void;
}

function formatDate(iso: string | undefined): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return '—';
  }
}

export function TenantServicesTable({
  services,
  loading,
  onAdd,
  onEdit,
  onDelete,
  onToggle,
}: TenantServicesTableProps) {
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleDeleteClick = (id: string) => setDeleteConfirmId(id);
  const handleDeleteConfirm = () => {
    if (deleteConfirmId) {
      onDelete(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  if (loading) {
    return (
      <div dir="rtl" className="rounded-xl border border-zinc-800 overflow-hidden bg-zinc-900">
        <div className="animate-pulse">
          <div className="h-12 bg-zinc-800/50" />
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-14 border-t border-zinc-800/60 bg-zinc-900" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div dir="rtl" className="rounded-xl border border-zinc-800 overflow-hidden bg-zinc-900">
        <div className="flex items-center justify-between flex-row-reverse border-b border-zinc-800 bg-zinc-800/50 px-4 py-3">
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
          >
            <Plus className="h-4 w-4" />
            הוסף שירות
          </button>
        </div>
        <table className="w-full text-sm" dir="rtl">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-800/30">
              <th className="text-right py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                שם הטיפול
              </th>
              <th className="text-right py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                מחיר
              </th>
              <th className="text-right py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                שגיאות כתיב / מילים נרדפות
              </th>
              <th className="text-right py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                סטטוס
              </th>
              <th className="text-right py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                עודכן לאחרונה
              </th>
              <th className="text-right py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                פעולות
              </th>
            </tr>
          </thead>
          <tbody>
            {services.map((s) => (
              <tr
                key={s.id}
                className="border-b border-zinc-800/60 transition-colors hover:bg-zinc-800/30"
              >
                <td className="py-3 px-4 font-medium text-zinc-100">{s.service_name}</td>
                <td className="py-3 px-4 tabular-nums text-zinc-300">{s.price} ₪</td>
                <td className="py-3 px-4 text-xs text-zinc-500">
                  {(s.aliases ?? []).join(', ') || '—'}
                </td>
                <td className="py-3 px-4">
                  <button
                    type="button"
                    onClick={() => onToggle(s)}
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                      s.is_active
                        ? 'bg-emerald-400/10 text-emerald-400 hover:bg-emerald-400/20'
                        : 'bg-zinc-700 text-zinc-400 hover:bg-zinc-600'
                    }`}
                  >
                    {s.is_active ? 'פעיל' : 'מושבת'}
                  </button>
                </td>
                <td className="py-3 px-4 text-zinc-500 text-xs">{formatDate(s.created_at)}</td>
                <td className="py-3 px-4">
                  <div className="flex gap-1 justify-end flex-row-reverse">
                    <button
                      type="button"
                      onClick={() => onEdit(s)}
                      className="p-1.5 rounded transition-colors text-zinc-500 hover:bg-zinc-700 hover:text-zinc-300"
                      aria-label="ערוך"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteClick(s.id)}
                      className="p-1.5 rounded transition-colors text-zinc-500 hover:bg-red-900/30 hover:text-red-400"
                      aria-label="מחק"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Delete confirmation modal */}
      {deleteConfirmId && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-confirm-title"
        >
          <div className="rounded-2xl border border-zinc-700 bg-zinc-900 p-6 text-right max-w-sm w-full shadow-xl">
            <h3 id="delete-confirm-title" className="text-base font-bold text-zinc-100 mb-2">
              מחיקת שירות
            </h3>
            <p className="text-sm text-zinc-400 mb-5">האם למחוק שירות זה? פעולה זו לא ניתנת לביטול.</p>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 rounded-xl border border-zinc-700 text-zinc-300 text-sm hover:bg-zinc-800 transition-colors"
              >
                ביטול
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-semibold transition-colors"
              >
                מחק
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
