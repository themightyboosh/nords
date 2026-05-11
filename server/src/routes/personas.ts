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
import logger from '../lib/logger.js';

export const personasRouter = Router();

// ══════════════════════════════════════════════════════════
//  PERSONAS
// ══════════════════════════════════════════════════════════

/** GET /api/projects/:id/personas — list all personas for a project */
personasRouter.get('/projects/:id/personas', async (req: Request, res: Response) => {
  try {
    const personas = await personasRepo.findByProject(req.params.id);
    res.json(personas);
  } catch (err: any) {
    logger.error('Failed to list personas', { error: err.message, projectId: req.params.id });
    res.status(500).json({ error: 'Failed to list personas' });
  }
});

/** POST /api/projects/:id/personas — create a new persona */
personasRouter.post('/projects/:id/personas', async (req: Request, res: Response) => {
  try {
    const persona = await personasRepo.create({
      project_id: req.params.id,
      name: req.body.name,
      avatar_seed: req.body.avatar_seed,
    });
    res.status(201).json(persona);
  } catch (err: any) {
    logger.error('Failed to create persona', { error: err.message });
    res.status(500).json({ error: 'Failed to create persona' });
  }
});

/** PUT /api/personas/:id — update persona fields */
personasRouter.put('/personas/:id', async (req: Request, res: Response) => {
  try {
    const persona = await personasRepo.update(req.params.id, req.body);
    if (!persona) return res.status(404).json({ error: 'Persona not found' });
    res.json(persona);
  } catch (err: any) {
    logger.error('Failed to update persona', { error: err.message, id: req.params.id });
    res.status(500).json({ error: 'Failed to update persona' });
  }
});

/** DELETE /api/personas/:id — soft-delete persona */
personasRouter.delete('/personas/:id', async (req: Request, res: Response) => {
  try {
    await personasRepo.delete(req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    logger.error('Failed to delete persona', { error: err.message, id: req.params.id });
    res.status(500).json({ error: 'Failed to delete persona' });
  }
});

// ══════════════════════════════════════════════════════════
//  MENTAL MODELS
// ══════════════════════════════════════════════════════════

/** POST /api/personas/:id/mental-models — add a mental model (max 5) */
personasRouter.post('/personas/:id/mental-models', async (req: Request, res: Response) => {
  try {
    const model = await personasRepo.addMentalModel(req.params.id, req.body);
    if (!model) return res.status(400).json({ error: 'Maximum of 5 mental models reached' });
    res.status(201).json(model);
  } catch (err: any) {
    logger.error('Failed to add mental model', { error: err.message, personaId: req.params.id });
    res.status(500).json({ error: 'Failed to add mental model' });
  }
});

/** PUT /api/mental-models/:id — update a mental model */
personasRouter.put('/mental-models/:id', async (req: Request, res: Response) => {
  try {
    const model = await personasRepo.updateMentalModel(req.params.id, req.body);
    if (!model) return res.status(404).json({ error: 'Mental model not found' });
    res.json(model);
  } catch (err: any) {
    logger.error('Failed to update mental model', { error: err.message, id: req.params.id });
    res.status(500).json({ error: 'Failed to update mental model' });
  }
});

/** DELETE /api/mental-models/:id — delete a mental model */
personasRouter.delete('/mental-models/:id', async (req: Request, res: Response) => {
  try {
    await personasRepo.deleteMentalModel(req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    logger.error('Failed to delete mental model', { error: err.message, id: req.params.id });
    res.status(500).json({ error: 'Failed to delete mental model' });
  }
});

/** PUT /api/personas/:id/mental-models/reorder — reorder mental models */
personasRouter.put('/personas/:id/mental-models/reorder', async (req: Request, res: Response) => {
  try {
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds)) return res.status(400).json({ error: 'orderedIds must be an array' });
    await personasRepo.reorderMentalModels(req.params.id, orderedIds);
    res.json({ success: true });
  } catch (err: any) {
    logger.error('Failed to reorder mental models', { error: err.message, personaId: req.params.id });
    res.status(500).json({ error: 'Failed to reorder mental models' });
  }
});

// ══════════════════════════════════════════════════════════
//  CATEGORY WEIGHTS
// ══════════════════════════════════════════════════════════

/** PUT /api/personas/:id/weights/:connectionTypeId — upsert category weight */
personasRouter.put('/personas/:id/weights/:connectionTypeId', async (req: Request, res: Response) => {
  try {
    const { weight } = req.body;
    if (typeof weight !== 'number' || weight < -100 || weight > 100) {
      return res.status(400).json({ error: 'Weight must be a number between -100 and 100' });
    }
    const result = await personasRepo.upsertCategoryWeight(req.params.id, req.params.connectionTypeId, weight);
    res.json(result);
  } catch (err: any) {
    logger.error('Failed to update category weight', { error: err.message });
    res.status(500).json({ error: 'Failed to update category weight' });
  }
});
