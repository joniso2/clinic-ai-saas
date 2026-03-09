'use client';

import { useState, useEffect, useRef } from 'react';
import { Pencil } from 'lucide-react';

export function InlineEdit({
  value, display, onSave,
}: {
  value: number;
  display: string;
  onSave: (v: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      setDraft(String(value));
      setTimeout(() => inputRef.current?.select(), 0);
    }
  }, [editing, value]);

  const commit = () => {
    const n = Number(draft);
    if (!Number.isNaN(n) && n >= 0 && n !== value) onSave(n);
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="number"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }}
        className="w-24 rounded-lg border border-indigo-300 dark:border-indigo-600 bg-white dark:bg-slate-800 px-2 py-1 text-sm text-right tabular-nums focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
        onClick={(e) => e.stopPropagation()}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); setEditing(true); }}
      className="group/ie inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition"
      title="לחץ לעריכה מהירה"
    >
      <span className="tabular-nums text-slate-700 dark:text-slate-300">{display}</span>
      <Pencil className="h-3 w-3 text-slate-300 dark:text-slate-600 opacity-0 group-hover/ie:opacity-100 transition" />
    </button>
  );
}
