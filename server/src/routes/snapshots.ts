import { Router, Request, Response } from 'express';
import { query, queryOne } from '../db.js';
import type { Snapshot } from '../types/entities.js';

export const snapshotsRouter = Router();

/**
 * @openapi
 * /api/projects/{id}/snapshots:
 *   get:
 *     tags: [Snapshots]
 *     summary: List snapshots for a project
 *     description: Returns snapshot metadata (without the heavy `snapshot_data` payload) sorted by most recent first.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Project ID
 *     responses:
 *       200:
 *         description: Array of snapshot summaries
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/SnapshotSummary'
 */
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

/**
 * @openapi
 * /api/projects/{id}/snapshots:
 *   post:
 *     tags: [Snapshots]
 *     summary: Capture a snapshot
 *     description: |
 *       Calls `fn_capture_snapshot()` — a PostgreSQL stored procedure that:
 *       1. Calls `fn_load_project_graph()` to assemble the full graph JSON
 *       2. Inserts it as an immutable snapshot row
 *       3. Returns the complete snapshot
 *
 *       Zero data leaves the database during this operation. The entire graph state
 *       is assembled and stored in one atomic transaction.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Project ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CaptureSnapshotRequest'
 *     responses:
 *       201:
 *         description: Snapshot captured
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SnapshotFull'
 */
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

/**
 * @openapi
 * /api/snapshots/{id}:
 *   get:
 *     tags: [Snapshots]
 *     summary: Load full snapshot data
 *     description: Returns the complete snapshot including the full graph state in `snapshot_data`. Snapshots are immutable — they cannot be updated or deleted.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Full snapshot with graph data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SnapshotFull'
 *       404:
 *         description: Snapshot not found
 */
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
