'use client';

import type { ServiceRow } from './types';

interface ServiceFormModalProps {
  mode: 'add' | 'edit';
  service?: ServiceRow | null;
  /** Initial form values when opening */
  name: string;
  price: string;
  aliases: string;
  active: boolean;
  onNameChange: (v: string) => void;
  onPriceChange: (v: string) => void;
  onAliasesChange: (v: string) => void;
  onActiveChange: (v: boolean) => void;
  onSave: () => void;
  onClose: () => void;
  saving: boolean;
}

export function ServiceFormModal({
  mode,
  name,
  price,
  aliases,
  active,
  onNameChange,
  onPriceChange,
  onAliasesChange,
  onActiveChange,
  onSave,
  onClose,
  saving,
}: ServiceFormModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="service-modal-title"
    >
      <div
        className="rounded-2xl border border-zinc-700 bg-zinc-900 max-w-sm w-full p-6 text-right shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="service-modal-title" className="text-base font-bold text-zinc-100 mb-5">
          {mode === 'add' ? 'הוסף טיפול' : 'ערוך טיפול'}
        </h2>
        <div className="space-y-3">
          <div>
            <label htmlFor="svc-name" className="block text-xs font-medium text-zinc-400 mb-1">
              שם הטיפול
            </label>
            <input
              id="svc-name"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="svc-price" className="block text-xs font-medium text-zinc-400 mb-1">
              מחיר (₪)
            </label>
            <input
              id="svc-price"
              type="number"
              min={0}
              value={price}
              onChange={(e) => onPriceChange(e.target.value)}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="svc-aliases" className="block text-xs font-medium text-zinc-400 mb-1">
              שגיאות כתיב / מילים נרדפות (מופרדות בפסיק)
            </label>
            <input
              id="svc-aliases"
              value={aliases}
              onChange={(e) => onAliasesChange(e.target.value)}
              placeholder="ניקוי, שיננית"
              className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none placeholder:text-zinc-500"
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => onActiveChange(e.target.checked)}
              className="rounded border-zinc-600 bg-zinc-800"
            />
            <span className="text-sm text-zinc-300">פעיל</span>
          </label>
        </div>
        <div className="flex gap-2 mt-5 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-zinc-700 text-zinc-300 text-sm hover:bg-zinc-800 transition-colors"
          >
            ביטול
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving || !name.trim()}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold disabled:opacity-50 transition-colors"
          >
            {saving ? 'שומר…' : mode === 'add' ? 'הוסף' : 'שמור'}
          </button>
        </div>
      </div>
    </div>
  );
}
