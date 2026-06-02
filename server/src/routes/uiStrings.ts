/**
 * uiStrings routes — GET/PUT for runtime UI string management.
 *
 * @openapi
 * /api/ui-strings:
 *   get:
 *     tags: [Admin]
 *     summary: Get merged UI strings (defaults + overrides)
 *     responses:
 *       200:
 *         description: Merged UI strings object
 *   put:
 *     tags: [Admin]
 *     summary: Update UI string overrides (admin only)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Updated overrides
 *
 * /api/ui-strings/overrides:
 *   get:
 *     tags: [Admin]
 *     summary: Get only custom UI string overrides (admin only)
 *     responses:
 *       200:
 *         description: Overrides object
 *
 * /api/ui-strings/reset:
 *   post:
 *     tags: [Admin]
 *     summary: Reset all UI string overrides to defaults (admin only)
 *     responses:
 *       200:
 *         description: Reset confirmation
 */

import { Router } from 'express';
import { getUIStrings, getUIStringOverrides, updateUIStrings, resetUIStrings } from '../lib/uiStrings.js';

export const uiStringsRouter = Router();

// Public — any authenticated user can read strings
uiStringsRouter.get('/ui-strings', (_req, res) => {
  res.json(getUIStrings());
});

// Admin only — view what's been customized
uiStringsRouter.get('/ui-strings/overrides', (req, res) => {
  const user = (req as any).user;
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  res.json(getUIStringOverrides());
});

// Admin only — update overrides
uiStringsRouter.put('/ui-strings', (req, res) => {
  const user = (req as any).user;
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const patch = req.body;
  if (!patch || typeof patch !== 'object') {
    return res.status(400).json({ error: 'Body must be a JSON object of { section: { key: value } }' });
  }

  const updated = updateUIStrings(patch);
  res.json(updated);
});

// Admin only — reset all overrides
uiStringsRouter.post('/ui-strings/reset', (req, res) => {
  const user = (req as any).user;
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const defaults = resetUIStrings();
  res.json(defaults);
});
