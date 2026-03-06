export interface Clinic {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  hero_image: string | null;
  hero_video: string | null;
  /** Optional: image URL for the hero 3D slot (replaces live 3D orb when set) */
  hero_3d_slot_image_url?: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  phone: string | null;
  created_at: string;
}

export interface ClinicService {
  id: string;
  clinic_id: string;
  service_name: string;
  price: number | null;
  duration_minutes: number;
  is_active: boolean;
  created_at: string;
}

export interface ClinicWorker {
  id: string;
  clinic_id: string;
  name: string;
  is_default: boolean;
  active: boolean;
  created_at: string;
}

export interface WorkingHours {
  id: string;
  clinic_id: string;
  worker_id: string | null;
  day_of_week: number;
  start_time: string;
  end_time: string;
}

export interface GalleryImage {
  id: string;
  clinic_id: string;
  image_url: string;
  sort_order: number;
  created_at: string;
}

export interface Appointment {
  id: string;
  clinic_id: string;
  service_id: string | null;
  worker_id: string | null;
  customer_phone: string;
  service_name_snapshot: string | null;
  service_duration_minutes: number | null;
  price_snapshot: number | null;
  start_time: string;
  end_time: string;
  status: 'locked' | 'confirmed' | 'cancelled';
  locked_until: string | null;
  booking_source: string;
  cancelled_at: string | null;
  cancelled_by: string | null;
  created_at: string;
}

export interface BookingProduct {
  id: string;
  name: string;
  price: number | null;
  image_url: string | null;
  description: string | null;
}

export interface ClinicPageData {
  clinic: Clinic;
  services: ClinicService[];
  workers: ClinicWorker[];
  gallery: GalleryImage[];
  workingHours: WorkingHours[];
  products: BookingProduct[];
}

export type BookingStep =
  | 'services'
  | 'worker'
  | 'date'
  | 'time'
  | 'phone'
  | 'otp'
  | 'success';
