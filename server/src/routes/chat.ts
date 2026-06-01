import { createHash } from 'node:crypto';

/**
 * chat.ts — Gemini proxy with full tool-calling loop.
 *
 * POST /api/projects/:id/chat  — Send a message, get AI response
 * GET  /api/sessions/:id/messages — Get conversation history
 *
 * Flow per turn:
 *   1. Resolve/create session
 *   2. Build system prompt (project + persona + protocol)
 *   3. Build conversation history (Gemini format)
 *   4. Call Gemini with tool declarations
 *   5. Loop: if Gemini wants tool calls, dispatch them and re-send
 *   6. Return final text response
 */

import { Router, Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import logger from '../lib/logger.js';
import { mcpMessagesRepo } from '../repositories/mcpMessages.js';
import * as mcpRepo from '../repositories/mcpSessions.js';
import * as projectsRepo from '../repositories/projects.js';
import { dispatchTool, type ToolContext } from '../lib/toolDispatch.js';
import { buildToolDeclarations } from '../lib/geminiTools.js';
import * as goalsRepo from '../repositories/goals.js';
import { query, queryOne } from '../db.js';

export const chatRouter = Router();

const MAX_TOOL_LOOPS = 10; // safety limit on tool-calling rounds
const MAX_CONTEXT_TOKENS = 900_000; // token budget — bail before hitting the context window ceiling

// ── System Prompt Assembly ──
// Minimal prompt — all behavioral intelligence comes from nords_get_briefing's
// protocol block. The built-in chat is a vanilla MCP client; it should receive
// the same guidance as any external client (Claude, GPT, etc.).

async function buildSystemPrompt(
  projectId: string,
  _sessionId: string,
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


// ── Conversation History → Gemini Format ──

function buildGeminiHistory(messages: Array<{ role: string; content: string; tool_calls?: unknown }>) {
  const history: Array<{ role: string; parts: Array<{ text?: string; functionCall?: unknown; functionResponse?: unknown }> }> = [];

  for (const msg of messages) {
    if (msg.role === 'user') {
      history.push({ role: 'user', parts: [{ text: msg.content }] });
    } else if (msg.role === 'assistant') {
      history.push({ role: 'model', parts: [{ text: msg.content }] });
    }
    // tool messages are handled internally in the loop
  }

  return history;
}

// ── Main Chat Endpoint ──

chatRouter.post('/projects/:id/chat', async (req: Request, res: Response) => {
  try {
    const projectId = req.params.id as string;
    const { message, sessionId: existingSessionId, model = 'gemini-2.5-flash' } = req.body;

    if (!message?.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    // 1. Resolve or create session (with auto-restart for completed sessions)
    let sessionId = existingSessionId;
    let session;
    let isNewSession = false;
    if (!sessionId) {
      const project = await projectsRepo.findById(projectId);
      session = await mcpRepo.createSession(
        projectId,
        project?.default_persona_id || null,
        project?.default_start_nord_id || null
      );
      sessionId = session.id;
      isNewSession = true;

      // Initialize session goals based on project mode
      const projectMode = project?.project_mode || 'collect';
      await goalsRepo.initializeSessionGoals(sessionId, projectId, projectMode);
    } else {
      session = await queryOne<any>('SELECT * FROM mcp_sessions WHERE id = $1', [sessionId]);

      // ── Auto-restart: if the session is completed, create a new one ──
      if (session && session.status === 'completed') {
        const project = await projectsRepo.findById(projectId);
        const oldSessionId = sessionId;

        // Determine end_type from session summary
        const endType = session.summary?.includes('(continue)') ? 'continue' : 'reset';

        // Create fresh session
        session = await mcpRepo.createSession(
          projectId,
          session.persona_id || project?.default_persona_id || null,
          project?.default_start_nord_id || null
        );
        sessionId = session.id;
        isNewSession = true;

        const projectMode = project?.project_mode || 'collect';
        await goalsRepo.initializeSessionGoals(sessionId, projectId, projectMode);

        // If 'continue', carry over completed goals from old session
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

    // 2. Log user message
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

    // 3. Build system prompt with persona injection
    const personaId = (session as any)?.persona_id || null;
    const { prompt: systemPrompt, temperature } = await buildSystemPrompt(projectId, sessionId, personaId);

    // 4. Get project mutability for tool gating
    const project = await projectsRepo.findById(projectId);
    const mcpMutable = project?.mcp_mutable ?? false;
    const mcpCaptureData = project?.mcp_capture_data ?? true;

     // 5. Build tool context
    const toolCtx: ToolContext = { sessionId, projectId, mcpMutable, mcpCaptureData };

    // 6. Initialize Gemini — API key or Vertex AI (Application Default Credentials)
    const gcpProject = 'nords-spatial-1776012153';
    const gcpLocation = process.env.VERTEX_AI_LOCATION || 'us-central1';
    process.env.GOOGLE_CLOUD_PROJECT = gcpProject;

    let genai: GoogleGenAI;
    if (apiKey) {
      genai = new GoogleGenAI({ apiKey });
    } else if (gcpProject) {
      genai = new GoogleGenAI({ vertexai: true, project: gcpProject, location: gcpLocation });
    } else {
      // No API key and no GCP project — preview mode
      const horizon = await mcpRepo.getSessionHorizon(sessionId);
      const replyContent = `[Preview Mode — No GEMINI_API_KEY or GCP project configured]

Session ${sessionId.slice(0, 8)}… is active.
Current nord: ${horizon.current_nord?.title || 'none'}
Completion: ${horizon.completion.percentage}%
Neighbors: ${horizon.neighbors.length}
Suggested next: ${horizon.suggested_next?.title || 'none'}

Set GEMINI_API_KEY in server/.env or configure GOOGLE_CLOUD_PROJECT for Vertex AI.`;

      const assistantMsg = await mcpMessagesRepo.create({
        session_id: sessionId,
        role: 'assistant',
        content: replyContent,
        tool_calls: null,
        context: { systemPrompt: systemPrompt.slice(0, 500), horizon },
        tokens_in: null,
        tokens_out: null,
        model,
        latency_ms: 0,
      });

      return res.json({ reply: replyContent, sessionId, message: assistantMsg, toolCalls: [] });
    }

    // Fetch project dictionary for dynamic tool descriptions (uses 5-min cache)
    // NEVER expose graph-mutating tools (create/update/delete nord/connection) in chat.
    // The session layer (update_session_nord, update_session_variables) handles all runtime data collection.
    // Graph mutations are design-time operations handled by the canvas UI.
    const dictionary = await mcpRepo.getProjectDictionary(projectId);
    const toolDeclarations = buildToolDeclarations(false /* never mutable at runtime */, dictionary);

    // 7. Build conversation history
    const messageHistory = await mcpMessagesRepo.findBySession(sessionId);
    // Exclude the user message we just logged (it goes in the current turn)
    const priorMessages = messageHistory.slice(0, -1);
    const history = buildGeminiHistory(priorMessages);

    // 8. Tool-calling loop
    const startTime = Date.now();
    const allToolCalls: Array<{ name: string; arguments: Record<string, unknown>; result?: unknown }> = [];
    let finalReply = '';
    let tokensIn = 0;
    let tokensOut = 0;

    // Initial request
    let currentContents: any[] = [
      ...history,
      { role: 'user', parts: [{ text: message.trim() }] },
    ];

    for (let loop = 0; loop < MAX_TOOL_LOOPS; loop++) {
      // Token budget check — bail before hitting context window ceiling
      if (tokensIn + tokensOut > MAX_CONTEXT_TOKENS) {
        logger.warn('Token budget exceeded, breaking tool loop', { tokensIn, tokensOut, loop });
        finalReply = '[Token budget reached — ending tool loop. Please continue in a follow-up message.]';
        break;
      }

      const response = await genai.models.generateContent({
        model,
        contents: currentContents,
        config: {
          systemInstruction: systemPrompt,
          temperature,
          tools: [{ functionDeclarations: toolDeclarations }],
        },
      });

      // Track usage
      if (response.usageMetadata) {
        tokensIn += response.usageMetadata.promptTokenCount || 0;
        tokensOut += response.usageMetadata.candidatesTokenCount || 0;
      }

      const candidate = response.candidates?.[0];
      if (!candidate?.content?.parts) break;

      // Check for function calls
      const functionCalls = candidate.content.parts.filter((p: any) => p.functionCall);

      if (functionCalls.length === 0) {
        // No tool calls — extract text response
        finalReply = candidate.content.parts
          .filter((p: any) => p.text)
          .map((p: any) => p.text)
          .join('');
        break;
      }

      // Dispatch all tool calls
      const toolResponses: any[] = [];
      for (const part of functionCalls) {
        const fc = part.functionCall!;
        const toolName = (fc as any).name as string;
        const toolArgs = ((fc as any).args || {}) as Record<string, unknown>;

        logger.info('Tool call', { tool: toolName, args: toolArgs, session: sessionId });

        const result = await dispatchTool(toolName, toolCtx, toolArgs);
        allToolCalls.push({ name: toolName, arguments: toolArgs, result: result.data ?? result.error });
        toolResponses.push({
          functionResponse: {
            name: toolName,
            response: result,
          },
        });
      }

      // Build next turn with model's function calls + our responses
      currentContents = [
        ...currentContents,
        { role: 'model', parts: functionCalls.map((p: any) => ({ functionCall: p.functionCall })) },
        { role: 'user', parts: toolResponses },
      ];
    }

    const latency = Date.now() - startTime;

    // 9. Log assistant response with tool calls
    // Store prompt hash instead of full text (~8KB savings per message).
    // First message of the session gets the full prompt for debugging.
    const promptHash = createHash('sha256').update(systemPrompt).digest('hex').slice(0, 16);
    const isFirstMessage = priorMessages.length === 0;
    const assistantMsg = await mcpMessagesRepo.create({
      session_id: sessionId,
      role: 'assistant',
      content: finalReply,
      tool_calls: allToolCalls.length > 0 ? allToolCalls : null,
      context: {
        toolCallCount: allToolCalls.length, temperature, model,
        systemPromptHash: promptHash,
        systemPromptLength: systemPrompt.length,
        ...(isFirstMessage ? { systemPrompt } : {}),
      },
      tokens_in: tokensIn,
      tokens_out: tokensOut,
      model,
      latency_ms: latency,
    });

    // 10. Check session completion — only for projects WITHOUT goals.
    // For projects with goals, the Goal DAG engine (evaluateGoals in toolDispatch)
    // is the canonical termination path. Running both causes double-fire.
    const hasGoals = await queryOne<{ exists: boolean }>(
      'SELECT EXISTS (SELECT 1 FROM goals WHERE project_id = $1) AS exists',
      [projectId]
    );
    const completionCheck = !hasGoals?.exists
      ? await mcpRepo.checkSessionCompletion(sessionId)
      : { shouldTransition: false, endNordId: null, incompleteCount: 0 };

    // Fetch current horizon for dev panel
    const finalHorizon = await mcpRepo.getSessionHorizon(sessionId);

    res.json({
      reply: finalReply,
      sessionId,
      message: assistantMsg,
      toolCalls: allToolCalls,
      completion: completionCheck,
      systemPrompt,
      horizon: finalHorizon,
    });

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
