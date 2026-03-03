'use client';

import type { TimeRange } from '@/types/analytics';

const RANGES: { value: TimeRange; label: string }[] = [
  { value: '7d',  label: '7 ימים' },
  { value: '30d', label: '30 ימים' },
  { value: '90d', label: '90 ימים' },
];

interface TimeRangeSelectorProps {
  value: TimeRange;
  onChange: (range: TimeRange) => void;
}

export default function TimeRangeSelector({ value, onChange }: TimeRangeSelectorProps) {
  return (
    <div
      className="inline-flex rounded-xl bg-zinc-900 border border-zinc-700 p-1 gap-0.5"
      role="group"
      aria-label="טווח זמן"
    >
      {RANGES.map((r) => (
        <button
          key={r.value}
          type="button"
          onClick={() => onChange(r.value)}
          className={[
            'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
            value === r.value
              ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700',
          ].join(' ')}
          aria-pressed={value === r.value}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}
