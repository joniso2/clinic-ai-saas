export type Clinic = { id: string; name: string | null; slug: string | null; logo_url?: string | null };
export type PageData = { clinic: { id: string; name: string; address: string | null; hero_image: string | null; hero_video: string | null; logo_url: string | null; slug: string }; gallery: Array<{ id: string; image_url: string; sort_order: number }> };
export type Section = { id: string; section_type: string; position: number; is_enabled: boolean; settings_json: unknown };
export type MediaItem = { id: string; url: string; type: string; filename: string | null; created_at: string };
export type Service = { id: string; service_name: string; price: number; duration_minutes: number; description?: string | null; is_active: boolean };
export type Product = { id: string; name: string; price: number | null; image_url: string | null; description: string | null };

export const SECTION_LABELS: Record<string, string> = { hero: 'Hero', gallery: 'גלריה', services: 'שירותים', products: 'מוצרים', contact: 'צור קשר' };
export const COLORS = ['bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-violet-500', 'bg-rose-500'];

export type ServicesByClinic = Record<string, Service[]>;
export type InitialServicesList = { clinicId: string; services: Service[] }[];

export function getServicesForClinic(clinicId: string, byClinic: ServicesByClinic, list: InitialServicesList): Service[] {
  const fromList = list.find((x) => x.clinicId === clinicId)?.services;
  if (fromList && fromList.length > 0) return fromList;
  return byClinic[clinicId] ?? [];
}
