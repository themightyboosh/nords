import { Router, Request, Response } from 'express';
import logger from '../lib/logger.js';
import * as mcpRepo from '../repositories/mcpSessions.js';
import { personasRepo } from '../repositories/personas.js';
import * as analyticsRepo from '../repositories/sessionAnalytics.js';

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
    const session = await mcpRepo.createSession(req.params.id as string, req.body.persona_id);
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
    const sessions = await mcpRepo.findSessionsByProject(req.params.id as string);
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
    const session = await mcpRepo.endSession(req.params.id as string, status, summary);
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
      session_id: req.params.id as string,
      connection_id,
      source_nord_id,
      target_nord_id,
      direction,
      traversal_type,
      context: context || {},
    });

    // #1: Auto-update current position and return updated horizon
    await mcpRepo.updateCurrentNord(req.params.id as string, target_nord_id);
    const horizon = await mcpRepo.getSessionHorizon(req.params.id as string);

    res.status(201).json({ traversal, horizon });
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
    const traversals = await mcpRepo.findTraversalsBySession(req.params.id as string);
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
      session_id: req.params.id as string,
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
    const visits = await mcpRepo.findVisitsBySession(req.params.id as string);
    res.json(visits);
  } catch (err: any) {
    logger.error('Failed to get visits', { error: err.message, sessionId: req.params.id });
    res.status(500).json({ error: 'Failed to get visits' });
  }
});

// ── Session Variables (Collection Tracking) ──

/**
 * @openapi
 * /api/mcp-sessions/{id}/variables:
 *   get:
 *     tags: [MCP Sessions]
 *     summary: Get all session variable values
 */
mcpSessionsRouter.get('/mcp-sessions/:id/variables', async (req: Request, res: Response) => {
  try {
    const { query: dbQuery } = await import('../db.js');
    const variables = await dbQuery(
      `SELECT sv.*, pv.name, pv.type, pv.prompt
       FROM mcp_session_variables sv
       JOIN project_variables pv ON pv.id = sv.variable_id
       WHERE sv.session_id = $1`,
      [req.params.id]
    );
    res.json(variables);
  } catch (err: any) {
    logger.error('Failed to get session variables', { error: err.message, sessionId: req.params.id });
    res.status(500).json({ error: 'Failed to get session variables' });
  }
});

/**
 * @openapi
 * /api/mcp-sessions/{id}/variables/incomplete:
 *   get:
 *     tags: [MCP Sessions]
 *     summary: Get unfilled session variables
 */
mcpSessionsRouter.get('/mcp-sessions/:id/variables/incomplete', async (req: Request, res: Response) => {
  try {
    const { query: dbQuery } = await import('../db.js');
    const incomplete = await dbQuery(
      `SELECT sv.*, pv.name, pv.type, pv.prompt
       FROM mcp_session_variables sv
       JOIN project_variables pv ON pv.id = sv.variable_id
       WHERE sv.session_id = $1 AND sv.value IS NULL`,
      [req.params.id]
    );
    res.json(incomplete);
  } catch (err: any) {
    logger.error('Failed to get incomplete variables', { error: err.message, sessionId: req.params.id });
    res.status(500).json({ error: 'Failed to get incomplete variables' });
  }
});

// ── Session Horizon (Sliding-Window Context) ──

/**
 * @openapi
 * /api/mcp-sessions/{id}/horizon:
 *   get:
 *     tags: [MCP Sessions]
 *     summary: Get the Session Horizon — full situational awareness
 *     description: |
 *       Returns a computed view combining: current nord position,
 *       persona-weighted neighbor relevance, overall completion %,
 *       traversal breadcrumb history, and suggested next nord.
 *       The AI should call this when resuming a session or after
 *       any traversal, persona switch, or session nord update.
 */
mcpSessionsRouter.get('/mcp-sessions/:id/horizon', async (req: Request, res: Response) => {
  try {
    const horizon = await mcpRepo.getSessionHorizon(req.params.id as string);
    res.json(horizon);
  } catch (err: any) {
    logger.error('Failed to get session horizon', { error: err.message, sessionId: req.params.id });
    res.status(500).json({ error: 'Failed to get session horizon' });
  }
});

/**
 * @openapi
 * /api/mcp-sessions/{id}/persona:
 *   put:
 *     tags: [MCP Sessions]
 *     summary: Switch the active persona for this session
 *     description: |
 *       Changes the persona lens, which alters how neighbor nords are
 *       weighted in the horizon. The AI should call nords_get_horizon
 *       after switching to see the reweighted view.
 */
mcpSessionsRouter.put('/mcp-sessions/:id/persona', async (req: Request, res: Response) => {
  try {
    const { persona_id } = req.body;
    if (persona_id === undefined) {
      res.status(400).json({ error: 'persona_id is required (use null to clear)' });
      return;
    }
    const session = await mcpRepo.updateSessionPersona(req.params.id as string, persona_id);
    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    // Auto-return updated horizon with new persona weights
    const horizon = await mcpRepo.getSessionHorizon(req.params.id as string);
    res.json({ session, horizon });
  } catch (err: any) {
    logger.error('Failed to switch persona', { error: err.message, sessionId: req.params.id });
    res.status(500).json({ error: 'Failed to switch persona' });
  }
});

/**
 * @openapi
 * /api/projects/{id}/personas:
 *   get:
 *     tags: [MCP Sessions]
 *     summary: List all personas available in this project
 *     description: |
 *       Returns personas with their names, category weights, mental models,
 *       and configuration. The AI uses this to discover which personas are
 *       available and decide when to switch.
 */
mcpSessionsRouter.get('/projects/:id/personas', async (req: Request, res: Response) => {
  try {
    const personas = await personasRepo.findByProject(req.params.id as string);
    res.json(personas.map(p => ({
      id: p.id,
      name: p.name,
      background: p.background,
      primary_motivation: p.primary_motivation,
      voice_and_tone: p.voice_and_tone,
      exchange_style: p.exchange_style,
      guardrails: p.guardrails,
      category_weights: (p.category_weights || []).map(w => ({
        connection_type_id: w.connection_type_id,
        weight: w.weight,
      })),
      mental_models: (p.mental_models || []).map(m => ({
        name: m.name,
        body: m.body,
      })),
    })));
  } catch (err: any) {
    logger.error('Failed to list personas', { error: err.message, projectId: req.params.id });
    res.status(500).json({ error: 'Failed to list personas' });
  }
});

// ── Project Dictionary (Ontology for AI) ──

/**
 * @openapi
 * /api/projects/{id}/dictionary:
 *   get:
 *     tags: [MCP Sessions]
 *     summary: Get the project dictionary — full ontology for the AI
 *     description: |
 *       Returns the complete vocabulary: nord types (with descriptions and
 *       property schemas), connection types (with verbs, measurement modes,
 *       stage labels, and direction prepositions), and personas (with
 *       backgrounds, motivations, mental models, and category weights).
 *       The AI should call this FIRST to understand the project before
 *       making any decisions.
 */
mcpSessionsRouter.get('/projects/:id/dictionary', async (req: Request, res: Response) => {
  try {
    const dictionary = await mcpRepo.getProjectDictionary(req.params.id as string);
    res.json(dictionary);
  } catch (err: any) {
    logger.error('Failed to get project dictionary', { error: err.message, projectId: req.params.id });
    res.status(500).json({ error: 'Failed to get project dictionary' });
  }
});

// ── Session Analytics ──

/**
 * @openapi
 * /api/projects/{id}/analytics:
 *   get:
 *     tags: [MCP Sessions]
 *     summary: Get aggregated analytics for all sessions in a project
 *     description: |
 *       Returns overview metrics, session summaries, nord visit heatmap,
 *       popular traversal paths, persona distribution, and bottleneck nords.
 */
mcpSessionsRouter.get('/projects/:id/analytics', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string || '50', 10);
    const analytics = await analyticsRepo.getProjectAnalytics(req.params.id as string, limit);
    res.json(analytics);
  } catch (err: any) {
    logger.error('Failed to get project analytics', { error: err.message, projectId: req.params.id });
    res.status(500).json({ error: 'Failed to get project analytics' });
  }
});

/**
 * @openapi
 * /api/mcp-sessions/{id}/analytics:
 *   get:
 *     tags: [MCP Sessions]
 *     summary: Get analytics for a single session
 */
mcpSessionsRouter.get('/mcp-sessions/:id/analytics', async (req: Request, res: Response) => {
  try {
    const analytics = await analyticsRepo.getSessionAnalytics(req.params.id as string);
    res.json(analytics);
  } catch (err: any) {
    logger.error('Failed to get session analytics', { error: err.message, sessionId: req.params.id });
    res.status(500).json({ error: 'Failed to get session analytics' });
  }
});
