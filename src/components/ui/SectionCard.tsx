'use client';

import type { ComponentType, ReactNode, SVGProps } from 'react';

interface SectionCardProps {
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
  title: string;
  subtitle?: string;
  children: ReactNode;
  headerActions?: ReactNode;
  className?: string;
  noPadding?: boolean;
}

export function SectionCard({
  icon: Icon,
  title,
  subtitle,
  children,
  headerActions,
  className = '',
  noPadding = false,
}: SectionCardProps) {
  return (
    <div
      className={`rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface-1)] overflow-hidden ${className}`}
      style={{ boxShadow: 'var(--shadow-sm)' }}
    >
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-3 flex-row-reverse flex-1 min-w-0">
          {Icon && (
            <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-[var(--accent-light)] text-[var(--accent)] shrink-0">
              <Icon className="h-[18px] w-[18px]" />
            </div>
          )}
          <div className="min-w-0 text-right">
            <h3 className="text-[15px] font-semibold text-[var(--text-primary)] leading-tight">
              {title}
            </h3>
            {subtitle && (
              <p className="mt-0.5 text-xs text-[var(--text-tertiary)] truncate">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {headerActions && (
          <div className="shrink-0 flex items-center gap-2">
            {headerActions}
          </div>
        )}
      </div>
      <div className={noPadding ? '' : 'p-5'}>
        {children}
      </div>
    </div>
  );
}
