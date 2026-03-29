'use client';

import type { ReactNode } from 'react';

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ eyebrow, title, subtitle, actions, className = '' }: PageHeaderProps) {
  return (
    <div className={`mb-8 ${className}`}>
      <div className="flex items-start justify-between gap-4 flex-row-reverse">
        <div className="flex-1 min-w-0 text-right">
          {eyebrow && (
            <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--text-tertiary)] mb-1">
              {eyebrow}
            </p>
          )}
          <h1 className="text-2xl font-bold text-[var(--text-primary)] leading-tight tracking-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              {subtitle}
            </p>
          )}
        </div>
        {actions && (
          <div className="shrink-0 flex items-center gap-2">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
