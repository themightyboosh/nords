/**
 * projectOwnership.ts — Middleware that verifies the authenticated user
 * owns the project being accessed.
 *
 * Extracts the project ID from `req.params.id` or `req.params.projectId`,
 * resolves the user's DB id, and checks `project.created_by`.
 *
 * Applied to all project-scoped routes (GET/PUT/DELETE /projects/:id,
 * and all child resource routes like /projects/:id/nords, /projects/:id/goals, etc.)
 */

import { Request, Response, NextFunction } from 'express';
import { queryOne } from '../db.js';
import { resolveUserId } from '../lib/resolveUser.js';
import logger from '../lib/logger.js';

/**
 * Middleware: require the authenticated user to own the project.
 * Works with both `:id` and `:projectId` route params.
 */
export async function requireProjectOwner(req: Request, res: Response, next: NextFunction): Promise<void> {
  const projectId = req.params.id || req.params.projectId;
  if (!projectId) {
    // No project ID in URL — this middleware shouldn't be here, pass through
    return next();
  }

  const uid = req.user?.uid;
  const email = req.user?.email;

  if (!uid) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const dbUserId = await resolveUserId(uid, email);
  if (!dbUserId) {
    res.status(403).json({ error: 'User not found' });
    return;
  }

  const project = await queryOne<{ created_by: string | null }>(
    'SELECT created_by FROM projects WHERE id = $1 AND deleted_at IS NULL',
    [projectId]
  );

  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  if (project.created_by !== dbUserId) {
    logger.warn('Project ownership denied', { projectId, userId: dbUserId, ownerId: project.created_by });
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  // Stash the resolved DB user ID for downstream handlers
  (req as any).dbUserId = dbUserId;
  next();
}
