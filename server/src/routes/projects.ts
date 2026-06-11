import { Router, Request, Response } from 'express';
import logger from '../lib/logger.js';
import * as projectsRepo from '../repositories/projects.js';
import { validate } from '../middleware/validate.js';
import { CreateProjectSchema, UpdateProjectSchema } from '../schemas/projects.js';
import { resolveUserId, isAdmin } from '../lib/resolveUser.js';
import { requireProjectOwner } from '../middleware/projectOwnership.js';
import { invalidateProtocolCache } from '../lib/toolDispatch.js';

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
projectsRouter.get('/projects', async (req: Request, res: Response) => {
  try {
    const uid = req.user?.uid;
    const email = req.user?.email;
    const projects = await projectsRepo.findAllWithStars(uid, email);
    res.json(projects);
  } catch (err: any) {
    logger.error('Failed to load projects', { error: err.message });
    res.status(500).json({ error: 'Failed to load projects' });
  }
});

/**
 * @openapi
 * /api/projects/{id}/star:
 *   post:
 *     tags: [Projects]
 *     summary: Toggle star/favorite on a project
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Star toggled, returns is_starred boolean
 */
projectsRouter.post('/projects/:id/star', async (req: Request, res: Response) => {
  try {
    const uid = req.user?.uid;
    const email = req.user?.email;
    const isStarred = await projectsRepo.toggleStar(req.params.id as string, uid, email);
    res.json({ is_starred: isStarred });
  } catch (err: any) {
    logger.error('Failed to toggle star', { error: err.message, projectId: req.params.id });
    res.status(500).json({ error: 'Failed to toggle star' });
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
projectsRouter.post('/projects', validate(CreateProjectSchema), async (req: Request, res: Response) => {
  try {
    const { name, description, purpose, icon, accent_color, mcp_mutable, mcp_system_prompt, default_persona_id, default_start_nord_id, default_end_nord_id } = req.body;
    const project_mode = req.body.project_mode || 'explore';

    // Derive MCP flags from project mode
    const mcp_capture_data = project_mode === 'collect' || project_mode === 'guided';
    const goals_enabled = project_mode === 'guided';

    // Resolve the authenticated user's DB id (with email fallback)
    const createdBy = await resolveUserId(req.user?.uid, req.user?.email);

    const project = await projectsRepo.create({
      name,
      description,
      purpose,
      icon,
      accent_color: accent_color ?? '#6b7aed',
      created_by: createdBy,
      mcp_enabled: true,
      mcp_capture_data,
      mcp_mutable: mcp_mutable ?? false,
      goals_enabled,
      mcp_system_prompt: mcp_system_prompt ?? null,
      mcp_welcome_message: null,
      project_mode,
      end_prompt_suggestion: null,
      default_persona_id: default_persona_id ?? null,
      default_start_nord_id: default_start_nord_id ?? null,
      default_end_nord_id: default_end_nord_id ?? null,
      is_demo: false,
      graph_only: req.body.graph_only ?? false,
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
projectsRouter.get('/projects/:id', requireProjectOwner, async (req: Request, res: Response) => {
  try {
    const project = await projectsRepo.findById(req.params.id as string);
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
projectsRouter.put('/projects/:id', requireProjectOwner, async (req: Request, res: Response) => {
  try {
    const body = { ...req.body };

    // Admin guard: only admins can set is_demo
    if (body.is_demo !== undefined) {
      const admin = await isAdmin(req.user?.uid, req.user?.email);
      if (!admin) {
        res.status(403).json({ error: 'Admin access required to set demo flag' });
        return;
      }
    }

    // If project_mode is being updated, auto-derive MCP flags
    if (body.project_mode) {
      body.mcp_capture_data = body.project_mode === 'collect' || body.project_mode === 'guided';
      body.goals_enabled = body.project_mode === 'guided';
    }

    const project = await projectsRepo.update(req.params.id as string, body);
    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    res.json(project);
    // Invalidate protocol cache on project settings change (mode affects cache key)
    invalidateProtocolCache(req.params.id as string);
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
projectsRouter.delete('/projects/:id', requireProjectOwner, async (req: Request, res: Response) => {
  try {
    const deleted = await projectsRepo.softDelete(req.params.id as string);
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
