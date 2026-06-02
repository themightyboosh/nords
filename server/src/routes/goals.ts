import { Router, type Request, type Response } from 'express';
import * as goalsRepo from '../repositories/goals.js';
import logger from '../lib/logger.js';

const log = logger.child({ route: 'goals' });

export const goalsRouter = Router();

/**
 * @openapi
 * /api/projects/{id}/goals:
 *   get:
 *     tags: [Goals]
 *     summary: List all goals with variable bindings and relevant nords
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Array of goals with bindings
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/Goal' }
 */
goalsRouter.get('/projects/:id/goals', async (req: Request, res: Response) => {
  try {
    const goals = await goalsRepo.findByProjectWithBindings(req.params.id as string);
    res.json(goals);
  } catch (err: any) {
    log.error('Error fetching goals', { error: err.message, requestId: req.requestId, projectId: req.params.id });
    res.status(500).json({ error: err.message });
  }
});

/**
 * @openapi
 * /api/projects/{id}/goals:
 *   post:
 *     tags: [Goals]
 *     summary: Create a goal
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/CreateGoalRequest' }
 *     responses:
 *       201:
 *         description: Created goal
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Goal' }
 */
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

/**
 * @openapi
 * /api/goals/{id}:
 *   put:
 *     tags: [Goals]
 *     summary: Update a goal
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/CreateGoalRequest' }
 *     responses:
 *       200:
 *         description: Updated goal
 *       404:
 *         description: Goal not found
 */
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

/**
 * @openapi
 * /api/goals/{id}:
 *   delete:
 *     tags: [Goals]
 *     summary: Delete a goal
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       204:
 *         description: Goal deleted
 *       404:
 *         description: Goal not found
 */
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

/**
 * @openapi
 * /api/goals/{id}/variable-bindings:
 *   post:
 *     tags: [Goals]
 *     summary: Add a variable binding to a goal
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [variable_id]
 *             properties:
 *               variable_id: { type: string, format: uuid }
 *               required: { type: boolean, default: true }
 *     responses:
 *       201:
 *         description: Binding created
 *       409:
 *         description: Binding already exists
 */
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

/**
 * @openapi
 * /api/goals/{id}/variable-bindings/{bindingId}:
 *   put:
 *     tags: [Goals]
 *     summary: Update a variable binding (toggle required)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: bindingId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [required]
 *             properties:
 *               required: { type: boolean }
 *     responses:
 *       200:
 *         description: Updated binding
 *       404:
 *         description: Binding not found
 */
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

/**
 * @openapi
 * /api/goals/{id}/variable-bindings/{bindingId}:
 *   delete:
 *     tags: [Goals]
 *     summary: Remove a variable binding
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: bindingId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       204:
 *         description: Binding removed
 *       404:
 *         description: Binding not found
 */
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

/**
 * @openapi
 * /api/goals/{id}/relevant-nords:
 *   get:
 *     tags: [Goals]
 *     summary: Get nords relevant to a goal
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Array of relevant nords
 */
goalsRouter.get('/goals/:id/relevant-nords', async (req: Request, res: Response) => {
  try {
    const nords = await goalsRepo.findRelevantNords(req.params.id as string);
    res.json(nords);
  } catch (err: any) {
    log.error('Error fetching relevant nords', { error: err.message, requestId: req.requestId });
    res.status(500).json({ error: err.message });
  }
});

/**
 * @openapi
 * /api/goals/{id}/relevant-nords:
 *   post:
 *     tags: [Goals]
 *     summary: Link a nord as relevant to a goal
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nord_id]
 *             properties:
 *               nord_id: { type: string, format: uuid }
 *     responses:
 *       201:
 *         description: Nord linked
 *       409:
 *         description: Already linked
 */
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

/**
 * @openapi
 * /api/goals/{id}/relevant-nords/{nordId}:
 *   delete:
 *     tags: [Goals]
 *     summary: Unlink a nord from a goal
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: nordId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       204:
 *         description: Link removed
 *       404:
 *         description: Link not found
 */
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

/**
 * @openapi
 * /api/nords/{nordId}/goals:
 *   get:
 *     tags: [Goals]
 *     summary: Get goals linked to a nord (reverse lookup)
 *     parameters:
 *       - in: path
 *         name: nordId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Array of goals linked to the nord
 */
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

/**
 * @openapi
 * /api/goals/{id}/relevant-types:
 *   post:
 *     tags: [Goals]
 *     summary: Link a nord type as relevant to a goal
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nord_type_id]
 *             properties:
 *               nord_type_id: { type: string, format: uuid }
 *     responses:
 *       201:
 *         description: Type linked
 *       409:
 *         description: Already linked
 */
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

/**
 * @openapi
 * /api/goals/{id}/relevant-types/{typeId}:
 *   delete:
 *     tags: [Goals]
 *     summary: Unlink a nord type from a goal
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: typeId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       204:
 *         description: Link removed
 *       404:
 *         description: Link not found
 */
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

/**
 * @openapi
 * /api/goals/{id}/persona-weights:
 *   get:
 *     tags: [Goals]
 *     summary: Get all persona weights for a goal
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Array of persona goal weights
 */
goalsRouter.get('/goals/:id/persona-weights', async (req: Request, res: Response) => {
  try {
    const weights = await goalsRepo.findWeightsByGoal(req.params.id as string);
    res.json(weights);
  } catch (err: any) {
    log.error('Error fetching persona weights', { error: err.message, requestId: req.requestId });
    res.status(500).json({ error: err.message });
  }
});

/**
 * @openapi
 * /api/goals/{id}/persona-weights/{personaId}:
 *   put:
 *     tags: [Goals]
 *     summary: Set persona weight for a goal
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: personaId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [weight]
 *             properties:
 *               weight: { type: integer, minimum: -100, maximum: 100 }
 *     responses:
 *       200:
 *         description: Updated weight
 */
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

/**
 * @openapi
 * /api/projects/{id}/goal-edges:
 *   get:
 *     tags: [Goals]
 *     summary: List all goal DAG edges for a project
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Array of goal edges
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/GoalEdge' }
 */
goalsRouter.get('/projects/:id/goal-edges', async (req: Request, res: Response) => {
  try {
    const edges = await goalsRepo.findEdgesByProject(req.params.id as string);
    res.json(edges);
  } catch (err: any) {
    log.error('Error fetching goal edges', { error: err.message, requestId: req.requestId, projectId: req.params.id });
    res.status(500).json({ error: err.message });
  }
});

/**
 * @openapi
 * /api/projects/{id}/goal-edges:
 *   post:
 *     tags: [Goals]
 *     summary: Create a goal DAG edge (with cycle detection)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [source_goal_id, target_goal_id]
 *             properties:
 *               source_goal_id: { type: string, format: uuid }
 *               target_goal_id: { type: string, format: uuid }
 *     responses:
 *       201:
 *         description: Edge created
 *       400:
 *         description: Self-reference or circular dependency detected
 *       409:
 *         description: Edge already exists
 */
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

/**
 * @openapi
 * /api/goal-edges/{id}:
 *   delete:
 *     tags: [Goals]
 *     summary: Remove a goal DAG edge
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       204:
 *         description: Edge removed
 *       404:
 *         description: Edge not found
 */
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

/**
 * @openapi
 * /api/goals/check-nord/{nordId}:
 *   get:
 *     tags: [Goals]
 *     summary: Check if a nord is linked to goals (deletion guard)
 *     parameters:
 *       - in: path
 *         name: nordId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Nord is safe to delete
 *       409:
 *         description: Nord is linked to goals
 */
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
