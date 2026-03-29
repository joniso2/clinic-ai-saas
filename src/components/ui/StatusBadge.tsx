'use client';

import type { ReactNode } from 'react';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'accent';
type BadgeSize = 'sm' | 'md';

const VARIANT_STYLES: Record<BadgeVariant, string> = {
  success: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 ring-emerald-200/50 dark:ring-emerald-800/30',
  warning: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 ring-amber-200/50 dark:ring-amber-800/30',
  danger:  'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-400 ring-red-200/50 dark:ring-red-800/30',
  info:    'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400 ring-blue-200/50 dark:ring-blue-800/30',
  neutral: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 ring-slate-200/50 dark:ring-slate-700/30',
  accent:  'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-400 ring-indigo-200/50 dark:ring-indigo-800/30',
};

const SIZE_STYLES: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-[11px]',
  md: 'px-2.5 py-1 text-xs',
};

interface StatusBadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  children: ReactNode;
  className?: string;
}

export function StatusBadge({
  variant = 'neutral',
  size = 'sm',
  dot = false,
  children,
  className = '',
}: StatusBadgeProps) {
  const dotColor: Record<BadgeVariant, string> = {
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-red-500',
    info: 'bg-blue-500',
    neutral: 'bg-slate-400',
    accent: 'bg-indigo-500',
  };

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 rounded-lg font-semibold ring-1 ring-inset
        ${SIZE_STYLES[size]}
        ${VARIANT_STYLES[variant]}
        ${className}
      `}
    >
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${dotColor[variant]}`} />}
      {children}
    </span>
  );
}
