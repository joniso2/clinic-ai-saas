import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let _cached: SupabaseClient | null = null;

/**
 * Server-only Supabase client with service role for admin operations.
 * Use for: auth.admin.createUser, auth.admin.updateUserById, and direct DB writes.
 * Never expose this client or SUPABASE_SERVICE_ROLE_KEY to the client.
 *
 * Returns a module-level singleton to avoid creating a new client per call.
 */
export function getSupabaseAdmin() {
  if (_cached) return _cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase server env not configured');
  _cached = createClient(url, key, { auth: { persistSession: false } });
  return _cached;
}
