/** Hebrew UI labels for RTL dashboard. */

export function formatCurrencyILS(value: number): string {
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/** Israeli phone display: 050-123-4567 */
export function formatPhoneILS(phone: string | null | undefined): string {
  if (!phone || typeof phone !== 'string') return '—';
  const digits = phone.replace(/\D/g, '');
  if (digits.length >= 9 && digits.length <= 10) {
    if (digits.length === 10 && digits.startsWith('0'))
      return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
    if (digits.length === 9) return `0${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`;
  }
  return phone;
}

export const STATUS_LABELS: Record<string, string> = {
  Pending: 'ממתין',
  Contacted: 'נוצר קשר',
  'Appointment scheduled': 'תור נקבע',
  Closed: 'נסגר',
  Converted: 'הומר',
  Disqualified: 'הוסר',
  'AI Failed': 'כשל AI',
};

export const PRIORITY_LABELS: Record<string, string> = {
  Low: 'נמוכה',
  Medium: 'בינונית',
  High: 'גבוהה',
  Urgent: 'דחוף',
};

export const SOURCE_LABELS: Record<string, string> = {
  'Google Ads': 'גוגל Ads',
  Organic: 'אורגני',
  Referral: 'הפניה',
  WhatsApp: 'וואטסאפ',
  discord: 'דיסקורד',
  Discord: 'דיסקורד',
  Other: 'אחר',
};

export const PATIENT_STATUS_LABELS: Record<string, string> = {
  active: 'פעיל',
  dormant: 'רדום',
  inactive: 'לא פעיל',
};
