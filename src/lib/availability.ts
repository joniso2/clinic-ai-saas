import moment from 'moment-timezone';

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
): moment.Moment[] {
  const slots: moment.Moment[] = [];

  const start = moment.tz(
    `${date} ${startTime.slice(0, 5)}`,
    'YYYY-MM-DD HH:mm',
    TZ,
  );
  const end = moment.tz(
    `${date} ${endTime.slice(0, 5)}`,
    'YYYY-MM-DD HH:mm',
    TZ,
  );

  let current = start.clone();
  while (current.isBefore(end)) {
    slots.push(current.clone());
    current.add(30, 'minutes');
  }

  return slots;
}

function overlaps(
  startA: moment.Moment,
  endA: moment.Moment,
  startB: moment.Moment,
  endB: moment.Moment,
): boolean {
  return startA.isBefore(endB) && endA.isAfter(startB);
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
  const nowLimit = moment().tz(TZ).add(30, 'minutes');

  const workEnd = moment.tz(
    `${date} ${workingHours.end_time.slice(0, 5)}`,
    'YYYY-MM-DD HH:mm',
    TZ,
  );

  const slots = generateSlots(
    date,
    workingHours.start_time,
    workingHours.end_time,
  );

  const available = slots.filter((slot) => {
    if (slot.isBefore(nowLimit)) return false;

    const start = slot.clone();
    const end = slot.clone().add(serviceDuration, 'minutes');

    if (end.isAfter(workEnd)) return false;

    const conflict = appointments.some((appt) => {
      if (appt.status === 'cancelled') return false;
      if (
        appt.status === 'locked' &&
        appt.locked_until &&
        moment().isAfter(moment(appt.locked_until))
      ) {
        return false;
      }
      return overlaps(
        start,
        end,
        moment(appt.start_time),
        moment(appt.end_time),
      );
    });

    return !conflict;
  });

  return available.map((slot) => slot.format('HH:mm'));
}
