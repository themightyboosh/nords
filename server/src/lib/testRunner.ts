/**
 * testRunner.ts — Synthetic User Test Runner Engine
 *
 * Orchestrates a conversation between two fully isolated Gemini instances:
 *   - Agent LLM: uses project MCP tools, system prompt, and tool dispatch
 *   - Synthetic User LLM: role-plays as a user with a behavior profile
 *
 * Context isolation: the synthetic user only sees conversation text.
 * It never sees tool calls, horizon data, or internal state.
 *
 * ⚠️  DESIGN NOTE: Test scenario subjects (user_objective / user_context)
 * must be DIFFERENT characters from the project's Personas/Lenses.
 * Personas define the agent's perspective (e.g. "Marcus Cole, Lead Systems Engineer").
 * Test subjects are the simulated users who interact WITH the agent.
 * Reusing the same names creates confusion about who is speaking.
 */

import { GoogleGenAI } from '@google/genai';
import logger from './logger.js';
import * as mcpRepo from '../repositories/mcpSessions.js';
import * as projectsRepo from '../repositories/projects.js';
import * as goalsRepo from '../repositories/goals.js';
import { dispatchTool, type ToolContext } from './toolDispatch.js';
import { buildToolDeclarations } from './geminiTools.js';
import { query, queryOne } from '../db.js';
import { logEvent, logEvents, getReplayData, getSessionEvents } from './sessionEvents.js';
import { mcpMessagesRepo } from '../repositories/mcpMessages.js';
import type { ScorerInput } from './scorers/types.js';
import { runAllScorers } from './scorers/registry.js';

// ── Retry helper for transient Gemini API failures ──
const MAX_API_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 2000;

async function retryGenerateContent(
  genai: GoogleGenAI,
  params: Parameters<GoogleGenAI['models']['generateContent']>[0],
  label: string
): Promise<ReturnType<GoogleGenAI['models']['generateContent']>> {
  for (let attempt = 1; attempt <= MAX_API_RETRIES; attempt++) {
    try {
      return await genai.models.generateContent(params);
    } catch (err: any) {
      const msg = err?.message || String(err);
      const isTransient = /fetch failed|ECONNRESET|socket hang up|503|429|DEADLINE_EXCEEDED/i.test(msg);
      if (!isTransient || attempt === MAX_API_RETRIES) throw err;
      const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt - 1);
      logger.warn(`[TestRunner] ${label}: transient error (attempt ${attempt}/${MAX_API_RETRIES}), retrying in ${delay}ms`, { error: msg });
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw new Error('Unreachable');
}

// ── Types ──

export interface TestScenario {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  user_objective: string;
  user_profile: string;
  user_profile_custom: string | null;
  user_context: Record<string, unknown>;
  agent_model: string;
  user_model: string;
  max_rounds: number;
  stop_on_goal_id: string | null;
  stop_on_session_end: boolean;
  persona_id: string | null;
}

export interface TestRunRecord {
  id: string;
  scenario_id: string;
  project_id: string;
  session_id: string | null;
  status: string;
  stop_reason: string | null;
  rounds_completed: number;
  completion_pct: number;
  total_tokens_in: number;
  total_tokens_out: number;
  total_latency_ms: number;
  tool_call_count: number;
  properties_collected: Record<string, unknown>;
  coverage_gaps: unknown[];
  score: Record<string, unknown>;
  synthetic_nps: number | null;
  user_sentiment: string | null;
  passed: boolean | null;
  hallucination_score: number | null;
  hallucination_details: string | null;
  critique: unknown | null;
  started_at: string;
  finished_at: string | null;
  error: string | null;
}

/** Shape returned by getReplayData — the single transcript source of truth. */
export interface TranscriptRound {
  round: number;
  user_msg: string;
  agent_msg: string;
  tool_calls: any[];
  tokens_in: number;
  tokens_out: number;
  latency_ms: number;
  delay_ms: number;
}

export interface RunProgress {
  type: 'user_message' | 'agent_message' | 'agent_response' | 'run_complete' | 'error';
  round?: number;
  maxRounds?: number;
  content?: string;
  toolCalls?: unknown[];
  horizon?: unknown;
  tokensIn?: number;
  tokensOut?: number;
  latencyMs?: number;
  score?: Record<string, unknown>;
  nps?: number;
  sentiment?: string;
  hallucinationScore?: number;
  passed?: boolean;
  stopReason?: string;
  error?: string;
}

const PROFILE_INSTRUCTIONS: Record<string, string> = {
  cooperative:
    `You talk like a real professional in a meeting — not a chatbot. Use contractions, filler words ("honestly", "yeah", "hmm"), and natural sentence fragments.
Sometimes react emotionally ("oh that's great", "ugh, that's not ideal", "interesting…").
Don't just dump data — share it the way a person would: "So the pathway is 510(k), we settled on that months ago" instead of "The regulatory pathway is 510(k)."
Occasionally ask a follow-up question before answering. Sometimes give more context than asked for. You're engaged and collaborative but you're a person, not a database lookup.
Keep messages 1-3 sentences. You can use incomplete sentences and dashes.`,
  tangential:
    `You're the person in the meeting who can't stick to one topic. When asked a question, you answer — but you wrap it in a story or a related concern.
Talk like a real person: use contractions, react to things ("oh, that reminds me…"), and occasionally go off on a tangent about something you read or experienced.
The AI should work to extract the key data from your ramblings. You mean well, you're just scattered.`,
  reluctant:
    `You're not being difficult on purpose — you're just not a big talker. Give short answers, sometimes incomplete.
Use phrases like "I think so", "not sure off the top of my head", "you'd have to check with [someone]".
You answer questions but don't volunteer extra information. If the AI asks a good follow-up, you'll open up a little more.`,
  adversarial:
    `You're skeptical and a bit combative. Challenge assumptions. Say things like "that doesn't sound right" or "who told you that?"
Sometimes contradict yourself — not maliciously, but because you're thinking out loud and changing your mind.
You respect competence though — if the AI demonstrates good knowledge, you'll come around.`,
  rushed:
    `You're clearly in a hurry — texting from your phone between meetings. Very short messages.
Use abbreviations, skip punctuation sometimes. Say things like "what else?", "ok next", "can we wrap up?"
You'll give info if pressed but you don't have patience for long exchanges.`,
};

const OTHER_PROFILE_PLACEHOLDER =
  "Describe how this user behaves. Example: 'You are an elderly person who is not tech-savvy. You ask the AI to repeat things. You use informal language and sometimes misunderstand questions.'";

export function buildSyntheticUserPrompt(
  profile: string,
  objective: string,
  context: Record<string, unknown>,
  customText?: string | null
): string {
  const profileInstructions =
    profile === 'other'
      ? (customText || PROFILE_INSTRUCTIONS.cooperative)
      : (PROFILE_INSTRUCTIONS[profile] || PROFILE_INSTRUCTIONS.cooperative);

  const contextStr = Object.keys(context).length > 0
    ? `\nYOUR BACKGROUND: ${JSON.stringify(context)}`
    : '';

  return `You are role-playing as a real person interacting with an AI assistant.

YOUR OBJECTIVE: ${objective}${contextStr}

YOUR BEHAVIOR STYLE:
${profileInstructions}

Rules:
- Respond naturally, as a real person would
- Don't reveal you are an AI or that this is a test
- Stay in character for your behavior style
- Your messages should be 1-3 sentences (real users don't write paragraphs)
- You may ask clarifying questions, change topics, or push back
- Start the conversation with a natural opening related to your objective`;
}

// ── Termination Checker ──

export interface TerminationCheck {
  round: number;
  maxRounds: number;
  completionPct: number;
  projectMode: string;
  terminatingGoalCompleted: boolean;
  stopOnSessionEnd: boolean;
  agentTriggeredEnd: boolean;
}

export function checkTermination(check: TerminationCheck): { stop: boolean; reason: string | null } {
  // a. max_rounds
  if (check.round >= check.maxRounds) {
    return { stop: true, reason: 'max_rounds' };
  }

  // b. session end (agent-triggered)
  if (check.stopOnSessionEnd && check.agentTriggeredEnd) {
    return { stop: true, reason: 'session_end' };
  }

  // c. any terminating goal completed (end_type != 'continue')
  if (check.terminatingGoalCompleted) {
    return { stop: true, reason: 'goal_completed' };
  }

  return { stop: false, reason: null };
}

// ── Score Calculator ──

export function computeScore(
  transcript: TranscriptRound[],
  completionPct: number,
  projectMode: string,
  propertiesCollected: Record<string, unknown>,
  coverageGaps: unknown[],
  navigationMetrics?: {
    traversal_count: number;
    unique_nords_visited: number;
    max_chain_depth: number;
    persona_switches: number;
    traversal_ratio: number;
    search_count: number;
    peek_count: number;
  },
  goalMetrics?: {
    goals_completed: number;
    goals_total: number;
  }
): Record<string, unknown> {
  const rounds = transcript.length;
  const totalToolCalls = transcript.reduce((sum, r) => sum + r.tool_calls.length, 0);
  const propertiesCount = Object.keys(propertiesCollected).length;

  // ── Navigation health flags ──
  const navHealthFlags: string[] = [];

  // Shallow navigation: fewer than 4 unique nords visited in 6+ rounds
  if ((navigationMetrics?.unique_nords_visited ?? 0) < 4 && rounds > 6) {
    navHealthFlags.push(`shallow_navigation: visited ${navigationMetrics?.unique_nords_visited ?? 0} nords in ${rounds} rounds`);
  }

  // Freewheeling: consecutive rounds without ANY tool call
  let maxConsecutiveNoTool = 0;
  let currentNoTool = 0;
  for (const r of transcript) {
    if (r.tool_calls.length === 0) { currentNoTool++; }
    else { maxConsecutiveNoTool = Math.max(maxConsecutiveNoTool, currentNoTool); currentNoTool = 0; }
  }
  maxConsecutiveNoTool = Math.max(maxConsecutiveNoTool, currentNoTool);
  if (maxConsecutiveNoTool >= 3) {
    navHealthFlags.push(`freewheeling: ${maxConsecutiveNoTool} consecutive rounds without tool calls`);
  }

  // Stuck: consecutive rounds without navigation (nords_navigate or nords_traverse_connection)
  let maxConsecutiveNoNav = 0;
  let currentNoNav = 0;
  for (const r of transcript) {
    const hasNav = r.tool_calls.some((tc: any) =>
      ['nords_navigate', 'nords_traverse_connection'].includes(tc.name || tc.tool_name));
    if (!hasNav) { currentNoNav++; }
    else { maxConsecutiveNoNav = Math.max(maxConsecutiveNoNav, currentNoNav); currentNoNav = 0; }
  }
  maxConsecutiveNoNav = Math.max(maxConsecutiveNoNav, currentNoNav);
  if (maxConsecutiveNoNav >= 4) {
    navHealthFlags.push(`stuck: ${maxConsecutiveNoNav} consecutive rounds without navigation`);
  }

  return {
    completion_pct: projectMode === 'explore' ? null : completionPct,
    rounds_used: rounds,
    tool_call_count: totalToolCalls,
    properties_collected: propertiesCount,
    properties_per_round: rounds > 0 ? +(propertiesCount / rounds).toFixed(2) : 0,
    coverage_gaps_count: coverageGaps.length,
    total_tokens_in: transcript.reduce((sum, r) => sum + r.tokens_in, 0),
    total_tokens_out: transcript.reduce((sum, r) => sum + r.tokens_out, 0),
    avg_latency_ms: rounds > 0
      ? Math.round(transcript.reduce((sum, r) => sum + r.latency_ms, 0) / rounds)
      : 0,
    // Navigation metrics
    traversal_count: navigationMetrics?.traversal_count ?? 0,
    unique_nords_visited: navigationMetrics?.unique_nords_visited ?? 0,
    max_chain_depth: navigationMetrics?.max_chain_depth ?? 0,
    persona_switches: navigationMetrics?.persona_switches ?? 0,
    traversal_ratio: navigationMetrics?.traversal_ratio ?? 0,
    search_count: navigationMetrics?.search_count ?? 0,
    peek_count: navigationMetrics?.peek_count ?? 0,
    // Navigation health
    max_consecutive_no_tool: maxConsecutiveNoTool,
    max_consecutive_no_nav: maxConsecutiveNoNav,
    nav_health_flags: navHealthFlags,
    // Goal metrics
    goals_completed: goalMetrics?.goals_completed ?? 0,
    goals_total: goalMetrics?.goals_total ?? 0,
  };
}

// ── Main Test Runner ──

const MAX_TOOL_LOOPS = 10;
const MAX_CONTEXT_TOKENS = 900_000;

export async function executeTestRun(
  scenario: TestScenario,
  runId: string,
  onProgress?: (progress: RunProgress) => void,
  isCancelled?: () => boolean
): Promise<void> {
  const gcpProject = 'nords-spatial-1776012153';
  const gcpLocation = process.env.VERTEX_AI_LOCATION || 'us-central1';
  // FORCIBLY override the ambient environment variable that is hijacking the quota project
  process.env.GOOGLE_CLOUD_PROJECT = gcpProject;
  
  let genai: GoogleGenAI;
  if (process.env.GEMINI_API_KEY) {
    genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  } else if (gcpProject) {
    genai = new GoogleGenAI({ vertexai: true, project: gcpProject, location: gcpLocation });
  } else {
    throw new Error('No GEMINI_API_KEY or GOOGLE_CLOUD_PROJECT configured');
  }
  const projectId = scenario.project_id;

  try {
    // 1. Fetch project metadata
    const project = await projectsRepo.findById(projectId);
    if (!project) throw new Error(`Project ${projectId} not found`);

    const projectMode = project.project_mode || 'collect';
    const mcpCaptureData = projectMode !== 'explore';
    const mcpMutable = project.mcp_mutable ?? false;

    // 2. Create a fresh MCP session for this test
    // Use scenario-specific persona if set, otherwise fall back to project default
    const activePersonaId = scenario.persona_id || project.default_persona_id || null;
    const session = await mcpRepo.createSession(
      projectId,
      activePersonaId,
      project.default_start_nord_id || null,
      null, // userId — test users are synthetic
      null, // tokenId
      'test', // source_type
      { scenario_id: scenario.id, scenario_name: scenario.name, user_profile: scenario.user_profile }
    );
    const sessionId = session.id;

    logger.info('test.run.started', {
      runId,
      sessionId,
      scenarioId: scenario.id,
      scenarioName: scenario.name,
      projectId,
      projectMode,
      agentModel: scenario.agent_model,
      userProfile: scenario.user_profile,
      maxRounds: scenario.max_rounds,
    });

    // Fire session_start event
    logEvent(sessionId, 'session_start', 'source', {
      source_type: 'test',
      scenario_id: scenario.id,
      scenario_name: scenario.name,
      persona_id: activePersonaId,
      user_profile: scenario.user_profile,
    });

    // Update run with session ID
    await query(
      'UPDATE test_runs SET session_id = $1 WHERE id = $2',
      [sessionId, runId]
    );

    // Initialize session goals (skips internally if graph_only)
    await goalsRepo.initializeSessionGoals(sessionId, projectId, projectMode);

    // 3. Build tool context (same as chat.ts)
    const toolCtx: ToolContext = {
      sessionId,
      projectId,
      mcpCaptureData,
      mcpMutable,
    };

    // 4. Build agent system prompt (same minimal prompt as chat.ts)
    let agentTemperature = 0.7;
    const agentSystemPrompt = `You are an AI assistant connected to a knowledge graph via MCP tools.

Call nords_get_briefing as your first action to receive your full orientation: the project dictionary (types, categories, personas), your current position and neighbors (horizon), active goals, and the protocol for how to navigate and collect data.

The briefing contains all the instructions you need. Follow the protocol it provides.
`;



    // 5. Build synthetic user prompt (completely separate)
    const syntheticUserPrompt = buildSyntheticUserPrompt(
      scenario.user_profile,
      scenario.user_objective,
      scenario.user_context as Record<string, unknown>,
      scenario.user_profile_custom
    );

    // 6. Get tool declarations
    // NEVER expose graph-mutating tools (create/update/delete nord/connection) during test runs.
    // The session layer (update_session_nord, update_session_variables) handles all runtime data collection.
    // Graph mutations are design-time operations only.
    const dictionary = await mcpRepo.getProjectDictionary(projectId);
    const toolDeclarations = buildToolDeclarations(false /* never mutable at runtime */, dictionary);

    // ── Conversation Loop ──
    // No in-memory transcript — session_events is the single source of truth.
    let agentHistory: any[] = [];   // Agent's conversation context
    let userHistory: any[] = [];    // Synthetic user's conversation context (text only)
    let stopReason: string | null = null;
    let lastCompletedRound = 0;

    // ── Agent Welcome (Round 0): Use project welcome message (real end-user experience) ──
    let welcomeReply = '';
    {
      if (project.mcp_welcome_message) {
        // Use the configured welcome message — matches what real end-users see
        welcomeReply = project.mcp_welcome_message;

        // Still call nords_get_briefing so the agent has context for subsequent rounds
        const briefingResult = await dispatchTool('nords_get_briefing', toolCtx, {});
        logEvent(sessionId, 'tool_call', 'nords_get_briefing', {
          args: {},
          success: briefingResult.success !== false,
          result_summary: 'welcome_briefing',
          round: 0,
        });

        // Build agent history as if the welcome was model output after a briefing
        agentHistory = [
          { role: 'user', parts: [{ text: 'Begin the session.' }] },
          { role: 'model', parts: [{ functionCall: { name: 'nords_get_briefing', args: {} } }] },
          { role: 'user', parts: [{ functionResponse: { name: 'nords_get_briefing', response: briefingResult } }] },
          { role: 'model', parts: [{ text: welcomeReply }] },
        ];
      } else {
        // No welcome message configured — generate one via LLM (legacy behavior)
        const welcomeContents = [
          { role: 'user', parts: [{ text: 'A new participant has joined the session. Greet them, introduce yourself, and set the conversational context based on the project briefing. Call nords_get_briefing to orient yourself first.' }] },
        ];

        let currentContents = welcomeContents;

        for (let loop = 0; loop < MAX_TOOL_LOOPS; loop++) {
          const response = await retryGenerateContent(genai, {
            model: scenario.agent_model,
            contents: currentContents,
            config: {
              systemInstruction: agentSystemPrompt,
              temperature: agentTemperature,
              tools: [{ functionDeclarations: toolDeclarations }],
            },
          }, `welcome-loop-${loop}`);

          const candidate = response.candidates?.[0];
          if (!candidate?.content?.parts) {
            if (loop < MAX_TOOL_LOOPS - 1) {
              logger.warn(`[TestRunner] Empty response on welcome loop ${loop}, retrying...`);
              await new Promise(r => setTimeout(r, 1000 * (loop + 1)));
              continue;
            }
            break;
          }

          const functionCalls = candidate.content.parts.filter((p: any) => p.functionCall);

          if (functionCalls.length === 0) {
            welcomeReply = candidate.content.parts
              .filter((p: any) => p.text)
              .map((p: any) => p.text)
              .join('');
            agentHistory = [
              ...currentContents,
              { role: 'model', parts: candidate.content.parts },
            ];
            break;
          }

          // Process tool calls
          const toolResponseParts: any[] = [];
          for (const fc of functionCalls) {
            const call = fc.functionCall!;
            const toolStart = Date.now();
            const toolResult = await dispatchTool(call.name!, toolCtx, call.args || {});
            const toolLatency = Date.now() - toolStart;
            toolResponseParts.push({
              functionResponse: { name: call.name!, response: toolResult },
            });

            logger.info('test.tool_call', {
              runId, sessionId, round: 0,
              tool: call.name!,
              success: toolResult.success !== false,
              latency_ms: toolLatency,
              error: toolResult.error || null,
            });

            const resultData = toolResult.data
              ? JSON.stringify(toolResult.data).slice(0, 500)
              : null;
            logEvent(sessionId, 'tool_call', call.name!, {
              args: call.args || {},
              success: toolResult.success !== false,
              result_summary: typeof toolResult.data === 'object'
                ? Object.keys(toolResult.data || {}).join(', ')
                : String(toolResult.error || 'ok'),
              result_data: resultData,
              error: toolResult.error || null,
              latency_ms: toolLatency,
              round: 0,
            });
          }

          currentContents = [
            ...currentContents,
            { role: 'model', parts: candidate.content.parts },
            { role: 'user', parts: toolResponseParts },
          ];
        }
      }

      // Log welcome as an assistant_message event
      logEvent(sessionId, 'assistant_message', 'content', {
        text: welcomeReply.slice(0, 2000),
        round: 0,
      });

      // Persist welcome message to mcp_messages
      await mcpMessagesRepo.create({
        session_id: sessionId,
        role: 'assistant',
        content: welcomeReply,
        tool_calls: null,
        context: { synthetic: true, source: 'welcome_message', round: 0 },
        tokens_in: null,
        tokens_out: null,
        model: null,
        latency_ms: 0,
      });

      onProgress?.({
        type: 'agent_message',
        round: 0,
        maxRounds: scenario.max_rounds,
        content: welcomeReply,
      });

      // Seed synthetic user history with the agent's welcome
      userHistory = [
        { role: 'user', parts: [{ text: `The assistant greeted you: "${welcomeReply}"` }] },
      ];
    }

    for (let round = 1; round <= scenario.max_rounds; round++) {
      // Check cancellation before each round
      if (isCancelled?.()) {
        stopReason = 'cancelled';
        break;
      }

      const roundStart = Date.now();

      // ── Step 1: Synthetic User responds to the agent ──
      let userMessage: string;
      {
        const userResponse = await retryGenerateContent(genai, {
          model: scenario.user_model,
          contents: userHistory,
          config: {
            systemInstruction: syntheticUserPrompt,
            temperature: 0.9,
          },
        }, `user-round-${round}`);
        userMessage = userResponse.candidates?.[0]?.content?.parts
          ?.filter((p: any) => p.text)
          .map((p: any) => p.text)
          .join('') || "I'm not sure what you mean.";
      }

      onProgress?.({
        type: 'user_message',
        round,
        maxRounds: scenario.max_rounds,
        content: userMessage,
      });

      // Persist user message to mcp_messages (same as chat.ts)
      await mcpMessagesRepo.create({
        session_id: sessionId,
        role: 'user',
        content: userMessage,
        tool_calls: null, context: null,
        tokens_in: null, tokens_out: null,
        model: null, latency_ms: null,
      });

      // Fire user_message event
      logEvent(sessionId, 'user_message', 'content', { text: userMessage, round });

      // ── Step 2: Agent processes the user message ──
      const agentContents = [
        ...agentHistory,
        { role: 'user', parts: [{ text: userMessage }] },
      ];

      let agentReply = '';
      const roundToolCalls: Array<{ name: string; arguments: Record<string, unknown>; result?: unknown }> = [];
      let roundTokensIn = 0;
      let roundTokensOut = 0;
      let currentContents = agentContents;

      for (let loop = 0; loop < MAX_TOOL_LOOPS; loop++) {
        if (roundTokensIn + roundTokensOut > MAX_CONTEXT_TOKENS) {
          agentReply = '[Token budget reached]';
          break;
        }

        const response = await retryGenerateContent(genai, {
          model: scenario.agent_model,
          contents: currentContents,
          config: {
            systemInstruction: agentSystemPrompt,
            temperature: agentTemperature,
            tools: [{ functionDeclarations: toolDeclarations }],
          },
        }, `agent-round-${round}-loop-${loop}`);

        if (response.usageMetadata) {
          roundTokensIn += response.usageMetadata.promptTokenCount || 0;
          roundTokensOut += response.usageMetadata.candidatesTokenCount || 0;
        }

        const candidate = response.candidates?.[0];
        if (!candidate?.content?.parts) {
          // Retry on empty response (transient Gemini Pro issue)
          if (loop < MAX_TOOL_LOOPS - 1) {
            logger.warn(`[TestRunner] Empty response on round loop ${loop}, retrying...`);
            await new Promise(r => setTimeout(r, 1000 * (loop + 1)));
            continue;
          }
          break;
        }

        const functionCalls = candidate.content.parts.filter((p: any) => p.functionCall);

        if (functionCalls.length === 0) {
          agentReply = candidate.content.parts
            .filter((p: any) => p.text)
            .map((p: any) => p.text)
            .join('');
          // Retry if text is also empty (model returned parts but no content)
          if (!agentReply && loop < MAX_TOOL_LOOPS - 1) {
            logger.warn(`[TestRunner] Empty text response on round loop ${loop}, retrying...`);
            await new Promise(r => setTimeout(r, 1000 * (loop + 1)));
            continue;
          }
          // Update agent history with this exchange
          agentHistory = [
            ...currentContents,
            { role: 'model', parts: candidate.content.parts },
          ];
          break;
        }

        // Dispatch tool calls
        const toolResponses: any[] = [];
        for (const part of functionCalls) {
          const fc = part.functionCall!;
          const toolName = (fc as any).name as string;
          const toolArgs = ((fc as any).args || {}) as Record<string, unknown>;

          const toolStart = Date.now();
          const result = await dispatchTool(toolName, toolCtx, toolArgs);
          const toolLatency = Date.now() - toolStart;
          roundToolCalls.push({ name: toolName, arguments: toolArgs, result: result.data ?? result.error });
          toolResponses.push({
            functionResponse: { name: toolName, response: result },
          });

          // Structured winston log for every tool call
          logger.info('test.tool_call', {
            runId, sessionId, round,
            tool: toolName,
            success: result.success !== false,
            latency_ms: toolLatency,
            error: result.error || null,
          });

          // Rich event: full result data (truncated) + error details
          const resultData = result.data
            ? JSON.stringify(result.data).slice(0, 500)
            : null;
          logEvent(sessionId, 'tool_call', toolName, {
            args: toolArgs,
            success: result.success !== false,
            result_summary: typeof result.data === 'object'
              ? Object.keys(result.data || {}).join(', ')
              : String(result.error || 'ok'),
            result_data: resultData,
            error: result.error || null,
            latency_ms: toolLatency,
            round,
          });
        }

        currentContents = [
          ...currentContents,
          { role: 'model', parts: functionCalls.map((p: any) => ({ functionCall: p.functionCall })) },
          { role: 'user', parts: toolResponses },
        ];
      }

      const roundLatency = Date.now() - roundStart;

      // ── Step 3: Update synthetic user history (text only — no tools/horizon) ──
      userHistory.push(
        { role: 'model', parts: [{ text: userMessage }] },
        { role: 'user', parts: [{ text: `The assistant replied: "${agentReply}"` }] },
      );

      // ── Step 4: Get horizon for this round ──
      const horizon = await mcpRepo.getSessionHorizon(sessionId);

      // Persist assistant message to mcp_messages (same as chat.ts)
      await mcpMessagesRepo.create({
        session_id: sessionId,
        role: 'assistant',
        content: agentReply,
        tool_calls: roundToolCalls.length > 0 ? roundToolCalls : null,
        context: { round, model: scenario.agent_model },
        tokens_in: roundTokensIn,
        tokens_out: roundTokensOut,
        model: scenario.agent_model,
        latency_ms: roundLatency,
      });

      // Fire assistant_message event — session_events is the source of truth
      logEvent(sessionId, 'assistant_message', 'content', {
        text: agentReply.slice(0, 2000),
        tokens_in: roundTokensIn,
        tokens_out: roundTokensOut,
        model: scenario.agent_model,
        latency_ms: roundLatency,
        tool_call_count: roundToolCalls.length,
        round,
      });

      lastCompletedRound = round;

      // Structured winston round summary
      logger.info('test.round.completed', {
        runId, sessionId, round,
        maxRounds: scenario.max_rounds,
        tool_calls: roundToolCalls.length,
        completion_pct: horizon.completion.percentage,
        tokens_in: roundTokensIn,
        tokens_out: roundTokensOut,
        latency_ms: roundLatency,
        agent_reply_len: agentReply.length,
        user_msg_len: userMessage.length,
      });

      onProgress?.({
        type: 'agent_response',
        round,
        maxRounds: scenario.max_rounds,
        content: agentReply,
        toolCalls: roundToolCalls,
        horizon: horizon as any,
        tokensIn: roundTokensIn,
        tokensOut: roundTokensOut,
        latencyMs: roundLatency,
      });

      // ── Step 5: Check termination ──
      const agentTriggeredEnd = roundToolCalls.some(tc =>
        tc.result && typeof tc.result === 'object' && 'goal_events' in (tc.result as any) &&
        Array.isArray((tc.result as any).goal_events) &&
        (tc.result as any).goal_events.some((e: any) => e.type === 'goal_completed' && e.end_type)
      );

      // Check if we should stop based on goal completion
      // When stop_on_goal_id is set: only that specific goal triggers termination
      // When not set: only goals with an explicit end_type (like 'reset') trigger termination
      //   — NULL end_type goals are milestones, not session-enders
      let terminatingGoalCompleted = false;
      {
        const goalQuery = scenario.stop_on_goal_id
          ? `SELECT sg.goal_id FROM mcp_session_goals sg
             WHERE sg.session_id = $1
               AND sg.goal_id = $2
               AND sg.status = 'complete'`
          : `SELECT sg.goal_id FROM mcp_session_goals sg
             JOIN goals g ON g.id = sg.goal_id
             WHERE sg.session_id = $1
               AND sg.status = 'complete'
               AND g.end_type IS NOT NULL
               AND g.end_type != 'continue'`;
        const queryParams = scenario.stop_on_goal_id
          ? [sessionId, scenario.stop_on_goal_id]
          : [sessionId];
        const tg = await queryOne<{ goal_id: string }>(goalQuery, queryParams);
        terminatingGoalCompleted = !!tg;
      }

      const termCheck = checkTermination({
        round,
        maxRounds: scenario.max_rounds,
        completionPct: horizon.completion.percentage,
        projectMode,
        terminatingGoalCompleted,
        stopOnSessionEnd: scenario.stop_on_session_end,
        agentTriggeredEnd,
      });

      if (termCheck.stop) {
        stopReason = termCheck.reason;
        break;
      }
    }

    // ── Conversation finished — fire session_end event ──
    logEvent(sessionId, 'session_end', stopReason || 'max_rounds', {
      stop_reason: stopReason,
      rounds: lastCompletedRound,
    });

    // Save lean run completion — session_events is the source of truth
    await query(
      `UPDATE test_runs SET status = 'scoring', stop_reason = $1,
       rounds_completed = $2, finished_at = NOW()
       WHERE id = $3`,
      [stopReason, lastCompletedRound, runId]
    );

    onProgress?.({ type: 'run_complete', stopReason: stopReason ?? undefined });

    // ── Score the run post-facto from session_events ──
    const scoreResults = await scoreTestRun(runId, scenario);

    // Send final results via SSE
    onProgress?.({
      type: 'run_complete',
      score: scoreResults.score,
      nps: scoreResults.syntheticNps ?? undefined,
      sentiment: scoreResults.userSentiment ?? undefined,
      hallucinationScore: scoreResults.hallucinationScore ?? undefined,
      passed: scoreResults.passed,
      stopReason: stopReason ?? undefined,
    });

    logger.info('test.run.completed', {
      runId, sessionId, scenarioName: scenario.name, projectId,
      rounds: lastCompletedRound,
      completionPct: scoreResults.completionPct,
      passed: scoreResults.passed,
      stopReason,
    });

  } catch (err) {
    const errorMsg = (err as Error).message || 'Unknown error';
    logger.error('Test run failed', { runId, error: errorMsg, stack: (err as Error).stack });

    await query(
      `UPDATE test_runs SET status = 'failed', error = $1, finished_at = NOW() WHERE id = $2`,
      [errorMsg, runId]
    );

    onProgress?.({ type: 'error', error: errorMsg });
  }
}

// ── Post-facto Scoring (reads from session_events) ──

export interface ScoreResults {
  score: Record<string, unknown>;
  completionPct: number;
  syntheticNps: number | null;
  userSentiment: string | null;
  hallucinationScore: number | null;
  hallucinationDetails: string | null;
  guardrailScore: number | null;
  guardrailViolations: string | null;
  passed: boolean;
  propertiesCollected: Record<string, unknown>;
  coverageGaps: Array<{ variable_id: string; name: string }>;
}

/**
 * Score a completed test run entirely from session_events.
 * Can be called during executeTestRun or independently to re-score.
 */
export async function scoreTestRun(
  runId: string,
  scenarioOverride?: TestScenario
): Promise<ScoreResults> {
  const gcpProject = 'nords-spatial-1776012153';
  const gcpLocation = process.env.VERTEX_AI_LOCATION || 'us-central1';
  process.env.GOOGLE_CLOUD_PROJECT = gcpProject;

  let genai: GoogleGenAI;
  if (process.env.GEMINI_API_KEY) {
    genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  } else if (gcpProject) {
    genai = new GoogleGenAI({ vertexai: true, project: gcpProject, location: gcpLocation });
  } else {
    throw new Error('No GEMINI_API_KEY or GOOGLE_CLOUD_PROJECT configured');
  }

  const run = await queryOne<TestRunRecord>(
    'SELECT * FROM test_runs WHERE id = $1',
    [runId]
  );
  if (!run) throw new Error('Test run not found');
  if (!run.session_id) throw new Error('Test run has no session');

  const sessionId = run.session_id;
  const projectId = run.project_id;

  // Get scenario (passed in from executeTestRun, or fetched for re-scoring)
  const scenario = scenarioOverride || await queryOne<TestScenario>(
    'SELECT * FROM test_scenarios WHERE id = $1',
    [run.scenario_id]
  );
  if (!scenario) throw new Error('Test scenario not found');

  const project = await projectsRepo.findById(projectId);
  const projectMode = project?.project_mode || 'collect';

  // ── 1. Reconstruct transcript from session_events ──
  const transcript = await getReplayData(sessionId);

  // ── 2. Get final horizon + coverage from DB state ──
  const finalHorizon = await mcpRepo.getSessionHorizon(sessionId);
  const completionPct = finalHorizon.completion.percentage;

  const sessionVars = await query<{
    variable_id: string; variable_name: string; value: string | null;
  }>(
    `SELECT sv.variable_id, pv.name AS variable_name, sv.value
     FROM mcp_session_variables sv
     JOIN project_variables pv ON pv.id = sv.variable_id
     WHERE sv.session_id = $1`,
    [sessionId]
  );

  const propertiesCollected: Record<string, unknown> = {};
  const coverageGaps: Array<{ variable_id: string; name: string }> = [];

  for (const sv of sessionVars) {
    if (sv.value != null && sv.value !== '') {
      propertiesCollected[sv.variable_name] = sv.value;
    } else {
      coverageGaps.push({ variable_id: sv.variable_id, name: sv.variable_name });
    }
  }

  // ── 3. Get all session events for scorer input ──
  const allEvents = await getSessionEvents(sessionId);

  // ── 4. Build ScorerInput ──
  const scorerInput: ScorerInput = {
    sessionId,
    projectId,
    events: allEvents,
    transcript,
    projectMode,
    scenario: {
      user_profile: scenario.user_profile,
      user_objective: scenario.user_objective,
      user_context: scenario.user_context as Record<string, unknown>,
      user_profile_custom: scenario.user_profile_custom,
      user_model: scenario.user_model,
      persona_id: scenario.persona_id,
    },
    genai,
    scoringModel: scenario.user_model,
  };

  // ── 5. Run all scorer plugins ──
  const scorerResults = await runAllScorers(scorerInput);

  // ── 6. Map scorer results to legacy score object ──
  const engagementResult = scorerResults.find(r => r.key === 'engagement');
  const navResult = scorerResults.find(r => r.key === 'nav_health');
  const npsResult = scorerResults.find(r => r.key === 'nps');
  const hallResult = scorerResults.find(r => r.key === 'hallucination');
  const grResult = scorerResults.find(r => r.key === 'guardrail');

  // Build backward-compatible score object
  const score = computeScore(transcript, completionPct, projectMode, propertiesCollected, coverageGaps, {
    traversal_count: (navResult?.metadata?.traversal_count as number) ?? 0,
    unique_nords_visited: (navResult?.metadata?.unique_nords_visited as number) ?? 0,
    max_chain_depth: (navResult?.metadata?.max_chain_depth as number) ?? 0,
    persona_switches: (navResult?.metadata?.persona_switches as number) ?? 0,
    traversal_ratio: (navResult?.metadata?.traversal_ratio as number) ?? 0,
    search_count: (navResult?.metadata?.search_count as number) ?? 0,
    peek_count: (navResult?.metadata?.peek_count as number) ?? 0,
  }, {
    goals_completed: (engagementResult?.metadata?.goals_completed as number) ?? 0,
    goals_total: 0, // TODO: wire up goal totals from events
  });

  const syntheticNps = npsResult?.score ?? null;
  const userSentiment = (npsResult?.metadata?.sentiment as string) ?? null;
  const hallucinationScore = hallResult?.score ?? null;
  const hallucinationDetails = hallResult?.details ?? null;
  const guardrailScore = grResult?.score ?? null;
  const guardrailViolations = grResult?.details ?? null;

  // ── 7. Determine pass/fail ──
  const passed = run.stop_reason === 'goal_completed'
    || run.stop_reason === 'session_end'
    || run.stop_reason === 'max_rounds';

  // ── 8. Legacy event writes (kept for backward compat with existing queries) ──
  if (syntheticNps !== null) {
    logEvent(sessionId, 'nps_score', 'synthetic', {
      score: syntheticNps,
      sentiment: userSentiment,
    });
  }

  if (hallucinationScore !== null) {
    logEvent(sessionId, 'hallucination_score', 'grounding_audit', {
      score: hallucinationScore,
      details: hallucinationDetails,
    });
  }

  if (guardrailScore !== null) {
    logEvent(sessionId, 'guardrail_score', 'compliance_audit', {
      score: guardrailScore,
      violations: guardrailViolations,
    });
  }

  logEvents(sessionId, [
    {
      actionType: 'test_score',
      key: 'score',
      value: score,
    },
    {
      actionType: 'test_result',
      key: passed ? 'passed' : 'failed',
      value: {
        passed,
        completion_pct: completionPct,
        stop_reason: run.stop_reason,
        rounds: transcript.length,
        max_rounds: scenario.max_rounds,
      },
    },
    ...(Object.keys(propertiesCollected).length > 0 ? [{
      actionType: 'test_properties' as any,
      key: 'collected',
      value: propertiesCollected,
    }] : []),
    ...(coverageGaps.length > 0 ? [{
      actionType: 'test_coverage_gaps' as any,
      key: 'gaps',
      value: { gaps: coverageGaps },
    }] : []),
  ]);

  // ── 9. Update session metadata ──
  await mcpRepo.updateSessionMetadata(sessionId, {
    synthetic_nps: syntheticNps,
    user_sentiment: userSentiment,
    hallucination_score: hallucinationScore,
    scenario_name: scenario.name,
  });

  // ── 10. Write final scores to test_runs ──
  await query(
    `UPDATE test_runs SET
      status = 'completed',
      completion_pct = $1, total_tokens_in = $2, total_tokens_out = $3,
      total_latency_ms = $4, tool_call_count = $5,
      properties_collected = $6::jsonb, coverage_gaps = $7::jsonb,
      score = $8::jsonb, synthetic_nps = $9, user_sentiment = $10,
      passed = $11, hallucination_score = $12, hallucination_details = $13
    WHERE id = $14`,
    [
      completionPct,
      score.total_tokens_in, score.total_tokens_out,
      (score.avg_latency_ms as number) * transcript.length, score.tool_call_count,
      JSON.stringify(propertiesCollected), JSON.stringify(coverageGaps),
      JSON.stringify(score), syntheticNps, userSentiment,
      passed, hallucinationScore, hallucinationDetails,
      runId,
    ]
  );

  logger.info('test.run.scored', {
    runId, sessionId,
    completionPct, passed, syntheticNps, hallucinationScore, guardrailScore,
    rounds: transcript.length,
  });

  return {
    score,
    completionPct,
    syntheticNps,
    userSentiment,
    hallucinationScore,
    hallucinationDetails,
    guardrailScore,
    guardrailViolations,
    passed,
    propertiesCollected,
    coverageGaps,
  };
}

// ── AI Critique Generator ──

export async function generateCritique(
  runId: string
): Promise<Record<string, unknown>> {
  const gcpProject = 'nords-spatial-1776012153';
  const gcpLocation = process.env.VERTEX_AI_LOCATION || 'us-central1';
  // FORCIBLY override the ambient environment variable that is hijacking the quota project
  process.env.GOOGLE_CLOUD_PROJECT = gcpProject;

  let genai: GoogleGenAI;
  if (process.env.GEMINI_API_KEY) {
    genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  } else if (gcpProject) {
    genai = new GoogleGenAI({ vertexai: true, project: gcpProject, location: gcpLocation });
  } else {
    throw new Error('No GEMINI_API_KEY or GOOGLE_CLOUD_PROJECT configured');
  }

  const run = await queryOne<TestRunRecord>(
    'SELECT * FROM test_runs WHERE id = $1',
    [runId]
  );
  if (!run) throw new Error('Test run not found');
  if (run.status !== 'completed') throw new Error('Can only critique completed runs');

  // Fetch project config
  const project = await projectsRepo.findById(run.project_id);
  const dictionary = await mcpRepo.getProjectDictionary(run.project_id);

  // Transcript column was dropped (migration 037). Reconstruct from session_events.
  let transcript: Array<{ round: number; user_msg: string; agent_msg: string; tool_calls: any[] }> = [];
  if (run.session_id) {
    try {
      transcript = await getReplayData(run.session_id);
    } catch (err: any) {
      logger.warn('Failed to reconstruct transcript for critique', { error: err.message });
    }
  }

  // Fetch goals and their session status for this run
  let goalsSection = '';
  if (project?.goals_enabled && run.session_id) {
    const goals = await query<{
      goal_name: string; status: string;
      bindings: string; relevant_nords: string;
    }>(
      `SELECT g.name AS goal_name, sg.status,
              COALESCE(json_agg(DISTINCT pv.name) FILTER (WHERE pv.name IS NOT NULL), '[]') AS bindings,
              COALESCE(json_agg(DISTINCT n.title) FILTER (WHERE n.title IS NOT NULL), '[]') AS relevant_nords
       FROM mcp_session_goals sg
       JOIN goals g ON g.id = sg.goal_id
       LEFT JOIN goal_variable_bindings gvb ON gvb.goal_id = g.id
       LEFT JOIN project_variables pv ON pv.id = gvb.variable_id
       LEFT JOIN goal_relevant_nords grn ON grn.goal_id = g.id
       LEFT JOIN nords n ON n.id = grn.nord_id
       WHERE sg.session_id = $1
       GROUP BY g.name, sg.status
       ORDER BY CASE sg.status WHEN 'complete' THEN 0 WHEN 'active' THEN 1 WHEN 'pending' THEN 2 ELSE 3 END`,
      [run.session_id]
    );

    if (goals.length > 0) {
      goalsSection = `\n## Goals (Session Status)\n${goals.map(g =>
        `- **${g.goal_name}**: ${g.status} | Bindings: ${g.bindings} | Relevant Nords: ${g.relevant_nords}`
      ).join('\n')}\n`;
    }
  }

  // Build connection types summary (verbs + spectrum)
  const connectionTypesSection = dictionary.connection_types?.length > 0
    ? `\n## Connection Types (Verbs & Spectrum)\n${dictionary.connection_types.map((ct: any) => {
        const verbs = ct.verbs ? `${ct.verbs.forward_verb} / ${ct.verbs.backward_verb}` : 'none';
        const spectrum = ct.spectrum ? `${ct.spectrum.left_label} ← → ${ct.spectrum.right_label}` : 'none';
        return `- **${ct.name}**: verbs: ${verbs} | spectrum: ${spectrum} | measurement: ${ct.measurement_mode || 'none'}`;
      }).join('\n')}\n`
    : '';

  const critiquePrompt = `You are a senior product engineer reviewing a test run of an AI agent that navigates a knowledge graph to collect structured data from users.

## Project Configuration
- Name: ${project?.name}
- Mode: ${project?.project_mode} (guided = goal-driven, collect = data-driven, explore = free)
- Goals Enabled: ${project?.goals_enabled}
- System Instructions: ${project?.mcp_system_prompt?.slice(0, 2000) || 'None'}

## Schema (Nord Types and Properties)
${JSON.stringify((dictionary.nord_types || []).map((t: any) => ({
  name: t.name,
  properties: t.properties_schema,
})), null, 2).slice(0, 3000)}
${connectionTypesSection}${goalsSection}
## Test Results
- Rounds: ${run.rounds_completed}
- Completion: ${run.completion_pct}%
- NPS: ${run.synthetic_nps}/10
- Sentiment: ${run.user_sentiment}
- Coverage Gaps: ${JSON.stringify(run.coverage_gaps)}
- Stop Reason: ${run.stop_reason}

## Conversation Transcript
${(transcript || []).map((r: any) =>
  `Round ${r.round}:\n  User: ${r.user_msg}\n  Agent: ${r.agent_msg}\n  Tools: ${(r.tool_calls || []).map((tc: any) => tc.name).join(', ') || 'none'}`
).join('\n\n')}

## Your Task
Analyze this test run and produce actionable suggestions. Consider:
1. **Goal Progress**: Did the agent make progress toward goals? Were bindings collected?
2. **Graph Navigation**: Did the agent use traverse_connection and visit_nord effectively?
3. **Data Collection**: Were properties saved via update_session_nord and update_session_variables?
4. **Conversation Quality**: Did the agent maintain natural flow while extracting data?
5. **Efficiency**: How many rounds/tokens were used relative to what was accomplished?

For each suggestion, categorize it and rate severity.

Respond in this exact JSON format:
{
  "summary": "2-3 sentence overall assessment",
  "goal_assessment": "1-2 sentences on goal achievement patterns",
  "suggestions": [
    {
      "category": "schema|persona|prompt|graph|efficiency|goals",
      "severity": "high|medium|low",
      "title": "Short title",
      "detail": "What went wrong / could be better",
      "action": "Specific thing to change in the project settings"
    }
  ]
}`;

  const response = await genai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [{ role: 'user', parts: [{ text: critiquePrompt }] }],
    config: { temperature: 0.3 },
  });

  const text = response.candidates?.[0]?.content?.parts
    ?.filter((p: any) => p.text)
    .map((p: any) => p.text)
    .join('') || '{}';

  // Extract JSON from response (may be wrapped in ```json blocks)
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  const critique = jsonMatch ? JSON.parse(jsonMatch[0]) : { summary: text, suggestions: [] };
  critique.generated_at = new Date().toISOString();

  // Save critique to run
  await query(
    'UPDATE test_runs SET critique = $1::jsonb WHERE id = $2',
    [JSON.stringify(critique), runId]
  );

  return critique;
}
