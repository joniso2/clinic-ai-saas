export type AppointmentType = 'new' | 'follow_up';

export type Appointment = {
  id: string;
  clinic_id: string;
  patient_name: string;
  datetime: string; // ISO with timezone
  type: AppointmentType;
  created_at: string;
  lead_id?: string | null;
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
