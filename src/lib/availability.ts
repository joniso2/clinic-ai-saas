import { parse, format, addMinutes, isBefore, isAfter } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

const TZ = 'Asia/Jerusalem';

export interface WorkingHourRecord {
  start_time: string;
  end_time: string;
}

export interface AppointmentRecord {
  start_time: string;
  end_time: string;
  status: string;
  locked_until: string | null;
}

function generateSlots(
  date: string,
  startTime: string,
  endTime: string,
): Date[] {
  const slots: Date[] = [];

  const start = parse(
    `${date} ${startTime.slice(0, 5)}`,
    'yyyy-MM-dd HH:mm',
    new Date(),
  );
  const end = parse(
    `${date} ${endTime.slice(0, 5)}`,
    'yyyy-MM-dd HH:mm',
    new Date(),
  );

  let current = start;
  while (isBefore(current, end)) {
    slots.push(current);
    current = addMinutes(current, 30);
  }

  return slots;
}

function overlaps(
  startA: Date,
  endA: Date,
  startB: Date,
  endB: Date,
): boolean {
  return isBefore(startA, endB) && isAfter(endA, startB);
}

export function calculateAvailability({
  date,
  workingHours,
  appointments,
  serviceDuration,
}: {
  date: string;
  workingHours: WorkingHourRecord;
  appointments: AppointmentRecord[];
  serviceDuration: number;
}): string[] {
  const nowInTz = toZonedTime(new Date(), TZ);
  const nowLimit = addMinutes(nowInTz, 30);

  const workEnd = parse(
    `${date} ${workingHours.end_time.slice(0, 5)}`,
    'yyyy-MM-dd HH:mm',
    new Date(),
  );

  const slots = generateSlots(
    date,
    workingHours.start_time,
    workingHours.end_time,
  );

  const available = slots.filter((slot) => {
    if (isBefore(slot, nowLimit)) return false;

    const end = addMinutes(slot, serviceDuration);

    if (isAfter(end, workEnd)) return false;

    const conflict = appointments.some((appt) => {
      if (appt.status === 'cancelled') return false;
      if (
        appt.status === 'locked' &&
        appt.locked_until &&
        isAfter(new Date(), new Date(appt.locked_until))
      ) {
        return false;
      }
      return overlaps(
        slot,
        end,
        new Date(appt.start_time),
        new Date(appt.end_time),
      );
    });

    return !conflict;
  });

  return available.map((slot) => format(slot, 'HH:mm'));
}
