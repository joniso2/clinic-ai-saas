'use client';

import { useEffect, useCallback, type ReactNode } from 'react';
import { X } from 'lucide-react';

type DrawerWidth = 'sm' | 'md' | 'lg';

const WIDTH_MAP: Record<DrawerWidth, string> = {
  sm: 'w-full sm:max-w-[380px]',
  md: 'w-full sm:max-w-[480px]',
  lg: 'w-full sm:max-w-[640px]',
};

interface DrawerShellProps {
  open: boolean;
  onClose: () => void;
  width?: DrawerWidth;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function DrawerShell({
  open,
  onClose,
  width = 'md',
  title,
  subtitle,
  children,
  footer,
}: DrawerShellProps) {
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) return;
    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [open, handleEscape]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-start" dir="rtl">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity duration-200"
        onClick={onClose}
      />

      {/* Panel */}
      <aside
        className={`
          drawer-enter relative ${WIDTH_MAP[width]} h-full
          bg-[var(--bg-surface-2)] border-s border-[var(--border-default)]
          flex flex-col overflow-hidden
        `}
        style={{ boxShadow: 'var(--shadow-xl)' }}
      >
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between gap-3 px-5 py-4 border-b border-[var(--border-subtle)] bg-[var(--bg-surface-1)]">
          <div className="min-w-0 text-right">
            <h2 className="text-base font-semibold text-[var(--text-primary)] truncate">
              {title}
            </h2>
            {subtitle && (
              <p className="text-xs text-[var(--text-tertiary)] mt-0.5 truncate">{subtitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center h-8 w-8 rounded-lg text-[var(--text-tertiary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] transition-colors"
            aria-label="סגור"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain px-5 py-5">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="shrink-0 border-t border-[var(--border-subtle)] bg-[var(--bg-surface-1)] px-5 py-4 safe-area-bottom">
            {footer}
          </div>
        )}
      </aside>
    </div>
  );
}
