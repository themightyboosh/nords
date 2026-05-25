/**
 * register.ts — Public registration endpoint.
 *
 * Called after Firebase auth completes (email or Google sign-up).
 * Validates the invite key, provisions the user + org + account,
 * and clones all demo-flagged projects into their workspace.
 *
 * Existing users skip invite key validation entirely.
 */

import { Router, Request, Response } from 'express';
import { query, queryOne } from '../db.js';
import { cloneProject } from '../services/projectClone.js';
import { getFirebaseAuth, isFirebaseInitialized } from '../lib/firebaseAdmin.js';
import logger from '../lib/logger.js';

export const registerRouter = Router();

interface InviteKey {
  id: string;
  key: string;
  max_uses: number | null;
  use_count: number;
  revoked_at: string | null;
}

/**
 * POST /api/auth/register
 *
 * Body: { invite_key: string }
 * Headers: Authorization: Bearer <firebase-id-token>
 *
 * For existing users: returns { existing: true, user_id }
 * For new users: validates invite key, provisions everything, returns { user_id, projects_cloned }
 */
registerRouter.post('/auth/register', async (req: Request, res: Response) => {
  try {
    // ── 1. Identify the user from Firebase token ──
    let firebaseUid: string;
    let email: string;
    let displayName: string | null = null;
    let avatarUrl: string | null = null;

    if (!isFirebaseInitialized()) {
      // Dev passthrough
      firebaseUid = 'dev-user-000';
      email = 'dev@nords.local';
      displayName = 'Dev User';
    } else {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Missing Authorization header' });
        return;
      }
      const token = authHeader.slice(7);
      try {
        const auth = getFirebaseAuth()!;
        const decoded = await auth.verifyIdToken(token);
        firebaseUid = decoded.uid;
        email = decoded.email || '';
        displayName = decoded.name || null;
        avatarUrl = decoded.picture || null;
      } catch {
        res.status(401).json({ error: 'Invalid token' });
        return;
      }
    }

    // ── 2. Check if user already exists ──
    const existingUser = await queryOne<{ id: string }>(
      'SELECT id FROM users WHERE firebase_uid = $1 AND deleted_at IS NULL',
      [firebaseUid]
    );

    if (existingUser) {
      // Active user — no invite key needed
      res.json({ existing: true, user_id: existingUser.id });
      return;
    }

    // ── 3. Validate invite key (only for NEW users) ──
    const { invite_key } = req.body;
    if (!invite_key || typeof invite_key !== 'string') {
      res.status(400).json({ error: 'Invite key is required' });
      return;
    }

    const key = await queryOne<InviteKey>(
      'SELECT * FROM invite_keys WHERE key = $1 AND revoked_at IS NULL',
      [invite_key.trim()]
    );

    if (!key) {
      res.status(403).json({ error: 'Invalid invite key' });
      return;
    }

    if (key.max_uses !== null && key.use_count >= key.max_uses) {
      res.status(403).json({ error: 'This invite key has reached its usage limit' });
      return;
    }

    // ── 4. Provision user ──
    const user = await queryOne<{ id: string }>(
      `INSERT INTO users (firebase_uid, email, display_name, avatar_url, role)
       VALUES ($1, $2, $3, $4, 'member')
       RETURNING id`,
      [firebaseUid, email, displayName, avatarUrl]
    );

    if (!user) {
      res.status(500).json({ error: 'Failed to create user' });
      return;
    }

    // ── 5. Provision org + account ──
    const org = await queryOne<{ id: string }>(
      `INSERT INTO organizations (name, slug)
       VALUES ($1, $2)
       RETURNING id`,
      [`${displayName || email}'s Workspace`, `user-${user.id.slice(0, 8)}`]
    );

    if (org) {
      // Link user to org
      await queryOne(
        'INSERT INTO org_members (org_id, user_id, role) VALUES ($1, $2, $3)',
        [org.id, user.id, 'owner']
      );

      // Create account for org
      await queryOne(
        `INSERT INTO accounts (name, owner_user_id, billing_email)
         VALUES ($1, $2, $3)`,
        [`${displayName || email}'s Account`, user.id, email]
      );
    }

    // ── 6. Increment invite key use count ──
    await queryOne(
      'UPDATE invite_keys SET use_count = use_count + 1 WHERE id = $1',
      [key.id]
    );

    // ── 7. Clone all demo projects ──
    const demoProjects = await query<{ id: string }>(
      'SELECT id FROM projects WHERE is_demo = true AND deleted_at IS NULL'
    );

    let projectsCloned = 0;
    const targetOrgId = org?.id || '00000000-0000-0000-0000-000000000000';

    for (const demo of demoProjects) {
      try {
        await cloneProject(demo.id, targetOrgId, user.id);
        projectsCloned++;
      } catch (err) {
        logger.error('Failed to clone demo project during registration', {
          demoProjectId: demo.id,
          userId: user.id,
          error: err instanceof Error ? err.message : String(err),
        });
        // Don't fail registration if clone fails — continue with others
      }
    }

    logger.info('User registered successfully', {
      userId: user.id,
      email,
      inviteKey: key.key,
      projectsCloned,
    });

    res.status(201).json({
      user_id: user.id,
      projects_cloned: projectsCloned,
    });

  } catch (err: any) {
    logger.error('Registration failed', { error: err.message });
    res.status(500).json({ error: 'Registration failed' });
  }
});
