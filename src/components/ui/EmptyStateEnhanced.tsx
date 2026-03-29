'use client';

import type { ComponentType, SVGProps } from 'react';

interface EmptyAction {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}

interface EmptyStateEnhancedProps {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  title: string;
  description?: string;
  actions?: EmptyAction[];
  progress?: { current: number; total: number; label: string };
  className?: string;
}

export function EmptyStateEnhanced({
  icon: Icon,
  title,
  description,
  actions,
  progress,
  className = '',
}: EmptyStateEnhancedProps) {
  return (
    <div className={`flex flex-col items-center justify-center text-center py-16 px-6 ${className}`}>
      <div className="mb-5 flex items-center justify-center h-16 w-16 rounded-2xl bg-[var(--bg-inset)] border border-[var(--border-subtle)]">
        <Icon className="h-7 w-7 text-[var(--text-tertiary)]" />
      </div>

      <h3 className="text-[15px] font-semibold text-[var(--text-primary)] mb-1">
        {title}
      </h3>

      {description && (
        <p className="text-sm text-[var(--text-secondary)] max-w-sm leading-relaxed">
          {description}
        </p>
      )}

      {progress && (
        <div className="mt-5 w-full max-w-xs">
          <div className="flex items-center justify-between text-[11px] font-medium text-[var(--text-tertiary)] mb-1.5">
            <span>{progress.label}</span>
            <span>{progress.current}/{progress.total}</span>
          </div>
          <div className="h-1.5 bg-[var(--bg-inset)] rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--accent)] rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, (progress.current / progress.total) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {actions && actions.length > 0 && (
        <div className="mt-6 flex items-center gap-3 flex-wrap justify-center">
          {actions.map((action, i) => (
            <button
              key={i}
              onClick={action.onClick}
              className={
                action.variant === 'primary'
                  ? 'inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-[var(--accent)] text-white text-sm font-semibold transition-all hover:opacity-90 active:scale-[0.98]'
                  : 'inline-flex items-center gap-2 h-9 px-4 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface-1)] text-sm font-medium text-[var(--text-secondary)] transition-all hover:bg-[var(--bg-subtle)] active:scale-[0.98]'
              }
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
