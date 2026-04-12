import { Router, Request, Response } from 'express';
import * as projectsRepo from '../repositories/projects.js';

export const projectsRouter = Router();

// GET /api/projects — List all projects for user
projectsRouter.get('/projects', async (_req: Request, res: Response) => {
  try {
    // TODO: Filter by user's org membership once auth middleware is wired
    const projects = await projectsRepo.findAll();
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load projects' });
  }
});

// POST /api/projects — Create a new project
projectsRouter.post('/projects', async (req: Request, res: Response) => {
  try {
    const { org_id, name, description, icon } = req.body;
    if (!org_id || !name) {
      res.status(400).json({ error: 'org_id and name are required' });
      return;
    }
    const project = await projectsRepo.create({ org_id, name, description, icon, created_by: null });
    res.status(201).json(project);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// GET /api/projects/:id — Get project details
projectsRouter.get('/projects/:id', async (req: Request, res: Response) => {
  try {
    const project = await projectsRepo.findById(req.params.id);
    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    res.json(project);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load project' });
  }
});

// PUT /api/projects/:id — Update project
projectsRouter.put('/projects/:id', async (req: Request, res: Response) => {
  try {
    const project = await projectsRepo.update(req.params.id, req.body);
    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    res.json(project);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update project' });
  }
});

// DELETE /api/projects/:id — Soft-delete project
projectsRouter.delete('/projects/:id', async (req: Request, res: Response) => {
  try {
    const deleted = await projectsRepo.softDelete(req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete project' });
  }
});
