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
import { query, queryOne } from '../db.js';

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

// ── Tool Implementations ──

const tools: Record<string, ToolHandler> = {

  // ── Tier 1: Read-Only ──

  nords_get_dictionary: async (ctx) => {
    const data = await mcpRepo.getProjectDictionary(ctx.projectId);
    return { success: true, data };
  },

  nords_get_graph: async (ctx) => {
    const nords = await query('SELECT n.*, nt.name as type_name FROM nords n JOIN nord_types nt ON nt.id = n.type_id WHERE n.project_id = $1 AND n.deleted_at IS NULL', [ctx.projectId]);
    const connections = await query('SELECT c.*, ct.name as type_name FROM connections c JOIN connection_types ct ON ct.id = c.type_id WHERE c.project_id = $1 AND c.deleted_at IS NULL', [ctx.projectId]);
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
    const nords = await mcpRepo.findSessionNords(ctx.sessionId);
    const traversals = await mcpRepo.findTraversalsBySession(ctx.sessionId);
    return { success: true, data: { session, nords, traversals } };
  },

  nords_get_incomplete_nords: async (ctx) => {
    const nords = await mcpRepo.findIncompleteSessionNords(ctx.sessionId);
    return { success: true, data: nords };
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
    const [dictionary, horizon, goals] = await Promise.all([
      mcpRepo.getProjectDictionary(ctx.projectId),
      mcpRepo.getSessionHorizon(ctx.sessionId),
      goalsRepo.findSessionGoals(ctx.sessionId, ctx.projectId),
    ]);
    return {
      success: true,
      data: {
        dictionary,
        horizon,
        goals,
        _hint: 'This is a composite cold-start response. You now have full ontology, spatial context, and goal state. Begin the conversation.',
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
    // Property validation against schema
    if (args.properties && args.nord_id) {
      const validationError = await validateProperties(ctx.projectId, args.nord_id as string, args.properties as Record<string, unknown>);
      if (validationError) return { success: false, error: validationError };
    }
    const sessionNord = await mcpRepo.upsertSessionNord(
      ctx.sessionId,
      args.nord_id as string,
      (args.properties as Record<string, unknown>) || {},
      (args.required_count as number) ?? 0,
      (args.filled_count as number) ?? 0,
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
    return { success: true, data: { sessionNord, horizon, goal_events: goalEvents.length > 0 ? goalEvents : undefined } };
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

  const schema = nordType.properties_schema as Array<{ key: string; type: string; required?: boolean; options?: string[] }>;

  for (const field of schema) {
    const value = properties[field.key];

    // Type checking
    if (value !== undefined && value !== null) {
      switch (field.type) {
        case 'text':
        case 'textarea':
        case 'url':
        case 'email':
          if (typeof value !== 'string') return `Property "${field.key}" must be a string, got ${typeof value}`;
          break;
        case 'number':
          if (typeof value !== 'number') return `Property "${field.key}" must be a number, got ${typeof value}`;
          break;
        case 'boolean':
        case 'checkbox':
          if (typeof value !== 'boolean') return `Property "${field.key}" must be a boolean, got ${typeof value}`;
          break;
        case 'select':
          if (field.options && !field.options.includes(value as string)) {
            return `Property "${field.key}" must be one of: ${field.options.join(', ')}`;
          }
          break;
        case 'date':
          if (typeof value === 'string' && isNaN(Date.parse(value))) {
            return `Property "${field.key}" must be a valid date string`;
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
    return { success: false, error: err.message };
  }
}

/** Get all tool names (for building Gemini function declarations) */
export function getToolNames(): string[] {
  return Object.keys(tools);
}
