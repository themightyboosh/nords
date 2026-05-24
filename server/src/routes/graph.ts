import { Router, Request, Response } from 'express';
import { query, queryOne } from '../db.js';
import logger from '../lib/logger.js';
import * as nordsRepo from '../repositories/nords.js';
import * as connectionsRepo from '../repositories/connections.js';
import * as boardPositionsRepo from '../repositories/boardPositions.js';
import { nordTypesRepo, connectionTypesRepo } from '../repositories/types.js';

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
    logger.error('fn_load_project_graph failed', { code: err.code, message: err.message, projectId: req.params.id });
    res.status(500).json({ error: 'Failed to load project graph' });
  }
});

/**
 * @openapi
 * /api/projects/{id}/nords/query:
 *   get:
 *     tags: [Nords]
 *     summary: Query nords by type and property filters
 *     description: |
 *       Filters nords using JSONB operators. Designed for MCP agent use cases
 *       like "find all Team Members with React skills and <80% utilization."
 *       Filter syntax: "property operator value" where operator is =, <, >, <=, >=, or contains.
 */
graphRouter.get('/projects/:id/nords/query', async (req: Request, res: Response) => {
  try {
    const projectId = req.params.id;
    const typeName = req.query.type_name as string | undefined;
    const filters = (Array.isArray(req.query.filter) ? req.query.filter : req.query.filter ? [req.query.filter] : []) as string[];
    const sortParam = req.query.sort as string | undefined;
    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 50, 1), 100);

    // Build the query
    const conditions: string[] = ['n.project_id = $1', 'n.deleted_at IS NULL'];
    const params: unknown[] = [projectId];
    let paramIdx = 2;

    // Type name filter — join nord_types
    let joinClause = '';
    if (typeName) {
      joinClause = 'JOIN nord_types nt ON n.type_id = nt.id';
      conditions.push(`nt.name = $${paramIdx}`);
      params.push(typeName);
      paramIdx++;
    }

    // Parse property filters
    const operatorRegex = /^(.+?)\s+(=|<|>|<=|>=|contains)\s+(.+)$/;
    for (const f of filters) {
      const match = f.match(operatorRegex);
      if (!match) continue;

      const [, propName, op, rawValue] = match;
      const prop = propName.trim();
      const val = rawValue.trim();

      if (op === 'contains') {
        // JSONB containment — works for arrays and strings
        conditions.push(`n.properties->'${prop}' @> $${paramIdx}::jsonb`);
        params.push(JSON.stringify(val));
        paramIdx++;
      } else if (op === '=') {
        conditions.push(`n.properties->>'${prop}' = $${paramIdx}`);
        params.push(val);
        paramIdx++;
      } else {
        // Numeric comparison: <, >, <=, >=
        const numVal = parseFloat(val);
        if (isNaN(numVal)) continue;
        conditions.push(`(n.properties->>'${prop}')::numeric ${op} $${paramIdx}`);
        params.push(numVal);
        paramIdx++;
      }
    }

    // Sort
    let orderClause = 'ORDER BY n.created_at DESC';
    if (sortParam) {
      const sortMatch = sortParam.match(/^(.+?)\s+(asc|desc)$/i);
      if (sortMatch) {
        const [, sortProp, sortDir] = sortMatch;
        orderClause = `ORDER BY n.properties->>'${sortProp.trim()}' ${sortDir.toUpperCase()}`;
      }
    }

    const sql = `
      SELECT n.*
      FROM nords n
      ${joinClause}
      WHERE ${conditions.join(' AND ')}
      ${orderClause}
      LIMIT ${limit}
    `;

    const rows = await query<Record<string, unknown>>(sql, params);
    res.json({ results: rows, count: rows.length, limit });
  } catch (err: any) {
    logger.error('Nord query failed', { code: err.code, message: err.message, projectId: req.params.id });
    res.status(500).json({ error: 'Failed to query nords' });
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
    if (!req.body.type_id) {
      res.status(400).json({ error: 'type_id is required' });
      return;
    }
    const nord = await nordsRepo.create({
      project_id: req.params.id as string,
      type_id: req.body.type_id,
      title: req.body.title || 'Untitled',
      properties: req.body.properties || {},
      position_x: req.body.position_x ?? 0,
      position_y: req.body.position_y ?? 0,
      scale: req.body.scale ?? 1.0,
      created_by: req.body.created_by || null,
    });
    res.status(201).json(nord);
  } catch (err: any) {
    logger.error('Nord creation failed', { code: err.code, message: err.message, projectId: req.params.id });
    if (err.code === '23503') {
      res.status(400).json({ error: 'Referenced type does not exist', detail: err.detail });
      return;
    }
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
    // Validate required properties if properties are being updated
    if (req.body.properties) {
      const existing = await nordsRepo.findById(req.params.id as string);
      if (existing) {
        const nordType = await nordTypesRepo.findById(existing.type_id);
        if (nordType?.properties_schema) {
          // Merge existing properties with incoming partial update
          const mergedProps = { ...(existing.properties || {}), ...req.body.properties };
          const missing = (nordType.properties_schema as any[])
            .filter((s: any) => s.required && s.card_row)
            .filter((s: any) => {
              const val = mergedProps[s.name];
              return val == null || (typeof val === 'string' && val.trim() === '') || (Array.isArray(val) && val.length === 0);
            })
            .map((s: any) => s.name);
          if (missing.length > 0) {
            res.status(400).json({ error: `Required properties missing: ${missing.join(', ')}` });
            return;
          }
        }
      }
    }
    const nord = await nordsRepo.update(req.params.id as string, req.body);
    if (!nord) {
      res.status(404).json({ error: 'Nord not found' });
      return;
    }
    res.json(nord);
  } catch (err: any) {
    logger.error('Failed to update nord', { error: err.message, nordId: req.params.id });
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
    const deleted = await nordsRepo.softDelete(req.params.id as string);
    if (!deleted) {
      res.status(404).json({ error: 'Nord not found' });
      return;
    }
    res.status(204).send();
  } catch (err: any) {
    logger.error('Failed to delete nord', { error: err.message, nordId: req.params.id });
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
    const { type_id, source_nord_id, target_nord_id } = req.body;
    if (!type_id || !source_nord_id || !target_nord_id) {
      res.status(400).json({ error: 'type_id, source_nord_id, and target_nord_id are required' });
      return;
    }
    const connection = await connectionsRepo.create({
      project_id: req.params.id as string,
      type_id,
      source_nord_id,
      target_nord_id,
      direction: req.body.direction || 'none',
      distance_x: req.body.distance_x ?? 0.5,
      distance_y: req.body.distance_y ?? 0.5,
      properties: req.body.properties || {},
    });
    res.status(201).json(connection);
  } catch (err: any) {
    logger.error('Connection creation failed', { code: err.code, message: err.message, projectId: req.params.id });
    // Unique constraint: duplicate connection
    if (err.code === '23505') {
      res.status(409).json({ error: 'Connection already exists between these nords for this type' });
      return;
    }
    // Foreign key: bad nord or type reference
    if (err.code === '23503') {
      res.status(400).json({ error: 'Referenced nord or connection type does not exist', detail: err.detail });
      return;
    }
    // Check constraint: e.g. distance out of range
    if (err.code === '23514') {
      res.status(400).json({ error: 'Value out of allowed range', detail: err.detail });
      return;
    }
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
 *                 enum: [forward, reverse, both, neither, none]
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
    // Validate required properties if properties are being updated
    if (req.body.properties) {
      const existing = await connectionsRepo.findById(req.params.id as string);
      if (existing) {
        const connType = await connectionTypesRepo.findById(existing.type_id);
        if (connType?.properties_schema) {
          // Merge existing properties with incoming partial update
          const mergedProps = { ...(existing.properties || {}), ...req.body.properties };
          const missing = (connType.properties_schema as any[])
            .filter((s: any) => s.required && s.card_row)
            .filter((s: any) => {
              const val = mergedProps[s.name];
              return val == null || (typeof val === 'string' && val.trim() === '') || (Array.isArray(val) && val.length === 0);
            })
            .map((s: any) => s.name);
          if (missing.length > 0) {
            res.status(400).json({ error: `Required properties missing: ${missing.join(', ')}` });
            return;
          }
        }
      }
    }
    const connection = await connectionsRepo.update(req.params.id as string, req.body);
    if (!connection) {
      res.status(404).json({ error: 'Connection not found' });
      return;
    }
    res.json(connection);
  } catch (err: any) {
    logger.error('Connection update failed', { code: err.code, message: err.message, connectionId: req.params.id });
    if (err.code === '23505') {
      res.status(409).json({ error: 'Duplicate connection would result from this update' });
      return;
    }
    if (err.code === '23514') {
      res.status(400).json({ error: 'Value out of allowed range', detail: err.detail });
      return;
    }
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
    const deleted = await connectionsRepo.softDelete(req.params.id as string);
    if (!deleted) {
      res.status(404).json({ error: 'Connection not found' });
      return;
    }
    res.status(204).send();
  } catch (err: any) {
    logger.error('Failed to delete connection', { error: err.message, connectionId: req.params.id });
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
  } catch (err: any) {
    logger.error('Failed to batch update positions', { error: err.message, projectId: req.params.id });
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
  } catch (err: any) {
    logger.error('Failed to upsert board position', { error: err.message, nordId: req.body.nord_id });
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
  } catch (err: any) {
    logger.error('Failed to batch upsert board positions', { error: err.message, projectId: req.params.id });
    res.status(500).json({ error: 'Failed to batch upsert board positions' });
  }
});

/** DELETE /api/board-position/:nordId/:typeId — remove a nord from a board */
graphRouter.delete('/board-position/:nordId/:typeId', async (req: Request, res: Response) => {
  try {
    await boardPositionsRepo.remove(req.params.nordId as string, req.params.typeId as string);
    res.status(204).send();
  } catch (err: any) {
    logger.error('Failed to remove board position', { error: err.message, nordId: req.params.nordId });
    res.status(500).json({ error: 'Failed to remove board position' });
  }
});
