/**
 * chat.ts — Authenticated chat endpoint (preview mode).
 *
 * @openapi
 * /api/projects/{id}/chat:
 *   post:
 *     tags: [Chat]
 *     summary: Send a message and get AI response via Gemini
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
 *             required: [message]
 *             properties:
 *               message: { type: string }
 *               session_id: { type: string, format: uuid }
 *               persona_id: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: AI response with tool results
 *
 * /api/sessions/{id}/messages:
 *   get:
 *     tags: [Chat]
 *     summary: Get conversation history for a session
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Array of conversation messages
 *
 * Thin wrapper around chatEngine.executeChatTurn().
 * Handles session resolution/creation, welcome message seeding,
 * goal initialization, and auto-restart for completed sessions.
 */

import { Router, Request, Response } from 'express';
import logger from '../lib/logger.js';
import { mcpMessagesRepo } from '../repositories/mcpMessages.js';
import * as mcpRepo from '../repositories/mcpSessions.js';
import * as projectsRepo from '../repositories/projects.js';
import * as goalsRepo from '../repositories/goals.js';
import { query, queryOne } from '../db.js';
import { logEvent } from '../lib/sessionEvents.js';
import { executeChatTurn } from '../lib/chatEngine.js';

export const chatRouter = Router();

// ── Main Chat Endpoint ──

chatRouter.post('/projects/:id/chat', async (req: Request, res: Response) => {
  try {
    const projectId = req.params.id as string;
    const { message, sessionId: existingSessionId, model = 'gemini-2.5-flash' } = req.body;

    if (!message?.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // 1. Resolve or create session (with auto-restart for completed sessions)
    let sessionId = existingSessionId;
    let session;
    if (!sessionId) {
      const project = await projectsRepo.findById(projectId);
      session = await mcpRepo.createSession(
        projectId,
        project?.default_persona_id || null,
        project?.default_start_nord_id || null,
        null, // userId
        null, // tokenId
        'chat'
      );
      sessionId = session.id;

      // Fire session_start event
      logEvent(sessionId, 'session_start', 'source', {
        source_type: 'chat',
        persona_id: project?.default_persona_id || null,
        start_nord_id: project?.default_start_nord_id || null,
      });

      // Seed welcome message as first assistant message
      if (project?.mcp_welcome_message) {
        await mcpMessagesRepo.create({
          session_id: sessionId,
          role: 'assistant',
          content: project.mcp_welcome_message,
          tool_calls: null,
          context: { synthetic: true, source: 'welcome_message' },
          tokens_in: null,
          tokens_out: null,
          model: null,
          latency_ms: 0,
        });
      }

      // Initialize session goals
      await goalsRepo.initializeSessionGoals(sessionId, projectId, 'collect');
    } else {
      session = await queryOne<any>('SELECT * FROM mcp_sessions WHERE id = $1', [sessionId]);

      // ── Auto-restart: if the session is completed, create a new one ──
      if (session && session.status === 'completed') {
        const project = await projectsRepo.findById(projectId);
        const oldSessionId = sessionId;
        const endType = session.summary?.includes('(continue)') ? 'continue' : 'reset';

        session = await mcpRepo.createSession(
          projectId,
          session.persona_id || project?.default_persona_id || null,
          project?.default_start_nord_id || null
        );
        sessionId = session.id;

        await goalsRepo.initializeSessionGoals(sessionId, projectId, 'collect');

        // If 'continue', carry over completed goals
        if (endType === 'continue') {
          const completedGoals = await query<{ goal_id: string; completed_data: any; completed_at: Date }>(
            `SELECT goal_id, completed_data, completed_at FROM mcp_session_goals
             WHERE session_id = $1 AND status = 'complete'`,
            [oldSessionId]
          );
          for (const cg of completedGoals) {
            await query(
              `UPDATE mcp_session_goals
               SET status = 'complete', completed_data = $3, completed_at = $4, updated_at = NOW()
               WHERE session_id = $1 AND goal_id = $2`,
              [sessionId, cg.goal_id, JSON.stringify(cg.completed_data), cg.completed_at]
            );
          }
          logger.info(`Session auto-restart (continue): carried over ${completedGoals.length} completed goals from ${oldSessionId}`);
        } else {
          logger.info(`Session auto-restart (reset): fresh session from ${oldSessionId}`);
        }
      }
    }

    // 2. Resolve project settings
    const project = await projectsRepo.findById(projectId);
    const personaId = (session as any)?.persona_id || null;

    // 3. Execute chat turn via shared engine
    const result = await executeChatTurn({
      projectId,
      sessionId,
      message: message.trim(),
      model,
      personaId,
      sourceType: 'chat',
      mcpMutable: false,
      mcpCaptureData: project?.mcp_capture_data ?? true,
    });

    res.json(result);

  } catch (err: any) {
    logger.error('Chat proxy error', { error: err.message, stack: err.stack, projectId: req.params.id });
    res.status(500).json({ error: 'Chat failed', details: err.message });
  }
});

/**
 * GET /api/sessions/:id/messages
 * Returns all messages for a session, ordered chronologically.
 */
chatRouter.get('/sessions/:id/messages', async (req: Request, res: Response) => {
  try {
    const messages = await mcpMessagesRepo.findBySession(req.params.id as string);
    const usage = await mcpMessagesRepo.getSessionTokenUsage(req.params.id as string);
    res.json({ messages, usage });
  } catch (err: any) {
    logger.error('Failed to load messages', { error: err.message, sessionId: req.params.id });
    res.status(500).json({ error: 'Failed to load messages' });
  }
});
