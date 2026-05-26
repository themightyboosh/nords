/**
 * shareLinksRoutes.ts — Admin CRUD for share links (authenticated).
 *
 * POST   /api/projects/:id/share-links       — Create a share link
 * GET    /api/projects/:id/share-links       — List share links for project
 * DELETE /api/projects/:id/share-links/:linkId — Revoke a share link
 */

import { Router } from 'express';
import * as shareLinksRepo from '../repositories/shareLinks.js';
import logger from '../lib/logger.js';

const router = Router();

// Create a share link
router.post('/projects/:id/share-links', async (req, res) => {
  try {
    const projectId = req.params.id;
    const { label, welcome_message_override, model, persona_id_override, max_sessions, expires_at, prefills } = req.body;

    if (!label?.trim()) {
      return res.status(400).json({ error: 'label is required' });
    }

    const link = await shareLinksRepo.create(projectId, {
      label: label.trim(),
      welcome_message_override,
      model,
      persona_id_override,
      max_sessions,
      expires_at,
      created_by: req.user?.uid || null,
      prefills,
    });

    logger.info('Share link created', { projectId, linkId: link.id, label });
    res.status(201).json(link);
  } catch (err: any) {
    logger.error('Failed to create share link', { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

// List share links for a project
router.get('/projects/:id/share-links', async (req, res) => {
  try {
    const links = await shareLinksRepo.findByProject(req.params.id);
    res.json(links);
  } catch (err: any) {
    logger.error('Failed to list share links', { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

// Revoke a share link
router.delete('/projects/:id/share-links/:linkId', async (req, res) => {
  try {
    const revoked = await shareLinksRepo.revoke(req.params.linkId);
    if (!revoked) {
      return res.status(404).json({ error: 'Share link not found or already revoked' });
    }
    logger.info('Share link revoked', { linkId: req.params.linkId });
    res.json(revoked);
  } catch (err: any) {
    logger.error('Failed to revoke share link', { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

export default router;
