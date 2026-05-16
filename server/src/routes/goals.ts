import { Router, type Request, type Response } from 'express';
import * as goalsRepo from '../repositories/goals.js';

export const goalsRouter = Router();

// ── GET /api/projects/:id/goals — List all goals with properties ──
goalsRouter.get('/projects/:id/goals', async (req: Request, res: Response) => {
  try {
    const goals = await goalsRepo.findByProjectWithProperties(req.params.id as string);
    res.json(goals);
  } catch (err: any) {
    console.error('Error fetching goals:', err);
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
    console.error('Error creating goal:', err);
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
    console.error('Error updating goal:', err);
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
    console.error('Error deleting goal:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/goals/:id/properties — Add a property binding ──
goalsRouter.post('/goals/:id/properties', async (req: Request, res: Response) => {
  try {
    const { nord_id, property_name } = req.body;
    if (!nord_id || !property_name) {
      return res.status(400).json({ error: 'nord_id and property_name are required' });
    }
    const prop = await goalsRepo.addProperty(req.params.id as string, nord_id, property_name);
    if (!prop) return res.status(409).json({ error: 'Property binding already exists' });
    res.status(201).json(prop);
  } catch (err: any) {
    console.error('Error adding goal property:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/goals/:id/properties/:propId — Remove a property binding ──
goalsRouter.delete('/goals/:id/properties/:propId', async (req: Request, res: Response) => {
  try {
    const deleted = await goalsRepo.removeProperty(req.params.propId as string);
    if (!deleted) return res.status(404).json({ error: 'Property binding not found' });
    res.status(204).send();
  } catch (err: any) {
    console.error('Error removing goal property:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/goals/check-nord/:nordId — Check if nord is bound to goals (deletion guard) ──
goalsRouter.get('/goals/check-nord/:nordId', async (req: Request, res: Response) => {
  try {
    const boundGoals = await goalsRepo.findGoalsByNord(req.params.nordId as string);
    if (boundGoals.length > 0) {
      return res.status(409).json({
        error: `Cannot delete — this nord is bound to ${boundGoals.length} goal(s): ${boundGoals.map(g => g.goal_name).join(', ')}`,
        goals: boundGoals,
      });
    }
    res.json({ ok: true });
  } catch (err: any) {
    console.error('Error checking nord goals:', err);
    res.status(500).json({ error: err.message });
  }
});
