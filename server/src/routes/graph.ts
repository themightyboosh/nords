import { Router, Request, Response } from 'express';
import { query, queryOne } from '../db.js';
import * as nordsRepo from '../repositories/nords.js';
import * as connectionsRepo from '../repositories/connections.js';

export const graphRouter = Router();

// ─────────────────────────────────────────────────────────
// GET /api/projects/:id/graph
// The single most important endpoint. Calls fn_load_project_graph()
// to return the entire graph payload in one database round trip.
// ─────────────────────────────────────────────────────────
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
  } catch (err) {
    res.status(500).json({ error: 'Failed to load project graph' });
  }
});

// ─────────────────────────────────────────────────────────
// NORDS CRUD
// ─────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────
// CONNECTIONS CRUD
// ─────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────
// BATCH POSITION UPDATE (Drag-and-drop optimization)
// ─────────────────────────────────────────────────────────

graphRouter.put('/projects/:id/positions', async (req: Request, res: Response) => {
  try {
    const { updates } = req.body; // [{id, x, y}, ...]
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
