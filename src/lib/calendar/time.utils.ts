export const ISRAEL_TZ = 'Asia/Jerusalem';

export function toIsraelDateString(utcIso: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: ISRAEL_TZ, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date(utcIso));
}

export function formatTime(utcIso: string): string {
  return new Intl.DateTimeFormat('he-IL', {
    timeZone: ISRAEL_TZ, hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(new Date(utcIso));
}

export function formatTimeRange(datetime: string, durationMinutes: number): string {
  const start = formatTime(datetime);
  const endDate = new Date(new Date(datetime).getTime() + durationMinutes * 60 * 1000);
  const end = new Intl.DateTimeFormat('he-IL', {
    timeZone: ISRAEL_TZ, hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(endDate);
  return `${start}–${end}`;
}

export function formatFullDateTime(utcIso: string): string {
  return new Intl.DateTimeFormat('he-IL', {
    timeZone: ISRAEL_TZ, weekday: 'long', year: 'numeric',
    month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(new Date(utcIso));
}

export function formatDayLong(isoDate: string): string {
  const d = new Date(isoDate + 'T12:00:00');
  const weekday = new Intl.DateTimeFormat('he-IL', { weekday: 'long', timeZone: ISRAEL_TZ }).format(d);
  const date = new Intl.DateTimeFormat('he-IL', { day: 'numeric', month: 'numeric', year: 'numeric', timeZone: ISRAEL_TZ }).format(d);
  return `יום ${weekday} ${date}`;
}

export function getMinutesFromMidnightIsrael(isoDatetime: string): number {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: ISRAEL_TZ, hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(new Date(isoDatetime));
  const hour = parseInt(parts.find((p) => p.type === 'hour')!.value, 10);
  const minute = parseInt(parts.find((p) => p.type === 'minute')!.value, 10);
  return hour * 60 + minute;
}
