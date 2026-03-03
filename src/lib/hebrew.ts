/** Hebrew UI labels for RTL dashboard. */

export function formatCurrencyILS(value: number): string {
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export const STATUS_LABELS: Record<string, string> = {
  Pending: 'ממתין',
  Contacted: 'נוצר קשר',
  'Appointment scheduled': 'תור נקבע',
  Closed: 'נסגר',
  Converted: 'הומר',
  Disqualified: 'הוסר',
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
