/**
 * types.ts — API routes for Nord Type and Connection Type CRUD.
 *
 * Types are user-level global components. They belong to a user account
 * and are associated with projects via the project_types join table.
 * Individual nords/connections hold VALUES for the properties their type defines.
 *
 * "Add Property" is TYPE-level only. Nords do not have their own property schema.
 */

import { Router, Request, Response } from 'express';
import { nordTypesRepo, connectionTypesRepo } from '../repositories/types.js';
import { query, queryOne } from '../db.js';

export const typesRouter = Router();

// ══════════════════════════════════════════════════════════
//  TYPES (Project-scoped queries, user-scoped ownership)
// ══════════════════════════════════════════════════════════

/** GET /api/projects/:id/types — all types associated with a project */
typesRouter.get('/projects/:id/types', async (req: Request, res: Response) => {
  try {
    const [nordTypes, connectionTypes] = await Promise.all([
      nordTypesRepo.findByProject(req.params.id),
      connectionTypesRepo.findByProject(req.params.id),
    ]);
    res.json({ nord_types: nordTypes, connection_types: connectionTypes });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load types' });
  }
});

/** GET /api/users/:userId/types — all types owned by a user (global library) */
typesRouter.get('/users/:userId/types', async (req: Request, res: Response) => {
  try {
    const [nordTypes, connectionTypes] = await Promise.all([
      nordTypesRepo.findByUser(req.params.userId),
      connectionTypesRepo.findByUser(req.params.userId),
    ]);
    res.json({ nord_types: nordTypes, connection_types: connectionTypes });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load user types' });
  }
});

// ══════════════════════════════════════════════════════════
//  NORD TYPES
// ══════════════════════════════════════════════════════════

/** POST /api/projects/:id/nord-types — create a nord type and associate with project */
typesRouter.post('/projects/:id/nord-types', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.uid;
    if (!userId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const type = await nordTypesRepo.create({
      user_id: userId,
      project_id: req.params.id,
      name: req.body.name || 'New Type',
      icon: req.body.icon,
      accent_color: req.body.accent_color,
      properties_schema: req.body.properties_schema,
      scale_property: req.body.scale_property,
    });
    res.status(201).json(type);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create nord type' });
  }
});

/** PUT /api/nord-types/:typeId — update a nord type */
typesRouter.put('/nord-types/:typeId', async (req: Request, res: Response) => {
  try {
    const updated = await nordTypesRepo.update(req.params.typeId, req.body);
    if (!updated) {
      res.status(404).json({ error: 'Nord type not found' });
      return;
    }
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update nord type' });
  }
});

/** DELETE /api/nord-types/:typeId — soft-delete a nord type */
typesRouter.delete('/nord-types/:typeId', async (req: Request, res: Response) => {
  try {
    await nordTypesRepo.delete(req.params.typeId);
    res.status(204).end();
  } catch (err: any) {
    if (err.message?.includes('Cannot delete')) {
      res.status(409).json({ error: err.message });
    } else {
      res.status(500).json({ error: 'Failed to delete nord type' });
    }
  }
});


// ══════════════════════════════════════════════════════════
//  CONNECTION TYPES
// ══════════════════════════════════════════════════════════

/** POST /api/projects/:id/connection-types — create and associate with project */
typesRouter.post('/projects/:id/connection-types', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.uid;
    if (!userId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const type = await connectionTypesRepo.create({
      user_id: userId,
      project_id: req.params.id,
      name: req.body.name || 'New Connection',
      accent_color: req.body.accent_color,
      stroke_style: req.body.stroke_style,
      default_direction: req.body.default_direction,
      x_stage_labels: req.body.x_stage_labels,
      y_stage_labels: req.body.y_stage_labels,
      properties_schema: req.body.properties_schema,
    });
    res.status(201).json(type);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create connection type' });
  }
});

/** PUT /api/connection-types/:typeId — update a connection type */
typesRouter.put('/connection-types/:typeId', async (req: Request, res: Response) => {
  try {
    const updated = await connectionTypesRepo.update(req.params.typeId, req.body);
    if (!updated) {
      res.status(404).json({ error: 'Connection type not found' });
      return;
    }
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update connection type' });
  }
});

/** DELETE /api/connection-types/:typeId — soft-delete a connection type */
typesRouter.delete('/connection-types/:typeId', async (req: Request, res: Response) => {
  try {
    await connectionTypesRepo.delete(req.params.typeId);
    res.status(204).end();
  } catch (err: any) {
    if (err.message?.includes('Cannot delete')) {
      res.status(409).json({ error: err.message });
    } else {
      res.status(500).json({ error: 'Failed to delete connection type' });
    }
  }
});


// ══════════════════════════════════════════════════════════
//  PROJECT-TYPE ASSOCIATIONS
// ══════════════════════════════════════════════════════════

/** POST /api/projects/:id/types/associate — add an existing type to a project */
typesRouter.post('/projects/:id/types/associate', async (req: Request, res: Response) => {
  try {
    const { type_id, type_kind } = req.body;
    if (!type_id || !type_kind) {
      res.status(400).json({ error: 'type_id and type_kind required' });
      return;
    }
    const maxSort = await queryOne<{ max: number }>(
      `SELECT COALESCE(MAX(sort_order), -1) + 1 AS max FROM project_types
       WHERE project_id = $1 AND type_kind = $2`,
      [req.params.id, type_kind]
    );
    await queryOne(
      `INSERT INTO project_types (project_id, type_id, type_kind, sort_order)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT DO NOTHING`,
      [req.params.id, type_id, type_kind, maxSort?.max ?? 0]
    );
    res.status(201).json({ associated: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to associate type' });
  }
});

/** DELETE /api/projects/:id/types/dissociate — remove a type from a project (not delete it) */
typesRouter.post('/projects/:id/types/dissociate', async (req: Request, res: Response) => {
  try {
    const { type_id } = req.body;
    if (!type_id) {
      res.status(400).json({ error: 'type_id required' });
      return;
    }
    // Don't allow dissociating system types
    const connType = await connectionTypesRepo.findById(type_id);
    if (connType?.is_system) {
      res.status(409).json({ error: 'Cannot remove system connection type from project' });
      return;
    }
    await query(
      'DELETE FROM project_types WHERE project_id = $1 AND type_id = $2',
      [req.params.id, type_id]
    );
    res.json({ dissociated: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to dissociate type' });
  }
});
