import { Router, type Request, type Response } from 'express';
import * as variablesRepo from '../repositories/variables.js';
import logger from '../lib/logger.js';

const log = logger.child({ route: 'variables' });

export const variablesRouter = Router();

// ── GET /api/projects/:id/variables — List all project variables ──
variablesRouter.get('/projects/:id/variables', async (req: Request, res: Response) => {
  try {
    const variables = await variablesRepo.findByProject(req.params.id as string);
    res.json(variables);
  } catch (err: any) {
    log.error('Error fetching variables', { error: err.message, requestId: req.requestId, projectId: req.params.id });
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/projects/:id/variables — Create a variable ──
variablesRouter.post('/projects/:id/variables', async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ error: 'name is required' });
    }
    const variable = await variablesRepo.create({
      project_id: req.params.id as string,
      ...req.body,
    });
    res.status(201).json(variable);
  } catch (err: any) {
    if (err.message?.includes('unique constraint') || err.code === '23505') {
      return res.status(409).json({ error: `Variable "${req.body.name}" already exists` });
    }
    log.error('Error creating variable', { error: err.message, requestId: req.requestId, projectId: req.params.id });
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/variables/:id — Update a variable ──
variablesRouter.put('/variables/:id', async (req: Request, res: Response) => {
  try {
    const variable = await variablesRepo.update(req.params.id as string, req.body);
    if (!variable) return res.status(404).json({ error: 'Variable not found' });
    res.json(variable);
  } catch (err: any) {
    if (err.message?.includes('unique constraint') || err.code === '23505') {
      return res.status(409).json({ error: `Variable name "${req.body.name}" already exists in this project` });
    }
    log.error('Error updating variable', { error: err.message, requestId: req.requestId, variableId: req.params.id });
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/variables/:id — Delete a variable ──
variablesRouter.delete('/variables/:id', async (req: Request, res: Response) => {
  try {
    const deleted = await variablesRepo.remove(req.params.id as string);
    if (!deleted) return res.status(404).json({ error: 'Variable not found' });
    res.status(204).send();
  } catch (err: any) {
    log.error('Error deleting variable', { error: err.message, requestId: req.requestId, variableId: req.params.id });
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/projects/:id/variables/reorder — Reorder variables ──
variablesRouter.put('/projects/:id/variables/reorder', async (req: Request, res: Response) => {
  try {
    const { variableIds } = req.body;
    if (!Array.isArray(variableIds)) {
      return res.status(400).json({ error: 'variableIds array is required' });
    }
    await variablesRepo.reorder(req.params.id as string, variableIds);
    res.json({ ok: true });
  } catch (err: any) {
    log.error('Error reordering variables', { error: err.message, requestId: req.requestId, projectId: req.params.id });
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/projects/:id/variables/bulk — Bulk upsert variables ──
variablesRouter.post('/projects/:id/variables/bulk', async (req: Request, res: Response) => {
  try {
    const { variables } = req.body;
    if (!Array.isArray(variables)) {
      return res.status(400).json({ error: 'variables array is required' });
    }
    const results = await variablesRepo.bulkUpsert(req.params.id as string, variables);
    res.json(results);
  } catch (err: any) {
    log.error('Error bulk upserting variables', { error: err.message, requestId: req.requestId, projectId: req.params.id });
    res.status(500).json({ error: err.message });
  }
});
