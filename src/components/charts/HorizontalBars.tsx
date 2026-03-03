'use client';

export interface HorizontalBarItem {
  readonly label: string;
  readonly value: number;
  readonly secondaryValue?: number;
}

interface HorizontalBarsProps {
  data: HorizontalBarItem[];
  /** Tailwind-compatible hex / CSS colour for the primary bar */
  primaryColor?: string;
  /** Tailwind-compatible hex / CSS colour for the secondary bar */
  secondaryColor?: string;
  valueFormatter?: (v: number) => string;
  maxItems?: number;
}

export default function HorizontalBars({
  data,
  primaryColor = '#6366f1',
  secondaryColor = '#10b981',
  valueFormatter = (v) => v.toLocaleString('he-IL'),
  maxItems = 8,
}: HorizontalBarsProps) {
  const visible = data.slice(0, maxItems);
  const maxVal = Math.max(...visible.map((d) => d.value + (d.secondaryValue ?? 0)), 1);

  if (visible.length === 0) {
    return (
      <p className="text-xs text-zinc-500 text-center py-6">אין נתונים להצגה</p>
    );
  }

  return (
    <div className="space-y-3" dir="rtl">
      {visible.map((item, i) => (
        <div key={i} className="flex items-start gap-3">
          {/* Label */}
          <span className="text-xs text-zinc-400 w-28 text-right truncate shrink-0 pt-0.5">
            {item.label}
          </span>

          {/* Bars */}
          <div className="flex-1 space-y-1">
            {/* Primary */}
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-zinc-800 rounded-full overflow-hidden h-2">
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: `${(item.value / maxVal) * 100}%`,
                    backgroundColor: primaryColor,
                  }}
                />
              </div>
              <span className="text-xs tabular-nums text-zinc-200 w-14 text-right shrink-0">
                {valueFormatter(item.value)}
              </span>
            </div>

            {/* Secondary (optional) */}
            {item.secondaryValue !== undefined && (
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-zinc-800 rounded-full overflow-hidden h-1">
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{
                      width: `${(item.secondaryValue / maxVal) * 100}%`,
                      backgroundColor: secondaryColor,
                    }}
                  />
                </div>
                <span className="text-xs tabular-nums text-zinc-500 w-14 text-right shrink-0">
                  {valueFormatter(item.secondaryValue)}
                </span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
