'use client';

import { useMemo } from 'react';
import type { TimeSeriesPoint } from '@/types/analytics';

interface SVGLineChartProps {
  data: TimeSeriesPoint[];
  strokeColor?: string;
  fillColor?: string;
  /** Pixel height of the rendered SVG */
  height?: number;
  /** Show first/last date labels on x-axis */
  showXLabels?: boolean;
  /** Must be unique per page to avoid gradient ID collisions */
  gradientId: string;
}

const PAD = 6;
const VIEW_W = 500;

export default function SVGLineChart({
  data,
  strokeColor = '#818cf8',
  fillColor = '#818cf8',
  height = 110,
  showXLabels = false,
  gradientId,
}: SVGLineChartProps) {
  const labelH = showXLabels ? 18 : 0;
  const chartH = height - labelH;

  const { pathD, fillD } = useMemo(() => {
    if (data.length < 2) return { pathD: '', fillD: '' };

    const values = data.map((d) => d.value);
    const min = Math.min(...values) * 0.97;
    const max = Math.max(...values) * 1.03;
    const range = max - min || 1;

    const pts = data.map((_, i) => ({
      x: PAD + (i / (data.length - 1)) * (VIEW_W - PAD * 2),
      y: PAD + (1 - (data[i].value - min) / range) * (chartH - PAD * 2),
    }));

    // Smooth cubic Bezier
    let path = `M ${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
    for (let i = 1; i < pts.length; i++) {
      const prev = pts[i - 1];
      const curr = pts[i];
      const cpX = ((prev.x + curr.x) / 2).toFixed(1);
      path += ` C ${cpX},${prev.y.toFixed(1)} ${cpX},${curr.y.toFixed(1)} ${curr.x.toFixed(1)},${curr.y.toFixed(1)}`;
    }

    const last = pts[pts.length - 1];
    const fill = `${path} L ${last.x.toFixed(1)},${chartH} L ${PAD},${chartH} Z`;

    return { pathD: path, fillD: fill };
  }, [data, chartH]);

  if (data.length < 2) {
    return (
      <div
        className="flex items-center justify-center text-xs text-zinc-600"
        style={{ height }}
      >
        אין נתונים
      </div>
    );
  }

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${height}`}
      className="w-full block"
      style={{ height }}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={fillColor} stopOpacity="0.22" />
          <stop offset="100%" stopColor={fillColor} stopOpacity="0.02" />
        </linearGradient>
      </defs>

      <path d={fillD} fill={`url(#${gradientId})`} />
      <path
        d={pathD}
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.8"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {showXLabels && data.length > 1 && (
        <>
          <text
            x={PAD}
            y={height - 3}
            fontSize="9"
            className="fill-zinc-500"
          >
            {data[0].label}
          </text>
          <text
            x={VIEW_W - PAD}
            y={height - 3}
            fontSize="9"
            textAnchor="end"
            className="fill-zinc-500"
          >
            {data[data.length - 1].label}
          </text>
        </>
      )}
    </svg>
  );
}
