export interface TenantRow {
  id: string;
  name: string | null;
  plan_id: string | null;
  status: string;
  leads_count: number;
  appointments_count: number;
  discord_connected: boolean;
}

export interface PlanOption {
  id: string;
  name: string;
  price_monthly: number | null;
}

export interface TenantUser {
  user_id: string;
  email: string;
  full_name: string | null;
  role: string;
  last_sign_in_at: string | null;
  banned_until?: string;
}

export interface ServiceRow {
  id: string;
  service_name: string;
  price: number;
  aliases: string[];
  is_active: boolean;
}
