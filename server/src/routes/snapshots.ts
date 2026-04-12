import { Router, Request, Response } from 'express';
import { query, queryOne } from '../db.js';
import type { Snapshot } from '../types/entities.js';

export const snapshotsRouter = Router();

// GET /api/projects/:id/snapshots — List snapshots (most recent first)
snapshotsRouter.get('/projects/:id/snapshots', async (req: Request, res: Response) => {
  try {
    const snapshots = await query<Omit<Snapshot, 'snapshot_data'>>(
      `SELECT id, project_id, name, description, created_by, created_at
       FROM snapshots
       WHERE project_id = $1
       ORDER BY created_at DESC`,
      [req.params.id]
    );
    res.json(snapshots);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load snapshots' });
  }
});

// POST /api/projects/:id/snapshots — Capture snapshot via stored procedure
snapshotsRouter.post('/projects/:id/snapshots', async (req: Request, res: Response) => {
  try {
    const { name, description } = req.body;
    if (!name) {
      res.status(400).json({ error: 'name is required' });
      return;
    }
    const snapshot = await queryOne<Snapshot>(
      'SELECT * FROM fn_capture_snapshot($1, $2, $3, $4)',
      [req.params.id, name, description || null, req.body.user_id || null]
    );
    res.status(201).json(snapshot);
  } catch (err) {
    res.status(500).json({ error: 'Failed to capture snapshot' });
  }
});

// GET /api/snapshots/:id — Load full snapshot data
snapshotsRouter.get('/snapshots/:id', async (req: Request, res: Response) => {
  try {
    const snapshot = await queryOne<Snapshot>(
      'SELECT * FROM snapshots WHERE id = $1',
      [req.params.id]
    );
    if (!snapshot) {
      res.status(404).json({ error: 'Snapshot not found' });
      return;
    }
    res.json(snapshot);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load snapshot' });
  }
});
