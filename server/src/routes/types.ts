/**
 * types.ts — API routes for Nord Type and Connection Type CRUD.
 *
 * Types define the schema for nords and connections within a project —
 * icon, accent color, available properties, and scale behavior.
 * Individual nords/connections hold VALUES for the properties their type defines.
 *
 * "Add Property" is TYPE-level only. Nords do not have their own property schema.
 */

import { Router, Request, Response } from 'express';
import { nordTypesRepo, connectionTypesRepo } from '../repositories/types.js';

export const typesRouter = Router();

// ══════════════════════════════════════════════════════════
//  NORD TYPES
// ══════════════════════════════════════════════════════════

/** GET /api/projects/:id/types — all types for a project */
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

/** POST /api/projects/:id/nord-types — create a nord type */
typesRouter.post('/projects/:id/nord-types', async (req: Request, res: Response) => {
  try {
    const type = await nordTypesRepo.create({
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

/** POST /api/projects/:id/connection-types — create a connection type */
typesRouter.post('/projects/:id/connection-types', async (req: Request, res: Response) => {
  try {
    const type = await connectionTypesRepo.create({
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
