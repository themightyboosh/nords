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
import { invalidateDictionaryCache } from '../repositories/mcpSessions.js';
import { query, queryOne } from '../db.js';
import logger from '../lib/logger.js';
import { validate } from '../middleware/validate.js';
import {
  CreateNordTypeSchema, UpdateNordTypeSchema,
  CreateConnectionTypeSchema, UpdateConnectionTypeSchema,
  AssociateTypeSchema, DissociateTypeSchema,
} from '../schemas/types.js';

export const typesRouter = Router();

// ══════════════════════════════════════════════════════════
//  TYPES (Project-scoped queries, user-scoped ownership)
// ══════════════════════════════════════════════════════════

/**
 * @openapi
 * /api/projects/{id}/types:
 *   get:
 *     tags: [Types]
 *     summary: List all types for a project
 *     description: Returns both nord types and connection types associated with the project.
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
 *         description: Object containing nord_types and connection_types arrays
 */
typesRouter.get('/projects/:id/types', async (req: Request, res: Response) => {
  try {
    const [nordTypes, connectionTypes] = await Promise.all([
      nordTypesRepo.findByProject(req.params.id as string),
      connectionTypesRepo.findByProject(req.params.id as string),
    ]);
    res.json({ nord_types: nordTypes, connection_types: connectionTypes });
  } catch (err: any) {
    logger.error('Failed to load types', { error: err.message, projectId: req.params.id });
    res.status(500).json({ error: 'Failed to load types' });
  }
});

/** GET /api/users/:userId/types — all types owned by a user (global library)
 *  NOTE: Unused — retained for future multi-user re-enablement.
 */
// typesRouter.get('/users/:userId/types', async (req: Request, res: Response) => { ... });

// ══════════════════════════════════════════════════════════
//  NORD TYPES
// ══════════════════════════════════════════════════════════

/**
 * @openapi
 * /api/projects/{id}/nord-types:
 *   post:
 *     tags: [Types]
 *     summary: Create a nord type
 *     description: Creates a new nord type and associates it with the project.
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
 *             $ref: '#/components/schemas/NordType'
 *     responses:
 *       201:
 *         description: Created nord type
 *       400:
 *         description: Validation error
 */
typesRouter.post('/projects/:id/nord-types', validate(CreateNordTypeSchema), async (req: Request, res: Response) => {
  try {
    const userId = req.user?.uid || 'dev-user-000';
    const type = await nordTypesRepo.create({
      user_id: userId,
      project_id: req.params.id as string,
      name: req.body.name,
      description: req.body.description,
      icon: req.body.icon,
      accent_color: req.body.accent_color,
      properties_schema: req.body.properties_schema,
      scale_property: req.body.scale_property,
    });
    // Invalidate dictionary cache so AI sees the new type
    invalidateDictionaryCache(req.params.id as string);
    res.status(201).json(type);
  } catch (err: any) {
    logger.error('Failed to create nord type', { error: err.message, projectId: req.params.id });
    res.status(500).json({ error: 'Failed to create nord type' });
  }
});

/**
 * @openapi
 * /api/nord-types/{typeId}:
 *   put:
 *     tags: [Types]
 *     summary: Update a nord type
 *     parameters:
 *       - in: path
 *         name: typeId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/NordType'
 *     responses:
 *       200:
 *         description: Updated nord type
 *       404:
 *         description: Not found
 */
typesRouter.put('/nord-types/:typeId', validate(UpdateNordTypeSchema), async (req: Request, res: Response) => {
  try {
    const updated = await nordTypesRepo.update(req.params.typeId as string, req.body);
    if (!updated) {
      res.status(404).json({ error: 'Nord type not found' });
      return;
    }
    res.json(updated);
    // Invalidate dictionary cache for all projects using this type
    const projects = await query<{ project_id: string }>('SELECT project_id FROM project_types WHERE type_id = $1', [req.params.typeId]);
    for (const p of projects) invalidateDictionaryCache(p.project_id);
  } catch (err: any) {
    logger.error('Failed to update nord type', { error: err.message, typeId: req.params.typeId });
    res.status(500).json({ error: 'Failed to update nord type' });
  }
});

/**
 * @openapi
 * /api/nord-types/{typeId}:
 *   delete:
 *     tags: [Types]
 *     summary: Delete a nord type
 *     description: Soft-deletes the type. Fails with 409 if nords still reference it.
 *     parameters:
 *       - in: path
 *         name: typeId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       204:
 *         description: Deleted
 *       409:
 *         description: Cannot delete — type is in use
 */
typesRouter.delete('/nord-types/:typeId', async (req: Request, res: Response) => {
  try {
    // Get project IDs before deleting
    const projects = await query<{ project_id: string }>('SELECT project_id FROM project_types WHERE type_id = $1', [req.params.typeId]);
    await nordTypesRepo.delete(req.params.typeId as string);
    for (const p of projects) invalidateDictionaryCache(p.project_id);
    res.status(204).end();
  } catch (err: any) {
    if (err.message?.includes('Cannot delete')) {
      res.status(409).json({ error: err.message });
    } else {
      logger.error('Failed to delete nord type', { error: err.message, typeId: req.params.typeId });
      res.status(500).json({ error: 'Failed to delete nord type' });
    }
  }
});


// ══════════════════════════════════════════════════════════
//  CONNECTION TYPES
// ══════════════════════════════════════════════════════════

/**
 * @openapi
 * /api/projects/{id}/connection-types:
 *   post:
 *     tags: [Types]
 *     summary: Create a connection type
 *     description: Creates a new connection (edge) type and associates it with the project.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ConnectionType'
 *     responses:
 *       201:
 *         description: Created connection type
 *       400:
 *         description: Validation error
 */
typesRouter.post('/projects/:id/connection-types', validate(CreateConnectionTypeSchema), async (req: Request, res: Response) => {
  try {
    const userId = req.user?.uid || 'dev-user-000';
    const type = await connectionTypesRepo.create({
      user_id: userId,
      project_id: req.params.id as string,
      name: req.body.name,
      description: req.body.description,
      icon: req.body.icon,
      accent_color: req.body.accent_color,
      stroke_style: req.body.stroke_style,
      default_direction: req.body.default_direction,
      verb: req.body.verb,
      direction_filter: req.body.direction_filter,
      x_stage_labels: req.body.x_stage_labels,
      y_stage_labels: req.body.y_stage_labels,
      properties_schema: req.body.properties_schema,
    });
    // Invalidate dictionary cache so AI sees the new connection type
    invalidateDictionaryCache(req.params.id as string);
    res.status(201).json(type);
  } catch (err: any) {
    logger.error('Failed to create connection type', { error: err.message, projectId: req.params.id });
    res.status(500).json({ error: 'Failed to create connection type' });
  }
});

/**
 * @openapi
 * /api/connection-types/{typeId}:
 *   put:
 *     tags: [Types]
 *     summary: Update a connection type
 *     parameters:
 *       - in: path
 *         name: typeId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Updated connection type
 *       404:
 *         description: Not found
 */
typesRouter.put('/connection-types/:typeId', validate(UpdateConnectionTypeSchema), async (req: Request, res: Response) => {
  try {
    const updated = await connectionTypesRepo.update(req.params.typeId as string, req.body);
    if (!updated) {
      res.status(404).json({ error: 'Connection type not found' });
      return;
    }
    res.json(updated);
    // Invalidate dictionary cache for all projects using this connection type
    const projects = await query<{ project_id: string }>('SELECT project_id FROM project_types WHERE type_id = $1', [req.params.typeId]);
    for (const p of projects) invalidateDictionaryCache(p.project_id);
  } catch (err: any) {
    logger.error('Failed to update connection type', { error: err.message, typeId: req.params.typeId });
    res.status(500).json({ error: 'Failed to update connection type' });
  }
});

/**
 * @openapi
 * /api/connection-types/{typeId}:
 *   delete:
 *     tags: [Types]
 *     summary: Delete a connection type
 *     description: Soft-deletes the type. Fails with 409 if connections still reference it.
 *     parameters:
 *       - in: path
 *         name: typeId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       204:
 *         description: Deleted
 *       409:
 *         description: Cannot delete — type is in use
 */
typesRouter.delete('/connection-types/:typeId', async (req: Request, res: Response) => {
  try {
    // Get project IDs before deleting
    const projects = await query<{ project_id: string }>('SELECT project_id FROM project_types WHERE type_id = $1', [req.params.typeId]);
    await connectionTypesRepo.delete(req.params.typeId as string);
    for (const p of projects) invalidateDictionaryCache(p.project_id);
    res.status(204).end();
  } catch (err: any) {
    if (err.message?.includes('Cannot delete')) {
      res.status(409).json({ error: err.message });
    } else {
      logger.error('Failed to delete connection type', { error: err.message, typeId: req.params.typeId });
      res.status(500).json({ error: 'Failed to delete connection type' });
    }
  }
});


// ══════════════════════════════════════════════════════════
//  PROJECT-TYPE ASSOCIATIONS
// ══════════════════════════════════════════════════════════

/**
 * @openapi
 * /api/projects/{id}/types/associate:
 *   post:
 *     tags: [Types]
 *     summary: Associate a type with a project
 *     description: Links an existing nord/connection type to a project.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       201:
 *         description: Associated
 *       400:
 *         description: Validation error
 */
typesRouter.post('/projects/:id/types/associate', validate(AssociateTypeSchema), async (req: Request, res: Response) => {
  try {
    const { type_id, type_kind } = req.body;
    const maxSort = await queryOne<{ max: number }>(
      `SELECT COALESCE(MAX(sort_order), -1) + 1 AS max FROM project_types
       WHERE project_id = $1 AND type_kind = $2`,
      [req.params.id as string, type_kind]
    );
    await queryOne(
      `INSERT INTO project_types (project_id, type_id, type_kind, sort_order)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT DO NOTHING`,
      [req.params.id as string, type_id, type_kind, maxSort?.max ?? 0]
    );
    res.status(201).json({ associated: true });
  } catch (err: any) {
    logger.error('Failed to associate type', { error: err.message, projectId: req.params.id });
    res.status(500).json({ error: 'Failed to associate type' });
  }
});

/**
 * @openapi
 * /api/projects/{id}/types/dissociate:
 *   post:
 *     tags: [Types]
 *     summary: Remove a type from a project
 *     description: Unlinks a type from the project without deleting it. System types cannot be removed.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Dissociated
 *       409:
 *         description: Cannot remove system type
 */
typesRouter.post('/projects/:id/types/dissociate', validate(DissociateTypeSchema), async (req: Request, res: Response) => {
  try {
    const { type_id } = req.body;
    const connType = await connectionTypesRepo.findById(type_id);
    if (connType?.is_system) {
      res.status(409).json({ error: 'Cannot remove system connection type from project' });
      return;
    }
    await query(
      'DELETE FROM project_types WHERE project_id = $1 AND type_id = $2',
      [req.params.id as string, type_id]
    );
    res.json({ dissociated: true });
  } catch (err: any) {
    logger.error('Failed to dissociate type', { error: err.message, projectId: req.params.id });
    res.status(500).json({ error: 'Failed to dissociate type' });
  }
});
