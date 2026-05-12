import { Router, Request, Response } from 'express';
import logger from '../lib/logger.js';
import * as projectsRepo from '../repositories/projects.js';

export const projectsRouter = Router();

/**
 * @openapi
 * /api/projects:
 *   get:
 *     tags: [Projects]
 *     summary: List all projects
 *     description: Returns all active (non-deleted) projects. Single-user mode — no org filtering.
 *     responses:
 *       200:
 *         description: Array of projects
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Project'
 */
projectsRouter.get('/projects', async (_req: Request, res: Response) => {
  try {
    const projects = await projectsRepo.findAll();
    res.json(projects);
  } catch (err: any) {
    logger.error('Failed to load projects', { error: err.message });
    res.status(500).json({ error: 'Failed to load projects' });
  }
});

/**
 * @openapi
 * /api/projects:
 *   post:
 *     tags: [Projects]
 *     summary: Create a new project
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateProjectRequest'
 *     responses:
 *       201:
 *         description: Project created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Project'
 *       400:
 *         description: Missing required fields
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
projectsRouter.post('/projects', async (req: Request, res: Response) => {
  try {
    const { org_id, name, description, purpose, icon, mcp_enabled, mcp_capture_data, mcp_mutable, default_persona_id, default_start_nord_id } = req.body;
    const errors: string[] = [];
    if (!name) errors.push('name is required');
    if (!description) errors.push('description is required');
    if (!purpose) errors.push('purpose is required');
    if (errors.length > 0) {
      res.status(400).json({ error: errors.join(', ') });
      return;
    }
    // Single-user mode: org_id is optional, defaults to a static placeholder
    const resolvedOrgId = org_id || '00000000-0000-0000-0000-000000000000';
    const project = await projectsRepo.create({
      org_id: resolvedOrgId,
      name,
      description,
      purpose,
      icon,
      created_by: null,
      mcp_enabled: mcp_enabled ?? false,
      mcp_capture_data: mcp_capture_data ?? false,
      mcp_mutable: mcp_mutable ?? false,
      default_persona_id: default_persona_id ?? null,
      default_start_nord_id: default_start_nord_id ?? null,
    });
    res.status(201).json(project);
  } catch (err: any) {
    logger.error('Failed to create project', { error: err.message, name: req.body.name });
    res.status(500).json({ error: 'Failed to create project' });
  }
});

/**
 * @openapi
 * /api/projects/{id}:
 *   get:
 *     tags: [Projects]
 *     summary: Get project by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Project details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Project'
 *       404:
 *         description: Project not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
projectsRouter.get('/projects/:id', async (req: Request, res: Response) => {
  try {
    const project = await projectsRepo.findById(req.params.id);
    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    res.json(project);
  } catch (err: any) {
    logger.error('Failed to load project', { error: err.message, projectId: req.params.id });
    res.status(500).json({ error: 'Failed to load project' });
  }
});

/**
 * @openapi
 * /api/projects/{id}:
 *   put:
 *     tags: [Projects]
 *     summary: Update a project
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               icon:
 *                 type: string
 *     responses:
 *       200:
 *         description: Updated project
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Project'
 *       404:
 *         description: Project not found
 */
projectsRouter.put('/projects/:id', async (req: Request, res: Response) => {
  try {
    const project = await projectsRepo.update(req.params.id, req.body);
    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    res.json(project);
  } catch (err: any) {
    logger.error('Failed to update project', { error: err.message, projectId: req.params.id });
    res.status(500).json({ error: 'Failed to update project' });
  }
});

/**
 * @openapi
 * /api/projects/{id}:
 *   delete:
 *     tags: [Projects]
 *     summary: Soft-delete a project
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       204:
 *         description: Project deleted
 *       404:
 *         description: Project not found
 */
projectsRouter.delete('/projects/:id', async (req: Request, res: Response) => {
  try {
    const deleted = await projectsRepo.softDelete(req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    res.status(204).send();
  } catch (err: any) {
    logger.error('Failed to delete project', { error: err.message, projectId: req.params.id });
    res.status(500).json({ error: 'Failed to delete project' });
  }
});
