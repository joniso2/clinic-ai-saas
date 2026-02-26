import * as appointmentRepo from '@/repositories/appointment.repository';
import type { Appointment, AppointmentType, ScheduleResult } from '@/types/appointments';

// ─── Clinic constants ───────────────────────────────────────────────────────
const CLINIC_OPEN_HOUR    = 8;   // 08:00 Israel time
const CLINIC_CLOSE_HOUR   = 16;  // 16:00 Israel time
const SLOT_MINUTES        = 30;  // appointment slot length
const FOLLOW_UP_MIN_DAYS  = 7;   // minimum days between appointments
const MAX_SUGGESTION_DAYS = 14;  // how many days forward to scan for alternatives

// ─── Timezone helpers ────────────────────────────────────────────────────────
/** Returns the hour (0-23) for a UTC Date in Israel time (Asia/Jerusalem). */
function israelHour(utcDate: Date): number {
  return parseInt(
    new Intl.DateTimeFormat('en-IL', {
      timeZone: 'Asia/Jerusalem',
      hour: 'numeric',
      hour12: false,
    }).format(utcDate),
    10,
  );
}

/** Returns a YYYY-MM-DD string in Israel time for a UTC Date. */
function israelDateString(utcDate: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jerusalem',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(utcDate); // en-CA produces "YYYY-MM-DD"
}

/** Advance a Date by N minutes. */
function addMinutes(date: Date, mins: number): Date {
  return new Date(date.getTime() + mins * 60_000);
}

/** Round a Date up to the nearest slot boundary. */
function ceilToSlot(date: Date): Date {
  const ms      = date.getTime();
  const slotMs  = SLOT_MINUTES * 60_000;
  const remainder = ms % slotMs;
  return remainder === 0 ? date : new Date(ms + (slotMs - remainder));
}

// ─── Core helpers ────────────────────────────────────────────────────────────

/** Parse an ISO datetime string (possibly without tz, treated as Israel time). */
function parseRequestedDatetime(raw: string): Date {
  const trimmed = raw.trim();
  // If the string already has a timezone offset, use it directly
  if (/[Zz]$|[+-]\d{2}:\d{2}$/.test(trimmed)) {
    return new Date(trimmed);
  }
  // Otherwise, treat as Israel Standard Time (UTC+2)
  return new Date(trimmed + '+02:00');
}

/**
 * Return an array of taken UTC datetime strings on a given UTC day
 * (formatted as "YYYY-MM-DD" in Israel time).
 */
async function getTakenSlotsOnDay(
  clinicId: string,
  israelDay: string, // "YYYY-MM-DD"
): Promise<string[]> {
  // Build a range for the full Israel calendar day in UTC
  const dayStart = new Date(`${israelDay}T00:00:00+02:00`);
  const dayEnd   = new Date(`${israelDay}T23:59:59+02:00`);

  const { data } = await appointmentRepo.getAppointmentsInRange(
    clinicId,
    dayStart.toISOString(),
    dayEnd.toISOString(),
  );
  return (data ?? []).map((a) => a.datetime);
}

// ─── Public service functions ────────────────────────────────────────────────

/** Check if a slot is within clinic opening hours. */
export function enforceOpeningHours(requestedDate: Date): boolean {
  const hour = israelHour(requestedDate);
  return hour >= CLINIC_OPEN_HOUR && hour < CLINIC_CLOSE_HOUR;
}

/**
 * Validate that a follow-up appointment is at least FOLLOW_UP_MIN_DAYS
 * after the patient's last appointment.
 * Returns { valid: true } or { valid: false, earliestAllowed: ISO }
 */
export async function validateFollowUp(
  clinicId: string,
  patientName: string,
  requestedDate: Date,
): Promise<{ valid: boolean; earliestAllowed?: string }> {
  const { data: last } = await appointmentRepo.getLastAppointmentForPatient(
    clinicId,
    patientName,
  );
  if (!last) return { valid: true };

  const lastDate    = new Date(last.datetime);
  const minAllowed  = new Date(lastDate.getTime() + FOLLOW_UP_MIN_DAYS * 86_400_000);

  if (requestedDate < minAllowed) {
    return { valid: false, earliestAllowed: minAllowed.toISOString() };
  }
  return { valid: true };
}

/**
 * Find the closest available slot at or after `afterDate`.
 * Scans up to MAX_SUGGESTION_DAYS days forward.
 * Returns an array of up to 3 ISO suggestion strings, or [] if none found.
 */
export async function suggestClosestAvailable(
  clinicId: string,
  afterDate: Date,
  count = 3,
): Promise<string[]> {
  const suggestions: string[] = [];
  let cursor = ceilToSlot(afterDate);

  const limit = new Date(afterDate.getTime() + MAX_SUGGESTION_DAYS * 86_400_000);

  while (suggestions.length < count && cursor < limit) {
    const hour = israelHour(cursor);

    // Skip outside clinic hours
    if (hour < CLINIC_OPEN_HOUR) {
      // Jump to open time of this day
      const day = israelDateString(cursor);
      cursor = new Date(`${day}T${String(CLINIC_OPEN_HOUR).padStart(2, '0')}:00:00+02:00`);
      continue;
    }
    if (hour >= CLINIC_CLOSE_HOUR) {
      // Jump to next day open time
      const nextDay = new Date(cursor.getTime() + 86_400_000);
      const nextDayStr = israelDateString(nextDay);
      cursor = new Date(`${nextDayStr}T${String(CLINIC_OPEN_HOUR).padStart(2, '0')}:00:00+02:00`);
      continue;
    }

    // Check if slot is free
    const slotEnd = addMinutes(cursor, SLOT_MINUTES);
    const { data: taken } = await appointmentRepo.getAppointmentsInRange(
      clinicId,
      cursor.toISOString(),
      slotEnd.toISOString(),
    );

    if (!taken || taken.length === 0) {
      suggestions.push(cursor.toISOString());
    }

    cursor = addMinutes(cursor, SLOT_MINUTES);
  }

  return suggestions;
}

export type ScheduleAppointmentParams = {
  clinicId: string;
  patientName: string;
  requestedDatetimeRaw: string;
  type: AppointmentType;
  leadId?: string | null;
};

/**
 * Main entry point for scheduling.
 * Validates hours, follow-up rules, and overlap, then creates the appointment
 * or returns structured alternatives.
 */
export async function scheduleAppointment(params: ScheduleAppointmentParams): Promise<ScheduleResult> {
  const { clinicId, patientName, requestedDatetimeRaw, type, leadId } = params;

  const requestedDate = parseRequestedDatetime(requestedDatetimeRaw);

  // 1. Enforce opening hours
  if (!enforceOpeningHours(requestedDate)) {
    return {
      status: 'outside_hours',
      openHour:  CLINIC_OPEN_HOUR,
      closeHour: CLINIC_CLOSE_HOUR,
    };
  }

  // 2. Follow-up rule
  if (type === 'follow_up') {
    const followUpCheck = await validateFollowUp(clinicId, patientName, requestedDate);
    if (!followUpCheck.valid) {
      return {
        status: 'follow_up_too_soon',
        earliestAllowed: followUpCheck.earliestAllowed!,
      };
    }
  }

  // 3. Check slot availability (no overlap within the slot window)
  const slotEnd = addMinutes(requestedDate, SLOT_MINUTES);
  const { data: existing } = await appointmentRepo.getAppointmentsInRange(
    clinicId,
    requestedDate.toISOString(),
    slotEnd.toISOString(),
  );

  if (existing && existing.length > 0) {
    const suggestions = await suggestClosestAvailable(
      clinicId,
      addMinutes(requestedDate, SLOT_MINUTES),
    );
    return { status: 'unavailable', suggestions };
  }

  // 4. Create the appointment
  const { data, error } = await appointmentRepo.createAppointment({
    clinic_id:    clinicId,
    patient_name: patientName,
    datetime:     requestedDate.toISOString(),
    type,
    lead_id:      leadId ?? null,
  });

  if (error || !data) {
    console.error('[AppointmentService] create failed:', error);
    // Try to suggest alternatives instead of silently failing
    const suggestions = await suggestClosestAvailable(clinicId, requestedDate);
    return { status: 'unavailable', suggestions };
  }

  return { status: 'confirmed', appointment: data };
}

/** Format an ISO datetime string for display in Israel time. */
export function formatAppointmentTime(isoString: string): string {
  return new Intl.DateTimeFormat('he-IL', {
    timeZone: 'Asia/Jerusalem',
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(isoString));
}
