// ─── Types for Pricing Page ──────────────────────────────────────────────────

export type ClinicService = {
  id: string;
  clinic_id: string;
  service_name: string;
  price: number;
  duration_minutes: number;
  aliases: string[];
  is_active: boolean;
  description?: string | null;
  category?: string | null;
  color?: string | null;
  created_at?: string;
  updated_at?: string;
  bookings_count?: number;
  total_revenue?: number;
};

export const SERVICE_COLOR_PRESETS = [
  // Row 1 — vivid primaries
  '#6366f1', // indigo
  '#3b82f6', // blue
  '#06b6d4', // cyan
  '#14b8a6', // teal
  '#10b981', // emerald
  // Row 2 — warm tones
  '#22c55e', // green
  '#84cc16', // lime
  '#f59e0b', // amber
  '#f97316', // orange
  '#ef4444', // red
  // Row 3 — purples & pinks
  '#8b5cf6', // violet
  '#a855f7', // purple
  '#d946ef', // fuchsia
  '#ec4899', // pink
  '#f43f5e', // rose
  // Row 4 — deep & muted
  '#0ea5e9', // sky
  '#0891b2', // dark cyan
  '#059669', // dark emerald
  '#b45309', // dark amber
  '#dc2626', // dark red
] as const;

export type Role = 'CLINIC_ADMIN' | 'STAFF' | 'SUPER_ADMIN';
export type StatusFilter = 'all' | 'active' | 'inactive';
export type SortKey = 'newest' | 'price_desc' | 'price_asc' | 'duration_asc' | 'duration_desc' | 'name_az';

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'newest',        label: 'החדש ביותר' },
  { value: 'price_desc',    label: 'מחיר — גבוה לנמוך' },
  { value: 'price_asc',     label: 'מחיר — נמוך לגבוה' },
  { value: 'duration_asc',  label: 'משך — קצר לארוך' },
  { value: 'duration_desc', label: 'משך — ארוך לקצר' },
  { value: 'name_az',       label: 'שם א–ת' },
];
