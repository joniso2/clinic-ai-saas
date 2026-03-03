/** Normalize phone for deduplication: no spaces/dashes, +972 -> 0, store consistently. */
export function normalizePhone(phone: string | null | undefined): string {
  if (phone == null || typeof phone !== 'string') return '';
  let s = phone.trim().replace(/\s+/g, '').replace(/-/g, '');
  if (s.startsWith('+972')) s = '0' + s.slice(4);
  else if (s.startsWith('972') && s.length > 9) s = '0' + s.slice(3);
  return s.replace(/\D/g, '');
}
