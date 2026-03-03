export type AppointmentType = 'new' | 'follow_up';

export type AppointmentStatus = 'scheduled' | 'completed' | 'cancelled' | 'ai_failed';

export type Appointment = {
  id: string;
  clinic_id: string;
  patient_name: string;
  datetime: string; // ISO with timezone
  type: AppointmentType;
  created_at: string;
  lead_id?: string | null;
  duration_minutes: number;
  /** Optional: from DB when available */
  status?: AppointmentStatus | null;
  revenue?: number | null;
  service_name?: string | null;
  /** TODO: Add when backend exposes AI-created flag. Do NOT change DB. */
  is_ai_created?: boolean;
  // Intelligence fields
  appointment_summary?: string | null;
  urgency_level?: 'low' | 'medium' | 'high' | null;
  priority_level?: 'low' | 'medium' | 'high' | null;
};

export type ScheduleStatus =
  | 'confirmed'
  | 'unavailable'
  | 'outside_hours'
  | 'follow_up_too_soon';

export type ScheduleResult =
  | { status: 'confirmed'; appointment: Appointment }
  | { status: 'unavailable'; suggestions: string[] }
  | { status: 'outside_hours'; openHour: number; closeHour: number }
  | { status: 'follow_up_too_soon'; earliestAllowed: string };
