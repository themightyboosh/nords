import { Router, type Request, type Response } from 'express';
import * as goalsRepo from '../repositories/goals.js';
import logger from '../lib/logger.js';

const log = logger.child({ route: 'goals' });

export const goalsRouter = Router();

// ── GET /api/projects/:id/goals — List all goals with variable bindings + relevant nords ──
goalsRouter.get('/projects/:id/goals', async (req: Request, res: Response) => {
  try {
    const goals = await goalsRepo.findByProjectWithBindings(req.params.id as string);
    res.json(goals);
  } catch (err: any) {
    log.error('Error fetching goals', { error: err.message, requestId: req.requestId, projectId: req.params.id });
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/projects/:id/goals — Create a goal ──
goalsRouter.post('/projects/:id/goals', async (req: Request, res: Response) => {
  try {
    const goal = await goalsRepo.create({
      project_id: req.params.id as string,
      ...req.body,
    });
    res.status(201).json(goal);
  } catch (err: any) {
    log.error('Error creating goal', { error: err.message, requestId: req.requestId, projectId: req.params.id });
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/goals/:id — Update a goal ──
goalsRouter.put('/goals/:id', async (req: Request, res: Response) => {
  try {
    const goal = await goalsRepo.update(req.params.id as string, req.body);
    if (!goal) return res.status(404).json({ error: 'Goal not found' });
    res.json(goal);
  } catch (err: any) {
    log.error('Error updating goal', { error: err.message, requestId: req.requestId, goalId: req.params.id });
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/goals/:id — Delete a goal ──
goalsRouter.delete('/goals/:id', async (req: Request, res: Response) => {
  try {
    const deleted = await goalsRepo.remove(req.params.id as string);
    if (!deleted) return res.status(404).json({ error: 'Goal not found' });
    res.status(204).send();
  } catch (err: any) {
    log.error('Error deleting goal', { error: err.message, requestId: req.requestId, goalId: req.params.id });
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════
// Variable Bindings (replaces property bindings)
// ══════════════════════════════════════════════════════════

// ── POST /api/goals/:id/variable-bindings — Add a variable binding ──
goalsRouter.post('/goals/:id/variable-bindings', async (req: Request, res: Response) => {
  try {
    const { variable_id, required } = req.body;
    if (!variable_id) {
      return res.status(400).json({ error: 'variable_id is required' });
    }
    const binding = await goalsRepo.addVariableBinding(
      req.params.id as string,
      variable_id,
      required !== undefined ? required : true
    );
    if (!binding) return res.status(409).json({ error: 'Variable binding already exists' });
    res.status(201).json(binding);
  } catch (err: any) {
    log.error('Error adding variable binding', { error: err.message, requestId: req.requestId, goalId: req.params.id });
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/goals/:id/variable-bindings/:bindingId — Update binding (required toggle) ──
goalsRouter.put('/goals/:id/variable-bindings/:bindingId', async (req: Request, res: Response) => {
  try {
    const { required } = req.body;
    if (required === undefined) {
      return res.status(400).json({ error: 'required is required' });
    }
    const binding = await goalsRepo.updateVariableBinding(req.params.bindingId as string, required);
    if (!binding) return res.status(404).json({ error: 'Binding not found' });
    res.json(binding);
  } catch (err: any) {
    log.error('Error updating variable binding', { error: err.message, requestId: req.requestId });
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/goals/:id/variable-bindings/:bindingId — Remove a variable binding ──
goalsRouter.delete('/goals/:id/variable-bindings/:bindingId', async (req: Request, res: Response) => {
  try {
    const deleted = await goalsRepo.removeVariableBinding(req.params.bindingId as string);
    if (!deleted) return res.status(404).json({ error: 'Variable binding not found' });
    res.status(204).send();
  } catch (err: any) {
    log.error('Error removing variable binding', { error: err.message, requestId: req.requestId });
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════
// Relevant Nords
// ══════════════════════════════════════════════════════════

// ── GET /api/goals/:id/relevant-nords ──
goalsRouter.get('/goals/:id/relevant-nords', async (req: Request, res: Response) => {
  try {
    const nords = await goalsRepo.findRelevantNords(req.params.id as string);
    res.json(nords);
  } catch (err: any) {
    log.error('Error fetching relevant nords', { error: err.message, requestId: req.requestId });
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/goals/:id/relevant-nords ──
goalsRouter.post('/goals/:id/relevant-nords', async (req: Request, res: Response) => {
  try {
    const { nord_id } = req.body;
    if (!nord_id) return res.status(400).json({ error: 'nord_id is required' });
    const result = await goalsRepo.addRelevantNord(req.params.id as string, nord_id);
    if (!result) return res.status(409).json({ error: 'Already linked' });
    res.status(201).json(result);
  } catch (err: any) {
    log.error('Error adding relevant nord', { error: err.message, requestId: req.requestId });
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/goals/:id/relevant-nords/:nordId ──
goalsRouter.delete('/goals/:id/relevant-nords/:nordId', async (req: Request, res: Response) => {
  try {
    const deleted = await goalsRepo.removeRelevantNord(req.params.id as string, req.params.nordId as string);
    if (!deleted) return res.status(404).json({ error: 'Link not found' });
    res.status(204).send();
  } catch (err: any) {
    log.error('Error removing relevant nord', { error: err.message, requestId: req.requestId });
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/nords/:nordId/goals — Get goals linked to a nord (reverse lookup) ──
goalsRouter.get('/nords/:nordId/goals', async (req: Request, res: Response) => {
  try {
    const goals = await goalsRepo.findGoalsByNord(req.params.nordId as string);
    res.json(goals);
  } catch (err: any) {
    log.error('Error fetching goals for nord', { error: err.message, requestId: req.requestId });
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════
// Relevant Nord Types
// ══════════════════════════════════════════════════════════

// ── POST /api/goals/:id/relevant-types ──
goalsRouter.post('/goals/:id/relevant-types', async (req: Request, res: Response) => {
  try {
    const { nord_type_id } = req.body;
    if (!nord_type_id) return res.status(400).json({ error: 'nord_type_id is required' });
    const result = await goalsRepo.addRelevantNordType(req.params.id as string, nord_type_id);
    if (!result) return res.status(409).json({ error: 'Already linked' });
    res.status(201).json(result);
  } catch (err: any) {
    log.error('Error adding relevant nord type', { error: err.message, requestId: req.requestId });
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/goals/:id/relevant-types/:typeId ──
goalsRouter.delete('/goals/:id/relevant-types/:typeId', async (req: Request, res: Response) => {
  try {
    const deleted = await goalsRepo.removeRelevantNordType(req.params.id as string, req.params.typeId as string);
    if (!deleted) return res.status(404).json({ error: 'Link not found' });
    res.status(204).send();
  } catch (err: any) {
    log.error('Error removing relevant nord type', { error: err.message, requestId: req.requestId });
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════
// Persona Weights
// ══════════════════════════════════════════════════════════

// ── GET /api/goals/:id/persona-weights — Get all persona weights for a goal ──
goalsRouter.get('/goals/:id/persona-weights', async (req: Request, res: Response) => {
  try {
    const weights = await goalsRepo.findWeightsByGoal(req.params.id as string);
    res.json(weights);
  } catch (err: any) {
    log.error('Error fetching persona weights', { error: err.message, requestId: req.requestId });
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/goals/:id/persona-weights/:personaId — Set persona weight ──
goalsRouter.put('/goals/:id/persona-weights/:personaId', async (req: Request, res: Response) => {
  try {
    const { weight } = req.body;
    if (weight === undefined || weight < -100 || weight > 100) {
      return res.status(400).json({ error: 'weight must be between -100 and 100' });
    }
    const result = await goalsRepo.upsertWeight(
      req.params.personaId as string,
      req.params.id as string,
      weight
    );
    res.json(result);
  } catch (err: any) {
    log.error('Error setting persona weight', { error: err.message, requestId: req.requestId });
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════
// Goal Edges — DAG connections
// ══════════════════════════════════════════════════════════

// ── GET /api/projects/:id/goal-edges — List all edges for a project ──
goalsRouter.get('/projects/:id/goal-edges', async (req: Request, res: Response) => {
  try {
    const edges = await goalsRepo.findEdgesByProject(req.params.id as string);
    res.json(edges);
  } catch (err: any) {
    log.error('Error fetching goal edges', { error: err.message, requestId: req.requestId, projectId: req.params.id });
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/projects/:id/goal-edges — Create an edge ──
goalsRouter.post('/projects/:id/goal-edges', async (req: Request, res: Response) => {
  try {
    const { source_goal_id, target_goal_id } = req.body;
    if (!source_goal_id || !target_goal_id) {
      return res.status(400).json({ error: 'source_goal_id and target_goal_id are required' });
    }
    if (source_goal_id === target_goal_id) {
      return res.status(400).json({ error: 'Cannot create self-referencing edge' });
    }
    const edge = await goalsRepo.createEdge(req.params.id as string, source_goal_id, target_goal_id);
    if (!edge) return res.status(409).json({ error: 'Edge already exists' });
    res.status(201).json(edge);
  } catch (err: any) {
    // Cycle detection and self-loop errors are client errors (400)
    if (err.message?.includes('circular dependency') || err.message?.includes('own prerequisite')) {
      return res.status(400).json({ error: err.message });
    }
    log.error('Error creating goal edge', { error: err.message, requestId: req.requestId, projectId: req.params.id });
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/goal-edges/:id — Remove an edge ──
goalsRouter.delete('/goal-edges/:id', async (req: Request, res: Response) => {
  try {
    const deleted = await goalsRepo.removeEdge(req.params.id as string);
    if (!deleted) return res.status(404).json({ error: 'Edge not found' });
    res.status(204).send();
  } catch (err: any) {
    log.error('Error removing goal edge', { error: err.message, requestId: req.requestId, edgeId: req.params.id });
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/goals/check-nord/:nordId — Check if nord is linked to goals (deletion guard) ──
goalsRouter.get('/goals/check-nord/:nordId', async (req: Request, res: Response) => {
  try {
    const boundGoals = await goalsRepo.findGoalsByNord(req.params.nordId as string);
    if (boundGoals.length > 0) {
      return res.status(409).json({
        error: `Cannot delete — this nord is linked to ${boundGoals.length} goal(s): ${boundGoals.map(g => g.goal_name).join(', ')}`,
        goals: boundGoals,
      });
    }
    res.json({ ok: true });
  } catch (err: any) {
    log.error('Error checking nord goals', { error: err.message, requestId: req.requestId, nordId: req.params.nordId });
    res.status(500).json({ error: err.message });
  }
});
