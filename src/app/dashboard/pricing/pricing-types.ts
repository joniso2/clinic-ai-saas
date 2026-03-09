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
  created_at?: string;
  updated_at?: string;
  bookings_count?: number;
  total_revenue?: number;
};

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
