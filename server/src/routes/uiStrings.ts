/**
 * uiStrings routes — GET/PUT for runtime UI string management.
 *
 * GET  /api/ui-strings          → merged defaults + overrides (public, cached in memory)
 * GET  /api/ui-strings/overrides → just the overrides (admin only)
 * PUT  /api/ui-strings          → update overrides (admin only)
 * POST /api/ui-strings/reset    → reset all overrides to defaults (admin only)
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
