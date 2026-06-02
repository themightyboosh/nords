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
 * Same Gemini + MCP pipeline as chat.ts, but:
 *   - Auth via share link token (not Firebase)
 *   - Welcome message override from share link config
 *   - Property pre-fills injected at session creation
 *   - Model locked to share link config
 *   - Session cookie for returning visitors
 */

import { Router, Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import logger from '../lib/logger.js';
import { mcpMessagesRepo } from '../repositories/mcpMessages.js';
import * as mcpRepo from '../repositories/mcpSessions.js';
import * as projectsRepo from '../repositories/projects.js';
import * as shareLinksRepo from '../repositories/shareLinks.js';
import { dispatchTool, type ToolContext } from '../lib/toolDispatch.js';
import { buildToolDeclarations } from '../lib/geminiTools.js';
import * as goalsRepo from '../repositories/goals.js';
import { query, queryOne } from '../db.js';

export const shareChatRouter = Router();

const MAX_TOOL_LOOPS = 10;
const MAX_CONTEXT_TOKENS = 900_000;
const SESSION_COOKIE_NAME = 'nords_share_session';
const SESSION_COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

// ── System Prompt (same as chat.ts) ──

async function buildSystemPrompt(
  personaId: string | null
): Promise<{ prompt: string; temperature: number }> {
  // Fixed temperature — preview chat is vanilla Gemini to keep MCP tests pure
  const temperature = 0.7;

  const prompt = `You are an AI assistant connected to a knowledge graph via MCP tools.

Call nords_get_briefing as your first action to receive your full orientation: the project dictionary (types, categories, personas), your current position and neighbors (horizon), active goals, and the protocol for how to navigate and collect data.

The briefing contains all the instructions you need. Follow the protocol it provides.
`;

  return { prompt, temperature };
}

// ── Gemini History Builder ──

function buildGeminiHistory(messages: Array<{ role: string; content: string }>) {
  const history: Array<{ role: string; parts: Array<{ text?: string }> }> = [];
  for (const msg of messages) {
    if (msg.role === 'user') {
      history.push({ role: 'user', parts: [{ text: msg.content }] });
    } else if (msg.role === 'assistant') {
      history.push({ role: 'model', parts: [{ text: msg.content }] });
    }
  }
  return history;
}

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

    const { message, sessionId: existingSessionId } = req.body;
    if (!message?.trim()) return res.status(400).json({ error: 'Message is required' });

    const projectId = link.project_id;
    const model = link.model || 'gemini-2.5-flash';
    const apiKey = process.env.GEMINI_API_KEY;

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
    let isNewSession = false;

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
        project?.default_start_nord_id || null
      );
      sessionId = session.id;
      isNewSession = true;

      // Set share_link_id on the session
      await queryOne(
        'UPDATE mcp_sessions SET share_link_id = $1 WHERE id = $2',
        [link.id, sessionId]
      );

      // Initialize session goals
      const projectMode = project?.project_mode || 'collect';
      await goalsRepo.initializeSessionGoals(sessionId, projectId, projectMode);

      // Apply collection variable pre-fills to the session
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

      // Set session cookie
      res.cookie(SESSION_COOKIE_NAME, sessionId, {
        maxAge: SESSION_COOKIE_MAX_AGE,
        httpOnly: true,
        sameSite: 'lax',
        path: '/api/share',
      });
    }

    // 2. Build system prompt
    const personaId = session?.persona_id || link.persona_id_override || null;
    const { prompt: systemPrompt, temperature } = await buildSystemPrompt(personaId);

    // 3. Save user message
    await mcpMessagesRepo.create({
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

    // 4. Build conversation history
    const allMessages = await mcpMessagesRepo.findBySession(sessionId);
    const history = buildGeminiHistory(allMessages);

    // 5. Call Gemini
    const genAI = new GoogleGenAI({ apiKey });

    const project = await projectsRepo.findById(projectId);
    const mcpMutable = false; // Graph mutation by AI is on the long-term roadmap

    // Fetch project dictionary for dynamic tool descriptions
    const dictionary = await mcpRepo.getProjectDictionary(projectId);
    const toolDecls = buildToolDeclarations(mcpMutable, dictionary);

    const toolCtx: ToolContext = {
      sessionId,
      projectId,
      mcpMutable,
      mcpCaptureData: project?.mcp_capture_data ?? true,
    };

    let finalReply = '';
    const allToolCalls: Array<{ name: string; arguments: Record<string, unknown>; result?: unknown }> = [];
    let currentHistory = [...history];

    for (let loop = 0; loop < MAX_TOOL_LOOPS; loop++) {
      const response = await genAI.models.generateContent({
        model,
        contents: currentHistory,
        config: {
          systemInstruction: systemPrompt,
          temperature,
          tools: [{ functionDeclarations: toolDecls }],
        },
      });

      const candidate = response.candidates?.[0];
      if (!candidate) break;

      // Check for tool calls
      const funcCalls = candidate.content?.parts?.filter((p: any) => p.functionCall) || [];

      if (funcCalls.length === 0) {
        // Final text response
        finalReply = candidate.content?.parts?.map((p: any) => p.text || '').join('') || '';
        break;
      }

      // Execute tool calls
      const toolResults: Array<{ functionResponse: { name: string; response: unknown } }> = [];
      for (const part of funcCalls) {
        const fc = (part as any).functionCall;
        const result = await dispatchTool(fc.name, toolCtx, fc.args || {});
        allToolCalls.push({ name: fc.name, arguments: fc.args || {}, result: result.data });
        toolResults.push({ functionResponse: { name: fc.name, response: result } });
      }

      // Add model's tool call + results to history
      currentHistory.push({ role: 'model', parts: funcCalls as any });
      currentHistory.push({ role: 'user', parts: toolResults as any });

      // Token budget check
      const estimatedTokens = JSON.stringify(currentHistory).length / 4;
      if (estimatedTokens > MAX_CONTEXT_TOKENS) {
        finalReply = 'I apologize, but this conversation has grown quite long. Let me summarize what we have so far.';
        break;
      }
    }

    if (!finalReply) {
      finalReply = 'I encountered an issue processing your request. Could you try rephrasing?';
    }

    // 6. Save assistant message
    const assistantMsg = await mcpMessagesRepo.create({
      session_id: sessionId,
      role: 'assistant',
      content: finalReply,
      tool_calls: allToolCalls.length > 0 ? allToolCalls : null,
      context: null,
      tokens_in: null,
      tokens_out: null,
      model,
      latency_ms: null,
    });

    // 7. Check completion
    const hasGoals = await queryOne<{ exists: boolean }>(
      'SELECT EXISTS (SELECT 1 FROM goals WHERE project_id = $1) AS exists',
      [projectId]
    );
    const completionCheck = !hasGoals?.exists
      ? await mcpRepo.checkSessionCompletion(sessionId)
      : { shouldTransition: false, endNordId: null, incompleteCount: 0 };

    res.json({
      reply: finalReply,
      sessionId,
      message: assistantMsg,
      completion: completionCheck,
    });

  } catch (err: any) {
    logger.error('Share chat error', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Chat failed', details: err.message });
  }
});

export default shareChatRouter;
