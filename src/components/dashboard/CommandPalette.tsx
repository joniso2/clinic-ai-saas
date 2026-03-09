'use client';
import { useEffect, useRef, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Users, BarChart3, Settings, Calendar, DollarSign, Receipt, UserCheck, Plus, X } from 'lucide-react';
import { useCommandPalette } from '@/contexts/CommandPaletteContext';

const NAV_ITEMS = [
  { label: 'לידים',    href: '/dashboard',            icon: Users },
  { label: 'לקוחות',   href: '/dashboard/customers',  icon: UserCheck },
  { label: 'תורים',    href: '/dashboard/calendar',   icon: Calendar },
  { label: 'אנליטיקה', href: '/dashboard/analytics',  icon: BarChart3 },
  { label: 'תמחור',    href: '/dashboard/pricing',    icon: DollarSign },
  { label: 'קבלות',    href: '/dashboard/receipts',   icon: Receipt },
  { label: 'הגדרות',   href: '/dashboard/settings',   icon: Settings },
];

function Hi({ text, q }: { text: string; q: string }) {
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (!q || i === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark className="bg-indigo-100 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-300 rounded px-0.5 not-italic">
        {text.slice(i, i + q.length)}
      </mark>
      {text.slice(i + q.length)}
    </>
  );
}

export default function CommandPalette() {
  const { isOpen, close, leadsRef, onNewLeadRef } = useCommandPalette();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [idx, setIdx] = useState(0);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Build flat list of all items
  const allItems = useMemo(() => {
    const q = query.toLowerCase();

    const nav = NAV_ITEMS
      .filter(n => n.label.includes(q) || !q)
      .map(n => ({
        key: `nav-${n.href}`,
        label: n.label,
        icon: n.icon,
        section: 'ניווט',
        action: () => { router.push(n.href); close(); },
      }));

    const leads = query.length >= 2
      ? leadsRef.current
          .filter(l =>
            (l.full_name ?? '').toLowerCase().includes(q) ||
            (l.phone ?? '').includes(query)
          )
          .slice(0, 5)
          .map(l => ({
            key: `lead-${l.id}`,
            label: l.full_name ?? l.phone ?? 'ליד',
            sub: l.phone,
            icon: Users,
            section: 'לידים',
            action: () => { router.push('/dashboard'); close(); },
          }))
      : [];

    const actions = [
      ...(!q || 'ליד חדש'.includes(q) ? [{
        key: 'new-lead',
        label: 'ליד חדש',
        icon: Plus,
        section: 'פעולות',
        action: () => { onNewLeadRef.current?.(); close(); },
      }] : []),
      ...(!q || 'הגדרות'.includes(q) ? [{
        key: 'settings',
        label: 'הגדרות',
        icon: Settings,
        section: 'פעולות',
        action: () => { router.push('/dashboard/settings'); close(); },
      }] : []),
    ];

    return [...nav, ...leads, ...actions];
  }, [query, isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep idx in bounds
  useEffect(() => {
    setIdx(i => Math.min(i, Math.max(0, allItems.length - 1)));
  }, [allItems.length]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); close(); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); setIdx(i => Math.min(i + 1, allItems.length - 1)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setIdx(i => Math.max(i - 1, 0)); }
      else if (e.key === 'Enter') { e.preventDefault(); allItems[idx]?.action(); }
    };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [isOpen, idx, allItems, close]);

  if (!isOpen) return null;

  // Group items by section for display
  const sections = ['ניווט', 'לידים', 'פעולות'];
  const grouped = sections
    .map(s => ({ section: s, items: allItems.filter(i => i.section === s) }))
    .filter(g => g.items.length > 0);

  let globalIdx = 0;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-start justify-center pt-[10vh] px-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={close} />

      {/* Panel */}
      <div
        className="relative w-full max-w-xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-[0_20px_60px_rgba(0,0,0,0.18),0_8px_20px_rgba(0,0,0,0.1)] overflow-hidden cmd-enter"
        dir="rtl"
      >
        {/* Search row */}
        <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setIdx(0); }}
            placeholder="חיפוש מהיר..."
            className="flex-1 bg-transparent text-sm text-slate-900 dark:text-slate-50 placeholder-slate-400 dark:placeholder-slate-500 outline-none text-right"
          />
          <kbd className="shrink-0 rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] font-mono text-slate-500 dark:text-slate-400">
            Esc
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[400px] overflow-y-auto py-2">
          {grouped.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 dark:text-slate-600 gap-2">
              <X className="h-8 w-8 opacity-40" />
              <p className="text-sm font-medium">לא נמצאו תוצאות</p>
            </div>
          ) : (
            grouped.map(({ section, items }) => (
              <div key={section} className="mb-1">
                <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  {section}
                </div>
                {items.map((item) => {
                  const itemIdx = globalIdx++;
                  const isActive = itemIdx === idx;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onMouseEnter={() => setIdx(itemIdx)}
                      onClick={() => item.action()}
                      className={`flex w-full items-center gap-3 px-3 py-2.5 text-sm transition-colors text-right
                        ${isActive
                          ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                        }`}
                    >
                      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg
                        ${isActive ? 'bg-indigo-100 dark:bg-indigo-900/50' : 'bg-slate-100 dark:bg-slate-800'}`}>
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex flex-col items-start min-w-0">
                        <span className="font-medium truncate">
                          <Hi text={item.label} q={query} />
                        </span>
                        {'sub' in item && typeof (item as { sub?: string }).sub === 'string' && (
                          <span className="text-[11px] text-slate-400 dark:text-slate-500 dir-ltr">
                            {(item as { sub: string }).sub}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
