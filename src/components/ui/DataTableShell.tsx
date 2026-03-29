'use client';

import type { ReactNode } from 'react';

interface DataTableShellProps {
  toolbar?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  loading?: boolean;
  empty?: ReactNode;
  className?: string;
}

export function DataTableShell({
  toolbar,
  children,
  footer,
  loading = false,
  empty,
  className = '',
}: DataTableShellProps) {
  return (
    <div
      className={`rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface-1)] overflow-hidden ${className}`}
      style={{ boxShadow: 'var(--shadow-sm)' }}
    >
      {toolbar && (
        <div className="border-b border-[var(--border-subtle)] px-4 py-3 bg-[var(--bg-subtle)]">
          {toolbar}
        </div>
      )}

      {loading ? (
        <div className="p-6">
          <TableSkeleton />
        </div>
      ) : empty ? (
        <div className="py-12 px-6">
          {empty}
        </div>
      ) : (
        <div className="overflow-x-auto">
          {children}
        </div>
      )}

      {footer && (
        <div className="border-t border-[var(--border-subtle)] px-4 py-3 bg-[var(--bg-subtle)]">
          {footer}
        </div>
      )}
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="h-8 bg-[var(--bg-inset)] rounded-lg w-full" />
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="h-12 bg-[var(--bg-inset)] rounded-lg w-full opacity-60" />
      ))}
    </div>
  );
}
