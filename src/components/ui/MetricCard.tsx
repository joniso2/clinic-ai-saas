'use client';

import type { ComponentType, SVGProps } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export type MetricColor = 'indigo' | 'emerald' | 'amber' | 'blue' | 'red' | 'slate' | 'purple' | 'orange' | 'teal';
export type MetricSize = 'hero' | 'standard' | 'compact';

const COLOR_MAP: Record<MetricColor, { dot: string; dotBg: string }> = {
  indigo:  { dot: 'text-[var(--accent)]',          dotBg: 'bg-[var(--accent-light)]' },
  emerald: { dot: 'text-[var(--success)]',         dotBg: 'bg-[var(--success-light)]' },
  amber:   { dot: 'text-[var(--warning)]',         dotBg: 'bg-[var(--warning-light)]' },
  blue:    { dot: 'text-[var(--info)]',            dotBg: 'bg-[var(--info-light)]' },
  red:     { dot: 'text-[var(--danger)]',          dotBg: 'bg-[var(--danger-light)]' },
  slate:   { dot: 'text-[var(--text-secondary)]',  dotBg: 'bg-[var(--surface-inset)]' },
  purple:  { dot: 'text-purple-600 dark:text-purple-400',  dotBg: 'bg-purple-100 dark:bg-purple-900/40' },
  orange:  { dot: 'text-orange-600 dark:text-orange-400',  dotBg: 'bg-orange-100 dark:bg-orange-900/40' },
  teal:    { dot: 'text-teal-600 dark:text-teal-400',      dotBg: 'bg-teal-100 dark:bg-teal-900/40' },
};

interface MetricCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: ComponentType<SVGProps<SVGSVGElement> & { strokeWidth?: number }>;
  color?: MetricColor;
  size?: MetricSize;
  trend?: { value: number; direction: 'up' | 'down' | 'flat' };
  className?: string;
}

export function MetricCard({
  label,
  value,
  sub,
  icon: Icon,
  color = 'indigo',
  size = 'standard',
  trend,
  className = '',
}: MetricCardProps) {
  const colors = COLOR_MAP[color];
  const isHero = size === 'hero';
  const isCompact = size === 'compact';

  const valueSize = isHero ? 'text-2xl' : isCompact ? 'text-lg' : 'text-xl';

  const TrendIcon = trend?.direction === 'up' ? TrendingUp : trend?.direction === 'down' ? TrendingDown : Minus;
  const trendColor = trend?.direction === 'up'
    ? 'text-[var(--success)] bg-[var(--success-light)]'
    : trend?.direction === 'down'
    ? 'text-[var(--danger)] bg-[var(--danger-light)]'
    : 'text-[var(--text-tertiary)] bg-[var(--surface-inset)]';

  return (
    <div
      className={`
        rounded-lg border border-[var(--border)]
        bg-[var(--surface)] p-4
        transition-colors
        hover:border-[var(--border-strong)]
        ${className}
      `}
      style={{ boxShadow: 'var(--shadow-xs)' }}
    >
      {/* Icon + label inline */}
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon className={`h-4 w-4 shrink-0 ${colors.dot}`} strokeWidth={2} />
        <span className={`${isCompact ? 'text-[10px]' : 'text-[11px]'} font-medium text-[var(--text-tertiary)] uppercase tracking-wider`}>
          {label}
        </span>
      </div>

      {/* Value + sub */}
      <div className="flex items-baseline justify-between gap-2">
        <span className={`${valueSize} font-semibold tabular-nums text-[var(--text-primary)] leading-tight`}>
          {value}
        </span>
        {sub && (
          <span className="text-[11px] text-[var(--text-quaternary)] shrink-0">{sub}</span>
        )}
      </div>

      {/* Trend */}
      {trend && (
        <div className="mt-1.5">
          <span className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${trendColor}`}>
            <TrendIcon className="h-3 w-3" />
            {trend.value > 0 ? '+' : ''}{trend.value}%
          </span>
        </div>
      )}
    </div>
  );
}

/* Re-export color map for consumers that need color keys */
export { COLOR_MAP as METRIC_COLORS };
