/**
 * Centralized helpers to enforce a consistent error-handling contract on
 * every Supabase call site.
 *
 * Convention: any Supabase call that returns `{ data, error }` should go
 * through `ensureOk` so silent failures become impossible. The thrown error
 * propagates through React Query (→ `isError`) or bubbles up to the caller's
 * try/catch, where it is surfaced to the user via toast.
 */

import { devWarn } from '@/common/utils/logger'

export interface SupabaseErrorShape {
  message?: string | null
  code?: string | null
  details?: string | null
  hint?: string | null
}

export interface SupabaseResponse<T> {
  data: T | null
  error: SupabaseErrorShape | null
}

/**
 * Throws if the response contains an error. Returns `.data` otherwise.
 *
 * @param response - Supabase PostgREST / auth / functions response
 * @param context - Short label prefixed to the error message for debugging
 *                  (e.g. 'loadActivityLog', 'insert books')
 */
export function ensureOk<T>(response: SupabaseResponse<T>, context: string): T {
  if (response.error) {
    devWarn(`[${context}] Supabase error`, response.error)
    throw new Error(formatSupabaseError(response.error, `Erreur ${context}`))
  }
  // `.data` can legitimately be null (e.g. `.maybeSingle()` on no row).
  // Cast is safe: callers expecting a list will receive `null` and handle it.
  return response.data as T
}

/**
 * Formats a Supabase error (or any thrown value) into a user-facing message.
 * Falls back to the provided message when the error is unrecognised.
 */
export function formatSupabaseError(
  err: unknown,
  fallback = 'Erreur inattendue',
): string {
  if (!err) return fallback
  if (typeof err === 'string') return err
  if (err instanceof Error && err.message) return err.message
  if (typeof err === 'object' && err !== null) {
    const obj = err as SupabaseErrorShape
    if (obj.message) return obj.message
  }
  try { return JSON.stringify(err) } catch { return fallback }
}
