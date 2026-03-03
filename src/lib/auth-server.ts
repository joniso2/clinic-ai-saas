import { createClient } from '@/lib/supabase-server';

export type ClinicUserRole = 'SUPER_ADMIN' | 'CLINIC_ADMIN' | 'STAFF';

export type ClinicUserRow = {
  user_id: string;
  clinic_id: string | null;
  role: ClinicUserRole;
};

/**
 * Get current session user. Returns null if not authenticated.
 */
export async function getSessionUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

/**
 * Get the current user's clinic_users row.
 * If the user has multiple rows (e.g. SUPER_ADMIN + clinic link), returns the SUPER_ADMIN row when present; otherwise the first row.
 * Ordering guarantee: we fetch all rows for the user and in code pick (SUPER_ADMIN row if any) else first — so SUPER_ADMIN is always preferred.
 */
export async function getClinicUser() {
  const user = await getSessionUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from('clinic_users')
    .select('user_id, clinic_id, role')
    .eq('user_id', user.id);

  const rows = (data ?? []) as ClinicUserRow[];
  const preferred = rows.find((r) => r.role === 'SUPER_ADMIN') ?? rows[0] ?? null;
  return preferred;
}

/**
 * Require authentication. Returns user or null (caller should return 401).
 */
export async function requireAuth() {
  const user = await getSessionUser();
  return user;
}

/**
 * Require Super Admin role. Returns user if SUPER_ADMIN, else null (caller should return 403).
 */
export async function requireSuperAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('clinic_users')
    .select('role')
    .eq('user_id', user.id)
    .eq('role', 'SUPER_ADMIN')
    .maybeSingle();

  return data ? user : null;
}

/**
 * Get clinic_id for the current user for API scope.
 * Returns null if not authenticated or if user is SUPER_ADMIN (no single clinic).
 * For SUPER_ADMIN, APIs that need "all clinics" should check requireSuperAdmin() and then query without clinic filter.
 */
export async function getClinicIdFromSession(): Promise<string | null> {
  const row = await getClinicUser();
  if (!row || row.role === 'SUPER_ADMIN') return null;
  return row.clinic_id ?? null;
}

/**
 * For API routes that are clinic-scoped: get clinic_id or 401.
 * For Super Admin, returns null so caller can return 403 or redirect (e.g. super-admin routes use requireSuperAdmin instead).
 */
export async function requireClinicAccess(): Promise<{ clinicId: string } | null> {
  const row = await getClinicUser();
  if (!row) return null;
  if (row.role === 'SUPER_ADMIN') return null; // Super Admin has no single clinic
  if (row.clinic_id) return { clinicId: row.clinic_id };
  return null;
}

const IMPERSONATE_COOKIE = 'impersonate_clinic_id';

/**
 * Get effective clinic_id for the current request.
 * For SUPER_ADMIN: returns impersonation cookie value if set; otherwise null.
 * For others: returns clinic_id from clinic_users.
 * Pass Request so impersonation cookie can be read (e.g. in API route handlers).
 */
export async function getEffectiveClinicId(request: Request): Promise<string | null> {
  const row = await getClinicUser();
  if (!row) return null;
  if (row.role !== 'SUPER_ADMIN') return row.clinic_id ?? null;
  const cookie = request.headers.get('cookie');
  const match = cookie?.match(new RegExp(`${IMPERSONATE_COOKIE}=([^;]+)`));
  return match?.[1]?.trim() ?? null;
}

export function getImpersonateCookieName() {
  return IMPERSONATE_COOKIE;
}
