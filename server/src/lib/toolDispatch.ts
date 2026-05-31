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
import { normalizePropertyType } from '@nords/shared/propertyTypes.js';

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
    collect: 'You navigate a knowledge graph via MCP tools. Your job is to gather information naturally through conversation, then save structured values using nords_update_session_variables (for project variables) and nords_update_session_nord (for nord-specific properties). The participant should never feel like they are filling out a form. Capture data organically as it comes up.',
    guided: 'You navigate a knowledge graph via MCP tools. You are actively working toward specific goals. Use the remaining_variables and goal bindings to steer the conversation toward uncollected variables. Be purposeful but never robotic — the user should feel heard, not interrogated.',
  };

  const modeCollection: Record<string, Record<string, string>> = {
    explore: {
      remaining_schema: 'The remaining_schema shows what properties exist but are unfilled. In explore mode, treat these as conversation topics you MAY discuss if the user is interested — not as a checklist to complete.',
      save_opportunistically: 'If the user naturally shares information that matches a property, save it with nords_update_session_nord. But do NOT ask probing questions specifically to fill properties.',
      planning_queue: 'The planning_queue shows unvisited nords. Use it to suggest interesting areas to explore, but always follow the user\'s lead.',
      pacing: 'Let the user guide the pace. If they want to linger on a topic, stay there. If they want to move on, follow them.',
    },
    collect: {
      remaining_variables: 'The remaining_variables in the horizon show uncollected project variables. Each has name, type, required, description, hint, and tags. Save collected values with nords_update_session_variables. Variables are sorted by priority — ask about earlier items first.',
      remaining_schema: 'The remaining_schema on current_nord shows nord-specific user properties not yet filled. Save these with nords_update_session_nord.',
      save_incrementally: 'Save values with nords_update_session_variables (for project variables) or nords_update_session_nord (for nord properties) as soon as you learn them. Do NOT wait until all are gathered.',
      planning_queue: 'The planning_queue is YOUR internal roadmap. Never share it with the user. Never say "we still need to cover X, Y, Z." Complete the current conversational thread before pivoting to queue items.',
      pacing: 'Explore topics deeply before moving on. Better to deeply explore 3 topics than shallowly touch 10. If a user gives a short answer, probe before moving on.',
    },
    guided: {
      remaining_variables: 'The remaining_variables show uncollected project variables. In guided mode, actively steer toward required variables bound to active goals. Use hints as conversational prompts.',
      remaining_schema: 'The remaining_schema on current_nord shows nord-specific properties. Save these with nords_update_session_nord if relevant.',
      save_incrementally: 'Save values with nords_update_session_variables as soon as you learn them. Goal completion is evaluated automatically after each save.',
      planning_queue: 'The planning_queue is YOUR internal roadmap aligned with active goals. Nords marked goal_relevant are bound to active goals — prioritize them. Never share the queue with the user.',
      pacing: 'Balance depth with goal progress. Probe important topics but keep momentum toward goal completion.',
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
      'Never list remaining fields or ask for them in sequence. That is a survey, not an interview.',
      'Never reference the graph structure, nords, schemas, or tools to the user.',
      'When a nord is complete, provide a brief reflection that validates what the user shared before transitioning.',
    ],
    guided: [
      'You navigate a real graph. Don\'t invent nords or connections — discover them with your tools.',
      'Infer prerequisite gates from connection verbs. Don\'t skip a "depends on" target.',
      'Never list remaining fields or ask for them in sequence. That is a survey, not an interview.',
      'Never reference the graph structure, nords, schemas, goals, or tools to the user.',
      'When a nord is complete, provide a brief reflection that validates what the user shared before transitioning.',
      'Actively work toward active goal bindings. The goal_events in tool responses tell you when goals complete.',
    ],
  };

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
    navigation: {
      verbs: 'Connection verbs encode causality: "flows into" / "leads to" = prerequisite gate (source before target). "depends on" = dependency (target before source). "assigned to" = resource binding. "blocks" = blocker. "contains" / "has" = composition. Use verbs to infer sequencing.',
      stages: 'Connection distance_x/distance_y (0.0–1.0) map to stage labels. Use the label name in conversation (e.g., "In Progress"), never raw numbers.',
      suggested_next: 'The horizon\'s suggested_next field guides your internal plan. Follow it unless the user\'s story leads elsewhere.',
      predicted_path: 'The predicted_path is a 2-hop lookahead. Use it for internal planning only.',
    },
    collection: modeCollection[mode] || modeCollection.collect,
    goal_events: {
      goal_completed: 'Acknowledge the milestone conversationally. If the goal has an achieved_prompt, weave it naturally into your response. Do NOT say "Goal complete!" or reference the goal system.',
      goal_activated: 'A new goal has unlocked (its prerequisites are met). Transition to its topics naturally, as if following the user\'s story.',
      goal_cancelled: 'A sibling branch was structurally excluded. Stop pursuing those topics silently. Do NOT mention this to the user.',
      session_terminating: 'A terminal goal was reached. If end_type is "reset", bring the conversation to a warm close and say goodbye. If "continue", close warmly but mention you\'ll pick up where you left off next time.',
    },
    error_recovery: {
      tool_error: 'If a tool returns success=false, handle it gracefully. Explain the situation naturally to the user if relevant, or silently try an alternative approach. Never show raw error messages or tool names.',
      invalid_property: 'If nords_update_session_nord rejects a value, rephrase your question to help the user provide a valid format. For example, if a date field is rejected, ask "Could you share that as a specific date?"',
      dead_end: 'If the current nord has no uncollected properties and no unvisited neighbors, check the planning_queue for the next priority nord. Use nords_traverse_connection to navigate there via the graph.',
      missing_data: 'If the user says "I don\'t know" or "skip that", respect it. Move to the next topic. Do NOT repeatedly ask for the same information.',
    },
    persona: horizon.persona
      ? 'You are operating as the persona described in the dictionary. Adopt its voice, tone, decision frameworks, and attention bias. When choosing which neighbor to explore, prefer connections with higher persona weight.'
      : null,
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

  nords_get_graph: async (ctx) => {
    const nords = await query<{ id: string; title: string; type_name: string; type_id: string; properties: Record<string, unknown> }>(
      `SELECT n.id, n.title, nt.name as type_name, n.type_id, n.properties
       FROM nords n JOIN nord_types nt ON nt.id = n.type_id
       WHERE n.project_id = $1 AND n.deleted_at IS NULL
       ORDER BY n.title`, [ctx.projectId]);
    const connections = await query<{ id: string; source_nord_id: string; target_nord_id: string; type_name: string; direction: string; distance_x: number; distance_y: number }>(
      `SELECT c.id, c.source_nord_id, c.target_nord_id, ct.name as type_name, c.direction, c.distance_x, c.distance_y
       FROM connections c JOIN connection_types ct ON ct.id = c.type_id
       WHERE c.project_id = $1 AND c.deleted_at IS NULL`, [ctx.projectId]);
    const nordTypes = await nordTypesRepo.findByProject(ctx.projectId);
    const connTypes = await connectionTypesRepo.findByProject(ctx.projectId);
    return { success: true, data: { nords, connections, nord_types: nordTypes, connection_types: connTypes } };
  },

  nords_get_nord: async (_ctx, args) => {
    const nord = await queryOne('SELECT n.*, nt.name as type_name FROM nords n JOIN nord_types nt ON nt.id = n.type_id WHERE n.id = $1 AND n.deleted_at IS NULL', [args.nord_id]);
    if (!nord) return { success: false, error: `Nord ${args.nord_id} not found` };
    return { success: true, data: nord };
  },

  nords_query_nords: async (ctx, args) => {
    let sql = 'SELECT n.*, nt.name as type_name FROM nords n JOIN nord_types nt ON nt.id = n.type_id WHERE n.project_id = $1 AND n.deleted_at IS NULL';
    const params: unknown[] = [ctx.projectId];
    let idx = 2;
    if (args.type_id) { sql += ` AND n.type_id = $${idx++}`; params.push(args.type_id); }
    if (args.title) { sql += ` AND n.title ILIKE $${idx++}`; params.push(`%${args.title}%`); }
    sql += ' ORDER BY n.title';
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
    const variables = await query(
      'SELECT sv.*, pv.name FROM mcp_session_variables sv JOIN project_variables pv ON pv.id = sv.variable_id WHERE sv.session_id = $1 AND sv.value IS NULL',
      [ctx.sessionId]
    );
    return { success: true, data: variables };
  },

  nords_get_horizon: async (ctx) => {
    const horizon = await mcpRepo.getSessionHorizon(ctx.sessionId);
    return { success: true, data: horizon };
  },

  nords_get_goals: async (ctx) => {
    const goals = await goalsRepo.findSessionGoals(ctx.sessionId, ctx.projectId);
    return { success: true, data: goals };
  },

  nords_get_briefing: async (ctx) => {
    const [dictionary, horizon, goals, project] = await Promise.all([
      mcpRepo.getProjectDictionary(ctx.projectId),
      mcpRepo.getSessionHorizon(ctx.sessionId),
      goalsRepo.findSessionGoals(ctx.sessionId, ctx.projectId),
      projectsRepo.findById(ctx.projectId),
    ]);

    // De-duplicate: if the active persona is fully represented in horizon.persona,
    // strip it from dictionary.personas to save ~1000 tokens.
    const slimDictionary = { ...dictionary };
    if (horizon.persona?.id && slimDictionary.personas) {
      slimDictionary.personas = slimDictionary.personas.filter(
        (p: { id: string }) => p.id !== horizon.persona!.id
      );
    }

    return {
      success: true,
      data: {
        dictionary: slimDictionary,
        horizon,
        goals,
        protocol: buildProtocol(project, horizon),
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

  // ── Tier 2: Session ──

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
    const horizon = await mcpRepo.getSessionHorizon(ctx.sessionId);
    return { success: true, data: { traversal, horizon } };
  },

  nords_update_session_nord: async (ctx, args) => {
    const nordId = args.nord_id as string;
    const newProperties = (args.properties as Record<string, unknown>) || {};

    // Property validation against schema
    if (Object.keys(newProperties).length > 0) {
      const validationError = await validateProperties(ctx.projectId, nordId, newProperties);
      if (validationError) return { success: false, error: validationError };
    }

    // Update properties directly on the nord (merge with existing)
    const existingNord = await queryOne<{ properties: Record<string, unknown> }>(
      'SELECT properties FROM nords WHERE id = $1 AND deleted_at IS NULL',
      [nordId]
    );
    if (!existingNord) return { success: false, error: 'Nord not found' };

    const merged = { ...(existingNord.properties || {}), ...newProperties };
    await queryOne(
      'UPDATE nords SET properties = $2 WHERE id = $1 RETURNING id',
      [nordId, JSON.stringify(merged)]
    );

    // Reactively evaluate goals after every property save
    const goalEvents = await goalsRepo.evaluateGoals(ctx.sessionId, ctx.projectId);

    // Auto-terminate session if a terminal goal fired
    const terminatingEvent = goalEvents.find(e => e.type === 'session_terminating');
    if (terminatingEvent) {
      await mcpRepo.endSession(ctx.sessionId, 'completed',
        `Session ended: ${terminatingEvent.goal_name} (${terminatingEvent.end_type || 'reset'})`
      );
    }

    // Auto-return horizon (#5)
    const horizon = await mcpRepo.getSessionHorizon(ctx.sessionId);
    return { success: true, data: { properties: merged, horizon, goal_events: goalEvents.length > 0 ? goalEvents : undefined } };
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
    const horizon = await mcpRepo.getSessionHorizon(ctx.sessionId);

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
          ? await mcpRepo.getSessionHorizon(ctx.sessionId) // re-fetch after persona switch
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
    const horizon = await mcpRepo.getSessionHorizon(ctx.sessionId);
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

// ── Property Validation (#4) ──

async function validateProperties(
  projectId: string,
  nordId: string,
  properties: Record<string, unknown>
): Promise<string | null> {
  // Look up the nord's type and its schema
  const nord = await queryOne<{ type_id: string }>('SELECT type_id FROM nords WHERE id = $1 AND deleted_at IS NULL', [nordId]);
  if (!nord) return `Nord ${nordId} not found`;

  const nordType = await nordTypesRepo.findById(nord.type_id);
  if (!nordType?.properties_schema?.length) return null; // No schema = no validation

  const schema = nordType.properties_schema as Array<{ name: string; type: string; required?: boolean; options?: string[] }>;

  for (const field of schema) {
    const value = properties[field.name];
    const fieldType = normalizePropertyType(field.type);

    // Type checking
    if (value !== undefined && value !== null) {
      switch (fieldType) {
        case 'short_text':
        case 'long_text':
        case 'url':
        case 'email':
        case 'phone':
          if (typeof value !== 'string') return `Property "${field.name}" must be a string, got ${typeof value}`;
          break;
        case 'number':
        case 'currency':
        case 'percentage':
          if (typeof value !== 'number') return `Property "${field.name}" must be a number, got ${typeof value}`;
          break;
        case 'boolean':
          if (typeof value !== 'boolean') return `Property "${field.name}" must be a boolean, got ${typeof value}`;
          break;
        case 'select':
          if (field.options && !field.options.includes(value as string)) {
            return `Property "${field.name}" must be one of: ${field.options.join(', ')}`;
          }
          break;
        case 'date':
        case 'date_range':
          if (typeof value === 'string' && isNaN(Date.parse(value))) {
            return `Property "${field.name}" must be a valid date string`;
          }
          break;
      }
    }
  }

  return null; // All valid
}




// ── Dispatcher ──

export async function dispatchTool(
  toolName: string,
  ctx: ToolContext,
  args: Record<string, unknown>
): Promise<ToolResult> {
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
