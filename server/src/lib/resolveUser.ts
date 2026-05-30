/**
 * resolveUser.ts — Shared utility for resolving Firebase UID → DB user ID.
 *
 * Used by routes, middleware, and repositories to consistently map
 * the authenticated Firebase identity to the internal user record.
 *
 * Supports email-based fallback for manually provisioned users whose
 * firebase_uid hasn't been linked yet.
 */

import { queryOne } from '../db.js';

/**
 * Resolve a user's DB id from their Firebase UID, with email fallback.
 * If the UID lookup fails but an email matches, auto-links the Firebase UID
 * to that user record (handles manually provisioned users).
 */
export async function resolveUserId(firebaseUid?: string, email?: string): Promise<string | null> {
  if (!firebaseUid) return null;

  // Primary: lookup by firebase_uid
  const byUid = await queryOne<{ id: string }>(
    'SELECT id FROM users WHERE firebase_uid = $1 AND deleted_at IS NULL',
    [firebaseUid]
  );
  if (byUid) return byUid.id;

  // Fallback: lookup by email and auto-link the Firebase UID
  if (email) {
    const byEmail = await queryOne<{ id: string }>(
      'SELECT id FROM users WHERE LOWER(email) = LOWER($1) AND deleted_at IS NULL',
      [email]
    );
    if (byEmail) {
      await queryOne(
        'UPDATE users SET firebase_uid = $1 WHERE id = $2',
        [firebaseUid, byEmail.id]
      );
      return byEmail.id;
    }
  }

  return null;
}

/**
 * Check if a Firebase UID belongs to an admin user.
 */
export async function isAdmin(firebaseUid?: string, email?: string): Promise<boolean> {
  if (!firebaseUid) return false;

  const user = await queryOne<{ role: string }>(
    'SELECT role FROM users WHERE firebase_uid = $1 AND deleted_at IS NULL',
    [firebaseUid]
  );
  if (user) return user.role === 'admin';

  // Fallback by email (for unlinked users)
  if (email) {
    const byEmail = await queryOne<{ role: string }>(
      'SELECT role FROM users WHERE LOWER(email) = LOWER($1) AND deleted_at IS NULL',
      [email]
    );
    return byEmail?.role === 'admin';
  }

  return false;
}
