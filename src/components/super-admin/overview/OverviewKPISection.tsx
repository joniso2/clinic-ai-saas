import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { KPIMetric } from '@/types/analytics';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatValue(m: KPIMetric): string {
  const raw =
    typeof m.value === 'number' ? m.value.toLocaleString('he-IL') : m.value;
  return `${m.prefix ?? ''}${raw}${m.suffix ?? ''}`;
}

function TrendBadge({ change, trend }: { change?: number; trend?: KPIMetric['trend'] }) {
  if (change === undefined || !trend) return null;

  const isUp = trend === 'up';
  const isDown = trend === 'down';
  const Icon = isUp ? TrendingUp : isDown ? TrendingDown : Minus;

  return (
    <span
      className={[
        'inline-flex items-center gap-0.5 text-[11px] font-semibold px-1.5 py-0.5 rounded-md',
        isUp
          ? 'text-emerald-400 bg-emerald-400/10'
          : isDown
          ? 'text-red-400 bg-red-400/10'
          : 'text-zinc-400 bg-zinc-400/10',
      ].join(' ')}
    >
      <Icon className="h-2.5 w-2.5 shrink-0" />
      {change > 0 ? '+' : ''}
      {change}%
    </span>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
interface OverviewKPISectionProps {
  kpis: KPIMetric[];
}

export default function OverviewKPISection({ kpis }: OverviewKPISectionProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {kpis.map((kpi) => (
        <div
          key={kpi.id}
          className={[
            'rounded-2xl border p-6 flex flex-col gap-2 transition-all duration-200 text-right',
            kpi.highlight
              ? 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 border-indigo-500/30'
              : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-600',
          ].join(' ')}
        >
          <p className="text-xs font-medium text-slate-500 dark:text-slate-500 leading-tight">
            {kpi.label}
          </p>

          <p
            className={[
              'text-2xl font-bold tabular-nums leading-none tracking-tight',
              kpi.highlight ? 'text-indigo-600 dark:text-indigo-200' : 'text-slate-900 dark:text-slate-50',
            ].join(' ')}
          >
            {formatValue(kpi)}
          </p>

          <div className="flex justify-end">
            <TrendBadge change={kpi.change} trend={kpi.trend} />
          </div>
        </div>
      ))}
    </div>
  );
}
