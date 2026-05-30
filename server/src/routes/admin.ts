/**
 * admin.ts — Admin-only API routes.
 *
 * Provides user management (list, update role, delete) for platform admins.
 * Protected by an admin guard that checks the user's role in the DB.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { query, queryOne } from '../db.js';
import logger from '../lib/logger.js';

export const adminRouter = Router();

async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const uid = req.user?.uid;
  if (!uid) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  // Check role in DB — no dev bypasses
  const user = await queryOne<{ role: string }>(
    'SELECT role FROM users WHERE firebase_uid = $1 AND deleted_at IS NULL',
    [uid]
  );

  if (!user || user.role !== 'admin') {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }

  next();
}

// Apply admin guard to all routes
adminRouter.use(requireAdmin);

// ══════════════════════════════════════════════════════════
//  USER MANAGEMENT
// ══════════════════════════════════════════════════════════

interface UserRow {
  id: string;
  firebase_uid: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  role: string;
  created_at: string;
  deleted_at: string | null;
}

/**
 * GET /api/admin/users — List all users
 */
adminRouter.get('/admin/users', async (_req: Request, res: Response) => {
  try {
    const users = await query<UserRow>(
      `SELECT id, firebase_uid, email, display_name, avatar_url, role, created_at
       FROM users
       WHERE deleted_at IS NULL
       ORDER BY created_at DESC`
    );
    res.json(users);
  } catch (err: any) {
    logger.error('Admin: failed to list users', { error: err.message });
    res.status(500).json({ error: 'Failed to list users' });
  }
});

/**
 * PUT /api/admin/users/:id — Update user (role, display_name)
 */
adminRouter.put('/admin/users/:id', async (req: Request, res: Response) => {
  try {
    const { role, display_name } = req.body;
    const setClauses: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (role !== undefined) {
      if (!['member', 'admin'].includes(role)) {
        res.status(400).json({ error: 'Role must be "member" or "admin"' });
        return;
      }
      setClauses.push(`role = $${idx++}`);
      values.push(role);
    }
    if (display_name !== undefined) {
      setClauses.push(`display_name = $${idx++}`);
      values.push(display_name);
    }

    if (setClauses.length === 0) {
      res.status(400).json({ error: 'No fields to update' });
      return;
    }

    values.push(req.params.id);
    const updated = await queryOne<UserRow>(
      `UPDATE users SET ${setClauses.join(', ')} WHERE id = $${idx} AND deleted_at IS NULL RETURNING *`,
      values
    );

    if (!updated) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json(updated);
  } catch (err: any) {
    logger.error('Admin: failed to update user', { error: err.message, userId: req.params.id });
    res.status(500).json({ error: 'Failed to update user' });
  }
});

/**
 * DELETE /api/admin/users/:id — Soft-delete user
 */
adminRouter.delete('/admin/users/:id', async (req: Request, res: Response) => {
  try {
    const result = await queryOne<{ id: string }>(
      'UPDATE users SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL RETURNING id',
      [req.params.id]
    );
    if (!result) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.status(204).end();
  } catch (err: any) {
    logger.error('Admin: failed to delete user', { error: err.message, userId: req.params.id });
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// ══════════════════════════════════════════════════════════
//  INVITE KEY MANAGEMENT
// ══════════════════════════════════════════════════════════

interface InviteKeyRow {
  id: string;
  key: string;
  label: string | null;
  max_uses: number | null;
  use_count: number;
  created_at: string;
  revoked_at: string | null;
}

/**
 * GET /api/admin/invite-keys — List all invite keys
 */
adminRouter.get('/admin/invite-keys', async (_req: Request, res: Response) => {
  try {
    const keys = await query<InviteKeyRow>(
      'SELECT * FROM invite_keys ORDER BY created_at DESC'
    );
    res.json(keys);
  } catch (err: any) {
    logger.error('Admin: failed to list invite keys', { error: err.message });
    res.status(500).json({ error: 'Failed to list invite keys' });
  }
});

/**
 * POST /api/admin/invite-keys — Create a new invite key
 */
adminRouter.post('/admin/invite-keys', async (req: Request, res: Response) => {
  try {
    const { key, label, max_uses } = req.body;
    if (!key || typeof key !== 'string') {
      res.status(400).json({ error: 'Key string is required' });
      return;
    }
    const created = await queryOne<InviteKeyRow>(
      `INSERT INTO invite_keys (key, label, max_uses)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [key.trim(), label || null, max_uses ?? null]
    );
    res.status(201).json(created);
  } catch (err: any) {
    if (err.code === '23505') {
      res.status(409).json({ error: 'An invite key with that value already exists' });
      return;
    }
    logger.error('Admin: failed to create invite key', { error: err.message });
    res.status(500).json({ error: 'Failed to create invite key' });
  }
});

/**
 * DELETE /api/admin/invite-keys/:id — Revoke an invite key (soft-delete)
 */
adminRouter.delete('/admin/invite-keys/:id', async (req: Request, res: Response) => {
  try {
    const result = await queryOne<{ id: string }>(
      'UPDATE invite_keys SET revoked_at = NOW() WHERE id = $1 AND revoked_at IS NULL RETURNING id',
      [req.params.id]
    );
    if (!result) {
      res.status(404).json({ error: 'Invite key not found' });
      return;
    }
    res.status(204).end();
  } catch (err: any) {
    logger.error('Admin: failed to revoke invite key', { error: err.message });
    res.status(500).json({ error: 'Failed to revoke invite key' });
  }
});
