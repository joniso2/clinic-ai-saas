'use client';

import { useEffect, useRef, useState, type ComponentType, type SVGProps, type CSSProperties } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════════════════════
   KpiCardPremium — Top-tier metric card for SaaS dashboards
   ─────────────────────────────────────────────────────────────────────────────
   variant="primary"  → hero card: rich gradient, glow, layered depth
   variant="default"  → elevated card: clean, calm, premium surface
   ═══════════════════════════════════════════════════════════════════════════════ */

type IconComponent = ComponentType<SVGProps<SVGSVGElement> & { strokeWidth?: number }>;

export type AccentHue = 'indigo' | 'sky' | 'emerald' | 'violet' | 'red' | 'amber' | 'slate';

export interface KpiCardPremiumProps {
  title: string;
  value: string | number;
  icon: IconComponent;
  variant?: 'default' | 'primary';
  trend?: string;            // e.g. "+12%", "-3%", "0%"
  accentHue?: AccentHue;     // per-card accent color (default variant only)
  danger?: boolean;          // red danger wash + red value text
  className?: string;
}

/* ── Per-card accent color map ── */
const ACCENT_STYLES: Record<AccentHue, {
  icon: string; iconHover: string; dot: string;
  shadow: string;
}> = {
  indigo: {
    icon: 'bg-indigo-50 text-indigo-500 dark:bg-indigo-950/30 dark:text-indigo-400',
    iconHover: 'group-hover:bg-indigo-500 group-hover:text-white dark:group-hover:bg-indigo-500',
    dot: 'bg-indigo-500',
    shadow: '0 1px 3px rgba(79,70,229,0.10)',
  },
  sky: {
    icon: 'bg-sky-50 text-sky-500 dark:bg-sky-950/30 dark:text-sky-400',
    iconHover: 'group-hover:bg-sky-500 group-hover:text-white dark:group-hover:bg-sky-500',
    dot: 'bg-sky-500',
    shadow: '0 1px 3px rgba(14,165,233,0.10)',
  },
  emerald: {
    icon: 'bg-emerald-50 text-emerald-500 dark:bg-emerald-950/30 dark:text-emerald-400',
    iconHover: 'group-hover:bg-emerald-500 group-hover:text-white dark:group-hover:bg-emerald-500',
    dot: 'bg-emerald-500',
    shadow: '0 1px 3px rgba(16,185,129,0.10)',
  },
  violet: {
    icon: 'bg-violet-50 text-violet-500 dark:bg-violet-950/30 dark:text-violet-400',
    iconHover: 'group-hover:bg-violet-500 group-hover:text-white dark:group-hover:bg-violet-500',
    dot: 'bg-violet-500',
    shadow: '0 1px 3px rgba(139,92,246,0.10)',
  },
  red: {
    icon: 'bg-red-50 text-red-500 dark:bg-red-950/25 dark:text-red-400',
    iconHover: 'group-hover:bg-red-500 group-hover:text-white dark:group-hover:bg-red-500',
    dot: 'bg-red-500',
    shadow: '0 1px 3px rgba(239,68,68,0.10)',
  },
  amber: {
    icon: 'bg-amber-50 text-amber-500 dark:bg-amber-950/30 dark:text-amber-400',
    iconHover: 'group-hover:bg-amber-500 group-hover:text-white dark:group-hover:bg-amber-500',
    dot: 'bg-amber-500',
    shadow: '0 1px 3px rgba(245,158,11,0.10)',
  },
  slate: {
    icon: 'bg-slate-50 text-slate-400 dark:bg-slate-800/40 dark:text-slate-500',
    iconHover: 'group-hover:bg-slate-400 group-hover:text-white dark:group-hover:bg-slate-600',
    dot: 'bg-slate-400',
    shadow: '0 1px 3px rgba(100,116,139,0.08)',
  },
};

/* ── Shadow systems ────────────────────────────────────────────────────────── */

const shadows = {
  default: {
    light: [
      '0 0 0 0.5px rgba(0,0,0,0.04)',
      '0 0.5px 1px rgba(0,0,0,0.02)',
      '0 2px 4px rgba(0,0,0,0.02)',
      '0 4px 12px rgba(0,0,0,0.03)',
      '0 12px 28px rgba(0,0,0,0.03)',
      '0 24px 40px rgba(0,0,0,0.01)',
    ].join(', '),
    lightHover: [
      '0 0 0 0.5px rgba(0,0,0,0.05)',
      '0 1px 2px rgba(0,0,0,0.02)',
      '0 3px 8px rgba(0,0,0,0.03)',
      '0 10px 24px rgba(0,0,0,0.05)',
      '0 24px 48px rgba(0,0,0,0.04)',
      '0 40px 64px rgba(0,0,0,0.02)',
    ].join(', '),
    dark: [
      '0 0 0 0.5px rgba(255,255,255,0.05)',
      '0 0.5px 1px rgba(0,0,0,0.20)',
      '0 2px 4px rgba(0,0,0,0.16)',
      '0 4px 12px rgba(0,0,0,0.14)',
      '0 12px 28px rgba(0,0,0,0.12)',
      '0 24px 40px rgba(0,0,0,0.06)',
    ].join(', '),
    darkHover: [
      '0 0 0 0.5px rgba(255,255,255,0.07)',
      '0 1px 2px rgba(0,0,0,0.24)',
      '0 3px 8px rgba(0,0,0,0.20)',
      '0 10px 24px rgba(0,0,0,0.18)',
      '0 24px 48px rgba(0,0,0,0.14)',
      '0 40px 64px rgba(0,0,0,0.08)',
    ].join(', '),
  },
  primary: {
    rest: [
      '0 0.5px 1px rgba(30,21,71,0.18)',
      '0 2px 4px rgba(30,21,71,0.14)',
      '0 5px 12px rgba(45,31,110,0.16)',
      '0 14px 28px rgba(72,41,168,0.20)',
      '0 28px 56px rgba(72,41,168,0.12)',
      '0 0 0 0.5px rgba(139,76,232,0.10)',
      'inset 0 1px 0 rgba(255,255,255,0.09)',
    ].join(', '),
    hover: [
      '0 0.5px 1px rgba(30,21,71,0.22)',
      '0 2px 6px rgba(30,21,71,0.18)',
      '0 8px 18px rgba(45,31,110,0.22)',
      '0 22px 44px rgba(72,41,168,0.26)',
      '0 44px 80px rgba(72,41,168,0.16)',
      '0 0 56px rgba(139,76,232,0.12)',
      '0 0 0 0.5px rgba(139,76,232,0.14)',
      'inset 0 1px 0 rgba(255,255,255,0.13)',
    ].join(', '),
  },
} as const;

/* ── Noise SVG data URI (reused across variants) ── */
const NOISE_BG = `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`;

/* ── Dark mode hook ── */
function useDarkMode() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const html = document.documentElement;
    setDark(html.classList.contains('dark'));

    const observer = new MutationObserver(() => {
      setDark(html.classList.contains('dark'));
    });
    observer.observe(html, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  return dark;
}

/* ═══════════════════════════════════════════════════════════════════════════════
   PRIMARY VARIANT — rich gradient hero card
   ═══════════════════════════════════════════════════════════════════════════════ */

function PrimaryCard({ title, value, icon: Icon, trend, className = '' }: KpiCardPremiumProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const style: CSSProperties = {
    background: [
      'radial-gradient(ellipse 80% 60% at 85% 15%, rgba(167,139,250,0.18) 0%, transparent 60%)',
      'radial-gradient(ellipse 50% 80% at 10% 90%, rgba(99,102,241,0.12) 0%, transparent 50%)',
      'linear-gradient(155deg, #1a1240 0%, #231760 14%, #2d1f6e 28%, #3d2494 42%, #4829a8 56%, #5a2fc0 68%, #6935d4 80%, #7b40e0 90%, #8b4ce8 100%)',
    ].join(', '),
    boxShadow: shadows.primary.rest,
  };

  return (
    <div
      ref={cardRef}
      className={`
        group relative rounded-[20px] p-6 overflow-hidden cursor-default
        hover:-translate-y-[3px]
        transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]
        will-change-transform
        ${className}
      `}
      style={style}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = shadows.primary.hover;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = shadows.primary.rest;
      }}
    >
      {/* ── Noise grain ── */}
      <div
        className="absolute inset-0 opacity-[0.025] mix-blend-overlay pointer-events-none"
        style={{ backgroundImage: NOISE_BG }}
      />

      {/* ── Specular highlight — simulates overhead light source ── */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: '-30%', right: '-10%',
          width: '70%', height: '70%',
          borderRadius: '50%',
          background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.02) 40%, transparent 70%)',
        }}
      />

      {/* ── Ambient orbs — layered internal dimension ── */}
      <div className="absolute -top-20 end-0 h-48 w-48 rounded-full bg-violet-400/[0.12] blur-[56px] pointer-events-none" />
      <div className="absolute -bottom-16 -start-12 h-40 w-40 rounded-full bg-indigo-300/[0.08] blur-[48px] pointer-events-none" />
      <div className="absolute top-1/2 start-1/3 -translate-y-1/2 h-24 w-48 rounded-full bg-white/[0.02] blur-[40px] pointer-events-none" />
      {/* tertiary warm orb — breaks uniformity */}
      <div className="absolute top-1/4 end-1/4 h-16 w-32 rounded-full bg-fuchsia-400/[0.04] blur-[32px] pointer-events-none" />

      {/* ── Top shimmer — dual-layer for width ── */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-l from-transparent via-white/[0.14] to-transparent pointer-events-none" />
      <div className="absolute top-px inset-x-4 h-px bg-gradient-to-l from-transparent via-white/[0.05] to-transparent pointer-events-none" />

      {/* ── Side edge highlights ── */}
      <div className="absolute top-4 bottom-4 end-0 w-px bg-gradient-to-b from-transparent via-white/[0.06] to-transparent pointer-events-none" />

      {/* ── Bottom vignette — softer falloff ── */}
      <div className="absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t from-black/[0.08] via-black/[0.03] to-transparent pointer-events-none" />

      {/* ── Hover glow ring ── */}
      <div className="absolute inset-0 rounded-[20px] ring-1 ring-inset ring-white/[0.05] group-hover:ring-white/[0.09] transition-all duration-500 pointer-events-none" />

      {/* ── Content ── */}
      <div className="relative flex items-center gap-4">
        {/* Icon — frosted glass container */}
        <div className="relative h-14 w-14 rounded-[16px] flex items-center justify-center shrink-0 group-hover:scale-[1.03] transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]" style={{ willChange: 'transform' }}>
          <div className="absolute inset-0 rounded-[16px] bg-white/[0.08] backdrop-blur-sm" />
          <div className="absolute inset-0 rounded-[16px] ring-1 ring-inset ring-white/[0.10] group-hover:ring-white/[0.14] transition-all duration-500" />
          <div className="absolute inset-0 rounded-[16px] bg-gradient-to-b from-white/[0.08] to-transparent" />
          {/* inner top-edge highlight */}
          <div className="absolute top-0 inset-x-2 h-px rounded-full bg-white/[0.12] pointer-events-none" />
          <Icon className="relative h-6 w-6 text-white/90 group-hover:text-white transition-colors duration-500" strokeWidth={1.6} />
        </div>

        <div className="min-w-0 flex-1">
          {/* Title */}
          <p className="text-[10.5px] font-semibold text-white/40 tracking-[0.10em] uppercase mb-3 select-none leading-none">
            {title}
          </p>

          {/* Value + trend */}
          <div className="flex items-end gap-3">
            <p className="text-[36px] font-bold text-white tabular-nums leading-none tracking-[-0.03em]">
              {value}
            </p>
            {trend && <TrendBadge trend={trend} variant="primary" />}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   DEFAULT VARIANT — clean elevated surface
   ═══════════════════════════════════════════════════════════════════════════════ */

function DefaultCard({ title, value, icon: Icon, trend, accentHue = 'indigo', danger, className = '' }: KpiCardPremiumProps) {
  const isDark = useDarkMode();
  const accent = ACCENT_STYLES[accentHue ?? 'indigo'];

  const dangerShadow = {
    light: '0 0 0 1px rgba(239,68,68,0.08), 0 1px 2px rgba(0,0,0,0.03), 0 4px 12px rgba(239,68,68,0.05), 0 12px 28px rgba(0,0,0,0.02)',
    lightHover: '0 0 0 1px rgba(239,68,68,0.12), 0 2px 4px rgba(0,0,0,0.04), 0 10px 24px rgba(239,68,68,0.08), 0 24px 48px rgba(0,0,0,0.04)',
    dark: '0 0 0 1px rgba(239,68,68,0.10), 0 1px 3px rgba(0,0,0,0.24), 0 4px 12px rgba(239,68,68,0.08), 0 12px 28px rgba(0,0,0,0.14)',
    darkHover: '0 0 0 1px rgba(239,68,68,0.14), 0 2px 6px rgba(0,0,0,0.28), 0 10px 24px rgba(239,68,68,0.12), 0 24px 48px rgba(0,0,0,0.18)',
  };

  const getShadow = (hovered: boolean, dark: boolean) => {
    if (danger) return dark ? (hovered ? dangerShadow.darkHover : dangerShadow.dark) : (hovered ? dangerShadow.lightHover : dangerShadow.light);
    return dark ? (hovered ? shadows.default.darkHover : shadows.default.dark) : (hovered ? shadows.default.lightHover : shadows.default.light);
  };

  return (
    <div
      className={`
        group relative rounded-[18px] p-5 overflow-hidden cursor-default
        bg-white dark:bg-[#161d30]
        hover:-translate-y-[2px]
        transition-all duration-[450ms] ease-[cubic-bezier(0.16,1,0.3,1)]
        will-change-transform
        ${className}
      `}
      style={{ boxShadow: getShadow(false, isDark) }}
      onMouseEnter={(e) => {
        const dark = document.documentElement.classList.contains('dark');
        e.currentTarget.style.boxShadow = getShadow(true, dark);
      }}
      onMouseLeave={(e) => {
        const dark = document.documentElement.classList.contains('dark');
        e.currentTarget.style.boxShadow = getShadow(false, dark);
      }}
    >
      {/* ── Danger wash overlay ── */}
      {danger && (
        <div className="absolute inset-0 rounded-[18px] bg-gradient-to-br from-red-50/60 via-red-50/20 to-transparent dark:from-red-950/12 dark:via-transparent pointer-events-none" />
      )}

      {/* ── Inner surface highlight — simulates slight curvature ── */}
      <div className="absolute inset-0 rounded-[18px] bg-gradient-to-b from-white/[0.6] via-transparent to-black/[0.01] dark:from-white/[0.03] dark:to-black/[0.04] pointer-events-none" />

      {/* ── Subtle noise grain — adds surface texture ── */}
      <div
        className="absolute inset-0 rounded-[18px] opacity-[0.012] dark:opacity-[0.03] mix-blend-overlay pointer-events-none"
        style={{ backgroundImage: NOISE_BG }}
      />

      {/* ── Border ring — sub-pixel for softness ── */}
      <div className="absolute inset-0 rounded-[18px] pointer-events-none" style={{ boxShadow: 'inset 0 0 0 0.5px rgba(0,0,0,0.05)' }} />
      <div className="absolute inset-0 rounded-[18px] pointer-events-none dark:hidden" style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.8)' }} />
      <div className="absolute inset-0 rounded-[18px] pointer-events-none hidden dark:block" style={{ boxShadow: 'inset 0 0 0 0.5px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.03)' }} />

      {/* ── Top accent line (hover reveal) ── */}
      <div className={`absolute top-0 inset-x-6 h-[1.5px] rounded-full ${accent.dot} opacity-0 group-hover:opacity-70 transition-opacity duration-500 pointer-events-none`} />

      {/* ── Content ── */}
      <div className="relative">
        {/* Icon container */}
        <div className="mb-4">
          <div
            className={`
              h-10 w-10 rounded-[12px] flex items-center justify-center
              transition-all duration-[400ms] ease-[cubic-bezier(0.16,1,0.3,1)]
              group-hover:scale-[1.04]
              ${accent.icon} ${accent.iconHover}
            `}
            style={{ boxShadow: accent.shadow, willChange: 'transform' }}
          >
            <Icon className="h-[18px] w-[18px]" strokeWidth={1.7} />
          </div>
        </div>

        {/* Value */}
        <p className={`text-[28px] font-bold tabular-nums leading-none tracking-[-0.03em] ${
          danger ? 'text-red-500 dark:text-red-400' : 'text-slate-900 dark:text-slate-50'
        }`}>
          {value}
        </p>

        {/* Title + trend row */}
        <div className="flex items-center justify-between mt-2">
          <p className={`text-[11px] font-medium tracking-[0.01em] ${
            danger ? 'text-red-400/50 dark:text-red-400/40' : 'text-slate-400 dark:text-slate-500'
          }`}>
            {title}
          </p>
          {trend && <TrendBadge trend={trend} variant="default" />}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   Trend Badge — contextual micro-indicator
   ═══════════════════════════════════════════════════════════════════════════════ */

function TrendBadge({
  trend,
  variant,
}: {
  trend: string;
  variant: 'primary' | 'default';
}) {
  const isPositive = trend.startsWith('+');
  const isNegative = trend.startsWith('-');
  const TrendIcon = isNegative ? TrendingDown : TrendingUp;

  if (variant === 'primary') {
    return (
      <span
        className={`
          inline-flex items-center gap-1 rounded-full px-2.5 py-1
          text-[11px] font-semibold leading-none backdrop-blur-sm
          ${
            isPositive
              ? 'bg-emerald-400/[0.15] text-emerald-300'
              : isNegative
                ? 'bg-red-400/[0.15] text-red-300'
                : 'bg-white/[0.08] text-white/50'
          }
        `}
      >
        <TrendIcon className="h-3 w-3" />
        {trend}
      </span>
    );
  }

  return (
    <span
      className={`
        inline-flex items-center gap-1 rounded-full px-2 py-0.5
        text-[11px] font-semibold leading-none
        ${
          isPositive
            ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
            : isNegative
              ? 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400'
              : 'bg-slate-100 text-slate-500 dark:bg-slate-800/50 dark:text-slate-400'
        }
      `}
    >
      <TrendIcon className="h-3 w-3" />
      {trend}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   Public export
   ═══════════════════════════════════════════════════════════════════════════════ */

export function KpiCardPremium(props: KpiCardPremiumProps) {
  if (props.variant === 'primary') return <PrimaryCard {...props} />;
  return <DefaultCard {...props} />;
}
