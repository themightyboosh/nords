/**
 * toolDispatch.ts — Maps MCP tool names to their backend implementations.
 *
 * Each tool takes a sessionId, projectId, and arguments object,
 * then calls the appropriate repository function and returns the result.
 * This is the single routing table for all 18 MCP tools.
 */

import * as mcpRepo from '../repositories/mcpSessions.js';
import * as projectsRepo from '../repositories/projects.js';
import * as goalsRepo from '../repositories/goals.js';
import { nordTypesRepo, connectionTypesRepo } from '../repositories/types.js';
import { queryOne, query } from '../db.js';
import logger from './logger.js';


export interface ToolContext {
  sessionId: string;
  projectId: string;
  mcpMutable: boolean;
  mcpCaptureData: boolean;
}

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

type ToolHandler = (ctx: ToolContext, args: Record<string, unknown>) => Promise<ToolResult>;

// ── Protocol Builder ──
// This generates the behavioral guidance block embedded in nords_get_briefing.
// Any MCP client (built-in Gemini, Claude, GPT, etc.) receives this protocol
// in the tool response — no system prompt needed.

function buildProtocol(
  project: { name?: string | null; purpose?: string | null; mcp_system_prompt?: string | null; mcp_welcome_message?: string | null; project_mode?: string | null } | null,
  horizon: mcpRepo.SessionHorizon,
  welcomeOverride?: string | null,
): Record<string, unknown> {
  const mode = project?.project_mode || 'collect';

  // Mode-specific behavioral guidance
  const modeOverview: Record<string, string> = {
    explore: 'You navigate a knowledge graph via MCP tools. Your role is to guide and discuss — help the user explore their project, understand relationships, and discover insights. Follow the user\'s curiosity. Do NOT push data collection unless the user volunteers information.',
    collect: 'You navigate a knowledge graph via MCP tools. Nords drive the conversation — each nord IS a topic, and its connections to neighbors (weighted by your persona) tell you what to explore next. Your job is to discuss what you find at each nord naturally while gathering information through conversation. When the user provides information that matches a collection variable in remaining_variables, save it immediately with nords_update_session_variables. The participant should never feel like they are filling out a form.',
    guided: 'You navigate a knowledge graph via MCP tools. Nords drive the conversation — each nord IS a topic, and its connections to neighbors (weighted by your persona) tell you what to explore next. Connection verbs describe the RELATIONSHIP between topics. Your job is to discuss each nord conversationally, collecting information as it comes up. Goals exist in the background — you are lightly aware of them but they NEVER steer your navigation. When you land on a nord that happens to be goal-relevant (tagged in the planning_queue), you shift from conversational to assertive: probe deeper, follow up on vague answers, and don\'t leave until relevant collection variables are filled.',
  };

  const modeCollection: Record<string, Record<string, string>> = {
    explore: {
      remaining_variables: 'The remaining_variables in the horizon show uncollected collection variables. In explore mode, treat these as conversation topics you MAY discuss if the user is interested — not as a checklist to complete.',
      save_opportunistically: 'If the user naturally shares information that matches a collection variable, save it with nords_update_session_variables. But do NOT ask probing questions specifically to fill variables.',
      planning_queue: 'The planning_queue shows unvisited nords. Use it to suggest interesting areas to explore, but always follow the user\'s lead.',
      pacing: 'Let the user guide the pace. If they want to linger on a topic, stay there. If they want to move on, follow them.',
    },
    collect: {
      remaining_variables: 'The remaining_variables in the horizon show uncollected collection variables. Each has name, type, required, description, options (for select types), and tags. Use the description to understand what the variable captures, then ask about it conversationally — do NOT read a script. Save collected values immediately with nords_update_session_variables. Variables are sorted by priority — ask about earlier items first.',
      nords_as_context: 'Nords and their properties are your conversational context. The current nord\'s title, type, and properties tell you WHAT to discuss. Use them to frame your questions and understand what the user is working on — but do NOT try to edit or fill nord properties.',
      save_incrementally: 'Save values with nords_update_session_variables as soon as you learn them. Do NOT wait until all are gathered. This is the ONLY tool for saving collected data.',
      planning_queue: 'The planning_queue is YOUR internal roadmap. Never share it with the user. Never say "we still need to cover X, Y, Z." Complete the current conversational thread before pivoting to queue items.',
      pacing: 'Two-phase rhythm: (1) NAVIGATE by following persona-weighted connections and verbs — the graph tells you where to go. (2) COLLECT at each stop — actively drive the conversation to gather the collection variables relevant to the current context. Explore deeply before moving on. If a user gives a short answer, probe before moving on.',
    },
    guided: {
      remaining_variables: 'The remaining_variables show uncollected collection variables. At each stop, ask about variables whose descriptions relate to the current nord context — especially on goal-relevant nords. Read the description to understand what each variable means, then ask about it naturally. For select types, weave the options into your question.',
      nords_as_context: 'Nords are your conversational anchor. Their properties give you domain context. On a NON-goal-relevant nord: discuss it conversationally, use it as context for collection. On a GOAL-RELEVANT nord: this is where you push harder to collect variables.',
      save_incrementally: 'Save values with nords_update_session_variables as soon as you learn them. Goal completion is evaluated automatically after each save.',
      planning_queue: 'The planning_queue blends persona interest with goal relevance. Items tagged goal_relevant indicate where you have permission to push harder — but this is a COLLECTION signal, not a NAVIGATION signal. Follow persona weights and verbs to navigate, not goal tags. Never share the queue with the user.',
      pacing: 'Two-phase rhythm with intensity modulation:\n(1) NAVIGATE organically — persona weights and connection verbs determine where you go. Never skip a high-weight neighbor to chase a goal. The nords and their connections ARE the conversation.\n(2) COLLECT with variable intensity based on goal-relevance:\n  • NON-goal-relevant nord: Conversational. Discuss what you see, share observations, collect what the user offers. Light touch — if they don\'t want to go deeper, move on.\n  • GOAL-relevant nord: Assertive. You have PERMISSION to probe. Ask follow-up questions, push for specifics, don\'t accept vague answers. Stay until relevant collection variables are filled. This is where real progress happens.\nGoals are milestones you notice in the rearview mirror, not destinations on your GPS.',
    },
  };

  const modeRules: Record<string, string[]> = {
    explore: [
      'You navigate a real graph. Don\'t invent nords or connections — discover them with your tools.',
      'Never reference the graph structure, nords, schemas, or tools to the user.',
      'Follow the user\'s interests. Suggest related topics from the graph but never force a direction.',
      'If the user shares useful information unprompted, save it — but don\'t interrogate.',
      'Summarize insights and connections you notice. Your value is in synthesis, not extraction.',
    ],
    collect: [
      'You navigate a real graph. Don\'t invent nords or connections — discover them with your tools.',
      'Infer prerequisite gates from connection verbs. Don\'t skip a "depends on" target.',
      'Never list remaining variables or ask for them in sequence. That is a survey, not an interview.',
      'Never reference the graph structure, nords, schemas, or tools to the user.',
      'Nord properties are read-only context. NEVER try to edit or fill them. Your ONLY save tool is nords_update_session_variables.',
      'When the current conversational thread is exhausted, provide a brief reflection that validates what the user shared before transitioning.',
    ],
    guided: [
      'You navigate a real graph. Don\'t invent nords or connections — discover them with your tools.',
      'Infer prerequisite gates from connection verbs. Don\'t skip a "depends on" target.',
      'Never list remaining variables or ask for them in sequence. That is a survey, not an interview.',
      'Never reference the graph structure, nords, schemas, goals, or tools to the user.',
      'Nord properties are read-only context. NEVER try to edit or fill them. Your ONLY save tool is nords_update_session_variables.',
      'When the current conversational thread is exhausted, provide a brief reflection that validates what the user shared before transitioning.',
      'Goals complete as a natural consequence of thorough exploration. When goal_events appear in tool responses, acknowledge the milestone — but do NOT change your navigation to chase goals.',
      'The user can also steer — if they ask about a topic that maps to a distant nord, jump there. User interest always overrides persona weight.',
    ],
  };

  // Build data_collection section — explicit instructions for saving data
  const dataCollection = mode === 'explore' ? null : {
    obligation: 'You MUST save data when the user provides it. Talking about information without saving it does NOTHING for session progress. Your completion percentage only increases when you call nords_update_session_variables.',
    how_to_save: 'When the user answers a question that matches a collection variable in remaining_variables, call nords_update_session_variables immediately with the variable_id and value. Each variable has a description field that explains what it means — use it to recognize matching answers. For select-type variables, the options array lists valid values.',
    save_immediately: 'Save EACH value as soon as you learn it. Do NOT batch multiple values. Do NOT wait until the end of a topic. Call nords_update_session_variables right after the user provides the information, before asking your next question.',
    variable_descriptions: 'Every collection variable includes a description field. Read it to understand what data to collect and how to ask about it conversationally. The description is your guide for turning a variable name into a natural question.',
    recognize_answers: 'The user will not say "the regulatory_pathway is 510(k)". They will say something like "we\'re going the 510(k) route". YOU must recognize this as a match to the variable and save it.',
    nord_properties_are_context: 'Nord properties (title, type, existing property values) are READ-ONLY reference data that helps you understand what the user is working on. They are the conversation\'s subject matter. NEVER try to edit them — they are design-time metadata.',
    goal_relevance_signal: 'When the current nord is tagged goal_relevant in the planning_queue, you shift gears from conversational to assertive. This is PERMISSION to push harder: probe for specifics, follow up on vague answers, ask clarifying questions, and do not move on until relevant collection variables are filled. You arrived here by following the graph organically — now make the most of it. Goal relevance is a collection intensity signal, never a navigation command.',
    non_goal_nords: 'When the current nord is NOT goal-relevant, be conversational. Discuss the topic, share observations about how it connects to what you\'ve explored so far, and collect any information the user naturally offers. Don\'t push — if the user gives a short answer, that\'s fine. The value here is in exploring the relationship topology, not extracting data.',
  };

  // ── Exchange Style (per-persona conversational posture) ──
  const exchangeStyleRules: Record<string, string> = {
    free_form: 'EXCHANGE STYLE: Free-form. Let the conversation flow naturally. You are aware of remaining_variables and goals — if the user volunteers information that matches a remaining variable description, SAVE it immediately with nords_update_session_variables. Gently steer if the conversation drifts far from anything useful. But do NOT actively push for answers or close every response with a collection question. The user leads, you capture opportunistically.',
    bi_directional: 'EXCHANGE STYLE: Bi-directional. After answering a user\'s question, always close with a question that targets a specific remaining_variable. Check the variable descriptions to find one related to the topic just discussed, then ask about it naturally. When the user answers, SAVE it immediately with nords_update_session_variables using the variable_id. Example flow: User asks "What\'s the difference between 510(k) and PMA?" → Answer thoroughly → Check remaining_variables for one about regulatory pathway → Ask "That distinction matters for your timeline — which pathway are you leaning toward?" → User says "510(k)" → Call nords_update_session_variables. Never answer a question and then go silent without a collection follow-up.',
    interrogate: 'EXCHANGE STYLE: Interrogate. Actively drive the conversation toward remaining_variables. Don\'t wait for the user to volunteer information — consult remaining_variables, pick the highest-priority unfilled one, and ask directly. When they answer, SAVE it immediately with nords_update_session_variables. Probe vague answers with follow-ups. If the user says "I\'m not sure," offer options or frameworks to help them decide. You are thorough and assertive. You still respect "skip" and "I don\'t know," but you push once before accepting.',
  };

  // Resolve persona exchange style — fall back to bi_directional
  const exchangeStyle = horizon.persona?.exchange_style || 'bi_directional';

  // ── Pacing Velocity ──
  const pacingHint = (horizon as any).pacing_hint;
  const pacingSuffix = pacingHint?.velocity === 'rushed'
    ? '\n\nPACING OVERRIDE: The user is moving quickly through the graph with minimal collection. Adapt: batch 2-3 related questions into a single turn. Prioritize required fields over optional ones. If they skip, acknowledge and move on — don\'t probe. Match their energy.'
    : pacingHint?.velocity === 'thorough'
    ? '\n\nPACING OVERRIDE: The user is engaging deeply and providing detailed answers. Adapt: ask one question at a time. Probe for nuance and depth. Offer to explore tangential connections. Don\'t rush — this is where quality data lives.'
    : '';

  return {
    overview: modeOverview[mode] || modeOverview.collect,
    project: {
      name: project?.name || null,
      purpose: project?.purpose || null,
      mode,
      instructions: project?.mcp_system_prompt || null,
    },
    welcome_message: (() => {
      const msg = welcomeOverride || project?.mcp_welcome_message;
      if (!msg) return 'On your first turn, greet the user warmly and start the conversation naturally.';
      return `On your FIRST response, say this VERBATIM as your opening message (do not paraphrase or summarize it):\n\n"${msg}"\n\nAfter delivering the welcome, wait for the user to respond before asking follow-up questions.`;
    })(),
    first_turn: 'On your FIRST turn, call ONLY nords_get_briefing. Read the protocol. Deliver the welcome_message exactly as instructed. Do NOT traverse, update, or call other tools on your first turn.',
    data_collection: dataCollection,
    exchange_style: mode !== 'explore' ? exchangeStyleRules[exchangeStyle] || exchangeStyleRules.bi_directional : exchangeStyleRules.free_form,
    navigation: {
      verbs: 'Connection verbs encode causality: "flows into" / "leads to" = prerequisite gate (source before target). "depends on" = dependency (target before source). "assigned to" = resource binding. "blocks" = blocker. "contains" / "has" = composition. Use verbs to infer sequencing.',
      stages: 'Connection distance_x/distance_y (0.0–1.0) map to stage labels. Use the label name in conversation (e.g., "In Progress"), never raw numbers.',
      suggested_next: 'The horizon\'s suggested_next is a ranked list of connected nords ordered by persona-weighted exploration score. Prefer items near the top, but let the conversation context sway your pick — the user\'s story matters more than raw score.',
      predicted_path: 'The predicted_path is a 2-hop lookahead. Use it for internal planning only.',
      context_refresh: 'The horizon includes context_hint.stale. When true, call nords_get_context before asking your next question — it has variable descriptions, connection schemas, and persona details you need. When false, you already have current context from the briefing or a previous context call.',
    },
    collection: modeCollection[mode] || modeCollection.collect,
    goal_events: {
      goal_completed: 'Acknowledge the milestone conversationally. If the goal has an achieved_prompt, weave it naturally into your response. Do NOT say "Goal complete!" or reference the goal system.',
      goal_activated: 'A new goal has unlocked (its prerequisites are met). You may notice its bound variables appearing in remaining_variables. Continue your current exploration — you\'ll encounter goal-relevant topics naturally as you traverse the graph. Do NOT redirect the conversation to chase the new goal.',
      goal_cancelled: 'A sibling branch was structurally excluded. Stop pursuing those topics silently. Do NOT mention this to the user.',
      session_terminating: 'A terminal goal was reached. If end_type is "reset", bring the conversation to a warm close and say goodbye. If "continue", close warmly but mention you\'ll pick up where you left off next time.',
    },
    error_recovery: {
      tool_error: 'If a tool returns success=false, handle it gracefully. Explain the situation naturally to the user if relevant, or silently try an alternative approach. Never show raw error messages or tool names.',
      invalid_variable: 'If nords_update_session_variables rejects a value, rephrase your question to help the user provide a valid format. For select types, remind them of the available options naturally.',
      dead_end: 'If no remaining collection variables relate to the current context and no unvisited neighbors exist, check the planning_queue for the next priority nord. Use nords_jump_to_nord to reposition yourself directly, or nords_traverse_connection if the target is a neighbor.',
      missing_data: 'If the user says "I don\'t know" or "skip that", respect it. Move to the next topic. Do NOT repeatedly ask for the same information.',
    },
    persona: horizon.persona
      ? (() => {
          const parts = [
            `You are operating as "${horizon.persona.name}".`,
            horizon.persona.primary_motivation ? `Your primary motivation: ${horizon.persona.primary_motivation}` : null,
            horizon.persona.voice_and_tone ? `Voice & tone: ${horizon.persona.voice_and_tone}` : null,
            'When choosing which neighbor to explore, prefer connections with higher persona weight.',
          ].filter(Boolean);

          // Surface guardrails as explicit behavioral rules
          if (horizon.persona.guardrails && horizon.persona.guardrails.length > 0) {
            parts.push('GUARDRAILS (you MUST follow these):');
            for (const g of horizon.persona.guardrails) {
              const prefix = g.mode === 'must' ? '✅ MUST' : g.mode === 'never' ? '🚫 NEVER' : g.mode === 'prefer' ? '⚡ PREFER' : g.mode.toUpperCase();
              parts.push(`  ${prefix}: ${g.text}`);
            }
          }

          // Surface mental models as decision frameworks
          if (horizon.persona.mental_models && horizon.persona.mental_models.length > 0) {
            parts.push('Mental models (use these as decision frameworks):');
            for (const m of horizon.persona.mental_models) {
              parts.push(`  • ${m.name}: ${m.body}`);
            }
          }

          return parts.join('\n');
        })()
      : null,
    pacing: pacingSuffix || null,
    rules: modeRules[mode] || modeRules.collect,
  };
}

// ── Tool Implementations ──

const tools: Record<string, ToolHandler> = {

  // ── Tier 1: Read-Only ──

  nords_get_dictionary: async (ctx) => {
    const data = await mcpRepo.getProjectDictionary(ctx.projectId);
    return { success: true, data };
  },

  nords_list_all: async (ctx) => {
    const nords = await query<{ id: string; title: string; type_name: string; description: string | null }>(
      `SELECT n.id, n.title, nt.name as type_name,
              LEFT(n.properties->>'description', 120) as description
       FROM nords n JOIN nord_types nt ON nt.id = n.type_id
       WHERE n.project_id = $1 AND n.deleted_at IS NULL
       ORDER BY nt.name, n.title`, [ctx.projectId]);
    return { success: true, data: { nords, count: nords.length } };
  },

  nords_get_graph: async (ctx, args) => {
    const maxDepth = Math.min(Number(args.max_depth) || 3, 5);

    // Load ALL nords and connections for the project (in-memory BFS is fine for <1000 nodes)
    const allNords = await query<{ id: string; title: string; type_name: string; type_id: string; properties: Record<string, unknown> }>(
      `SELECT n.id, n.title, nt.name as type_name, n.type_id, n.properties
       FROM nords n JOIN nord_types nt ON nt.id = n.type_id
       WHERE n.project_id = $1 AND n.deleted_at IS NULL
       ORDER BY n.title`, [ctx.projectId]);
    const allConnections = await query<{ id: string; source_nord_id: string; target_nord_id: string; type_name: string; direction: string; distance_x: number; distance_y: number }>(
      `SELECT c.id, c.source_nord_id, c.target_nord_id, ct.name as type_name, c.direction, c.distance_x, c.distance_y
       FROM connections c JOIN connection_types ct ON ct.id = c.type_id
       WHERE c.project_id = $1 AND c.deleted_at IS NULL`, [ctx.projectId]);

    const nordTypes = await nordTypesRepo.findByProject(ctx.projectId);
    const connTypes = await connectionTypesRepo.findByProject(ctx.projectId);

    // If the project is small enough, skip the BFS and return everything
    const FULL_GRAPH_THRESHOLD = 50;
    if (allNords.length <= FULL_GRAPH_THRESHOLD) {
      return { success: true, data: { nords: allNords, connections: allConnections, nord_types: nordTypes, connection_types: connTypes, scope: 'full' } };
    }

    // Try to scope the graph from the current session position
    const session = await mcpRepo.findActiveSession(ctx.projectId);
    const startNordId = (args.center_nord_id as string) || session?.current_nord_id;

    if (!startNordId) {
      // No position — return capped full graph
      const cappedNords = allNords.slice(0, 200);
      const cappedNordIds = new Set(cappedNords.map(n => n.id));
      const cappedConns = allConnections.filter(c => cappedNordIds.has(c.source_nord_id) && cappedNordIds.has(c.target_nord_id));
      return { success: true, data: { nords: cappedNords, connections: cappedConns, nord_types: nordTypes, connection_types: connTypes, scope: 'capped', total_nords: allNords.length } };
    }

    // BFS from startNordId, expanding outward max_depth hops
    const adjacency = new Map<string, string[]>();
    for (const c of allConnections) {
      if (!adjacency.has(c.source_nord_id)) adjacency.set(c.source_nord_id, []);
      if (!adjacency.has(c.target_nord_id)) adjacency.set(c.target_nord_id, []);
      adjacency.get(c.source_nord_id)!.push(c.target_nord_id);
      adjacency.get(c.target_nord_id)!.push(c.source_nord_id);
    }

    const visited = new Set<string>();
    const queue: Array<{ id: string; depth: number }> = [{ id: startNordId, depth: 0 }];
    visited.add(startNordId);

    while (queue.length > 0) {
      const { id, depth } = queue.shift()!;
      if (depth >= maxDepth) continue;
      for (const neighborId of (adjacency.get(id) || [])) {
        if (!visited.has(neighborId)) {
          visited.add(neighborId);
          queue.push({ id: neighborId, depth: depth + 1 });
        }
      }
    }

    const nords = allNords.filter(n => visited.has(n.id));
    const connections = allConnections.filter(c => visited.has(c.source_nord_id) && visited.has(c.target_nord_id));

    return {
      success: true,
      data: {
        nords, connections, nord_types: nordTypes, connection_types: connTypes,
        scope: 'neighborhood', center: startNordId, max_depth: maxDepth,
        total_nords: allNords.length,
      }
    };
  },

  nords_get_nord: async (_ctx, args) => {
    const nord = await queryOne('SELECT n.*, nt.name as type_name FROM nords n JOIN nord_types nt ON nt.id = n.type_id WHERE n.id = $1 AND n.deleted_at IS NULL', [args.nord_id]);
    if (!nord) return { success: false, error: `Nord ${args.nord_id} not found` };
    return { success: true, data: nord };
  },

  nords_query_nords: async (ctx, args) => {
    // Resolve type_name → type_id if type_name provided (preferred over raw UUID)
    let resolvedTypeId = args.type_id as string | undefined;
    if (args.type_name && !resolvedTypeId) {
      const types = await nordTypesRepo.findByProject(ctx.projectId);
      const match = types.find(t => t.name.toLowerCase() === (args.type_name as string).toLowerCase());
      if (match) resolvedTypeId = match.id;
    }

    let sql = 'SELECT n.*, nt.name as type_name FROM nords n JOIN nord_types nt ON nt.id = n.type_id WHERE n.project_id = $1 AND n.deleted_at IS NULL';
    const params: unknown[] = [ctx.projectId];
    let idx = 2;
    if (resolvedTypeId) { sql += ` AND n.type_id = $${idx++}`; params.push(resolvedTypeId); }
    if (args.title) { sql += ` AND n.title ILIKE $${idx++}`; params.push(`%${args.title}%`); }
    // Tool #1: Property-aware search — filter by JSON property name/value
    if (args.property_name) {
      const propName = args.property_name as string;
      if (args.property_value) {
        sql += ` AND n.properties->>$${idx++} ILIKE $${idx++}`;
        params.push(propName, `%${args.property_value}%`);
      } else {
        sql += ` AND n.properties ? $${idx++}`;
        params.push(propName);
      }
    }
    sql += ' ORDER BY n.title LIMIT 100';
    const nords = await query(sql, params);
    return { success: true, data: nords };
  },

  nords_get_connections: async (_ctx, args) => {
    const connections = await query(
      `SELECT c.*, ct.name as type_name,
              sn.title as source_title, tn.title as target_title
       FROM connections c
       JOIN connection_types ct ON ct.id = c.type_id
       JOIN nords sn ON sn.id = c.source_nord_id
       JOIN nords tn ON tn.id = c.target_nord_id
       WHERE (c.source_nord_id = $1 OR c.target_nord_id = $1)
         AND c.deleted_at IS NULL`,
      [args.nord_id]
    );
    return { success: true, data: connections };
  },

  nords_get_session_state: async (ctx) => {
    const session = await queryOne('SELECT * FROM mcp_sessions WHERE id = $1', [ctx.sessionId]);
    const variables = await query(
      'SELECT sv.*, pv.name FROM mcp_session_variables sv JOIN project_variables pv ON pv.id = sv.variable_id WHERE sv.session_id = $1',
      [ctx.sessionId]
    );
    const traversals = await mcpRepo.findTraversalsBySession(ctx.sessionId);
    return { success: true, data: { session, variables, traversals } };
  },

  nords_get_incomplete_nords: async (ctx) => {
    // DEPRECATED: This tool returns uncollected variables, not "incomplete nords".
    // Nords are design-time entities and are always complete.
    // Use remaining_variables in the horizon instead.
    const variables = await query(
      'SELECT sv.*, pv.name FROM mcp_session_variables sv JOIN project_variables pv ON pv.id = sv.variable_id WHERE sv.session_id = $1 AND sv.value IS NULL',
      [ctx.sessionId]
    );
    return { success: true, data: variables };
  },

  nords_get_horizon: async (ctx) => {
    const horizon = await mcpRepo.getSessionHorizonLean(ctx.sessionId);
    return { success: true, data: horizon };
  },

  nords_get_context: async (ctx) => {
    const context = await mcpRepo.getSessionContext(ctx.sessionId);
    return { success: true, data: context };
  },

  nords_get_goals: async (ctx) => {
    const goals = await goalsRepo.findSessionGoals(ctx.sessionId, ctx.projectId);
    return { success: true, data: goals };
  },

  nords_get_briefing: async (ctx) => {
    const [dictionary, fullHorizon, goals, project, context] = await Promise.all([
      mcpRepo.getProjectDictionary(ctx.projectId),
      mcpRepo.getSessionHorizon(ctx.sessionId),
      goalsRepo.findSessionGoals(ctx.sessionId, ctx.projectId),
      projectsRepo.findById(ctx.projectId),
      mcpRepo.getSessionContext(ctx.sessionId),
    ]);

    // De-duplicate: if the active persona is fully represented in horizon.persona,
    // strip it from dictionary.personas to save ~1000 tokens.
    const slimDictionary = { ...dictionary };
    if (fullHorizon.persona?.id && slimDictionary.personas) {
      slimDictionary.personas = slimDictionary.personas.filter(
        (p: { id: string }) => p.id !== fullHorizon.persona!.id
      );
    }

    // Briefing embeds full horizon + context so the LLM has everything on turn 1.
    // The lean horizon + context_hint pattern kicks in on subsequent turns.
    return {
      success: true,
      data: {
        dictionary: slimDictionary,
        horizon: fullHorizon,
        context,
        goals,
        protocol: buildProtocol(project, fullHorizon),
      },
    };
  },

  nords_get_analytics: async (ctx) => {
    const [sessionStats, traversalStats, nordVisitStats] = await Promise.all([
      queryOne<{ total: string; active: string; completed: string; abandoned: string }>(`
        SELECT
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE status = 'active') AS active,
          COUNT(*) FILTER (WHERE status = 'completed') AS completed,
          COUNT(*) FILTER (WHERE status = 'abandoned') AS abandoned
        FROM mcp_sessions WHERE project_id = $1
      `, [ctx.projectId]),
      queryOne<{ total: string; avg_per_session: string }>(`
        SELECT COUNT(*) AS total,
          ROUND(COUNT(*)::numeric / GREATEST(COUNT(DISTINCT session_id), 1), 1) AS avg_per_session
        FROM mcp_traversals t
        JOIN mcp_sessions s ON s.id = t.session_id
        WHERE s.project_id = $1
      `, [ctx.projectId]),
      query<{ nord_title: string; visit_count: string }>(`
        SELECT n.title AS nord_title, COUNT(*) AS visit_count
        FROM mcp_nord_visits v
        JOIN nords n ON n.id = v.nord_id
        JOIN mcp_sessions s ON s.id = v.session_id
        WHERE s.project_id = $1
        GROUP BY n.title ORDER BY visit_count DESC LIMIT 10
      `, [ctx.projectId]),
    ]);
    return {
      success: true,
      data: {
        sessions: sessionStats,
        traversals: traversalStats,
        top_visited_nords: nordVisitStats,
      },
    };
  },

  // ── Tool #2: Connection-Aware Query ──
  nords_get_connected: async (ctx, args) => {
    const nordId = args.nord_id as string;
    if (!nordId) return { success: false, error: 'nord_id is required' };

    let sql = `
      SELECT n.id, n.title, nt.name as type_name,
             LEFT(n.properties->>'description', 120) as description,
             c.id as connection_id, ct.name as connection_type, ct.verb,
             c.direction, c.distance_x, c.distance_y,
             CASE WHEN c.source_nord_id = $1 THEN 'outbound' ELSE 'inbound' END as relationship
      FROM connections c
      JOIN nords n ON n.id = CASE WHEN c.source_nord_id = $1 THEN c.target_nord_id ELSE c.source_nord_id END
      JOIN nord_types nt ON nt.id = n.type_id
      JOIN connection_types ct ON ct.id = c.type_id
      WHERE (c.source_nord_id = $1 OR c.target_nord_id = $1)
        AND c.deleted_at IS NULL AND n.deleted_at IS NULL`;
    const params: unknown[] = [nordId];
    if (args.connection_type_name) {
      sql += ` AND ct.name ILIKE $2`;
      params.push(`%${args.connection_type_name}%`);
    }
    sql += ' ORDER BY ct.name, n.title';
    const connected = await query(sql, params);
    return { success: true, data: { nord_id: nordId, connected, count: connected.length } };
  },

  // ── Tool #3: Full-Text Search ──
  nords_search: async (ctx, args) => {
    const searchQuery = args.query as string;
    if (!searchQuery) return { success: false, error: 'query is required' };

    // Try tsvector search first
    let results = await query<{ id: string; title: string; type_name: string; description: string | null; relevance: number }>(
      `SELECT n.id, n.title, nt.name as type_name,
              LEFT(n.properties->>'description', 120) as description,
              ts_rank(n.search_vector, plainto_tsquery('english', $2)) as relevance
       FROM nords n
       JOIN nord_types nt ON nt.id = n.type_id
       WHERE n.project_id = $1 AND n.deleted_at IS NULL
         AND n.search_vector @@ plainto_tsquery('english', $2)
       ORDER BY relevance DESC
       LIMIT 20`, [ctx.projectId, searchQuery]);

    // Fallback to ILIKE if tsvector returns nothing
    if (results.length === 0) {
      results = await query(
        `SELECT n.id, n.title, nt.name as type_name,
                LEFT(n.properties->>'description', 120) as description,
                1.0 as relevance
         FROM nords n
         JOIN nord_types nt ON nt.id = n.type_id
         WHERE n.project_id = $1 AND n.deleted_at IS NULL
           AND (n.title ILIKE $2 OR n.properties->>'description' ILIKE $2)
         ORDER BY n.title
         LIMIT 20`, [ctx.projectId, `%${searchQuery}%`]);
    }
    return { success: true, data: { query: searchQuery, results, count: results.length } };
  },

  // ── Tool #4: Batch Get ──
  nords_get_nords: async (ctx, args) => {
    const idsRaw = args.nord_ids as string;
    if (!idsRaw) return { success: false, error: 'nord_ids is required (comma-separated UUIDs)' };
    const ids = idsRaw.split(',').map(s => s.trim()).filter(Boolean).slice(0, 20);
    if (ids.length === 0) return { success: false, error: 'No valid IDs provided' };

    const nords = await query(
      `SELECT n.*, nt.name as type_name
       FROM nords n JOIN nord_types nt ON nt.id = n.type_id
       WHERE n.id = ANY($1) AND n.deleted_at IS NULL`,
      [ids]);
    return { success: true, data: { nords, count: nords.length } };
  },

  // ── Tool #5: Aggregate Snapshots ──
  nords_get_summary: async (ctx, args) => {
    const groupByProperty = args.group_by_property as string | undefined;

    const typeCounts = await query<{ type_name: string; count: string }>(
      `SELECT nt.name as type_name, COUNT(*) as count
       FROM nords n JOIN nord_types nt ON nt.id = n.type_id
       WHERE n.project_id = $1 AND n.deleted_at IS NULL
       GROUP BY nt.name ORDER BY count DESC`, [ctx.projectId]);

    let propertyBreakdown = null;
    if (groupByProperty) {
      propertyBreakdown = await query<{ type_name: string; property_value: string; count: string }>(
        `SELECT nt.name as type_name, COALESCE(n.properties->>$2, '(unset)') as property_value, COUNT(*) as count
         FROM nords n JOIN nord_types nt ON nt.id = n.type_id
         WHERE n.project_id = $1 AND n.deleted_at IS NULL
         GROUP BY nt.name, property_value ORDER BY count DESC`, [ctx.projectId, groupByProperty]);
    }

    const total = typeCounts.reduce((sum, t) => sum + parseInt(t.count), 0);
    return {
      success: true,
      data: {
        types: typeCounts.map(t => ({ name: t.type_name, count: parseInt(t.count) })),
        total_nords: total,
        property_breakdown: propertyBreakdown,
      },
    };
  },

  // ── Tool #6: Path Finding ──
  nords_find_path: async (ctx, args) => {
    const fromId = args.from_nord_id as string;
    const toId = args.to_nord_id as string;
    const maxHops = Math.min(Number(args.max_hops) || 10, 10);
    if (!fromId || !toId) return { success: false, error: 'from_nord_id and to_nord_id are required' };

    // Load all connections for BFS
    const allConnections = await query<{ id: string; source_nord_id: string; target_nord_id: string; type_name: string; verb: string | null }>(
      `SELECT c.id, c.source_nord_id, c.target_nord_id, ct.name as type_name, ct.verb
       FROM connections c JOIN connection_types ct ON ct.id = c.type_id
       WHERE c.project_id = $1 AND c.deleted_at IS NULL`, [ctx.projectId]);

    // Build adjacency list with edge info
    const adjacency = new Map<string, Array<{ neighbor: string; connection_id: string; type_name: string; verb: string | null }>>();
    for (const c of allConnections) {
      if (!adjacency.has(c.source_nord_id)) adjacency.set(c.source_nord_id, []);
      if (!adjacency.has(c.target_nord_id)) adjacency.set(c.target_nord_id, []);
      adjacency.get(c.source_nord_id)!.push({ neighbor: c.target_nord_id, connection_id: c.id, type_name: c.type_name, verb: c.verb });
      adjacency.get(c.target_nord_id)!.push({ neighbor: c.source_nord_id, connection_id: c.id, type_name: c.type_name, verb: c.verb });
    }

    // BFS with parent tracking
    const visited = new Map<string, { parent: string | null; edge: { connection_id: string; type_name: string; verb: string | null } | null }>();
    const bfsQueue: Array<{ id: string; depth: number }> = [{ id: fromId, depth: 0 }];
    visited.set(fromId, { parent: null, edge: null });
    let found = false;

    while (bfsQueue.length > 0) {
      const { id, depth } = bfsQueue.shift()!;
      if (id === toId) { found = true; break; }
      if (depth >= maxHops) continue;
      for (const { neighbor, connection_id, type_name, verb } of (adjacency.get(id) || [])) {
        if (!visited.has(neighbor)) {
          visited.set(neighbor, { parent: id, edge: { connection_id, type_name, verb } });
          bfsQueue.push({ id: neighbor, depth: depth + 1 });
        }
      }
    }

    if (!found) return { success: true, data: { path: null, reason: `No path found within ${maxHops} hops` } };

    // Reconstruct path
    const pathIds: string[] = [];
    let current: string | null = toId;
    while (current) {
      pathIds.unshift(current);
      current = visited.get(current)?.parent || null;
    }

    // Fetch nord titles
    const nordTitles = await query<{ id: string; title: string; type_name: string }>(
      `SELECT n.id, n.title, nt.name as type_name FROM nords n JOIN nord_types nt ON nt.id = n.type_id WHERE n.id = ANY($1)`, [pathIds]);
    const titleMap = new Map(nordTitles.map(n => [n.id, n]));

    const path = pathIds.map((id, i) => {
      const info = titleMap.get(id);
      const edge = i > 0 ? visited.get(id)?.edge : null;
      return {
        nord_id: id,
        title: info?.title || 'Unknown',
        type: info?.type_name || 'Unknown',
        connection_type: edge?.type_name || null,
        verb: edge?.verb || null,
      };
    });

    return { success: true, data: { path, hops: path.length - 1 } };
  },

  // ── Tool #7: Goal Progress + Dormancy Detection ──
  nords_get_goal_progress: async (ctx) => {
    const goals = await goalsRepo.findSessionGoals(ctx.sessionId, ctx.projectId);

    // Load traversal count per session to estimate "rounds"
    const traversalCount = await queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM mcp_traversals WHERE session_id = $1', [ctx.sessionId]);
    const totalRounds = parseInt(traversalCount?.count || '0');

    // Load all traversals to check recency against goal-relevant nords
    const traversals = await query<{ target_nord_id: string; traversed_at: string }>(
      'SELECT target_nord_id, traversed_at FROM mcp_traversals WHERE session_id = $1 ORDER BY traversed_at DESC', [ctx.sessionId]);
    const visitedNordIds = new Set(traversals.map(t => t.target_nord_id));

    // Load goal dependencies (edges)
    const edges = await query<{ source_goal_id: string; target_goal_id: string }>(
      'SELECT source_goal_id, target_goal_id FROM goal_edges WHERE project_id = $1', [ctx.projectId]);

    // Map which goals are prerequisites for which
    const prerequisiteMap = new Map<string, string[]>();
    for (const e of edges) {
      if (!prerequisiteMap.has(e.target_goal_id)) prerequisiteMap.set(e.target_goal_id, []);
      prerequisiteMap.get(e.target_goal_id)!.push(e.source_goal_id);
    }
    const goalStatusMap = new Map(goals.map(g => [g.goal_id, g.status]));

    // Load relevant nords per goal
    const goalIds = goals.filter(g => !g.is_implicit).map(g => g.goal_id);
    const relevantNords = goalIds.length > 0
      ? await query<{ goal_id: string; nord_id: string }>(
          'SELECT goal_id, nord_id FROM goal_relevant_nords WHERE goal_id = ANY($1)', [goalIds])
      : [];
    const relevantByGoal = new Map<string, string[]>();
    for (const rn of relevantNords) {
      if (!relevantByGoal.has(rn.goal_id)) relevantByGoal.set(rn.goal_id, []);
      relevantByGoal.get(rn.goal_id)!.push(rn.nord_id);
    }

    const enrichedGoals = goals.filter(g => !g.is_implicit).map(g => {
      const vars = g.variables || [];
      const collected = vars.filter(v => v.collected);
      const remaining = vars.filter(v => !v.collected);
      const completionPct = vars.length > 0 ? Math.round((collected.length / vars.length) * 100) : 100;

      // Check prerequisites
      const prereqs = prerequisiteMap.get(g.goal_id) || [];
      const prerequisitesMet = prereqs.every(pid => goalStatusMap.get(pid) === 'complete');

      // Check relevant nords visited
      const goalRelevantNords = relevantByGoal.get(g.goal_id) || [];
      const relevantVisited = goalRelevantNords.filter(id => visitedNordIds.has(id)).length;

      // Path status: simple heuristic based on progress + recency
      let pathStatus: 'on-path' | 'dormant' | 'off-path' = 'on-path';
      if (g.status === 'complete') pathStatus = 'on-path';
      else if (completionPct === 0 && totalRounds >= 8) pathStatus = 'off-path';
      else if (completionPct > 0 && completionPct < 100 && totalRounds >= 5 && relevantVisited === 0) pathStatus = 'dormant';

      return {
        id: g.goal_id,
        name: g.goal_name,
        status: g.status,
        path_status: pathStatus,
        completion_pct: completionPct,
        variables: {
          collected: collected.map(v => ({ name: v.variable_name, value: v.value })),
          remaining: remaining.map(v => ({ name: v.variable_name, variable_id: v.variable_id, type: v.variable_type })),
        },
        prerequisites_met: prerequisitesMet,
        relevant_nords_visited: relevantVisited,
        relevant_nords_total: goalRelevantNords.length,
      };
    });

    return { success: true, data: { goals: enrichedGoals, total_rounds: totalRounds } };
  },

  // ── Tool #8: Goal Recommendations ──
  nords_get_goal_recommendations: async (ctx, args) => {
    const goals = await goalsRepo.findSessionGoals(ctx.sessionId, ctx.projectId);
    const explicitGoals = goals.filter(g => !g.is_implicit && g.status !== 'complete');

    // Find target goal
    let targetGoal = args.goal_id
      ? explicitGoals.find(g => g.goal_id === args.goal_id)
      : explicitGoals[0]; // highest priority by sort_order

    if (!targetGoal) return { success: true, data: { message: 'No active goals with remaining variables' } };

    const remaining = (targetGoal.variables || []).filter(v => !v.collected);
    if (remaining.length === 0) return { success: true, data: { goal_name: targetGoal.goal_name, message: 'All variables collected for this goal' } };

    // Get relevant nords for this goal
    const relevantNords = await query<{ nord_id: string; title: string; type_name: string }>(
      `SELECT grn.nord_id, n.title, nt.name as type_name
       FROM goal_relevant_nords grn
       JOIN nords n ON n.id = grn.nord_id
       JOIN nord_types nt ON nt.id = n.type_id
       WHERE grn.goal_id = $1 AND n.deleted_at IS NULL`, [targetGoal.goal_id]);

    // Check which have been visited
    const visitedNords = await query<{ target_nord_id: string }>(
      'SELECT DISTINCT target_nord_id FROM mcp_traversals WHERE session_id = $1', [ctx.sessionId]);
    const visitedSet = new Set(visitedNords.map(v => v.target_nord_id));

    const recommended = relevantNords
      .filter(n => !visitedSet.has(n.nord_id))
      .map(n => ({
        id: n.nord_id,
        title: n.title,
        type: n.type_name,
        visited: false,
      }));

    return {
      success: true,
      data: {
        goal_name: targetGoal.goal_name,
        remaining_variables: remaining.map(v => ({ name: v.variable_name, variable_id: v.variable_id })),
        recommended_nords: recommended,
        already_visited: relevantNords.filter(n => visitedSet.has(n.nord_id)).map(n => ({ id: n.nord_id, title: n.title })),
      },
    };
  },

  // ── Tool #9: Goal Dependencies ──
  nords_get_goal_dependencies: async (ctx) => {
    const goals = await goalsRepo.findSessionGoals(ctx.sessionId, ctx.projectId);
    const edges = await query<{ source_goal_id: string; target_goal_id: string }>(
      'SELECT source_goal_id, target_goal_id FROM goal_edges WHERE project_id = $1', [ctx.projectId]);

    const goalStatusMap = new Map(goals.map(g => [g.goal_id, g.status]));
    const prerequisiteMap = new Map<string, string[]>();
    for (const e of edges) {
      if (!prerequisiteMap.has(e.target_goal_id)) prerequisiteMap.set(e.target_goal_id, []);
      prerequisiteMap.get(e.target_goal_id)!.push(e.source_goal_id);
    }

    const nodes = goals.filter(g => !g.is_implicit).map(g => {
      const prereqs = prerequisiteMap.get(g.goal_id) || [];
      const blocked = prereqs.some(pid => goalStatusMap.get(pid) !== 'complete');
      return {
        id: g.goal_id,
        name: g.goal_name,
        status: g.status,
        blocked,
        blockers: blocked ? prereqs.filter(pid => goalStatusMap.get(pid) !== 'complete').map(pid => {
          const bg = goals.find(g2 => g2.goal_id === pid);
          return { id: pid, name: bg?.goal_name || 'Unknown' };
        }) : [],
      };
    });

    return {
      success: true,
      data: {
        nodes,
        edges: edges.map(e => ({
          from: e.source_goal_id,
          to: e.target_goal_id,
          from_name: goals.find(g => g.goal_id === e.source_goal_id)?.goal_name,
          to_name: goals.find(g => g.goal_id === e.target_goal_id)?.goal_name,
        })),
      },
    };
  },

  // ── Tool #10: Next Goal ──
  nords_get_next_goal: async (ctx) => {
    const goals = await goalsRepo.findSessionGoals(ctx.sessionId, ctx.projectId);
    const edges = await query<{ source_goal_id: string; target_goal_id: string }>(
      'SELECT source_goal_id, target_goal_id FROM goal_edges WHERE project_id = $1', [ctx.projectId]);

    const goalStatusMap = new Map(goals.map(g => [g.goal_id, g.status]));
    const prerequisiteMap = new Map<string, string[]>();
    for (const e of edges) {
      if (!prerequisiteMap.has(e.target_goal_id)) prerequisiteMap.set(e.target_goal_id, []);
      prerequisiteMap.get(e.target_goal_id)!.push(e.source_goal_id);
    }

    // Filter to actionable goals (not complete, prerequisites met)
    const actionable = goals
      .filter(g => !g.is_implicit && g.status !== 'complete' && g.status !== 'cancelled')
      .filter(g => {
        const prereqs = prerequisiteMap.get(g.goal_id) || [];
        return prereqs.every(pid => goalStatusMap.get(pid) === 'complete');
      });

    if (actionable.length === 0) {
      return { success: true, data: { next_goal: null, reason: 'All goals complete or blocked by prerequisites' } };
    }

    // Score: fewest remaining variables + has remaining vars at all
    const scored = actionable.map(g => {
      const vars = g.variables || [];
      const remaining = vars.filter(v => !v.collected);
      const collected = vars.filter(v => v.collected);
      return {
        goal: g,
        remaining_count: remaining.length,
        completion_pct: vars.length > 0 ? Math.round((collected.length / vars.length) * 100) : 100,
        remaining_variables: remaining.map(v => ({ name: v.variable_name, variable_id: v.variable_id })),
      };
    }).sort((a, b) => {
      // Prioritize goals with some progress (most likely to complete soon)
      if (a.completion_pct > 0 && b.completion_pct === 0) return -1;
      if (b.completion_pct > 0 && a.completion_pct === 0) return 1;
      // Then by fewest remaining
      return a.remaining_count - b.remaining_count;
    });

    const best = scored[0];
    // Get relevant nords for this goal
    const relevantNords = await query<{ nord_id: string; title: string }>(
      `SELECT grn.nord_id, n.title FROM goal_relevant_nords grn
       JOIN nords n ON n.id = grn.nord_id
       WHERE grn.goal_id = $1 AND n.deleted_at IS NULL LIMIT 3`, [best.goal.goal_id]);

    return {
      success: true,
      data: {
        next_goal: {
          id: best.goal.goal_id,
          name: best.goal.goal_name,
          completion_pct: best.completion_pct,
          remaining_variables: best.remaining_variables,
          suggested_nords: relevantNords,
          reason: best.completion_pct > 0
            ? `${best.remaining_count} variable(s) remaining, already ${best.completion_pct}% complete`
            : `${best.remaining_count} variable(s) to collect — ready to start`,
        },
        other_actionable: scored.slice(1).map(s => ({
          id: s.goal.goal_id,
          name: s.goal.goal_name,
          completion_pct: s.completion_pct,
          remaining_count: s.remaining_count,
        })),
      },
    };
  },

  // ── Tool #11: Variable Status Dashboard ──
  nords_get_variable_status: async (ctx) => {
    const variables = await query<{
      id: string; name: string; description: string; type: string; options: string | null;
      required: boolean; hint: string | null;
      value: unknown; collected_at: string | null; collected_at_nord_id: string | null;
      collected_at_nord_title: string | null;
    }>(`
      SELECT pv.id, pv.name, pv.description, pv.type, pv.options::text, pv.required, pv.hint,
             sv.value, sv.collected_at as collected_at, sv.nord_id as collected_at_nord_id,
             n.title as collected_at_nord_title
      FROM project_variables pv
      LEFT JOIN mcp_session_variables sv ON sv.variable_id = pv.id AND sv.session_id = $1
      LEFT JOIN nords n ON n.id = sv.nord_id
      WHERE pv.project_id = $2
      ORDER BY pv.sort_order, pv.created_at`, [ctx.sessionId, ctx.projectId]);

    // Compute which goals each variable impacts
    const varIds = variables.map(v => v.id);
    const bindings = varIds.length > 0
      ? await query<{ variable_id: string; goal_id: string; goal_name: string }>(
          `SELECT gvb.variable_id, g.id as goal_id, g.name as goal_name
           FROM goal_variable_bindings gvb
           JOIN goals g ON g.id = gvb.goal_id
           WHERE gvb.variable_id = ANY($1)`, [varIds])
      : [];
    const goalsByVar = new Map<string, Array<{ goal_id: string; goal_name: string }>>();
    for (const b of bindings) {
      if (!goalsByVar.has(b.variable_id)) goalsByVar.set(b.variable_id, []);
      goalsByVar.get(b.variable_id)!.push({ goal_id: b.goal_id, goal_name: b.goal_name });
    }

    const collected = variables.filter(v => v.value !== null && v.value !== undefined);
    const remaining = variables.filter(v => v.value === null || v.value === undefined);

    return {
      success: true,
      data: {
        collected: collected.map(v => ({
          id: v.id, name: v.name, description: v.description, type: v.type,
          value: v.value, collected_at: v.collected_at,
          collected_at_nord: v.collected_at_nord_title,
          goals_impacted: goalsByVar.get(v.id) || [],
        })),
        remaining: remaining.map(v => ({
          id: v.id, name: v.name, description: v.description, type: v.type,
          required: v.required, hint: v.hint,
          options: v.options ? JSON.parse(v.options) : null,
          goals_impacted: goalsByVar.get(v.id) || [],
        })),
        stats: {
          total: variables.length,
          collected: collected.length,
          required_remaining: remaining.filter(v => v.required).length,
        },
      },
    };
  },

  // ── Tool #12: Variable Context ──
  nords_get_variable_context: async (ctx) => {
    // Get current position
    const session = await mcpRepo.findActiveSession(ctx.projectId);
    const currentNordId = session?.current_nord_id;
    if (!currentNordId) return { success: true, data: { message: 'No current position — navigate to a nord first' } };

    // Get current nord info
    const currentNord = await queryOne<{ id: string; title: string; type_id: string; type_name: string }>(
      `SELECT n.id, n.title, n.type_id, nt.name as type_name
       FROM nords n JOIN nord_types nt ON nt.id = n.type_id WHERE n.id = $1`, [currentNordId]);

    // Get uncollected variables
    const remaining = await query<{
      id: string; name: string; description: string; type: string;
      options: string | null; hint: string | null; required: boolean;
    }>(`
      SELECT pv.id, pv.name, pv.description, pv.type, pv.options::text, pv.hint, pv.required
      FROM project_variables pv
      WHERE pv.project_id = $1
        AND pv.id NOT IN (SELECT variable_id FROM mcp_session_variables WHERE session_id = $2 AND value IS NOT NULL)
      ORDER BY pv.sort_order, pv.created_at`, [ctx.projectId, ctx.sessionId]);

    if (remaining.length === 0) return { success: true, data: { message: 'All variables collected!' } };

    // Score by goal relevance to current nord
    const varIds = remaining.map(v => v.id);
    const relevanceData = await query<{ variable_id: string; goal_id: string; goal_name: string; has_relevant_nord: boolean; has_relevant_type: boolean }>(
      `SELECT gvb.variable_id, g.id as goal_id, g.name as goal_name,
              EXISTS(SELECT 1 FROM goal_relevant_nords grn WHERE grn.goal_id = g.id AND grn.nord_id = $2) as has_relevant_nord,
              EXISTS(SELECT 1 FROM goal_relevant_nord_types grnt WHERE grnt.goal_id = g.id AND grnt.nord_type_id = $3) as has_relevant_type
       FROM goal_variable_bindings gvb
       JOIN goals g ON g.id = gvb.goal_id
       WHERE gvb.variable_id = ANY($1)`, [varIds, currentNordId, currentNord?.type_id]);

    // Build relevance scores
    const varScores = new Map<string, { score: number; reasons: string[] }>();
    for (const r of relevanceData) {
      if (!varScores.has(r.variable_id)) varScores.set(r.variable_id, { score: 0, reasons: [] });
      const entry = varScores.get(r.variable_id)!;
      if (r.has_relevant_nord) { entry.score += 3; entry.reasons.push(`Goal "${r.goal_name}" targets this nord directly`); }
      if (r.has_relevant_type) { entry.score += 2; entry.reasons.push(`Goal "${r.goal_name}" targets this nord type`); }
      if (!r.has_relevant_nord && !r.has_relevant_type) { entry.score += 1; entry.reasons.push(`Bound to goal "${r.goal_name}"`); }
    }

    const ranked = remaining
      .map(v => ({
        id: v.id, name: v.name, description: v.description, type: v.type,
        options: v.options ? JSON.parse(v.options) : null,
        hint: v.hint, required: v.required,
        relevance_score: varScores.get(v.id)?.score || 0,
        relevance_reasons: varScores.get(v.id)?.reasons || [],
      }))
      .sort((a, b) => b.relevance_score - a.relevance_score)
      .slice(0, 5);

    return {
      success: true,
      data: {
        current_nord: { id: currentNord?.id, title: currentNord?.title, type: currentNord?.type_name },
        suggested_variables: ranked,
      },
    };
  },

  // ── Tool #13: Variable Validation ──
  nords_validate_variable: async (ctx, args) => {
    const variableId = args.variable_id as string;
    const value = args.value;
    if (!variableId) return { success: false, error: 'variable_id is required' };
    if (value === undefined || value === null) return { success: false, error: 'value is required' };

    const variable = await queryOne<{ id: string; name: string; type: string; options: string | null; required: boolean }>(
      `SELECT id, name, type, options::text, required FROM project_variables WHERE id = $1 AND project_id = $2`,
      [variableId, ctx.projectId]);
    if (!variable) return { success: false, error: `Variable ${variableId} not found` };

    const strValue = String(value);
    let valid = true;
    let reason = '';
    let allowedValues: string[] | null = null;

    switch (variable.type) {
      case 'select': {
        const options = variable.options ? JSON.parse(variable.options) : [];
        allowedValues = options;
        if (!options.includes(strValue)) {
          valid = false;
          reason = `Value '${strValue}' is not in the allowed options: ${options.join(', ')}`;
        }
        break;
      }
      case 'number': {
        if (isNaN(Number(value))) {
          valid = false;
          reason = `Value '${strValue}' is not a valid number`;
        }
        break;
      }
      case 'boolean': {
        const boolValues = ['true', 'false', 'yes', 'no', '1', '0'];
        if (!boolValues.includes(strValue.toLowerCase())) {
          valid = false;
          reason = `Value '${strValue}' is not a valid boolean (expected: true/false)`;
        }
        break;
      }
      case 'short_text': {
        if (strValue.length > 500) {
          valid = false;
          reason = `Value exceeds 500 character limit (got ${strValue.length})`;
        }
        break;
      }
      case 'long_text': {
        if (strValue.length > 5000) {
          valid = false;
          reason = `Value exceeds 5000 character limit (got ${strValue.length})`;
        }
        break;
      }
    }

    return {
      success: true,
      data: valid
        ? { valid: true, variable_name: variable.name }
        : { valid: false, variable_name: variable.name, reason, allowed_values: allowedValues },
    };
  },

  // ── Tool #14: Collection Summary ──
  nords_get_collection_summary: async (ctx) => {
    const collected = await query<{
      name: string; description: string; value: unknown; collected_at: string;
      nord_title: string | null;
    }>(`
      SELECT pv.name, pv.description, sv.value, sv.collected_at as collected_at,
             n.title as nord_title
      FROM mcp_session_variables sv
      JOIN project_variables pv ON pv.id = sv.variable_id
      LEFT JOIN nords n ON n.id = sv.nord_id
      WHERE sv.session_id = $1
      ORDER BY sv.collected_at`, [ctx.sessionId]);

    return {
      success: true,
      data: {
        items: collected.map(c => ({
          name: c.name,
          description: c.description,
          value: c.value,
          collected_at: c.collected_at,
          collected_at_nord: c.nord_title,
        })),
        count: collected.length,
      },
    };
  },

  // ── Tool #15: Session Recap ──
  nords_get_session_recap: async (ctx) => {
    const [session, traversals, sessionVars, goalEvents] = await Promise.all([
      queryOne<{ current_nord_id: string; created_at: string; context_version: number }>(
        'SELECT current_nord_id, created_at, context_version FROM mcp_sessions WHERE id = $1', [ctx.sessionId]),
      query<{ target_nord_id: string; target_title: string; target_type: string; traversed_at: string }>(
        `SELECT t.target_nord_id, n.title as target_title, nt.name as target_type, t.traversed_at
         FROM mcp_traversals t
         JOIN nords n ON n.id = t.target_nord_id
         JOIN nord_types nt ON nt.id = n.type_id
         WHERE t.session_id = $1 ORDER BY t.traversed_at`, [ctx.sessionId]),
      query<{ name: string; value: unknown; nord_title: string | null }>(
        `SELECT pv.name, sv.value, n.title as nord_title
         FROM mcp_session_variables sv
         JOIN project_variables pv ON pv.id = sv.variable_id
         LEFT JOIN nords n ON n.id = sv.nord_id
         WHERE sv.session_id = $1 ORDER BY sv.collected_at`, [ctx.sessionId]),
      query<{ event_type: string; goal_name: string }>(
        `SELECT sge.event_type, g.name as goal_name
         FROM mcp_session_goal_events sge
         JOIN goals g ON g.id = sge.goal_id
         WHERE sge.session_id = $1 ORDER BY sge.created_at`, [ctx.sessionId]),
    ]);

    // Current position info
    let currentPosition = null;
    if (session?.current_nord_id) {
      const nord = await queryOne<{ title: string; type_name: string }>(
        `SELECT n.title, nt.name as type_name FROM nords n JOIN nord_types nt ON nt.id = n.type_id WHERE n.id = $1`, [session.current_nord_id]);
      currentPosition = { id: session.current_nord_id, title: nord?.title, type: nord?.type_name };
    }

    // Deduplicate visited nords
    const visitedMap = new Map<string, { title: string; type: string; visit_order: number }>();
    traversals.forEach((t, i) => {
      if (!visitedMap.has(t.target_nord_id)) {
        visitedMap.set(t.target_nord_id, { title: t.target_title, type: t.target_type, visit_order: i + 1 });
      }
    });

    const goalsCompleted = goalEvents.filter(e => e.event_type === 'goal_completed' || e.event_type === 'session_terminating');

    return {
      success: true,
      data: {
        rounds_elapsed: traversals.length,
        current_position: currentPosition,
        nords_visited: Array.from(visitedMap.entries()).map(([id, info]) => ({
          id, title: info.title, type: info.type, visit_order: info.visit_order,
        })),
        variables_collected: sessionVars.map(v => ({
          name: v.name, value: v.value, collected_at_nord: v.nord_title,
        })),
        goals_completed: goalsCompleted.map(e => e.goal_name),
      },
    };
  },

  // ── Tool #16: Traversal History ──
  nords_get_traversal_history: async (ctx) => {
    const history = await query<{
      traversed_at: string; traversal_type: string;
      source_title: string; target_title: string;
      connection_type: string; verb: string | null;
    }>(`
      SELECT t.traversed_at, t.traversal_type,
             sn.title as source_title, tn.title as target_title,
             ct.name as connection_type, ct.verb
      FROM mcp_traversals t
      JOIN nords sn ON sn.id = t.source_nord_id
      JOIN nords tn ON tn.id = t.target_nord_id
      JOIN connections c ON c.id = t.connection_id
      JOIN connection_types ct ON ct.id = c.type_id
      WHERE t.session_id = $1
      ORDER BY t.traversed_at`, [ctx.sessionId]);

    return {
      success: true,
      data: {
        steps: history.map((h, i) => ({
          step: i + 1,
          from: h.source_title,
          to: h.target_title,
          via: h.connection_type,
          verb: h.verb,
          type: h.traversal_type,
          at: h.traversed_at,
        })),
        total_steps: history.length,
      },
    };
  },

  // ── Tool #17: Nord Comparison ──
  nords_compare: async (_ctx, args) => {
    const idA = args.nord_id_a as string;
    const idB = args.nord_id_b as string;
    if (!idA || !idB) return { success: false, error: 'nord_id_a and nord_id_b are required' };

    const [nordA, nordB] = await Promise.all([
      queryOne<{ id: string; title: string; type_name: string; properties: Record<string, unknown> }>(
        'SELECT n.id, n.title, nt.name as type_name, n.properties FROM nords n JOIN nord_types nt ON nt.id = n.type_id WHERE n.id = $1', [idA]),
      queryOne<{ id: string; title: string; type_name: string; properties: Record<string, unknown> }>(
        'SELECT n.id, n.title, nt.name as type_name, n.properties FROM nords n JOIN nord_types nt ON nt.id = n.type_id WHERE n.id = $1', [idB]),
    ]);
    if (!nordA) return { success: false, error: `Nord ${idA} not found` };
    if (!nordB) return { success: false, error: `Nord ${idB} not found` };

    const propsA = nordA.properties || {};
    const propsB = nordB.properties || {};
    const allKeys = new Set([...Object.keys(propsA), ...Object.keys(propsB)]);

    const shared: Array<{ key: string; value: unknown }> = [];
    const different: Array<{ key: string; value_a: unknown; value_b: unknown }> = [];
    const onlyInA: Array<{ key: string; value: unknown }> = [];
    const onlyInB: Array<{ key: string; value: unknown }> = [];

    for (const key of allKeys) {
      const inA = key in propsA;
      const inB = key in propsB;
      if (inA && inB) {
        if (JSON.stringify(propsA[key]) === JSON.stringify(propsB[key])) {
          shared.push({ key, value: propsA[key] });
        } else {
          different.push({ key, value_a: propsA[key], value_b: propsB[key] });
        }
      } else if (inA) {
        onlyInA.push({ key, value: propsA[key] });
      } else {
        onlyInB.push({ key, value: propsB[key] });
      }
    }

    return {
      success: true,
      data: {
        nord_a: { id: nordA.id, title: nordA.title, type: nordA.type_name },
        nord_b: { id: nordB.id, title: nordB.title, type: nordB.type_name },
        comparison: { shared, different, only_in_a: onlyInA, only_in_b: onlyInB },
      },
    };
  },

  // ── Tool #18: Session Progress Dashboard ──
  nords_get_session_progress: async (ctx) => {
    const [totalNords, visitedNords, variables, goals, session] = await Promise.all([
      queryOne<{ count: string }>('SELECT COUNT(*) as count FROM nords WHERE project_id = $1 AND deleted_at IS NULL', [ctx.projectId]),
      queryOne<{ count: string }>('SELECT COUNT(DISTINCT target_nord_id) as count FROM mcp_traversals WHERE session_id = $1', [ctx.sessionId]),
      query<{ id: string; required: boolean; value: unknown }>(`
        SELECT pv.id, pv.required, sv.value
        FROM project_variables pv
        LEFT JOIN mcp_session_variables sv ON sv.variable_id = pv.id AND sv.session_id = $1
        WHERE pv.project_id = $2`, [ctx.sessionId, ctx.projectId]),
      goalsRepo.findSessionGoals(ctx.sessionId, ctx.projectId),
      queryOne<{ created_at: string; context_version: number }>('SELECT created_at, context_version FROM mcp_sessions WHERE id = $1', [ctx.sessionId]),
    ]);

    const totalNordCount = parseInt(totalNords?.count || '0');
    const visitedNordCount = parseInt(visitedNords?.count || '0');
    const totalVars = variables.length;
    const collectedVars = variables.filter(v => v.value !== null && v.value !== undefined).length;
    const requiredRemaining = variables.filter(v => v.required && (v.value === null || v.value === undefined)).length;

    const explicitGoals = goals.filter(g => !g.is_implicit);
    const completedGoals = explicitGoals.filter(g => g.status === 'complete').length;
    const activeGoals = explicitGoals.filter(g => g.status === 'active').length;
    const pendingGoals = explicitGoals.filter(g => g.status === 'pending').length;

    const traversalCount = await queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM mcp_traversals WHERE session_id = $1', [ctx.sessionId]);
    const roundsElapsed = parseInt(traversalCount?.count || '0');

    // Overall completion — weighted: 60% variables, 40% goals
    const varPct = totalVars > 0 ? (collectedVars / totalVars) * 100 : 100;
    const goalPct = explicitGoals.length > 0 ? (completedGoals / explicitGoals.length) * 100 : 100;
    const overallPct = Math.round(varPct * 0.6 + goalPct * 0.4);

    // Estimate remaining rounds based on pace
    const pace = roundsElapsed > 0 ? collectedVars / roundsElapsed : 0;
    const remainingVars = totalVars - collectedVars;
    const estimatedRemaining = pace > 0 ? Math.ceil(remainingVars / pace) : null;

    return {
      success: true,
      data: {
        nords: { total: totalNordCount, visited: visitedNordCount, pct: totalNordCount > 0 ? Math.round((visitedNordCount / totalNordCount) * 100) : 0 },
        variables: { total: totalVars, collected: collectedVars, required_remaining: requiredRemaining },
        goals: { total: explicitGoals.length, completed: completedGoals, active: activeGoals, pending: pendingGoals },
        completion_pct: overallPct,
        rounds_elapsed: roundsElapsed,
        estimated_rounds_remaining: estimatedRemaining,
      },
    };
  },

  // ── Tier 2: Session ──

  nords_jump_to_nord: async (ctx, args) => {
    const nordId = args.nord_id as string;
    // Verify nord exists in project
    const nord = await queryOne<{ id: string; title: string }>(
      'SELECT id, title FROM nords WHERE id = $1 AND project_id = $2 AND deleted_at IS NULL',
      [nordId, ctx.projectId]
    );
    if (!nord) return { success: false, error: `Nord ${nordId} not found in this project` };

    // Check if target is a horizon neighbor — if so, auto-resolve connection for proper traversal
    let traversalInfo: any = null;
    const currentHorizon = await mcpRepo.getSessionHorizon(ctx.sessionId);
    const currentNordId = currentHorizon?.current_nord?.id;
    const neighbor = (currentHorizon?.neighbors || []).find((n: any) => n.nord?.id === nordId);

    if (neighbor && currentNordId && ctx.mcpCaptureData) {
      // Target is a neighbor — log a full traversal with connection context
      const connId = neighbor.relationship?.connection_id;
      const direction = neighbor.relationship?.direction || 'forward';
      if (connId) {
        traversalInfo = await mcpRepo.logTraversal({
          session_id: ctx.sessionId,
          connection_id: connId,
          source_nord_id: currentNordId,
          target_nord_id: nordId,
          direction: direction as 'forward' | 'backward',
          traversal_type: (args.traversal_type as string || 'read') as 'read' | 'advance' | 'rework' | 'create' | 'assign' | 'evaluate',
          context: { auto_resolved: true, verb: neighbor.relationship?.verb || null },
        });
      }
    } else if (ctx.mcpCaptureData) {
      // Not a neighbor — log as a reposition visit
      await mcpRepo.logNordVisit({ session_id: ctx.sessionId, nord_id: nordId, visit_type: 'inspect' } as any);
    }

    await mcpRepo.updateCurrentNord(ctx.sessionId, nordId);
    await mcpRepo.bumpContextVersion(ctx.sessionId);
    const updatedHorizon = await mcpRepo.getSessionHorizonLean(ctx.sessionId);
    return {
      success: true,
      data: {
        jumped_to: { id: nord.id, title: nord.title },
        traversal: traversalInfo ? 'connected' : 'repositioned',
        horizon: updatedHorizon,
      },
    };
  },

  nords_traverse_connection: async (ctx, args) => {

    // Gate audit trail on mcp_capture_data — traversals are analytics, not functional
    let traversal = null;
    if (ctx.mcpCaptureData) {
      traversal = await mcpRepo.logTraversal({
        session_id: ctx.sessionId,
        connection_id: args.connection_id as string,
        source_nord_id: args.source_nord_id as string,
        target_nord_id: args.target_nord_id as string,
        direction: args.direction as 'forward' | 'backward',
        traversal_type: args.traversal_type as 'read' | 'advance' | 'rework' | 'create' | 'assign' | 'evaluate',
        context: (args.context as Record<string, unknown>) || {},
      });
    }
    await mcpRepo.updateCurrentNord(ctx.sessionId, args.target_nord_id as string);
    await mcpRepo.bumpContextVersion(ctx.sessionId);
    const horizon = await mcpRepo.getSessionHorizonLean(ctx.sessionId);
    return { success: true, data: { traversal, horizon } };
  },

  nords_update_session_nord: async (_ctx, _args) => {
    // REMOVED: This tool was mutating canonical graph data.
    // All data collection goes through nords_update_session_variables.
    return {
      success: false,
      error: 'nords_update_session_nord has been removed. Use nords_update_session_variables to save collected data. Nord properties are read-only reference data.',
    };
  },

  nords_update_session_variables: async (ctx, args) => {
    const variables = (args.variables as Array<{ variable_id: string; value: unknown }>) || [];
    if (variables.length === 0) {
      return { success: false, error: 'At least one variable is required' };
    }

    // Get session for current position context
    const session = await mcpRepo.findActiveSession(ctx.projectId);
    const currentNordId = session?.current_nord_id || null;
    const personaId = session?.persona_id || null;

    const allGoalEvents: goalsRepo.GoalEvent[] = [];
    const saved: Array<{ variable_id: string; value: unknown }> = [];

    for (const v of variables) {
      const { variable: savedVar, goalEvents } = await mcpRepo.upsertSessionVariable(
        ctx.sessionId, v.variable_id, v.value, currentNordId, personaId
      );
      saved.push({ variable_id: savedVar.variable_id, value: savedVar.value });
      allGoalEvents.push(...goalEvents);
    }

    // Auto-terminate session if a terminal goal fired
    const terminatingEvent = allGoalEvents.find(e => e.type === 'session_terminating');
    if (terminatingEvent) {
      await mcpRepo.endSession(ctx.sessionId, 'completed',
        `Session ended: ${terminatingEvent.goal_name} (${terminatingEvent.end_type || 'reset'})`
      );
    }

    // Get updated horizon (includes suggested_persona)
    await mcpRepo.bumpContextVersion(ctx.sessionId);
    const horizon = await mcpRepo.getSessionHorizonLean(ctx.sessionId);

    // Auto-switch persona if strongly recommended
    let persona_switched = false;
    if (horizon.suggested_persona && !terminatingEvent) {
      await mcpRepo.autoSwitchPersona(ctx.sessionId, horizon.suggested_persona.persona_id);
      persona_switched = true;
    }

    return {
      success: true,
      data: {
        saved_variables: saved,
        goal_events: allGoalEvents.length > 0 ? allGoalEvents : undefined,
        persona_switched: persona_switched ? horizon.suggested_persona : undefined,
        horizon: persona_switched
          ? await mcpRepo.getSessionHorizonLean(ctx.sessionId) // re-fetch after persona switch
          : horizon,
      },
    };
  },

  nords_visit_nord: async (ctx, args) => {
    // Gate audit trail on mcp_capture_data — visits are analytics, not functional
    if (!ctx.mcpCaptureData) {
      return { success: true, data: { skipped: true, reason: 'mcp_capture_data is disabled' } };
    }
    const visit = await mcpRepo.logNordVisit({
      session_id: ctx.sessionId,
      nord_id: args.nord_id as string,
      visit_type: args.visit_type as 'inspect' | 'update' | 'complete' | 'create' | 'gate_check',
      properties_before: (args.properties_before as Record<string, unknown>) || {},
      properties_after: (args.properties_after as Record<string, unknown>) || {},
      context: (args.context as Record<string, unknown>) || {},
    });
    return { success: true, data: visit };
  },

  nords_switch_persona: async (ctx, args) => {
    const session = await mcpRepo.updateSessionPersona(ctx.sessionId, args.persona_id as string | null);
    if (!session) return { success: false, error: 'Session not found' };
    await mcpRepo.bumpContextVersion(ctx.sessionId);
    const horizon = await mcpRepo.getSessionHorizonLean(ctx.sessionId);
    return {
      success: true,
      data: {
        session,
        horizon,
        reframe_prompt: 'You are now viewing this session through a new persona lens. Re-examine the nords you have already visited — what did the previous persona miss? What would you prioritize differently? Reference your new Decision Frameworks and Attention Bias weights.',
      },
    };
  },

  // ── Tier 3: Mutable ──

  nords_create_nord: async (ctx, args) => {
    if (!ctx.mcpMutable) return { success: false, error: 'Project is not mcp_mutable. Create operations disabled.' };
    const nord = await queryOne(
      `INSERT INTO nords (project_id, type_id, title, properties, position_x, position_y)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [ctx.projectId, args.type_id, args.title, JSON.stringify(args.properties || {}), args.position_x ?? 0, args.position_y ?? 0]
    );
    return { success: true, data: nord };
  },

  nords_update_nord: async (ctx, args) => {
    if (!ctx.mcpMutable) return { success: false, error: 'Project is not mcp_mutable. Update operations disabled.' };
    const sets: string[] = []; const vals: unknown[] = []; let i = 1;
    if (args.title !== undefined) { sets.push(`title = $${i++}`); vals.push(args.title); }
    if (args.properties !== undefined) { sets.push(`properties = $${i++}`); vals.push(JSON.stringify(args.properties)); }
    if (sets.length === 0) return { success: false, error: 'No fields to update' };
    vals.push(args.nord_id);
    const nord = await queryOne(`UPDATE nords SET ${sets.join(', ')} WHERE id = $${i} AND deleted_at IS NULL RETURNING *`, vals);
    return { success: true, data: nord };
  },

  nords_delete_nord: async (ctx, args) => {
    if (!ctx.mcpMutable) return { success: false, error: 'Project is not mcp_mutable. Delete operations disabled.' };
    await queryOne('UPDATE nords SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL RETURNING id', [args.nord_id]);
    return { success: true, data: { deleted: args.nord_id } };
  },

  nords_create_connection: async (ctx, args) => {
    if (!ctx.mcpMutable) return { success: false, error: 'Project is not mcp_mutable.' };
    const conn = await queryOne(
      `INSERT INTO connections (project_id, type_id, source_nord_id, target_nord_id, direction, distance_x, distance_y)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [ctx.projectId, args.type_id, args.source_nord_id, args.target_nord_id, args.direction || 'none', args.distance_x ?? 0.5, args.distance_y ?? 0.5]
    );
    return { success: true, data: conn };
  },

  nords_update_connection: async (ctx, args) => {
    if (!ctx.mcpMutable) return { success: false, error: 'Project is not mcp_mutable.' };
    const sets: string[] = []; const vals: unknown[] = []; let i = 1;
    if (args.distance_x !== undefined) { sets.push(`distance_x = $${i++}`); vals.push(args.distance_x); }
    if (args.distance_y !== undefined) { sets.push(`distance_y = $${i++}`); vals.push(args.distance_y); }
    if (args.direction !== undefined) { sets.push(`direction = $${i++}`); vals.push(args.direction); }
    if (args.properties !== undefined) { sets.push(`properties = $${i++}`); vals.push(JSON.stringify(args.properties)); }
    if (sets.length === 0) return { success: false, error: 'No fields to update' };
    vals.push(args.connection_id);
    const conn = await queryOne(`UPDATE connections SET ${sets.join(', ')} WHERE id = $${i} AND deleted_at IS NULL RETURNING *`, vals);
    return { success: true, data: conn };
  },

  nords_delete_connection: async (ctx, args) => {
    if (!ctx.mcpMutable) return { success: false, error: 'Project is not mcp_mutable.' };
    await queryOne('UPDATE connections SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL RETURNING id', [args.connection_id]);
    return { success: true, data: { deleted: args.connection_id } };
  },
};




// ── Dispatcher ──

// Graph-mutating tools that are NEVER allowed at runtime (chat/test sessions).
// All runtime data collection goes through session-layer tools:
//   nords_update_session_nord (property snapshots)
//   nords_update_session_variables (project variables)
const GRAPH_MUTATING_TOOLS = new Set([
  'nords_create_nord',
  'nords_update_nord',
  'nords_delete_nord',
  'nords_create_connection',
  'nords_update_connection',
  'nords_delete_connection',
]);

export async function dispatchTool(
  toolName: string,
  ctx: ToolContext,
  args: Record<string, unknown>
): Promise<ToolResult> {
  // Hard guard: reject graph-mutating tools at runtime.
  // These should never appear in tool declarations (buildToolDeclarations passes false),
  // but this is belt-and-suspenders in case they leak through.
  if (GRAPH_MUTATING_TOOLS.has(toolName) && !ctx.mcpMutable) {
    logger.warn('Blocked graph-mutating tool at runtime', { tool: toolName, session: ctx.sessionId });
    return {
      success: false,
      error: `${toolName} is not available during sessions. Use nords_update_session_variables to save collected data.`,
    };
  }

  const handler = tools[toolName];
  if (!handler) {
    return { success: false, error: `Unknown tool: ${toolName}` };
  }
  try {
    return await handler(ctx, args);
  } catch (err: any) {
    logger.error('Tool dispatch error', { tool: toolName, error: err.message });
    return { success: false, error: err.message };
  }
}

/** Get all tool names (for building Gemini function declarations) */
export function getToolNames(): string[] {
  return Object.keys(tools);
}
