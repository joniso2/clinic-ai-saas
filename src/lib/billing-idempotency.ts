/**
 * Idempotency helpers for billing POST endpoints.
 *
 * Uses service role (getSupabaseAdmin) because:
 * - Key management must be reliable regardless of RLS state.
 * - clinic_id is always passed explicitly from server-resolved session —
 *   never from client input. Service role bypasses RLS; tenant scoping
 *   is enforced here via explicit clinic_id filtering on every query.
 *
 * Lifecycle:
 *   new        → key not seen before; proceed and lock
 *   in_progress → key locked by an in-flight request; return 409
 *   replay     → key completed; return stored response
 *   conflict   → same key, different payload; return 422
 */

import { createHash } from 'crypto';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

const LOCK_SECONDS   = 30;
const EXPIRES_HOURS  = 24;

export type IdempotencyResult =
  | { status: 'new' }
  | { status: 'replay'; responseStatus: number; responseBody: unknown }
  | { status: 'in_progress' }
  | { status: 'conflict' };

/** SHA-256 of canonical (sorted-keys) JSON serialization of the payload. */
export function hashPayload(payload: unknown): string {
  return createHash('sha256')
    .update(JSON.stringify(sortObjectKeys(payload)))
    .digest('hex');
}

function sortObjectKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortObjectKeys);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => [k, sortObjectKeys(v)]),
    );
  }
  return value;
}

/**
 * Check an idempotency key before processing a request.
 * - If 'new': the key has been locked; proceed with the operation.
 * - If 'replay': return the stored response immediately.
 * - If 'in_progress' or 'conflict': return the appropriate error.
 *
 * @param clinicId  Server-resolved clinic_id — never from client input.
 */
export async function checkIdempotency(
  clinicId: string,
  key: string,
  endpoint: string,
  payloadHash: string,
): Promise<IdempotencyResult> {
  const admin = getSupabaseAdmin();
  const now = new Date();

  const { data: existing } = await admin
    .from('idempotency_keys')
    .select('*')
    .eq('clinic_id', clinicId)   // explicit tenant scoping — service role bypasses RLS
    .eq('idempotency_key', key)
    .maybeSingle();

  // ── No existing record: insert with lock ──────────────────
  if (!existing) {
    const lockedUntil = new Date(now.getTime() + LOCK_SECONDS * 1000).toISOString();
    const expiresAt   = new Date(now.getTime() + EXPIRES_HOURS * 3_600_000).toISOString();

    await admin.from('idempotency_keys').insert({
      clinic_id:        clinicId,
      idempotency_key:  key,
      endpoint,
      payload_hash:     payloadHash,
      locked_at:        now.toISOString(),
      locked_until:     lockedUntil,
      expires_at:       expiresAt,
    });

    return { status: 'new' };
  }

  // ── Expired: treat as new (cleanup job handles deletion) ──
  if (new Date(existing.expires_at) < now) {
    // Delete the expired row and recurse once
    await admin.from('idempotency_keys')
      .delete()
      .eq('clinic_id', clinicId)
      .eq('idempotency_key', key);

    return checkIdempotency(clinicId, key, endpoint, payloadHash);
  }

  // ── Completed: check payload match ────────────────────────
  if (existing.response_body !== null) {
    if (existing.payload_hash !== payloadHash) return { status: 'conflict' };
    return {
      status:         'replay',
      responseStatus: existing.response_status ?? 200,
      responseBody:   existing.response_body,
    };
  }

  // ── Locked and in-flight ───────────────────────────────────
  if (existing.locked_until && new Date(existing.locked_until) > now) {
    return { status: 'in_progress' };
  }

  // ── Stale lock (lock expired, no response stored): reset lock ─
  await admin.from('idempotency_keys')
    .update({
      payload_hash: payloadHash,
      locked_at:    now.toISOString(),
      locked_until: new Date(now.getTime() + LOCK_SECONDS * 1000).toISOString(),
    })
    .eq('clinic_id', clinicId)
    .eq('idempotency_key', key);

  return { status: 'new' };
}

/**
 * Store the final response after a successful operation.
 * Call this only after all DB writes have completed.
 *
 * @param clinicId  Server-resolved clinic_id — never from client input.
 */
export async function resolveIdempotency(
  clinicId: string,
  key: string,
  responseStatus: number,
  responseBody: unknown,
): Promise<void> {
  const admin = getSupabaseAdmin();
  await admin.from('idempotency_keys')
    .update({
      response_status: responseStatus,
      response_body:   responseBody,
      locked_at:       null,
      locked_until:    null,
    })
    .eq('clinic_id', clinicId)  // explicit tenant scoping
    .eq('idempotency_key', key);
}
