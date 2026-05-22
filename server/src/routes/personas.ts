/**
 * personas.ts — API routes for Persona CRUD, mental models, and category weights.
 *
 * Follows the same route pattern as types.ts:
 *   POST   /api/projects/:id/personas          — create
 *   GET    /api/projects/:id/personas          — list all for project
 *   PUT    /api/personas/:id                   — update persona fields
 *   DELETE /api/personas/:id                   — soft-delete
 *   POST   /api/personas/:id/mental-models     — add mental model (max 5)
 *   PUT    /api/mental-models/:id              — update mental model
 *   DELETE /api/mental-models/:id              — delete mental model
 *   PUT    /api/personas/:id/mental-models/reorder — reorder models
 *   PUT    /api/personas/:id/weights/:ctId     — upsert category weight
 */

import { Router, Request, Response } from 'express';
import { personasRepo } from '../repositories/personas.js';
import { invalidateDictionaryCache } from '../repositories/mcpSessions.js';
import logger from '../lib/logger.js';
import { validate } from '../middleware/validate.js';
import {
  CreatePersonaSchema, UpdatePersonaSchema,
  CreateMentalModelSchema, UpdateMentalModelSchema,
  ReorderMentalModelsSchema, UpsertCategoryWeightSchema,
} from '../schemas/personas.js';

export const personasRouter = Router();

// ══════════════════════════════════════════════════════════
//  PERSONAS
// ══════════════════════════════════════════════════════════

/**
 * @openapi
 * /api/projects/{id}/personas:
 *   get:
 *     tags: [Personas]
 *     summary: List all personas for a project
 *     description: Returns an array of persona objects with their mental models and category weights.
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
 *         description: Array of personas
 */
personasRouter.get('/projects/:id/personas', async (req: Request, res: Response) => {
  try {
    const personas = await personasRepo.findByProject(req.params.id as string);
    res.json(personas);
  } catch (err: any) {
    logger.error('Failed to list personas', { error: err.message, projectId: req.params.id });
    res.status(500).json({ error: 'Failed to list personas' });
  }
});

/**
 * @openapi
 * /api/projects/{id}/personas:
 *   post:
 *     tags: [Personas]
 *     summary: Create a new persona
 *     description: Creates an AI lens persona and associates it with the project.
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
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *                 description: Display name (e.g., "Engineering Lead")
 *               avatar_seed:
 *                 type: string
 *                 description: DiceBear avatar seed
 *     responses:
 *       201:
 *         description: Created persona
 *       400:
 *         description: Validation error
 */
personasRouter.post('/projects/:id/personas', validate(CreatePersonaSchema), async (req: Request, res: Response) => {
  try {
    const persona = await personasRepo.create({
      project_id: req.params.id as string,
      name: req.body.name,
      avatar_seed: req.body.avatar_seed,
    });
    invalidateDictionaryCache(req.params.id as string);
    res.status(201).json(persona);
  } catch (err: any) {
    logger.error('Failed to create persona', { error: err.message });
    res.status(500).json({ error: 'Failed to create persona' });
  }
});

/**
 * @openapi
 * /api/personas/{id}:
 *   put:
 *     tags: [Personas]
 *     summary: Update persona fields
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Updated persona
 *       404:
 *         description: Not found
 */
personasRouter.put('/personas/:id', validate(UpdatePersonaSchema), async (req: Request, res: Response) => {
  try {
    const persona = await personasRepo.update(req.params.id as string, req.body);
    if (!persona) return res.status(404).json({ error: 'Persona not found' });
    if (persona.project_id) invalidateDictionaryCache(persona.project_id);
    res.json(persona);
  } catch (err: any) {
    logger.error('Failed to update persona', { error: err.message, id: req.params.id });
    res.status(500).json({ error: 'Failed to update persona' });
  }
});

/**
 * @openapi
 * /api/personas/{id}:
 *   delete:
 *     tags: [Personas]
 *     summary: Delete a persona
 *     description: Soft-deletes the persona.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Deleted
 */
personasRouter.delete('/personas/:id', async (req: Request, res: Response) => {
  try {
    // Look up project before deleting
    const persona = await personasRepo.findById(req.params.id as string);
    await personasRepo.delete(req.params.id as string);
    if (persona?.project_id) invalidateDictionaryCache(persona.project_id);
    res.json({ success: true });
  } catch (err: any) {
    logger.error('Failed to delete persona', { error: err.message, id: req.params.id });
    res.status(500).json({ error: 'Failed to delete persona' });
  }
});

// ══════════════════════════════════════════════════════════
//  MENTAL MODELS
// ══════════════════════════════════════════════════════════

/**
 * @openapi
 * /api/personas/{id}/mental-models:
 *   post:
 *     tags: [Personas]
 *     summary: Add a mental model
 *     description: Adds a mental model to a persona (max 5). Mental models define focus areas and behavioral guardrails for AI interactions.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Persona ID
 *     responses:
 *       201:
 *         description: Created mental model
 *       400:
 *         description: Maximum of 5 mental models reached
 */
personasRouter.post('/personas/:id/mental-models', validate(CreateMentalModelSchema), async (req: Request, res: Response) => {
  try {
    const model = await personasRepo.addMentalModel(req.params.id as string, req.body);
    if (!model) return res.status(400).json({ error: 'Maximum of 5 mental models reached' });
    res.status(201).json(model);
  } catch (err: any) {
    logger.error('Failed to add mental model', { error: err.message, personaId: req.params.id });
    res.status(500).json({ error: 'Failed to add mental model' });
  }
});

/**
 * @openapi
 * /api/mental-models/{id}:
 *   put:
 *     tags: [Personas]
 *     summary: Update a mental model
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Updated mental model
 *       404:
 *         description: Not found
 */
personasRouter.put('/mental-models/:id', validate(UpdateMentalModelSchema), async (req: Request, res: Response) => {
  try {
    const model = await personasRepo.updateMentalModel(req.params.id as string, req.body);
    if (!model) return res.status(404).json({ error: 'Mental model not found' });
    res.json(model);
  } catch (err: any) {
    logger.error('Failed to update mental model', { error: err.message, id: req.params.id });
    res.status(500).json({ error: 'Failed to update mental model' });
  }
});

/**
 * @openapi
 * /api/mental-models/{id}:
 *   delete:
 *     tags: [Personas]
 *     summary: Delete a mental model
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Deleted
 */
personasRouter.delete('/mental-models/:id', async (req: Request, res: Response) => {
  try {
    await personasRepo.deleteMentalModel(req.params.id as string);
    res.json({ success: true });
  } catch (err: any) {
    logger.error('Failed to delete mental model', { error: err.message, id: req.params.id });
    res.status(500).json({ error: 'Failed to delete mental model' });
  }
});

/**
 * @openapi
 * /api/personas/{id}/mental-models/reorder:
 *   put:
 *     tags: [Personas]
 *     summary: Reorder mental models
 *     description: Sets the display order of mental models by providing an ordered array of IDs.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Persona ID
 *     responses:
 *       200:
 *         description: Reordered
 *       400:
 *         description: Validation error
 */
personasRouter.put('/personas/:id/mental-models/reorder', validate(ReorderMentalModelsSchema), async (req: Request, res: Response) => {
  try {
    await personasRepo.reorderMentalModels(req.params.id as string, req.body.orderedIds);
    res.json({ success: true });
  } catch (err: any) {
    logger.error('Failed to reorder mental models', { error: err.message, personaId: req.params.id });
    res.status(500).json({ error: 'Failed to reorder mental models' });
  }
});

// ══════════════════════════════════════════════════════════
//  CATEGORY WEIGHTS
// ══════════════════════════════════════════════════════════

/**
 * @openapi
 * /api/personas/{id}/weights/{connectionTypeId}:
 *   put:
 *     tags: [Personas]
 *     summary: Set category weight
 *     description: Upserts the relevance weight for a connection type category. -100 = suppress, 0 = neutral, 100 = prioritize.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Persona ID
 *       - in: path
 *         name: connectionTypeId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Connection type ID
 *     responses:
 *       200:
 *         description: Weight saved
 *       400:
 *         description: Validation error
 */
personasRouter.put('/personas/:id/weights/:connectionTypeId', validate(UpsertCategoryWeightSchema), async (req: Request, res: Response) => {
  try {
    const result = await personasRepo.upsertCategoryWeight(
      req.params.id as string,
      req.params.connectionTypeId as string,
      req.body.weight,
    );
    // Weights affect the dictionary, invalidate cache
    const persona = await personasRepo.findById(req.params.id as string);
    if (persona?.project_id) invalidateDictionaryCache(persona.project_id);
    res.json(result);
  } catch (err: any) {
    logger.error('Failed to update category weight', { error: err.message });
    res.status(500).json({ error: 'Failed to update category weight' });
  }
});
