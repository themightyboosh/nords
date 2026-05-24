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
  transcript: TranscriptRound[];
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

// ── Behavioral Profile Prompts ──

const PROFILE_INSTRUCTIONS: Record<string, string> = {
  cooperative:
    'You are helpful and direct. Answer questions clearly. Stay on topic. Provide the information asked for.',
  tangential:
    "You tend to go off on tangents. When asked a question, give the answer but bury it in a longer story. Mention related topics. The AI should work to extract the key data.",
  reluctant:
    "You're not very forthcoming. Give short, vague answers. Say 'I'm not sure' sometimes. The AI needs to probe and ask follow-up questions to get real answers from you.",
  adversarial:
    "You sometimes contradict yourself. You challenge what the AI says. You push back on questions. You might change your answer if asked twice.",
  rushed:
    "You're in a hurry. Give the minimum possible answer. Ask 'are we almost done?' frequently. Skip details unless pressed.",
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
  onProgress?: (progress: RunProgress) => void
): Promise<void> {
  const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  const projectId = scenario.project_id;

  try {
    // 1. Fetch project metadata
    const project = await projectsRepo.findById(projectId);
    if (!project) throw new Error(`Project ${projectId} not found`);

    const projectMode = project.project_mode || 'collect';
    const mcpCaptureData = projectMode !== 'explore';
    const mcpMutable = project.mcp_mutable ?? false;

    // 2. Create a fresh MCP session for this test
    const session = await mcpRepo.createSession(
      projectId,
      project.default_persona_id || null,
      project.default_start_nord_id || null
    );
    const sessionId = session.id;

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

    if (project.default_persona_id) {
      const persona = await queryOne<{ temperature: number }>(
        'SELECT temperature FROM personas WHERE id = $1 AND deleted_at IS NULL',
        [project.default_persona_id]
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
    const dictionary = await mcpRepo.getProjectDictionary(projectId);
    const toolDeclarations = buildToolDeclarations(mcpMutable, dictionary);

    // ── Conversation Loop ──
    const transcript: TranscriptRound[] = [];
    let agentHistory: any[] = [];   // Agent's conversation context
    let userHistory: any[] = [];    // Synthetic user's conversation context (text only)
    let totalTokensIn = 0;
    let totalTokensOut = 0;
    let totalLatency = 0;
    let totalToolCallCount = 0;
    let stopReason: string | null = null;

    for (let round = 1; round <= scenario.max_rounds; round++) {
      const roundStart = Date.now();

      // ── Step 1: Synthetic User generates a message ──
      let userMessage: string;
      if (round === 1) {
        // First round: user opens the conversation
        const userResponse = await genai.models.generateContent({
          model: scenario.user_model,
          contents: [{ role: 'user', parts: [{ text: 'Start the conversation now.' }] }],
          config: {
            systemInstruction: syntheticUserPrompt,
            temperature: 0.9,
          },
        });
        userMessage = userResponse.candidates?.[0]?.content?.parts
          ?.filter((p: any) => p.text)
          .map((p: any) => p.text)
          .join('') || 'Hi';
      } else {
        // Subsequent rounds: respond to agent's last message
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
        if (!candidate?.content?.parts) break;

        const functionCalls = candidate.content.parts.filter((p: any) => p.functionCall);

        if (functionCalls.length === 0) {
          agentReply = candidate.content.parts
            .filter((p: any) => p.text)
            .map((p: any) => p.text)
            .join('');
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
        }

        currentContents = [
          ...currentContents,
          { role: 'model', parts: functionCalls.map((p: any) => ({ functionCall: p.functionCall })) },
          { role: 'user', parts: toolResponses },
        ];
      }

      const roundLatency = Date.now() - roundStart;

      // ── Step 3: Update synthetic user history (text only — no tools/horizon) ──
      if (round === 1) {
        userHistory = [
          { role: 'user', parts: [{ text: 'Start the conversation now.' }] },
          { role: 'model', parts: [{ text: userMessage }] },
          { role: 'user', parts: [{ text: `The assistant replied: "${agentReply}"` }] },
        ];
      } else {
        userHistory.push(
          { role: 'model', parts: [{ text: userMessage }] },
          { role: 'user', parts: [{ text: `The assistant replied: "${agentReply}"` }] },
        );
      }

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
        (tc.result as any).goal_events.some((e: any) => e.event === 'session_terminating')
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
           tool_call_count = $6, transcript = $7::jsonb WHERE id = $8`,
          [round, horizon.completion.percentage, totalTokensIn, totalTokensOut,
           totalLatency, totalToolCallCount, JSON.stringify(transcript), runId]
        );
      }
    }

    // ── Post-run: Get final horizon and compute results ──
    const finalHorizon = await mcpRepo.getSessionHorizon(sessionId);
    const completionPct = finalHorizon.completion.percentage;

    // Compute coverage gaps
    const sessionNords = await query<{
      nord_id: string; properties: string; required_count: number; filled_count: number;
    }>(
      'SELECT nord_id, properties::text, required_count, filled_count FROM mcp_session_nords WHERE session_id = $1',
      [sessionId]
    );

    const propertiesCollected: Record<string, unknown> = {};
    const coverageGaps: Array<{ nord_id: string; field: string }> = [];

    for (const sn of sessionNords) {
      const props = typeof sn.properties === 'string' ? JSON.parse(sn.properties) : sn.properties;
      for (const [key, value] of Object.entries(props || {})) {
        if (value != null && value !== '') {
          propertiesCollected[`${sn.nord_id}:${key}`] = value;
        }
      }
      // Find unfilled required fields
      // (we'd need the schema to know which are required — simplified for now)
      if (sn.filled_count < sn.required_count) {
        coverageGaps.push({ nord_id: sn.nord_id, field: `${sn.required_count - sn.filled_count} unfilled` });
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

    // ── Save final results ──
    await query(
      `UPDATE test_runs SET
        status = 'completed', stop_reason = $1, rounds_completed = $2,
        completion_pct = $3, total_tokens_in = $4, total_tokens_out = $5,
        total_latency_ms = $6, tool_call_count = $7,
        properties_collected = $8::jsonb, coverage_gaps = $9::jsonb,
        score = $10::jsonb, synthetic_nps = $11, user_sentiment = $12,
        passed = $13, transcript = $14::jsonb, finished_at = NOW()
      WHERE id = $15`,
      [
        stopReason, transcript.length, completionPct,
        totalTokensIn, totalTokensOut, totalLatency, totalToolCallCount,
        JSON.stringify(propertiesCollected), JSON.stringify(coverageGaps),
        JSON.stringify(score), syntheticNps, userSentiment,
        passed, JSON.stringify(transcript), runId,
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
  const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

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

  const critiquePrompt = `You are a senior product engineer reviewing a test run of an AI agent.

## Project Configuration
- Name: ${project?.name}
- Mode: ${project?.project_mode}
- System Instructions: ${project?.mcp_system_prompt?.slice(0, 2000) || 'None'}

## Schema (Nord Types and Properties)
${JSON.stringify(dictionary.nord_types.map(t => ({
  name: t.name,
  properties: t.properties_schema,
})), null, 2).slice(0, 3000)}

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
Analyze this test run and produce actionable suggestions. For each suggestion, categorize it and rate severity.

Respond in this exact JSON format:
{
  "summary": "2-3 sentence overall assessment",
  "suggestions": [
    {
      "category": "schema|persona|prompt|graph|efficiency",
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
