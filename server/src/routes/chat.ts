/**
 * chat.ts — Gemini proxy route for the Preview Chat.
 *
 * POST /api/projects/:id/chat  — Send a message, get AI response
 * GET  /api/sessions/:id/messages — Get conversation history
 *
 * The proxy assembles the system prompt from:
 *   1. Project's mcp_system_prompt (business logic)
 *   2. NordType schemas (auto-injected)
 *   3. Active persona context (if set)
 *   4. Current session state (traversals, completion)
 *   5. Capabilities section (tools context)
 */

import { Router, Request, Response } from 'express';
import logger from '../lib/logger.js';
import { mcpMessagesRepo } from '../repositories/mcpMessages.js';
import * as mcpSessionsRepo from '../repositories/mcpSessions.js';
import * as projectsRepo from '../repositories/projects.js';

export const chatRouter = Router();

/**
 * POST /api/projects/:id/chat
 *
 * Body: { message: string, sessionId?: string, model?: string }
 * Returns: { reply: string, sessionId: string, message: McpMessage }
 *
 * For now, this is a passthrough that logs messages and returns
 * a placeholder response. The Gemini integration will be wired
 * when API keys are configured.
 */
chatRouter.post('/projects/:id/chat', async (req: Request, res: Response) => {
  try {
    const projectId = req.params.id as string;
    const { message, sessionId: existingSessionId, model = 'gemini-2.0-flash' } = req.body;

    if (!message?.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // 1. Resolve or create session
    let sessionId = existingSessionId;
    if (!sessionId) {
      const project = await projectsRepo.findById(projectId);
      const session = await mcpSessionsRepo.createSession(
        projectId,
        project?.default_persona_id || null,
        project?.default_start_nord_id || null
      );
      sessionId = session.id;
    }

    // 2. Log user message
    const userMsg = await mcpMessagesRepo.create({
      session_id: sessionId,
      role: 'user',
      content: message.trim(),
      tool_calls: null,
      context: null,
      tokens_in: null,
      tokens_out: null,
      model: null,
      latency_ms: null,
    });

    // 3. Assemble context (for dev mode visibility)
    const project = await projectsRepo.findById(projectId);
    const sessionNords = await mcpSessionsRepo.findSessionNords(sessionId);
    const traversals = await mcpSessionsRepo.findTraversalsBySession(sessionId);
    const messageHistory = await mcpMessagesRepo.findBySession(sessionId);

    const assembledContext = {
      project: {
        name: project?.name,
        purpose: project?.purpose,
        mcp_system_prompt: project?.mcp_system_prompt,
        default_start_nord_id: project?.default_start_nord_id,
        default_end_nord_id: project?.default_end_nord_id,
      },
      session: {
        id: sessionId,
        nordCount: sessionNords.length,
        completedNords: sessionNords.filter(n => n.complete).length,
        traversalCount: traversals.length,
      },
      messageCount: messageHistory.length,
      model,
    };

    // 4. TODO: Call Gemini API with assembled context
    // For now, return a structured placeholder that shows the system is working
    const startTime = Date.now();
    const replyContent = `[Preview Mode] Received your message. Session ${sessionId.slice(0, 8)}… is active with ${assembledContext.session.nordCount} nords tracked and ${assembledContext.session.traversalCount} traversals logged. Gemini integration pending API key configuration.`;
    const latency = Date.now() - startTime;

    // 5. Log assistant response
    const assistantMsg = await mcpMessagesRepo.create({
      session_id: sessionId,
      role: 'assistant',
      content: replyContent,
      tool_calls: null,
      context: assembledContext,
      tokens_in: null,
      tokens_out: null,
      model,
      latency_ms: latency,
    });

    // 6. Check session completion after interaction
    const completionCheck = await mcpSessionsRepo.checkSessionCompletion(sessionId);

    res.json({
      reply: replyContent,
      sessionId,
      message: assistantMsg,
      completion: completionCheck,
    });

  } catch (err: any) {
    logger.error('Chat proxy error', { error: err.message, projectId: req.params.id });
    res.status(500).json({ error: 'Chat failed' });
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
