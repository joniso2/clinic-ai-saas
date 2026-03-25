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
  '#6366f1', // indigo
  '#ec4899', // pink
  '#f59e0b', // amber
  '#10b981', // emerald
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ef4444', // red
  '#14b8a6', // teal
  '#f97316', // orange
  '#06b6d4', // cyan
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
