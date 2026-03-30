/**
 * Calendar color system — derives premium presentation tokens from raw service hex colors.
 *
 * Source of truth: clinic_services.color (hex string from pricing page).
 * This module transforms that single hex into a structured token set
 * for calendar card rendering.
 *
 * Usage: const tokens = deriveCalendarColors('#8b5cf6');
 *        tokens.surface   — very light tinted card background
 *        tokens.accent    — the strong service identity color
 *        tokens.border    — refined border tone
 *        tokens.strip     — side/top accent strip color
 *        tokens.dot       — service indicator dot
 *        tokens.text      — service name text color (readable)
 */

export type CalendarColorTokens = {
  /** Very light tinted surface — card background (not a heavy wash) */
  surface: string;
  /** The raw service color at full strength — for dots, icons, emphasis */
  accent: string;
  /** Border/outline color — visible but not heavy */
  border: string;
  /** Side/top strip accent — 4px color marker */
  strip: string;
  /** Service name text color — darker version for readability */
  text: string;
  /** Dot/indicator color */
  dot: string;
};

/**
 * Parse hex to RGB. Supports #RGB, #RRGGBB.
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  if (h.length === 3) {
    return {
      r: parseInt(h[0] + h[0], 16),
      g: parseInt(h[1] + h[1], 16),
      b: parseInt(h[2] + h[2], 16),
    };
  }
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

/**
 * Mix a color with white at a given ratio (0 = full white, 1 = full color).
 */
function tint(hex: string, ratio: number): string {
  const { r, g, b } = hexToRgb(hex);
  const mix = (c: number) => Math.round(c * ratio + 255 * (1 - ratio));
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

/**
 * Darken a color by mixing with black.
 */
function shade(hex: string, ratio: number): string {
  const { r, g, b } = hexToRgb(hex);
  const mix = (c: number) => Math.round(c * (1 - ratio));
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

/**
 * Derive calendar color tokens from a raw service hex color.
 */
export function deriveCalendarColors(hex: string): CalendarColorTokens {
  return {
    surface: tint(hex, 0.30),    // 30% color, 70% white — clearly tinted background
    accent: hex,                  // raw color
    border: tint(hex, 0.35),      // 35% color — clear border
    strip: hex,                   // full color (kept for potential future use)
    text: shade(hex, 0.15),       // slightly darker for readability
    dot: hex,                     // full color dot
  };
}

/** Fallback tokens when no service color is set */
export const FALLBACK_CALENDAR_TOKENS: CalendarColorTokens = {
  surface: '#ffffff',
  accent: '#94a3b8',
  border: '#e2e8f0',
  strip: '#cbd5e1',
  text: '#64748b',
  dot: '#94a3b8',
};
