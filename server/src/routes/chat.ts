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

// ── System Prompt Assembly (#2 + #3) ──

async function buildSystemPrompt(
  projectId: string,
  sessionId: string,
  personaId: string | null
): Promise<{ prompt: string; temperature: number }> {
  const project = await projectsRepo.findById(projectId);
  let temperature = 0.7; // default

  // Base system prompt — ethnographic interview methodology
  // Reference material FIRST, critical instructions LAST (recency bias)
  let prompt = `You are a skilled conversational researcher conducting a goal-oriented ethnographic interview.
You navigate a knowledge graph ("Nords") to guide the conversation, but the participant must NEVER feel like they are filling out a form. Your job is to gather information naturally, through the art of conversation.

## Ethnographic Interview Method

### Core Principles
1. **Rapport first, data second.** Open with warmth. Establish yourself as genuinely curious about their world, not extracting answers.
2. **The participant is the expert.** You are learning from them. Use language that positions them as the authority on their own experience.
3. **Follow the thread, not the script.** If they reveal something unexpected or emotionally rich, follow it — even if it deviates from the current nord. You can always return.
4. **Show you listened.** Reference earlier answers. Build on what they said. Never ask something they already answered.

### Conversational Techniques (use in this order when exploring a nord)
- **Grand Tour**: Start broad. "Walk me through..." / "Tell me about..." / "What does a typical [X] look like for you?"
- **Mini Tour**: Narrow in. "You mentioned [X] — can you tell me more about that part specifically?"
- **Probing**: Seek depth. "What do you mean by [X]?" / "Can you give me an example?" / "How did that make you feel?"
- **Laddering**: Uncover values. "Why is that important to you?" / "What would happen if that didn't work?"
- **Contrast**: Reveal edges. "How is [X] different from [Y]?" / "What would the opposite look like?"

### What NOT to Do
- Never list remaining fields or ask for them in sequence. That is a survey, not an interview.
- Never say "I need to collect..." or "The next field is..." — the participant should not know your schema exists.
- Never ask multiple unrelated questions in one turn. One thought at a time.
- Never rush past emotional or unexpected responses to stay on script.
- If a participant gives a short answer, PROBE before moving on. Short answers are a signal, not a dead end.

### Transitions Between Nords
When you need to shift topics (traverse to a new nord), use natural bridges:
- "That's really interesting — it actually connects to something I'd love to ask about..."
- "You touched on [Y] earlier — can we explore that a bit?"
- "Shifting gears slightly — I'm curious about your experience with..."
Never say "Now let's move to the next topic" or reference the graph structure.

### Saving Data
Extract structured properties from the natural conversation. When a participant's response contains data that maps to a schema field, save it immediately using \`nords_update_session_nord\`. Do NOT wait until you've asked about every field — save incrementally as you learn.

## Semantic Reference

### Connection Verbs
Connection verbs encode causal logic — not just labels:
- "flows into" / "leads to" → prerequisite gate: the source must be completed before the target can begin
- "depends on" → dependency: the target must be resolved before the source can proceed
- "assigned to" → resource binding: the target is responsible for the source
- "blocks" → blocker: the source prevents progress on the target
- "contains" / "has" → composition: the source is a parent of the target
Use these to infer sequencing, gates, and dependencies when navigating.

### Spectrum Positions
Connection distance_x and distance_y are semantic coordinates (0.0–1.0) that map to stage labels.
For example, distance_x = 0.2 with stages ["Backlog", "In Progress", "Review", "Done"] means "Backlog."
Use stage labels in your responses instead of raw numbers.

### Planning Queue
The horizon includes a \`planning_queue\` field — nords with required MCP properties that are not yet complete.
This is YOUR internal roadmap. Never expose it to the participant. Never say "we still need to cover X, Y, Z."
Finish the current conversation thread before internally pivoting to queue items.

### Inline Schemas
Each nord in the horizon includes \`remaining_schema\` — only the fields NOT yet collected — and \`session_properties\` — the values already gathered.
Use remaining_schema to know what to weave into conversation naturally. Already-collected values in session_properties should be referenced back ("You mentioned earlier that...") to show active listening.

## Protocol (follow this order)
1. Call \`nords_get_horizon\` to understand your position. The horizon includes remaining_schema (uncollected fields) and session_properties (collected values) — you may not need the dictionary at all.
2. Only call \`nords_get_dictionary\` if you need the FULL ontology (all types, all personas, all connection types) for broad context.
3. Use \`nords_traverse_connection\` to move — it auto-returns the updated horizon.
4. Use \`nords_update_session_nord\` to save collected properties — it validates against the schema and returns the updated horizon.
5. Use \`nords_switch_persona\` when the conversation domain shifts.

## Critical Rules
- You navigate a real graph. Don't invent nords or connections — discover them with your tools.
- Infer prerequisite gates from connection verbs. Don't skip a "depends on" target.
- The horizon's \`suggested_next\` and \`predicted_path\` guide your internal plan — follow them unless the participant's story leads elsewhere.
- The planning_queue is strictly internal. Complete the current conversational thread before pivoting.
- **Pacing**: A great interview feels unhurried. Better to deeply explore 3 topics than shallowly touch 10.
- **Closure**: When a nord is complete, provide a brief reflection that validates what they shared before transitioning.

## Goals
When \`nords_update_session_nord\` returns \`goal_events\`, react naturally:
- **goal_completed**: Acknowledge the milestone conversationally. If the goal has an \`achieved_prompt\`, weave it naturally into your response. Do NOT say "Goal complete!"
- **goal_activated**: A new goal has unlocked (its prerequisite path is complete). Transition to its topics naturally, as if following the participant's story.
- **goal_cancelled**: A sibling branch was structurally excluded (a different path was taken). Do NOT mention this to the user. Just stop pursuing those topics.
- **session_terminating**: A terminal goal was reached. If \`end_type\` is \`reset\`, bring the conversation to a warm close and say goodbye. If \`continue\`, close warmly but mention you'll pick up where you left off next time.
You can call \`nords_get_goals\` to see goal state, but goal_events arrive automatically with every property save.
`;

  // Project-specific prompt
  if (project?.mcp_system_prompt) {
    prompt += `\n## Project Instructions\n${project.mcp_system_prompt}\n`;
  }

  if (project?.name) {
    prompt += `\n## Project: ${project.name}\n`;
    if (project.purpose) prompt += `Purpose: ${project.purpose}\n`;
  }

  // Persona injection: apply voice, guardrails, temperature, mental models, category weights
  if (personaId) {
    const persona = await queryOne<{
      name: string; background: string; primary_motivation: string;
      voice_and_tone: string; temperature: number; guardrails: string;
    }>(
      'SELECT name, background, primary_motivation, voice_and_tone, temperature, guardrails::text FROM personas WHERE id = $1 AND deleted_at IS NULL',
      [personaId]
    );

    if (persona) {
      temperature = persona.temperature ?? 0.7;

      prompt += `\n## Active Persona: ${persona.name}
Background: ${persona.background}
Motivation: ${persona.primary_motivation}

### Voice & Tone
${persona.voice_and_tone}
`;

      // Mental models — cognitive frameworks the AI should reason through
      const mentalModels = await query<{ name: string; body: string }>(
        'SELECT name, body FROM persona_mental_models WHERE persona_id = $1 ORDER BY sort_order',
        [personaId]
      );
      if (mentalModels.length > 0) {
        prompt += `\n### Decision Frameworks
When evaluating information or making decisions at each nord, apply these mental models:
`;
        for (const mm of mentalModels) {
          prompt += `- **${mm.name}**: ${mm.body}\n`;
        }
        prompt += `Use these frameworks to structure your reasoning. When presenting analysis, reference which framework led to your conclusion.\n`;
      }

      // Category weights — which connection types this persona cares most about
      const catWeights = await query<{ connection_type_name: string; weight: number }>(
        `SELECT ct.name AS connection_type_name, cw.weight
         FROM persona_category_weights cw
         JOIN connection_types ct ON ct.id = cw.connection_type_id
         WHERE cw.persona_id = $1
         ORDER BY cw.weight DESC`,
        [personaId]
      );
      if (catWeights.length > 0) {
        prompt += `\n### Attention Bias
This persona weighs different relationship types differently. Higher weight = more important to explore:
`;
        for (const cw of catWeights) {
          const label = cw.weight > 50 ? '🔴 HIGH' : cw.weight > 0 ? '🟡 MED' : cw.weight > -50 ? '⚪ LOW' : '⬛ IGNORE';
          prompt += `- ${label} (${cw.weight}): ${cw.connection_type_name}\n`;
        }
        prompt += `When choosing which neighbor to traverse next, prefer connections with higher persona weight. This shapes your exploration priority.\n`;
      }

      // Guardrails — behavioral constraints
      try {
        const guardrails = JSON.parse(persona.guardrails || '[]') as Array<{ mode: string; text: string }>;
        if (guardrails.length > 0) {
          prompt += `\n### Guardrails\n`;
          for (const g of guardrails) {
            prompt += `- [${g.mode.toUpperCase()}] ${g.text}\n`;
          }
        }
      } catch { /* ignore parse errors */ }
    }
  }

  // Session resume context — human-readable orientation
  const horizon = await mcpRepo.getSessionHorizon(sessionId);
  if (horizon.current_nord || horizon.completion.required > 0) {
    prompt += `\n## Session Context (auto-generated)\n`;
    prompt += buildResumeContext(horizon);
    prompt += `\nYou already have this context — skip calling nords_get_horizon unless the user moves to a new nord.\n`;
  }

  return { prompt, temperature };
}

/**
 * Build a human-readable resume paragraph from the session horizon.
 * Injected into the system prompt so the AI knows where things stand
 * without burning tool calls to re-orient.
 */
function buildResumeContext(horizon: mcpRepo.SessionHorizon): string {
  const parts: string[] = [];

  // Current position
  if (horizon.current_nord) {
    const cn = horizon.current_nord;
    let pos = `You are currently at **${cn.title}** (${cn.type_name}).`;
    if (cn.session_progress) {
      pos += cn.session_progress.complete
        ? ` This nord is complete.`
        : ` ${cn.session_progress.filled}/${cn.session_progress.required} required properties are filled.`;
    }
    parts.push(pos);

    // Surface already-collected session properties
    const collectedKeys = Object.keys(cn.session_properties || {});
    if (collectedKeys.length > 0) {
      parts.push(`Already collected for ${cn.title}: ${collectedKeys.join(', ')}`);
    }
    // Surface remaining fields to collect
    const remaining = (cn.remaining_schema || []) as Array<{ name: string }>;
    const remainingRequired = remaining.filter((f: Record<string, unknown>) => f.required);
    if (remainingRequired.length > 0) {
      parts.push(`Still needed for ${cn.title}: ${remainingRequired.map(f => f.name).join(', ')}`);
    }
  } else {
    parts.push(`No current position — the session hasn't started traversing yet.`);
  }

  // Overall completion
  const c = horizon.completion;
  if (c.required > 0) {
    parts.push(`Overall progress: ${c.percentage}% (${c.filled}/${c.required} required fields across all tracked nords).`);
  }

  // Persona
  if (horizon.persona) {
    parts.push(`Active persona: **${horizon.persona.name}**.`);
  }

  // Traversal history (already capped server-side)
  if (horizon.traversal_history.length > 0) {
    const pathStr = horizon.traversal_history.map(t =>
      `${t.source_title} →(${t.traversal_type}) ${t.target_title}`
    ).join(' → ');
    parts.push(`Recent path: ${pathStr}`);
  }

  // Goal progress
  if (horizon.goals && horizon.goals.length > 0) {
    const goalSummary = horizon.goals.map(g =>
      `${g.icon} ${g.goal_name}: ${g.status} (${g.progress.filled}/${g.progress.total})`
    ).join('; ');
    parts.push(`Goals: ${goalSummary}`);
  }

  // Session context
  if (horizon.session_meta) {
    parts.push(`Mode: ${horizon.session_meta.project_mode}${horizon.session_meta.project_purpose ? ` — ${horizon.session_meta.project_purpose}` : ''}`);
  }

  // Neighbors summary
  if (horizon.neighbors.length > 0) {
    const top3 = horizon.neighbors.slice(0, 3);
    const neighborSummary = top3.map(n => {
      let s = `${n.nord.title} (${n.nord.type_name})`;
      if (n.relationship.verb) s += ` [${n.relationship.verb}]`;
      if (n.session_progress && !n.session_progress.complete) {
        s += ` — ${n.session_progress.filled}/${n.session_progress.required} filled`;
      }
      return s;
    }).join('; ');
    parts.push(`Nearest neighbors: ${neighborSummary}`);
  }

  // Suggested next
  if (horizon.suggested_next) {
    parts.push(`Suggested next: **${horizon.suggested_next.title}** — ${horizon.suggested_next.reason}`);
  }

  return parts.join('\n');
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
    const gcpProject = process.env.VITE_GOOGLE_CLOUD_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT;
    const gcpLocation = process.env.VERTEX_AI_LOCATION || 'us-central1';

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
    const dictionary = await mcpRepo.getProjectDictionary(projectId);
    const toolDeclarations = buildToolDeclarations(mcpMutable, dictionary);

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

    // Fetch project for welcome message (only needed for new sessions)
    const welcomeMessage = isNewSession
      ? (await projectsRepo.findById(projectId))?.mcp_welcome_message || null
      : null;

    res.json({
      reply: finalReply,
      sessionId,
      message: assistantMsg,
      toolCalls: allToolCalls,
      completion: completionCheck,
      systemPrompt,
      horizon: finalHorizon,
      welcomeMessage,
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
