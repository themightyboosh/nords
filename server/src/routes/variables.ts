import { Router, type Request, type Response } from 'express';
import * as variablesRepo from '../repositories/variables.js';
import * as collectionGroupsRepo from '../repositories/collectionGroups.js';
import logger from '../lib/logger.js';

const log = logger.child({ route: 'variables' });

export const variablesRouter = Router();

/** Server-side snake_case normalization (safety net for client-side conversion) */
function toSnakeCase(input: string): string {
  return input
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    .replace(/[\s\-\.]+/g, '_')
    .replace(/[^a-zA-Z0-9_]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .toLowerCase()
    || 'variable';
}

const SNAKE_CASE_RE = /^[a-z][a-z0-9_]*$/;

/**
 * @openapi
 * /api/projects/{id}/variables:
 *   get:
 *     tags: [Variables]
 *     summary: List all project variables
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Array of project variables
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/ProjectVariable' }
 */
variablesRouter.get('/projects/:id/variables', async (req: Request, res: Response) => {
  try {
    const variables = await variablesRepo.findByProject(req.params.id as string);
    res.json(variables);
  } catch (err: any) {
    log.error('Error fetching variables', { error: err.message, requestId: req.requestId, projectId: req.params.id });
    res.status(500).json({ error: err.message });
  }
});

/**
 * @openapi
 * /api/projects/{id}/variables:
 *   post:
 *     tags: [Variables]
 *     summary: Create a variable
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/CreateVariableRequest' }
 *     responses:
 *       201:
 *         description: Created variable
 *       409:
 *         description: Variable name already exists
 */
variablesRouter.post('/projects/:id/variables', async (req: Request, res: Response) => {
  try {
    let { name } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ error: 'name is required' });
    }
    // Auto-normalize to snake_case
    name = toSnakeCase(name);
    if (!SNAKE_CASE_RE.test(name)) {
      return res.status(400).json({ error: `Variable name must be snake_case (got "${req.body.name}")` });
    }
    const variable = await variablesRepo.create({
      project_id: req.params.id as string,
      ...req.body,
      name,
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

/**
 * @openapi
 * /api/variables/{id}:
 *   put:
 *     tags: [Variables]
 *     summary: Update a variable
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Updated variable
 *       404:
 *         description: Variable not found
 *       409:
 *         description: Variable name conflict
 */
variablesRouter.put('/variables/:id', async (req: Request, res: Response) => {
  try {
    // Auto-normalize name to snake_case if provided
    if (req.body.name) {
      req.body.name = toSnakeCase(req.body.name);
      if (!SNAKE_CASE_RE.test(req.body.name)) {
        return res.status(400).json({ error: `Variable name must be snake_case (got "${req.body.name}")` });
      }
    }
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

/**
 * @openapi
 * /api/variables/{id}:
 *   delete:
 *     tags: [Variables]
 *     summary: Delete a variable
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       204:
 *         description: Variable deleted
 *       404:
 *         description: Variable not found
 */
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

/**
 * @openapi
 * /api/projects/{id}/variables/reorder:
 *   put:
 *     tags: [Variables]
 *     summary: Reorder variables within a project
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
 *             required: [variableIds]
 *             properties:
 *               variableIds:
 *                 type: array
 *                 items: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Variables reordered
 */
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

/**
 * @openapi
 * /api/projects/{id}/variables/bulk:
 *   post:
 *     tags: [Variables]
 *     summary: Bulk upsert variables
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
 *             required: [variables]
 *             properties:
 *               variables:
 *                 type: array
 *                 items: { $ref: '#/components/schemas/CreateVariableRequest' }
 *     responses:
 *       200:
 *         description: Bulk upsert results
 */
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

// ══════════════════════════════════════════════════════════
// Collection Groups — Grouped containers for variables
// ══════════════════════════════════════════════════════════

/**
 * @openapi
 * /api/projects/{id}/collection-groups:
 *   get:
 *     tags: [Variables]
 *     summary: List collection groups with nested variables
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Groups with variables and ungrouped variables
 */
variablesRouter.get('/projects/:id/collection-groups', async (req: Request, res: Response) => {
  try {
    const groups = await collectionGroupsRepo.findByProject(req.params.id as string);
    const variables = await variablesRepo.findByProject(req.params.id as string);

    // Nest variables into their groups
    const groupsWithVars = groups.map(g => ({
      ...g,
      variables: variables.filter(v => v.collection_group_id === g.id),
    }));

    // Also include ungrouped variables
    const ungroupedVars = variables.filter(v => !v.collection_group_id);

    res.json({ groups: groupsWithVars, ungrouped: ungroupedVars });
  } catch (err: any) {
    log.error('Error fetching collection groups', { error: err.message, projectId: req.params.id });
    res.status(500).json({ error: err.message });
  }
});

/**
 * @openapi
 * /api/projects/{id}/collection-groups:
 *   post:
 *     tags: [Variables]
 *     summary: Create a collection group
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
 *             required: [name]
 *             properties:
 *               name: { type: string }
 *               description: { type: string }
 *               icon: { type: string }
 *               accent_color: { type: string }
 *     responses:
 *       201:
 *         description: Created collection group
 *       409:
 *         description: Name conflict
 */
variablesRouter.post('/projects/:id/collection-groups', async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ error: 'name is required' });
    }
    const group = await collectionGroupsRepo.create({
      project_id: req.params.id as string,
      ...req.body,
    });
    res.status(201).json(group);
  } catch (err: any) {
    if (err.code === '23505') {
      return res.status(409).json({ error: `Collection group "${req.body.name}" already exists` });
    }
    log.error('Error creating collection group', { error: err.message, projectId: req.params.id });
    res.status(500).json({ error: err.message });
  }
});

/**
 * @openapi
 * /api/collection-groups/{id}:
 *   put:
 *     tags: [Variables]
 *     summary: Update a collection group
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Updated group
 *       404:
 *         description: Group not found
 */
variablesRouter.put('/collection-groups/:id', async (req: Request, res: Response) => {
  try {
    const group = await collectionGroupsRepo.update(req.params.id as string, req.body);
    if (!group) return res.status(404).json({ error: 'Collection group not found' });
    res.json(group);
  } catch (err: any) {
    if (err.code === '23505') {
      return res.status(409).json({ error: `Collection group name "${req.body.name}" already exists` });
    }
    log.error('Error updating collection group', { error: err.message, groupId: req.params.id });
    res.status(500).json({ error: err.message });
  }
});

/**
 * @openapi
 * /api/collection-groups/{id}:
 *   delete:
 *     tags: [Variables]
 *     summary: Soft-delete a collection group
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       204:
 *         description: Group deleted
 *       404:
 *         description: Group not found
 */
variablesRouter.delete('/collection-groups/:id', async (req: Request, res: Response) => {
  try {
    const deleted = await collectionGroupsRepo.softDelete(req.params.id as string);
    if (!deleted) return res.status(404).json({ error: 'Collection group not found' });
    res.status(204).send();
  } catch (err: any) {
    log.error('Error deleting collection group', { error: err.message, groupId: req.params.id });
    res.status(500).json({ error: err.message });
  }
});

/**
 * @openapi
 * /api/projects/{id}/collection-groups/reorder:
 *   put:
 *     tags: [Variables]
 *     summary: Reorder collection groups
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
 *             required: [groupIds]
 *             properties:
 *               groupIds:
 *                 type: array
 *                 items: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Groups reordered
 */
variablesRouter.put('/projects/:id/collection-groups/reorder', async (req: Request, res: Response) => {
  try {
    const { groupIds } = req.body;
    if (!Array.isArray(groupIds)) {
      return res.status(400).json({ error: 'groupIds array is required' });
    }
    await collectionGroupsRepo.reorder(req.params.id as string, groupIds);
    res.json({ ok: true });
  } catch (err: any) {
    log.error('Error reordering collection groups', { error: err.message, projectId: req.params.id });
    res.status(500).json({ error: err.message });
  }
});
