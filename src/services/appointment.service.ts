import * as appointmentRepo from '@/repositories/appointment.repository';
import type { Appointment, AppointmentType, ScheduleResult } from '@/types/appointments';

// ─── Clinic constants (used as fallback defaults) ───────────────────────────
const CLINIC_OPEN_HOUR    = 8;   // 08:00 Israel time
const CLINIC_CLOSE_HOUR   = 16;  // 16:00 Israel time
const SLOT_MINUTES        = 30;  // appointment slot length
const FOLLOW_UP_MIN_DAYS  = 7;   // minimum days between appointments
const MAX_SUGGESTION_DAYS = 14;  // how many days forward to scan for alternatives

// ─── Scheduling config (injected from clinic settings) ──────────────────────
export type SchedulingConfig = {
  openHour?: number;
  closeHour?: number;
  slotMinutes?: number;
  bufferMinutes?: number;
  maxPerDay?: number | null;
  minBookingNoticeHours?: number;
  maxSuggestionDays?: number;
};

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
 * Scans up to maxSuggestionDays days forward.
 * Returns an array of up to 3 ISO suggestion strings, or [] if none found.
 */
export async function suggestClosestAvailable(
  clinicId: string,
  afterDate: Date,
  count = 3,
  config?: SchedulingConfig,
): Promise<string[]> {
  const openHour  = config?.openHour  ?? CLINIC_OPEN_HOUR;
  const closeHour = config?.closeHour ?? CLINIC_CLOSE_HOUR;
  const slotMins  = config?.slotMinutes  ?? SLOT_MINUTES;
  const bufferMins = config?.bufferMinutes ?? 0;
  const maxDays   = config?.maxSuggestionDays ?? MAX_SUGGESTION_DAYS;

  const suggestions: string[] = [];
  let cursor = ceilToSlot(afterDate);

  const limit = new Date(afterDate.getTime() + maxDays * 86_400_000);

  while (suggestions.length < count && cursor < limit) {
    const hour = israelHour(cursor);

    if (hour < openHour) {
      const day = israelDateString(cursor);
      cursor = new Date(`${day}T${String(openHour).padStart(2, '0')}:00:00+02:00`);
      continue;
    }
    if (hour >= closeHour) {
      const nextDay = new Date(cursor.getTime() + 86_400_000);
      const nextDayStr = israelDateString(nextDay);
      cursor = new Date(`${nextDayStr}T${String(openHour).padStart(2, '0')}:00:00+02:00`);
      continue;
    }

    const slotEnd = addMinutes(cursor, slotMins + bufferMins);
    const { data: taken } = await appointmentRepo.getAppointmentsInRange(
      clinicId,
      cursor.toISOString(),
      slotEnd.toISOString(),
    );

    if (!taken || taken.length === 0) {
      suggestions.push(cursor.toISOString());
    }

    cursor = addMinutes(cursor, slotMins);
  }

  return suggestions;
}

export type ScheduleAppointmentParams = {
  clinicId: string;
  patientName: string;
  requestedDatetimeRaw: string;
  type: AppointmentType;
  leadId?: string | null;
  config?: SchedulingConfig;
};

/**
 * Main entry point for scheduling.
 * Validates hours, follow-up rules, and overlap, then creates the appointment
 * or returns structured alternatives.
 * Pass `config` to apply clinic-level scheduling rules from settings.
 */
export async function scheduleAppointment(params: ScheduleAppointmentParams): Promise<ScheduleResult> {
  const { clinicId, patientName, requestedDatetimeRaw, type, leadId, config } = params;

  const openHour   = config?.openHour   ?? CLINIC_OPEN_HOUR;
  const closeHour  = config?.closeHour  ?? CLINIC_CLOSE_HOUR;
  const slotMins   = config?.slotMinutes   ?? SLOT_MINUTES;
  const bufferMins = config?.bufferMinutes ?? 0;
  const maxPerDay  = config?.maxPerDay  ?? null;
  const minNoticeMins = (config?.minBookingNoticeHours ?? 0) * 60;

  const requestedDate = parseRequestedDatetime(requestedDatetimeRaw);

  console.log('[AppointmentService] scheduling — raw:', requestedDatetimeRaw, '| parsed UTC:', requestedDate.toISOString(), '| israelHour:', israelHour(requestedDate), '| type:', type);

  // 0. Minimum booking notice
  if (minNoticeMins > 0) {
    const earliest = new Date(Date.now() + minNoticeMins * 60_000);
    if (requestedDate < earliest) {
      console.log('[AppointmentService] blocked: too soon (min notice)');
      const suggestions = await suggestClosestAvailable(clinicId, earliest, 3, config);
      return { status: 'unavailable', suggestions };
    }
  }

  // 1. Enforce opening hours (using config-resolved values)
  const hour = israelHour(requestedDate);
  if (hour < openHour || hour >= closeHour) {
    console.log('[AppointmentService] blocked: outside_hours');
    return { status: 'outside_hours', openHour, closeHour };
  }

  // 2. Max appointments per day
  if (maxPerDay !== null) {
    const dayStr = israelDateString(requestedDate);
    const daySlots = await getTakenSlotsOnDay(clinicId, dayStr);
    if (daySlots.length >= maxPerDay) {
      console.log('[AppointmentService] blocked: max per day reached');
      const suggestions = await suggestClosestAvailable(
        clinicId,
        addMinutes(requestedDate, slotMins),
        3,
        config,
      );
      return { status: 'unavailable', suggestions };
    }
  }

  // 3. Follow-up rule
  if (type === 'follow_up') {
    const followUpCheck = await validateFollowUp(clinicId, patientName, requestedDate);
    if (!followUpCheck.valid) {
      return {
        status: 'follow_up_too_soon',
        earliestAllowed: followUpCheck.earliestAllowed!,
      };
    }
  }

  // 4. Check slot availability (no overlap within the slot + buffer window)
  const slotEnd = addMinutes(requestedDate, slotMins + bufferMins);
  const { data: existing } = await appointmentRepo.getAppointmentsInRange(
    clinicId,
    requestedDate.toISOString(),
    slotEnd.toISOString(),
  );

  if (existing && existing.length > 0) {
    console.log('[AppointmentService] blocked: slot taken —', existing.map(a => a.datetime));
    const suggestions = await suggestClosestAvailable(
      clinicId,
      addMinutes(requestedDate, slotMins),
      3,
      config,
    );
    return { status: 'unavailable', suggestions };
  }

  // 5. Create the appointment
  const { data, error } = await appointmentRepo.createAppointment({
    clinic_id:    clinicId,
    patient_name: patientName,
    datetime:     requestedDate.toISOString(),
    type,
    lead_id:      leadId ?? null,
  });

  if (error || !data) {
    console.error('[AppointmentService] create failed:', error);
    const suggestions = await suggestClosestAvailable(clinicId, requestedDate, 3, config);
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
