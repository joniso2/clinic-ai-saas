export type TeamMember = {
  user_id: string;
  email: string;
  full_name: string | null;
  role: string;
  job_title: string | null;
  banned_until: string | null;
  last_sign_in_at: string | null;
};

export const ROLE_DISPLAY_OPTIONS = ['מנהל', 'רופא', 'מזכירה', 'תומך'] as const;

export function getRoleDisplay(dbRole: string, jobTitle: string | null): string {
  if (dbRole === 'CLINIC_ADMIN') return 'מנהל';
  if (jobTitle && ROLE_DISPLAY_OPTIONS.includes(jobTitle as typeof ROLE_DISPLAY_OPTIONS[number])) return jobTitle;
  return 'צוות';
}

export const ROLE_PERMISSIONS: Record<string, string> = {
  מנהל: 'גישה מלאה',
  רופא: 'לידים, תורים',
  מזכירה: 'לידים, תורים',
  תומך: 'צפייה מוגבלת',
};
