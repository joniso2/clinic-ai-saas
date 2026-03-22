'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export type GlassSelectOption = { value: string; label: string };

interface GlassSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: GlassSelectOption[];
  placeholder?: string;
  className?: string;
  dir?: 'rtl' | 'ltr';
}

export function GlassSelect({ value, onChange, options, placeholder, className = '', dir = 'rtl' }: GlassSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className={`relative ${className}`} dir={dir}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between rounded-xl border border-slate-200/80 dark:border-slate-700/60 bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition-all shadow-sm"
      >
        <span className={current ? '' : 'text-slate-400 dark:text-slate-500'}>{current?.label ?? placeholder ?? ''}</span>
        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute inset-x-0 top-full mt-1.5 z-30 rounded-xl border border-slate-200/80 dark:border-slate-700/60 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.04)] overflow-hidden max-h-[240px] overflow-y-auto overscroll-contain">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium transition-colors text-right
                ${opt.value === value
                  ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                }`}
            >
              <span>{opt.label}</span>
              {opt.value === value && <Check className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
