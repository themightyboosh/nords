/**
 * chatEngine.ts — Shared chat execution engine.
 *
 * Contains the complete LLM turn loop used by both the authenticated
 * preview chat (/api/projects/:id/chat) and the public share chat
 * (/api/share/chat). Extracted so both paths get identical:
 *   - Vertex AI / API key / Preview Mode fallback
 *   - Tool-calling loop with budget limits
 *   - Session event logging (user_message, assistant_message, tool_call, horizon_snapshot)
 *   - Token tracking and latency measurement
 *   - Completion checking
 */

import { createHash } from 'node:crypto';
import { GoogleGenAI } from '@google/genai';
import logger from './logger.js';
import { mcpMessagesRepo } from '../repositories/mcpMessages.js';
import * as mcpRepo from '../repositories/mcpSessions.js';
import * as projectsRepo from '../repositories/projects.js';
import { dispatchTool, type ToolContext } from './toolDispatch.js';
import { buildToolDeclarations } from './geminiTools.js';
import { queryOne } from '../db.js';
import { logEvent } from './sessionEvents.js';

// ── Constants ──

const MAX_TOOL_LOOPS = 10;
const MAX_CONTEXT_TOKENS = 900_000;

// ── System Prompt ──
// Minimal — all behavioral intelligence comes from nords_get_briefing's
// protocol block. The built-in chat is a vanilla MCP client; it should
// receive the same guidance as any external client (Claude, GPT, etc.).

export function buildSystemPrompt(): { prompt: string; temperature: number } {
  return {
    temperature: 0.7,
    prompt: `You are an AI assistant connected to a knowledge graph via MCP tools.

Call nords_get_briefing as your first action to receive your full orientation: the project dictionary (types, categories, personas), your current position and neighbors (horizon), active goals, and the protocol for how to navigate and collect data.

The briefing contains all the instructions you need. Follow the protocol it provides.
`,
  };
}

// ── Gemini History Builder ──

export function buildGeminiHistory(
  messages: Array<{ role: string; content: string; tool_calls?: unknown }>
) {
  const history: Array<{
    role: string;
    parts: Array<{ text?: string; functionCall?: unknown; functionResponse?: unknown }>;
  }> = [];

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

// ── LLM Initialization ──

export function initLLM(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  const gcpProject = 'nords-spatial-1776012153';
  const gcpLocation = process.env.VERTEX_AI_LOCATION || 'us-central1';
  process.env.GOOGLE_CLOUD_PROJECT = gcpProject;

  if (apiKey) {
    return new GoogleGenAI({ apiKey });
  } else if (gcpProject) {
    return new GoogleGenAI({ vertexai: true, project: gcpProject, location: gcpLocation });
  }

  return null; // Preview mode — no LLM available
}

// ── Chat Turn Parameters ──

export interface ChatTurnParams {
  projectId: string;
  sessionId: string;
  message: string;
  model: string;
  personaId: string | null;
  sourceType: 'chat' | 'share' | 'test';
  /** Whether the project allows graph mutations via AI */
  mcpMutable?: boolean;
  /** Whether the project captures collection variable data */
  mcpCaptureData?: boolean;
}

export interface ChatTurnResult {
  reply: string;
  sessionId: string;
  message: any;
  toolCalls: Array<{ name: string; arguments: Record<string, unknown>; result?: unknown }>;
  completion: { shouldTransition: boolean; endNordId: string | null; incompleteCount: number };
  systemPrompt: string;
  horizon: Record<string, unknown>;
}

// ── Execute a Single Chat Turn ──

export async function executeChatTurn(params: ChatTurnParams): Promise<ChatTurnResult> {
  const {
    projectId,
    sessionId,
    message,
    model,
    personaId,
    sourceType,
    mcpMutable = false,
    mcpCaptureData = true,
  } = params;

  // 1. Log user message
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

  // Fire user_message event
  logEvent(sessionId, 'user_message', 'content', { text: message.trim() });

  // 2. Build system prompt
  const { prompt: systemPrompt, temperature } = buildSystemPrompt();

  // 3. Build tool context
  const toolCtx: ToolContext = { sessionId, projectId, mcpMutable, mcpCaptureData, sourceType };

  // 4. Initialize LLM
  const genai = initLLM();

  if (!genai) {
    // Preview mode — no LLM available
    const horizon = await mcpRepo.getSessionHorizon(sessionId);
    const replyContent = `[Preview Mode — No GEMINI_API_KEY or GCP project configured]

Session ${sessionId.slice(0, 8)}… is active.
Current nord: ${(horizon as any).current_nord?.title || 'none'}
Completion: ${(horizon as any).completion.percentage}%
Neighbors: ${(horizon as any).neighbors.length}
Suggested next: ${(horizon as any).suggested_next?.[0]?.title || 'none'}

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

    return {
      reply: replyContent,
      sessionId,
      message: assistantMsg,
      toolCalls: [],
      completion: { shouldTransition: false, endNordId: null, incompleteCount: 0 },
      systemPrompt,
      horizon: horizon as unknown as Record<string, unknown>,
    };
  }

  // 5. Fetch tool declarations
  const dictionary = await mcpRepo.getProjectDictionary(projectId);
  const toolDeclarations = buildToolDeclarations(false /* never mutable at runtime */, dictionary);

  // 6. Build conversation history
  const messageHistory = await mcpMessagesRepo.findBySession(sessionId);
  // Exclude the user message we just logged (it goes in the current turn)
  const priorMessages = messageHistory.slice(0, -1);
  const history = buildGeminiHistory(priorMessages);

  // 7. Tool-calling loop
  const startTime = Date.now();
  const allToolCalls: Array<{ name: string; arguments: Record<string, unknown>; result?: unknown }> = [];
  let finalReply = '';
  let tokensIn = 0;
  let tokensOut = 0;

  let currentContents: any[] = [
    ...history,
    { role: 'user', parts: [{ text: message.trim() }] },
  ];

  for (let loop = 0; loop < MAX_TOOL_LOOPS; loop++) {
    // Token budget check
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

      // Fire tool_call event
      logEvent(sessionId, 'tool_call', toolName, {
        args: toolArgs,
        result_summary: typeof result.data === 'object'
          ? Object.keys(result.data || {}).join(', ')
          : String(result.error || 'ok'),
      });
    }

    // Build next turn with model's function calls + our responses
    currentContents = [
      ...currentContents,
      { role: 'model', parts: functionCalls.map((p: any) => ({ functionCall: p.functionCall })) },
      { role: 'user', parts: toolResponses },
    ];
  }

  if (!finalReply) {
    finalReply = 'I encountered an issue processing your request. Could you try rephrasing?';
  }

  const latency = Date.now() - startTime;

  // 8. Log assistant response
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

  // Fire assistant_message event
  logEvent(sessionId, 'assistant_message', 'content', {
    text: finalReply.slice(0, 2000),
    tokens_in: tokensIn,
    tokens_out: tokensOut,
    model,
    latency_ms: latency,
    tool_call_count: allToolCalls.length,
  });

  // 9. Check session completion
  const hasGoals = await queryOne<{ exists: boolean }>(
    'SELECT EXISTS (SELECT 1 FROM goals WHERE project_id = $1) AS exists',
    [projectId]
  );
  const completionCheck = !hasGoals?.exists
    ? await mcpRepo.checkSessionCompletion(sessionId)
    : { shouldTransition: false, endNordId: null, incompleteCount: 0 };

  // 10. Horizon snapshot
  const finalHorizon = await mcpRepo.getSessionHorizon(sessionId);

  logEvent(sessionId, 'horizon_snapshot', 'state', {
    current_nord_id: (finalHorizon as any).current_nord?.id || null,
    current_nord_title: (finalHorizon as any).current_nord?.title || null,
    neighbor_ids: (finalHorizon as any).neighbors?.map((n: any) => n.id) || [],
    completion_pct: (finalHorizon as any).completion?.percentage || 0,
    persona_id: personaId,
  });

  return {
    reply: finalReply,
    sessionId,
    message: assistantMsg,
    toolCalls: allToolCalls,
    completion: completionCheck,
    systemPrompt,
    horizon: finalHorizon as unknown as Record<string, unknown>,
  };
}
