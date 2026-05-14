import { Router, Request, Response } from 'express';
import logger from '../lib/logger.js';
import * as mcpRepo from '../repositories/mcpSessions.js';

export const mcpSessionsRouter = Router();

/**
 * @openapi
 * /api/projects/{id}/mcp-sessions:
 *   post:
 *     tags: [MCP Sessions]
 *     summary: Start a new MCP session
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Project ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               persona_id:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       201:
 *         description: Session created
 */
mcpSessionsRouter.post('/projects/:id/mcp-sessions', async (req: Request, res: Response) => {
  try {
    const session = await mcpRepo.createSession(req.params.id, req.body.persona_id);
    res.status(201).json(session);
  } catch (err: any) {
    logger.error('Failed to create MCP session', { error: err.message, projectId: req.params.id });
    res.status(500).json({ error: 'Failed to create MCP session' });
  }
});

/**
 * @openapi
 * /api/projects/{id}/mcp-sessions:
 *   get:
 *     tags: [MCP Sessions]
 *     summary: List MCP sessions for a project
 */
mcpSessionsRouter.get('/projects/:id/mcp-sessions', async (req: Request, res: Response) => {
  try {
    const sessions = await mcpRepo.findSessionsByProject(req.params.id);
    res.json(sessions);
  } catch (err: any) {
    logger.error('Failed to list MCP sessions', { error: err.message, projectId: req.params.id });
    res.status(500).json({ error: 'Failed to list MCP sessions' });
  }
});

/**
 * @openapi
 * /api/mcp-sessions/{id}:
 *   put:
 *     tags: [MCP Sessions]
 *     summary: End an MCP session
 */
mcpSessionsRouter.put('/mcp-sessions/:id', async (req: Request, res: Response) => {
  try {
    const { status, summary } = req.body;
    if (!status || !['completed', 'abandoned'].includes(status)) {
      res.status(400).json({ error: 'status must be "completed" or "abandoned"' });
      return;
    }
    const session = await mcpRepo.endSession(req.params.id, status, summary);
    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    res.json(session);
  } catch (err: any) {
    logger.error('Failed to end MCP session', { error: err.message, sessionId: req.params.id });
    res.status(500).json({ error: 'Failed to end MCP session' });
  }
});

/**
 * @openapi
 * /api/mcp-sessions/{id}/traversals:
 *   post:
 *     tags: [MCP Sessions]
 *     summary: Log a connection traversal
 */
mcpSessionsRouter.post('/mcp-sessions/:id/traversals', async (req: Request, res: Response) => {
  try {
    const { connection_id, source_nord_id, target_nord_id, direction, traversal_type, context } = req.body;
    if (!connection_id || !source_nord_id || !target_nord_id || !direction || !traversal_type) {
      res.status(400).json({ error: 'connection_id, source_nord_id, target_nord_id, direction, and traversal_type are required' });
      return;
    }
    const traversal = await mcpRepo.logTraversal({
      session_id: req.params.id,
      connection_id,
      source_nord_id,
      target_nord_id,
      direction,
      traversal_type,
      context: context || {},
    });
    res.status(201).json(traversal);
  } catch (err: any) {
    logger.error('Failed to log traversal', { error: err.message, sessionId: req.params.id });
    res.status(500).json({ error: 'Failed to log traversal' });
  }
});

/**
 * @openapi
 * /api/mcp-sessions/{id}/traversals:
 *   get:
 *     tags: [MCP Sessions]
 *     summary: Get all traversals for a session
 */
mcpSessionsRouter.get('/mcp-sessions/:id/traversals', async (req: Request, res: Response) => {
  try {
    const traversals = await mcpRepo.findTraversalsBySession(req.params.id);
    res.json(traversals);
  } catch (err: any) {
    logger.error('Failed to get traversals', { error: err.message, sessionId: req.params.id });
    res.status(500).json({ error: 'Failed to get traversals' });
  }
});

/**
 * @openapi
 * /api/mcp-sessions/{id}/visits:
 *   post:
 *     tags: [MCP Sessions]
 *     summary: Log a Nord visit
 */
mcpSessionsRouter.post('/mcp-sessions/:id/visits', async (req: Request, res: Response) => {
  try {
    const { nord_id, visit_type, properties_before, properties_after, context } = req.body;
    if (!nord_id || !visit_type) {
      res.status(400).json({ error: 'nord_id and visit_type are required' });
      return;
    }
    const visit = await mcpRepo.logNordVisit({
      session_id: req.params.id,
      nord_id,
      visit_type,
      properties_before: properties_before || null,
      properties_after: properties_after || null,
      context: context || {},
    });
    res.status(201).json(visit);
  } catch (err: any) {
    logger.error('Failed to log Nord visit', { error: err.message, sessionId: req.params.id });
    res.status(500).json({ error: 'Failed to log Nord visit' });
  }
});

/**
 * @openapi
 * /api/mcp-sessions/{id}/visits:
 *   get:
 *     tags: [MCP Sessions]
 *     summary: Get all Nord visits for a session
 */
mcpSessionsRouter.get('/mcp-sessions/:id/visits', async (req: Request, res: Response) => {
  try {
    const visits = await mcpRepo.findVisitsBySession(req.params.id);
    res.json(visits);
  } catch (err: any) {
    logger.error('Failed to get visits', { error: err.message, sessionId: req.params.id });
    res.status(500).json({ error: 'Failed to get visits' });
  }
});

// ── Session-scoped Nord Completion (Instance Layer) ──

/**
 * @openapi
 * /api/mcp-sessions/{id}/nords:
 *   put:
 *     tags: [MCP Sessions]
 *     summary: Upsert session-scoped completion state for a Nord
 */
mcpSessionsRouter.put('/mcp-sessions/:id/nords', async (req: Request, res: Response) => {
  try {
    const { nord_id, properties, required_count, filled_count } = req.body;
    if (!nord_id) {
      res.status(400).json({ error: 'nord_id is required' });
      return;
    }
    const sessionNord = await mcpRepo.upsertSessionNord(
      req.params.id as string,
      nord_id,
      properties || {},
      required_count ?? 0,
      filled_count ?? 0
    );
    res.json(sessionNord);
  } catch (err: any) {
    logger.error('Failed to upsert session nord', { error: err.message, sessionId: req.params.id });
    res.status(500).json({ error: 'Failed to upsert session nord' });
  }
});

/**
 * @openapi
 * /api/mcp-sessions/{id}/nords:
 *   get:
 *     tags: [MCP Sessions]
 *     summary: Get all session-scoped Nord completion states
 */
mcpSessionsRouter.get('/mcp-sessions/:id/nords', async (req: Request, res: Response) => {
  try {
    const sessionNords = await mcpRepo.findSessionNords(req.params.id as string);
    res.json(sessionNords);
  } catch (err: any) {
    logger.error('Failed to get session nords', { error: err.message, sessionId: req.params.id });
    res.status(500).json({ error: 'Failed to get session nords' });
  }
});

/**
 * @openapi
 * /api/mcp-sessions/{id}/nords/incomplete:
 *   get:
 *     tags: [MCP Sessions]
 *     summary: Get incomplete Nords for gate-readiness check
 */
mcpSessionsRouter.get('/mcp-sessions/:id/nords/incomplete', async (req: Request, res: Response) => {
  try {
    const incomplete = await mcpRepo.findIncompleteSessionNords(req.params.id as string);
    res.json(incomplete);
  } catch (err: any) {
    logger.error('Failed to get incomplete nords', { error: err.message, sessionId: req.params.id });
    res.status(500).json({ error: 'Failed to get incomplete nords' });
  }
});
