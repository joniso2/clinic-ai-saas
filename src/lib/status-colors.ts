/**
 * Canonical status color system — single source of truth for all status/priority/source colors.
 *
 * The canonical status layer is app-wide (not feature-specific).
 * DB statuses from leads, appointments, etc. map to canonical UI statuses
 * via the mapping functions below.
 */

// ─── Canonical Statuses (app-wide) ──────────────────────────────────────────

export type CanonicalStatus = 'new' | 'pending' | 'closed' | 'cancelled' | 'disqualified';

export const CANONICAL_STATUS: Record<CanonicalStatus, {
  label: string;
  badge: string;
  accent: string;
  hex: string;
}> = {
  new: {
    label: 'חדש',
    badge: 'bg-blue-50 text-blue-700 border border-blue-200/30 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-700/40',
    accent: 'border-s-4 border-blue-500',
    hex: '#3b82f6',
  },
  pending: {
    label: 'ממתין',
    badge: 'bg-amber-50 text-amber-600 border border-amber-200/30 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-700/40',
    accent: 'border-s-4 border-amber-500',
    hex: '#f59e0b',
  },
  closed: {
    label: 'נסגר / הושלם',
    badge: 'bg-emerald-50 text-emerald-600 border border-emerald-200/30 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-700/40',
    accent: 'border-s-4 border-emerald-500',
    hex: '#10b981',
  },
  cancelled: {
    label: 'בוטל',
    badge: 'bg-red-50 text-red-600 border border-red-200/30 dark:bg-red-900/20 dark:text-red-300 dark:border-red-700/40',
    accent: 'border-s-4 border-red-500',
    hex: '#ef4444',
  },
  disqualified: {
    label: 'נסגר ללא טיפול',
    badge: 'bg-slate-50 text-slate-600 border border-slate-200/30 dark:bg-slate-950/20 dark:text-slate-300 dark:border-slate-700/40',
    accent: 'border-s-4 border-slate-400',
    hex: '#94a3b8',
  },
};

/**
 * Map DB lead status → canonical UI status.
 *
 * DB values: Pending | Contacted | Appointment scheduled | Closed | Disqualified | AI Failed
 * Note: Lead DB statuses never map to `cancelled` — that canonical status
 * is used by appointments and other features.
 */
export function mapLeadStatusToCanonical(dbStatus: string | null | undefined): CanonicalStatus {
  switch (dbStatus) {
    case 'Pending':                return 'new';
    case 'Contacted':
    case 'Appointment scheduled':  return 'pending';
    case 'Closed':
    case 'Converted':              return 'closed';
    case 'Disqualified':
    case 'Not relevant':
    case 'AI Failed':              return 'disqualified';
    default:                       return 'new';
  }
}

export function getLeadStatusBadgeClass(dbStatus: string | null | undefined): string {
  return CANONICAL_STATUS[mapLeadStatusToCanonical(dbStatus)].badge;
}

export function getLeadStatusAccentHex(dbStatus: string | null | undefined): string {
  return CANONICAL_STATUS[mapLeadStatusToCanonical(dbStatus)].hex;
}

// ─── Appointment Statuses ────────────────────────────────────────────────────

export type AppointmentStatusKey = 'scheduled' | 'completed' | 'cancelled' | 'no_show' | 'ai_failed';

export const APPOINTMENT_STATUS: Record<AppointmentStatusKey, {
  label: string;
  badge: string;
  accent: string;
  hex: string;
}> = {
  scheduled: {
    label: 'מתוכנן',
    badge: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300',
    accent: 'border-s-4 border-indigo-500',
    hex: '#6366f1',
  },
  completed: {
    label: 'הושלם',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
    accent: 'border-s-4 border-emerald-500',
    hex: '#10b981',
  },
  cancelled: {
    label: 'בוטל',
    badge: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300',
    accent: 'border-s-4 border-red-500',
    hex: '#ef4444',
  },
  no_show: {
    label: 'לא הופיע',
    badge: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300',
    accent: 'border-s-4 border-rose-500',
    hex: '#f43f5e',
  },
  ai_failed: {
    label: 'AI נכשל',
    badge: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300',
    accent: 'border-s-4 border-rose-500',
    hex: '#f43f5e',
  },
};

/**
 * Map DB appointment status → canonical UI status (for unified cross-feature display).
 *
 * DB values: scheduled | completed | cancelled | no_show | ai_failed
 */
export function mapAppointmentStatusToCanonical(dbStatus: string | null | undefined): CanonicalStatus {
  switch (dbStatus) {
    case 'completed':              return 'closed';
    case 'cancelled':
    case 'no_show':
    case 'ai_failed':             return 'cancelled';
    case 'scheduled':
    default:                       return 'pending';
  }
}

export function getAppointmentStatusBadgeClass(status: string | null | undefined): string {
  return APPOINTMENT_STATUS[(status ?? 'scheduled') as AppointmentStatusKey]?.badge
    ?? APPOINTMENT_STATUS.scheduled.badge;
}

export function getAppointmentStatusAccent(status: string | null | undefined): string {
  return APPOINTMENT_STATUS[(status ?? 'scheduled') as AppointmentStatusKey]?.accent
    ?? APPOINTMENT_STATUS.scheduled.accent;
}

export function getAppointmentStatusHex(status: string | null | undefined): string {
  return APPOINTMENT_STATUS[(status ?? 'scheduled') as AppointmentStatusKey]?.hex
    ?? APPOINTMENT_STATUS.scheduled.hex;
}

export function getAppointmentStatusLabel(status: string | null | undefined): string {
  return APPOINTMENT_STATUS[(status ?? 'scheduled') as AppointmentStatusKey]?.label
    ?? APPOINTMENT_STATUS.scheduled.label;
}

// ─── Priority Colors ─────────────────────────────────────────────────────────

export type PriorityKey = 'Low' | 'Medium' | 'High' | 'Urgent';

export const PRIORITY_COLORS: Record<PriorityKey, {
  badge: string;
}> = {
  Low: {
    badge: 'bg-slate-50 text-slate-600 border border-slate-200/30 dark:bg-slate-950/20 dark:text-slate-300 dark:border-slate-700/40',
  },
  Medium: {
    badge: 'bg-amber-50 text-amber-600 border border-amber-200/30 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-700/40',
  },
  High: {
    badge: 'bg-orange-50 text-orange-600 border border-orange-200/30 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-700/40',
  },
  Urgent: {
    badge: 'bg-red-50 text-red-600 border border-red-200/30 dark:bg-red-900/20 dark:text-red-300 dark:border-red-700/40',
  },
};

export function getPriorityBadgeClass(priority: string | null | undefined): string {
  return PRIORITY_COLORS[(priority ?? 'Low') as PriorityKey]?.badge
    ?? PRIORITY_COLORS.Low.badge;
}

// ─── Source Colors ───────────────────────────────────────────────────────────

export const SOURCE_COLORS: Record<string, string> = {
  WhatsApp: 'bg-green-50 text-green-700 dark:bg-green-950/60 dark:text-green-400',
  Instagram: 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-400',
  Discord: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400',
  'Google Ads': 'bg-orange-50 text-orange-700 dark:bg-orange-950/60 dark:text-orange-400',
  Referral: 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400',
  Organic: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400',
  Other: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
};

// ─── Appointment Type Colors ─────────────────────────────────────────────────

export const APPOINTMENT_TYPE_PILL: Record<string, string> = {
  follow_up: 'bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60',
  new: 'bg-blue-100 dark:bg-blue-950/50 text-blue-800 dark:text-blue-400 border border-blue-200 dark:border-blue-800/60',
};
