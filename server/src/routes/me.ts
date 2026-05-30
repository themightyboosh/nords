/**
 * me.ts — GET /api/me
 * Returns the authenticated user's profile from the database.
 * Used by the client to determine role-based access (admin vs member).
 */

import { Router, Request, Response } from 'express';
import { queryOne } from '../db.js';
import logger from '../lib/logger.js';

export const meRouter = Router();

meRouter.get('/me', async (req: Request, res: Response) => {
  try {
    const uid = (req as any).user?.uid;
    if (!uid) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // No special dev bypass — all users (including dev passthrough)
    // go through the normal DB lookup path.

    let user = await queryOne<{
      id: string;
      email: string;
      display_name: string;
      role: string;
      is_tester: boolean;
    }>(
      `SELECT u.id, u.email, u.display_name, u.role, u.is_tester
       FROM users u
       WHERE u.firebase_uid = $1
       LIMIT 1`,
      [uid]
    );

    logger.info('/me lookup', { firebaseUid: uid, email: (req as any).user?.email, foundByUid: !!user });

    // Fallback: if no match by firebase_uid, try by email and auto-link.
    // This handles manually provisioned users whose firebase_uid is a placeholder.
    if (!user) {
      const email = (req as any).user?.email;
      if (email) {
        user = await queryOne<{
          id: string;
          email: string;
          display_name: string;
          role: string;
          is_tester: boolean;
        }>(
          `SELECT u.id, u.email, u.display_name, u.role, u.is_tester
           FROM users u
           WHERE LOWER(u.email) = LOWER($1) AND u.deleted_at IS NULL
           LIMIT 1`,
          [email]
        );
        if (user) {
          // Link the real Firebase UID so future lookups are fast
          await queryOne(
            'UPDATE users SET firebase_uid = $1 WHERE id = $2',
            [uid, user.id]
          );
          logger.info('Linked Firebase UID to existing user via email', { userId: user.id, email });
        }
      }
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (err: any) {
    logger.error('Failed to get user profile', { error: err.message });
    res.status(500).json({ error: 'Failed to get user profile' });
  }
});
