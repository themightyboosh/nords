import { Router, Request, Response } from 'express';
import { query, queryOne } from '../db.js';
import * as nordsRepo from '../repositories/nords.js';
import * as connectionsRepo from '../repositories/connections.js';
import * as boardPositionsRepo from '../repositories/boardPositions.js';

export const graphRouter = Router();

/**
 * @openapi
 * /api/projects/{id}/graph:
 *   get:
 *     tags: [Graph]
 *     summary: Load entire project graph
 *     description: |
 *       Calls `fn_load_project_graph()` — a PostgreSQL stored procedure that assembles
 *       all nords, connections, nord types, and connection types into a single JSON
 *       payload entirely inside database memory. Returns the full graph in one network round trip.
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
 *         description: Complete graph payload
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProjectGraph'
 */
graphRouter.get('/projects/:id/graph', async (req: Request, res: Response) => {
  try {
    const result = await queryOne<{ fn_load_project_graph: Record<string, unknown> }>(
      'SELECT fn_load_project_graph($1) AS fn_load_project_graph',
      [req.params.id]
    );
    if (!result) {
      res.json({ nord_types: [], nords: [], connection_types: [], connections: [] });
      return;
    }
    res.json(result.fn_load_project_graph);
  } catch (err: any) {
    console.error('[graph] fn_load_project_graph error:', err.message, err.code);
    res.status(500).json({ error: 'Failed to load project graph' });
  }
});

/**
 * @openapi
 * /api/projects/{id}/nords:
 *   post:
 *     tags: [Nords]
 *     summary: Create a nord
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
 *             $ref: '#/components/schemas/CreateNordRequest'
 *     responses:
 *       201:
 *         description: Nord created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Nord'
 */
graphRouter.post('/projects/:id/nords', async (req: Request, res: Response) => {
  try {
    const nord = await nordsRepo.create({
      project_id: req.params.id,
      type_id: req.body.type_id,
      title: req.body.title || 'Untitled',
      description: req.body.description || '',
      properties: req.body.properties || {},
      position_x: req.body.position_x ?? 0,
      position_y: req.body.position_y ?? 0,
      scale: req.body.scale ?? 1.0,
      created_by: req.body.created_by || null,
    });
    res.status(201).json(nord);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create nord' });
  }
});

/**
 * @openapi
 * /api/nords/{id}:
 *   put:
 *     tags: [Nords]
 *     summary: Update a nord
 *     description: Update title, description, properties, position, or scale. The `updated_at` trigger fires automatically.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateNordRequest'
 *     responses:
 *       200:
 *         description: Updated nord
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Nord'
 *       404:
 *         description: Nord not found
 */
graphRouter.put('/nords/:id', async (req: Request, res: Response) => {
  try {
    const nord = await nordsRepo.update(req.params.id, req.body);
    if (!nord) {
      res.status(404).json({ error: 'Nord not found' });
      return;
    }
    res.json(nord);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update nord' });
  }
});

/**
 * @openapi
 * /api/nords/{id}:
 *   delete:
 *     tags: [Nords]
 *     summary: Soft-delete a nord
 *     description: Sets `deleted_at` on the nord. Triggers `trg_cascade_soft_delete_connections` which automatically soft-deletes all connections referencing this nord.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       204:
 *         description: Nord deleted (connections cascade soft-deleted)
 *       404:
 *         description: Nord not found
 */
graphRouter.delete('/nords/:id', async (req: Request, res: Response) => {
  try {
    const deleted = await nordsRepo.softDelete(req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'Nord not found' });
      return;
    }
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete nord' });
  }
});

/**
 * @openapi
 * /api/projects/{id}/connections:
 *   post:
 *     tags: [Connections]
 *     summary: Create a connection between two nords
 *     description: Creates an edge linking a source nord to a target nord. Distance values are constrained to 0.0–1.0 by CHECK constraints. Duplicate type+source+target combinations are rejected by a unique constraint.
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
 *             $ref: '#/components/schemas/CreateConnectionRequest'
 *     responses:
 *       201:
 *         description: Connection created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Connection'
 */
graphRouter.post('/projects/:id/connections', async (req: Request, res: Response) => {
  try {
    const connection = await connectionsRepo.create({
      project_id: req.params.id,
      type_id: req.body.type_id,
      source_nord_id: req.body.source_nord_id,
      target_nord_id: req.body.target_nord_id,
      direction: req.body.direction || 'none',
      distance_x: req.body.distance_x ?? 0.5,
      distance_y: req.body.distance_y ?? 0.5,
      properties: req.body.properties || {},
    });
    res.status(201).json(connection);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create connection' });
  }
});

/**
 * @openapi
 * /api/connections/{id}:
 *   put:
 *     tags: [Connections]
 *     summary: Update a connection
 *     description: Update direction, distance values, or properties of an existing connection.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               direction:
 *                 type: string
 *                 enum: [forward, reverse, none]
 *               distance_x:
 *                 type: number
 *                 format: float
 *                 minimum: 0
 *                 maximum: 1
 *               distance_y:
 *                 type: number
 *                 format: float
 *                 minimum: 0
 *                 maximum: 1
 *               properties:
 *                 type: object
 *     responses:
 *       200:
 *         description: Updated connection
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Connection'
 *       404:
 *         description: Connection not found
 */
graphRouter.put('/connections/:id', async (req: Request, res: Response) => {
  try {
    const connection = await connectionsRepo.update(req.params.id, req.body);
    if (!connection) {
      res.status(404).json({ error: 'Connection not found' });
      return;
    }
    res.json(connection);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update connection' });
  }
});

/**
 * @openapi
 * /api/connections/{id}:
 *   delete:
 *     tags: [Connections]
 *     summary: Soft-delete a connection
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       204:
 *         description: Connection deleted
 *       404:
 *         description: Connection not found
 */
graphRouter.delete('/connections/:id', async (req: Request, res: Response) => {
  try {
    const deleted = await connectionsRepo.softDelete(req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'Connection not found' });
      return;
    }
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete connection' });
  }
});

/**
 * @openapi
 * /api/projects/{id}/positions:
 *   put:
 *     tags: [Graph]
 *     summary: Batch update nord positions
 *     description: |
 *       Calls `fn_batch_update_positions()` — a PostgreSQL stored procedure that updates
 *       N nords' positions in a single SQL statement. Used after drag-and-drop or
 *       force-directed physics settle operations.
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
 *             $ref: '#/components/schemas/BatchPositionUpdate'
 *     responses:
 *       200:
 *         description: Number of nords updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 updated:
 *                   type: integer
 *                   example: 12
 */
graphRouter.put('/projects/:id/positions', async (req: Request, res: Response) => {
  try {
    const { updates } = req.body;
    if (!Array.isArray(updates) || updates.length === 0) {
      res.status(400).json({ error: 'updates array is required' });
      return;
    }
    const result = await queryOne<{ fn_batch_update_positions: number }>(
      'SELECT fn_batch_update_positions($1::jsonb) AS fn_batch_update_positions',
      [JSON.stringify(updates)]
    );
    res.json({ updated: result?.fn_batch_update_positions ?? 0 });
  } catch (err) {
    res.status(500).json({ error: 'Failed to batch update positions' });
  }
});

/** PUT /api/projects/:id/board-position — upsert a nord's position on a board */
graphRouter.put('/projects/:id/board-position', async (req: Request, res: Response) => {
  try {
    const { nord_id, type_id, distance_x, distance_y } = req.body;
    if (!nord_id || !type_id) {
      res.status(400).json({ error: 'nord_id and type_id are required' });
      return;
    }
    const position = await boardPositionsRepo.upsert({
      nord_id,
      type_id,
      distance_x: distance_x ?? 0.5,
      distance_y: distance_y ?? 0.5,
    });
    res.json(position);
  } catch (err) {
    res.status(500).json({ error: 'Failed to upsert board position' });
  }
});

/** PUT /api/projects/:id/board-position/batch — batch upsert positions */
graphRouter.put('/projects/:id/board-position/batch', async (req: Request, res: Response) => {
  try {
    const { positions } = req.body;
    if (!Array.isArray(positions)) {
      res.status(400).json({ error: 'positions array is required' });
      return;
    }
    const results = await boardPositionsRepo.batchUpsert(positions);
    res.json({ updated: results.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to batch upsert board positions' });
  }
});

/** DELETE /api/board-position/:nordId/:typeId — remove a nord from a board */
graphRouter.delete('/board-position/:nordId/:typeId', async (req: Request, res: Response) => {
  try {
    await boardPositionsRepo.remove(req.params.nordId, req.params.typeId);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove board position' });
  }
});
