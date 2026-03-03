export type PatientStatus = 'active' | 'dormant' | 'inactive';

export type Patient = {
  id: string;
  clinic_id: string;
  lead_id: string | null;
  full_name: string;
  phone: string;
  total_revenue: number;
  visits_count: number;
  last_visit_date: string | null;
  status: PatientStatus;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
};

export type CompletedAppointmentRow = {
  id: string;
  datetime: string;
  service_name: string | null;
  revenue: number | null;
  notes: string | null;
};
