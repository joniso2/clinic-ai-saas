/** Tenant (clinic) option for selector. Same data as clinics API. */
export interface TenantOption {
  id: string;
  name: string | null;
}

/** Single service row — same as clinic_services table / API. Single source of truth. */
export interface ServiceRow {
  id: string;
  clinic_id: string;
  service_name: string;
  price: number;
  aliases: string[];
  is_active: boolean;
  duration_minutes?: number;
  created_at?: string;
}
