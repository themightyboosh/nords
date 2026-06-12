/**
 * shareChat.ts — Public chat endpoint for share links.
 *
 * @openapi
 * /api/share/info:
 *   get:
 *     tags: [Chat]
 *     summary: Get project info for a share link (public, token-gated)
 *     parameters:
 *       - in: header
 *         name: x-share-token
 *         schema: { type: string }
 *       - in: query
 *         name: token
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Project info for share display
 *       401:
 *         description: Invalid or missing share token
 *
 * /api/share/chat:
 *   post:
 *     tags: [Chat]
 *     summary: Send a message via share link (no auth required)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [message]
 *             properties:
 *               message: { type: string }
 *               token: { type: string }
 *               sessionId: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: AI response with session ID
 *
 * Thin wrapper around chatEngine.executeChatTurn().
 * Handles share token validation, session limits, cookie persistence,
 * and variable pre-fills. No Firebase auth required.
 */

import { Router, Request, Response } from 'express';
import logger from '../lib/logger.js';
import { mcpMessagesRepo } from '../repositories/mcpMessages.js';
import * as mcpRepo from '../repositories/mcpSessions.js';
import * as projectsRepo from '../repositories/projects.js';
import * as shareLinksRepo from '../repositories/shareLinks.js';
import * as goalsRepo from '../repositories/goals.js';
import { query, queryOne } from '../db.js';
import { logEvent } from '../lib/sessionEvents.js';
import { executeChatTurn } from '../lib/chatEngine.js';

export const shareChatRouter = Router();

const SESSION_COOKIE_NAME = 'nords_share_session';
const SESSION_COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

// ── Project Info Endpoint (public, token-gated) ──

shareChatRouter.get('/share/info', async (req: Request, res: Response) => {
  try {
    const token = (req.headers['x-share-token'] as string) || (req.query.token as string);
    if (!token) return res.status(401).json({ error: 'Share token required' });

    const link = await shareLinksRepo.findByToken(token);
    if (!link) return res.status(401).json({ error: 'Invalid or expired share link' });

    // Check max sessions
    if (link.max_sessions) {
      const count = await shareLinksRepo.getSessionCount(link.id);
      if (count >= link.max_sessions) {
        return res.status(403).json({ error: 'This share link has reached its session limit' });
      }
    }

    const project = await projectsRepo.findById(link.project_id);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    res.json({
      project_name: project.name,
      project_icon: project.icon,
      accent_color: project.accent_color,
      welcome_message: link.welcome_message_override || project.mcp_welcome_message || null,
      agent_name: project.agent_name || 'Assistant',
      agent_icon: project.agent_icon || 'Bot',
      model: link.model,
      label: link.label,
    });
  } catch (err: any) {
    logger.error('Share info error', { error: err.message });
    res.status(500).json({ error: 'Failed to get share info' });
  }
});

// ── Main Share Chat Endpoint ──

shareChatRouter.post('/share/chat', async (req: Request, res: Response) => {
  try {
    const token = (req.headers['x-share-token'] as string) || req.body.token;
    if (!token) return res.status(401).json({ error: 'Share token required' });

    const link = await shareLinksRepo.findByToken(token);
    if (!link) return res.status(401).json({ error: 'Invalid or expired share link' });

    const { message, sessionId: existingSessionId, url_overrides } = req.body;
    if (!message?.trim()) return res.status(400).json({ error: 'Message is required' });

    const projectId = link.project_id;
    const model = link.model || 'gemini-2.5-flash';

    // Check max sessions before creating new ones
    if (link.max_sessions && !existingSessionId) {
      const count = await shareLinksRepo.getSessionCount(link.id);
      if (count >= link.max_sessions) {
        return res.status(403).json({ error: 'Session limit reached for this share link' });
      }
    }

    // 1. Resolve or create session
    let sessionId = existingSessionId || req.cookies?.[SESSION_COOKIE_NAME];
    let session;

    if (sessionId) {
      session = await queryOne<any>('SELECT * FROM mcp_sessions WHERE id = $1', [sessionId]);
      if (!session || session.status !== 'active' || session.project_id !== projectId) {
        sessionId = null; // Invalid session, create new
      }
    }

    if (!sessionId) {
      const project = await projectsRepo.findById(projectId);
      const personaId = link.persona_id_override || project?.default_persona_id || null;

      session = await mcpRepo.createSession(
        projectId,
        personaId,
        project?.default_start_nord_id || null,
        null,     // userId
        null,     // tokenId
        'share'   // sourceType — ensures Shared tab filter works
      );
      sessionId = session.id;

      // Set share_link_id on the session
      await queryOne(
        'UPDATE mcp_sessions SET share_link_id = $1 WHERE id = $2',
        [link.id, sessionId]
      );

      // Fire session_start event
      logEvent(sessionId, 'session_start', 'source', {
        source_type: 'share',
        share_link_id: link.id,
        persona_id: personaId,
        start_nord_id: project?.default_start_nord_id || null,
      });

      // Initialize session goals
      await goalsRepo.initializeSessionGoals(sessionId, projectId, 'collect');

      // Seed welcome message
      const welcomeMsg = link.welcome_message_override || project?.mcp_welcome_message;
      if (welcomeMsg) {
        await mcpMessagesRepo.create({
          session_id: sessionId,
          role: 'assistant',
          content: welcomeMsg,
          tool_calls: null,
          context: { synthetic: true, source: 'welcome_message', share_link_id: link.id },
          tokens_in: null,
          tokens_out: null,
          model: null,
          latency_ms: 0,
        });
      }

      // Apply collection variable pre-fills
      if (link.prefills.length > 0) {
        for (const pf of link.prefills) {
          if (pf.variable_id && pf.value != null) {
            await mcpRepo.upsertSessionVariable(
              sessionId,
              pf.variable_id,
              pf.value,
              null,  // no nord context for prefills
              null   // no persona context for prefills
            );
          }
        }
        logger.info('Applied share link variable prefills', { linkId: link.id, count: link.prefills.length });
      }

      // Apply URL query param overrides (e.g. ?user_name=Daniel)
      if (url_overrides && typeof url_overrides === 'object') {
        const projectVars = await query<{ id: string; name: string }>(
          'SELECT id, name FROM project_variables WHERE project_id = $1',
          [projectId]
        );
        const varByName = new Map(projectVars.map(v => [v.name.toLowerCase(), v.id]));
        let overrideCount = 0;
        for (const [key, val] of Object.entries(url_overrides)) {
          const varId = varByName.get(key.toLowerCase());
          if (varId && typeof val === 'string') {
            await mcpRepo.upsertSessionVariable(
              sessionId,
              varId,
              val,
              null,  // no nord context for URL overrides
              null   // no persona context for URL overrides
            );
            overrideCount++;
          }
        }
        if (overrideCount > 0) {
          logger.info('Applied URL variable overrides', { linkId: link.id, count: overrideCount });
        }
      }

      // Set session cookie
      res.cookie(SESSION_COOKIE_NAME, sessionId, {
        maxAge: SESSION_COOKIE_MAX_AGE,
        httpOnly: true,
        sameSite: 'lax',
        path: '/api/share',
      });
    }

    // 2. Resolve project settings
    const project = await projectsRepo.findById(projectId);
    const personaId = session?.persona_id || link.persona_id_override || null;

    // 3. Execute chat turn via shared engine
    const result = await executeChatTurn({
      projectId,
      sessionId,
      message: message.trim(),
      model,
      personaId,
      sourceType: 'share',
      mcpMutable: false,
      mcpCaptureData: project?.mcp_capture_data ?? true,
    });

    res.json(result);

  } catch (err: any) {
    logger.error('Share chat error', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Chat failed', details: err.message });
  }
});

export default shareChatRouter;
