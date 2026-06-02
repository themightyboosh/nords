/**
 * testRunner.ts — Synthetic User Test Runner Engine
 *
 * Orchestrates a conversation between two fully isolated Gemini instances:
 *   - Agent LLM: uses project MCP tools, system prompt, and tool dispatch
 *   - Synthetic User LLM: role-plays as a user with a behavior profile
 *
 * Context isolation: the synthetic user only sees conversation text.
 * It never sees tool calls, horizon data, or internal state.
 */

import { GoogleGenAI } from '@google/genai';
import logger from './logger.js';
import * as mcpRepo from '../repositories/mcpSessions.js';
import * as projectsRepo from '../repositories/projects.js';
import * as goalsRepo from '../repositories/goals.js';
import { dispatchTool, type ToolContext } from './toolDispatch.js';
import { buildToolDeclarations } from './geminiTools.js';
import { query, queryOne } from '../db.js';
import { logEvent, logEvents } from './sessionEvents.js';
import { mcpMessagesRepo } from '../repositories/mcpMessages.js';

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
  stop_on_completion_pct: number | null;
  stop_on_goal_id: string | null;
  stop_on_session_end: boolean;
  min_completion_pct: number;
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
  transcript: TranscriptRound[]; // kept in-memory for computeScore, no longer persisted to DB
  critique: unknown | null;
  started_at: string;
  finished_at: string | null;
  error: string | null;
}

export interface TranscriptRound {
  round: number;
  user_msg: string;
  agent_msg: string;
  tool_calls: Array<{ name: string; arguments: Record<string, unknown>; result?: unknown }>;
  horizon_snapshot: Record<string, unknown> | null;
  tokens_in: number;
  tokens_out: number;
  latency_ms: number;
}

export interface RunProgress {
  type: 'user_message' | 'agent_response' | 'run_complete' | 'error';
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
  stopOnCompletionPct: number | null;
  stopOnGoalId: string | null;
  goalStatus: string | null;
  stopOnSessionEnd: boolean;
  agentTriggeredEnd: boolean;
}

export function checkTermination(check: TerminationCheck): { stop: boolean; reason: string | null } {
  // a. max_rounds
  if (check.round >= check.maxRounds) {
    return { stop: true, reason: 'max_rounds' };
  }

  // b. session end
  if (check.stopOnSessionEnd && check.agentTriggeredEnd) {
    return { stop: true, reason: 'session_end' };
  }

  // c. completion (collect/guided only)
  if (
    check.stopOnCompletionPct != null &&
    check.projectMode !== 'explore' &&
    check.completionPct >= check.stopOnCompletionPct
  ) {
    return { stop: true, reason: 'completion' };
  }

  // d. goal (guided only)
  if (
    check.stopOnGoalId &&
    check.projectMode === 'guided' &&
    check.goalStatus === 'completed'
  ) {
    return { stop: true, reason: 'goal' };
  }

  return { stop: false, reason: null };
}

// ── Score Calculator ──

export function computeScore(
  transcript: TranscriptRound[],
  completionPct: number,
  projectMode: string,
  propertiesCollected: Record<string, unknown>,
  coverageGaps: unknown[]
): Record<string, unknown> {
  const rounds = transcript.length;
  const totalToolCalls = transcript.reduce((sum, r) => sum + r.tool_calls.length, 0);
  const propertiesCount = Object.keys(propertiesCollected).length;

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

    // Initialize goals if guided mode
    if (projectMode === 'guided') {
      await goalsRepo.initializeSessionGoals(sessionId, projectId, projectMode);
    }

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

    if (activePersonaId) {
      const persona = await queryOne<{ temperature: number }>(
        'SELECT temperature FROM personas WHERE id = $1 AND deleted_at IS NULL',
        [activePersonaId]
      );
      if (persona) agentTemperature = persona.temperature ?? 0.7;
    }

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
    const transcript: TranscriptRound[] = [];
    let agentHistory: any[] = [];   // Agent's conversation context
    let userHistory: any[] = [];    // Synthetic user's conversation context (text only)
    let totalTokensIn = 0;
    let totalTokensOut = 0;
    let totalLatency = 0;
    let totalToolCallCount = 0;
    let stopReason: string | null = null;

    // ── Agent Welcome (Round 0): Agent goes first to establish context ──
    let welcomeReply = '';
    const welcomeToolCalls: Array<{ name: string; arguments: Record<string, unknown>; result?: unknown }> = [];
    {
      // Prompt the agent to introduce itself and set the scene
      const welcomeContents = [
        { role: 'user', parts: [{ text: 'A new participant has joined the session. Greet them, introduce yourself, and set the conversational context based on the project briefing. Call nords_get_briefing to orient yourself first.' }] },
      ];

      let currentContents = welcomeContents;
      let welcomeTokensIn = 0;
      let welcomeTokensOut = 0;

      for (let loop = 0; loop < MAX_TOOL_LOOPS; loop++) {
        const response = await genai.models.generateContent({
          model: scenario.agent_model,
          contents: currentContents,
          config: {
            systemInstruction: agentSystemPrompt,
            temperature: agentTemperature,
            tools: [{ functionDeclarations: toolDeclarations }],
          },
        });

        if (response.usageMetadata) {
          welcomeTokensIn += response.usageMetadata.promptTokenCount || 0;
          welcomeTokensOut += response.usageMetadata.candidatesTokenCount || 0;
        }

        const candidate = response.candidates?.[0];
        if (!candidate?.content?.parts) {
          // Retry on empty response (transient Gemini Pro issue)
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

        // Process tool calls (same pattern as main loop)
        const toolResponseParts: any[] = [];
        for (const fc of functionCalls) {
          const call = fc.functionCall!;
          const toolResult = await dispatchTool(call.name!, toolCtx, call.args || {});
          welcomeToolCalls.push({ name: call.name!, arguments: call.args || {}, result: toolResult });
          toolResponseParts.push({
            functionResponse: { name: call.name!, response: toolResult },
          });
        }
        totalToolCallCount += functionCalls.length;

        currentContents = [
          ...currentContents,
          { role: 'model', parts: candidate.content.parts },
          { role: 'user', parts: toolResponseParts },
        ];
      }

      totalTokensIn += welcomeTokensIn;
      totalTokensOut += welcomeTokensOut;

      onProgress?.({
        type: 'agent_message',
        round: 0,
        maxRounds: scenario.max_rounds,
        content: welcomeReply,
        toolCalls: welcomeToolCalls,
      });

      // Seed synthetic user history with the agent's welcome
      userHistory = [
        { role: 'user', parts: [{ text: `The assistant greeted you: "${welcomeReply}"` }] },
      ];

      // Record the welcome as round 0 in transcript
      transcript.push({
        round: 0,
        user_msg: '',
        agent_msg: welcomeReply,
        tool_calls: welcomeToolCalls,
        horizon_snapshot: null as any,
        tokens_in: welcomeTokensIn,
        tokens_out: welcomeTokensOut,
        latency_ms: 0,
      });
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
        const userResponse = await genai.models.generateContent({
          model: scenario.user_model,
          contents: userHistory,
          config: {
            systemInstruction: syntheticUserPrompt,
            temperature: 0.9,
          },
        });
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

        const response = await genai.models.generateContent({
          model: scenario.agent_model,
          contents: currentContents,
          config: {
            systemInstruction: agentSystemPrompt,
            temperature: agentTemperature,
            tools: [{ functionDeclarations: toolDeclarations }],
          },
        });

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

          const result = await dispatchTool(toolName, toolCtx, toolArgs);
          roundToolCalls.push({ name: toolName, arguments: toolArgs, result: result.data ?? result.error });
          toolResponses.push({
            functionResponse: { name: toolName, response: result },
          });

          // Fire tool_call event (toolDispatch fires traversal/variable/goal events internally)
          logEvent(sessionId, 'tool_call', toolName, {
            args: toolArgs,
            result_summary: typeof result.data === 'object'
              ? Object.keys(result.data || {}).join(', ')
              : String(result.error || 'ok'),
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

      // Record round
      const roundData: TranscriptRound = {
        round,
        user_msg: userMessage,
        agent_msg: agentReply,
        tool_calls: roundToolCalls,
        horizon_snapshot: horizon as any,
        tokens_in: roundTokensIn,
        tokens_out: roundTokensOut,
        latency_ms: roundLatency,
      };
      transcript.push(roundData);

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

      // Fire assistant_message event
      logEvent(sessionId, 'assistant_message', 'content', {
        text: agentReply.slice(0, 500),
        tokens_in: roundTokensIn,
        tokens_out: roundTokensOut,
        model: scenario.agent_model,
        latency_ms: roundLatency,
        tool_call_count: roundToolCalls.length,
        round,
      });

      totalTokensIn += roundTokensIn;
      totalTokensOut += roundTokensOut;
      totalLatency += roundLatency;
      totalToolCallCount += roundToolCalls.length;

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

      let goalStatus: string | null = null;
      if (scenario.stop_on_goal_id && projectMode === 'guided') {
        const sg = await queryOne<{ status: string }>(
          'SELECT status FROM mcp_session_goals WHERE session_id = $1 AND goal_id = $2',
          [sessionId, scenario.stop_on_goal_id]
        );
        goalStatus = sg?.status || null;
      }

      const termCheck = checkTermination({
        round,
        maxRounds: scenario.max_rounds,
        completionPct: horizon.completion.percentage,
        projectMode,
        stopOnCompletionPct: scenario.stop_on_completion_pct,
        stopOnGoalId: scenario.stop_on_goal_id,
        goalStatus,
        stopOnSessionEnd: scenario.stop_on_session_end,
        agentTriggeredEnd,
      });

      if (termCheck.stop) {
        stopReason = termCheck.reason;
        break;
      }

      // Update run progress in DB periodically
      if (round % 5 === 0 || round === scenario.max_rounds) {
        await query(
          `UPDATE test_runs SET rounds_completed = $1, completion_pct = $2,
           total_tokens_in = $3, total_tokens_out = $4, total_latency_ms = $5,
           tool_call_count = $6 WHERE id = $7`,
          [round, horizon.completion.percentage, totalTokensIn, totalTokensOut,
           totalLatency, totalToolCallCount, runId]
        );
      }
    }

    // ── Post-run: Get final horizon and compute results ──
    const finalHorizon = await mcpRepo.getSessionHorizon(sessionId);
    const completionPct = finalHorizon.completion.percentage;

    // Compute coverage gaps from session variables
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

    const score = computeScore(transcript, completionPct, projectMode, propertiesCollected, coverageGaps);

    // ── Post-run: Synthetic NPS + Sentiment ──
    let syntheticNps: number | null = null;
    let userSentiment: string | null = null;

    try {
      const npsResponse = await genai.models.generateContent({
        model: scenario.user_model,
        contents: [
          ...userHistory,
          {
            role: 'user',
            parts: [{
              text: `The conversation is now over. Based on your experience:
1. On a scale of 0-10, how likely would you recommend this assistant to a friend? Respond with just the number.
2. In exactly 2 sentences, describe how the experience felt from your perspective as a user.

Format your response as:
NPS: [number]
SENTIMENT: [2 sentences]`
            }],
          },
        ],
        config: {
          systemInstruction: syntheticUserPrompt,
          temperature: 0.5,
        },
      });

      const npsText = npsResponse.candidates?.[0]?.content?.parts
        ?.filter((p: any) => p.text)
        .map((p: any) => p.text)
        .join('') || '';

      const npsMatch = npsText.match(/NPS:\s*(\d+)/i);
      if (npsMatch) syntheticNps = Math.min(10, Math.max(0, parseInt(npsMatch[1])));

      const sentMatch = npsText.match(/SENTIMENT:\s*(.+)/is);
      if (sentMatch) userSentiment = sentMatch[1].trim().slice(0, 500);
    } catch (err) {
      logger.warn('Failed to generate NPS/sentiment', { error: (err as Error).message });
    }

    // Determine pass/fail
    const passed = projectMode === 'explore'
      ? true // explore has no completion metric
      : completionPct >= (scenario.min_completion_pct || 0);

    // Fire NPS/sentiment events
    if (syntheticNps !== null) {
      logEvent(sessionId, 'nps_score', 'synthetic', {
        score: syntheticNps,
        sentiment: userSentiment,
      });
    }

    // Store NPS/sentiment in session metadata
    await mcpRepo.updateSessionMetadata(sessionId, {
      synthetic_nps: syntheticNps,
      user_sentiment: userSentiment,
      scenario_name: scenario.name,
    });

    // Fire session_end event
    logEvent(sessionId, 'session_end', stopReason || 'max_rounds', {
      stop_reason: stopReason,
      completion_pct: completionPct,
      rounds: transcript.length,
      tokens_in: totalTokensIn,
      tokens_out: totalTokensOut,
      nps: syntheticNps,
    });

    // Fire test-specific events — all test data as session entries
    logEvents(sessionId, [
      {
        actionType: 'test_score' as any,
        key: 'score',
        value: score,
      },
      {
        actionType: 'test_result' as any,
        key: passed ? 'passed' : 'failed',
        value: {
          passed,
          completion_pct: completionPct,
          min_completion_pct: scenario.min_completion_pct,
          stop_reason: stopReason,
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

    // ── Save final results (no transcript column) ──
    await query(
      `UPDATE test_runs SET
        status = 'completed', stop_reason = $1, rounds_completed = $2,
        completion_pct = $3, total_tokens_in = $4, total_tokens_out = $5,
        total_latency_ms = $6, tool_call_count = $7,
        properties_collected = $8::jsonb, coverage_gaps = $9::jsonb,
        score = $10::jsonb, synthetic_nps = $11, user_sentiment = $12,
        passed = $13, finished_at = NOW()
      WHERE id = $14`,
      [
        stopReason, transcript.length, completionPct,
        totalTokensIn, totalTokensOut, totalLatency, totalToolCallCount,
        JSON.stringify(propertiesCollected), JSON.stringify(coverageGaps),
        JSON.stringify(score), syntheticNps, userSentiment,
        passed, runId,
      ]
    );

    onProgress?.({
      type: 'run_complete',
      score,
      nps: syntheticNps ?? undefined,
      sentiment: userSentiment ?? undefined,
      passed,
      stopReason: stopReason ?? undefined,
    });

    logger.info('test.run.completed', {
      runId,
      sessionId,
      scenarioName: scenario.name,
      projectId,
      rounds: transcript.length,
      completionPct,
      passed,
      stopReason,
      syntheticNps,
      totalTokensIn,
      totalTokensOut,
      totalLatencyMs: totalLatency,
      toolCallCount: totalToolCallCount,
      propertiesCollected: Object.keys(propertiesCollected).length,
      coverageGaps: coverageGaps.length,
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

  const transcript = typeof run.transcript === 'string'
    ? JSON.parse(run.transcript)
    : run.transcript;

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
${JSON.stringify(dictionary.nord_types.map((t: any) => ({
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
${transcript.map((r: any) =>
  `Round ${r.round}:\n  User: ${r.user_msg}\n  Agent: ${r.agent_msg}\n  Tools: ${r.tool_calls.map((tc: any) => tc.name).join(', ') || 'none'}`
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
