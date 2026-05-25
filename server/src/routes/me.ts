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

    // Dev bypass user
    if (uid === 'dev-user-000') {
      return res.json({
        id: 'dev-user-000',
        email: 'dev@nords.local',
        display_name: 'Dev User',
        role: 'admin',
        org_id: null,
      });
    }

    const user = await queryOne<{
      id: string;
      email: string;
      display_name: string;
      role: string;
      org_id: string | null;
    }>(
      `SELECT u.id, u.email, u.display_name, u.role, om.org_id
       FROM users u
       LEFT JOIN org_members om ON om.user_id = u.id
       WHERE u.firebase_uid = $1
       LIMIT 1`,
      [uid]
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (err: any) {
    logger.error('Failed to get user profile', { error: err.message });
    res.status(500).json({ error: 'Failed to get user profile' });
  }
});
