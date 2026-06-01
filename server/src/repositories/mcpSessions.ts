import { query, queryOne } from '../db.js';
import type { McpSession, McpTraversal, McpNordVisit, Project, ProjectVariable } from '../types/entities.js';
import * as goalsRepo from './goals.js';
import * as variablesRepo from './variables.js';

// ── Null Stripping Utility ──

/**
 * Recursively strips null values from objects and arrays.
 * - Removes object keys whose value is null or undefined
 * - Removes null/undefined elements from arrays
 * - Keeps 0, false, "", [], {} (only nulls are stripped)
 * - Recurses into nested objects and arrays
 */
export function stripNulls<T>(obj: T): T {
  if (obj === null || obj === undefined) return undefined as unknown as T;
  if (Array.isArray(obj)) {
    return obj
      .filter(item => item !== null && item !== undefined)
      .map(item => stripNulls(item)) as unknown as T;
  }
  if (typeof obj === 'object' && obj !== null) {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== null && value !== undefined) {
        result[key] = stripNulls(value);
      }
    }
    return result as T;
  }
  return obj;
}

// ── Context Versioning ──

/**
 * Bump the context version for a session.
 * Called after persona switch, traversal, or variable save
 * so the lean horizon can report staleness.
 */
export async function bumpContextVersion(sessionId: string): Promise<void> {
  await query(
    'UPDATE mcp_sessions SET context_version = context_version + 1 WHERE id = $1',
    [sessionId]
  );
}

/**
 * Mark context as served — sets last_context_served = context_version.
 * Called after nords_get_context returns, so subsequent horizons
 * know the LLM has fresh context.
 */
export async function markContextServed(sessionId: string): Promise<void> {
  await query(
    'UPDATE mcp_sessions SET last_context_served = context_version WHERE id = $1',
    [sessionId]
  );
}

// ── Sessions ──

export async function createSession(
  projectId: string,
  personaId?: string | null,
  startNordId?: string | null,
  _userId?: string | null,
  _tokenId?: string | null
): Promise<McpSession> {
  // Gate on mcp_enabled — admin must enable MCP for this project
  const project = await queryOne<{ mcp_enabled: boolean; mcp_capture_data: boolean }>(`
    SELECT mcp_enabled, mcp_capture_data FROM projects WHERE id = $1
  `, [projectId]);
  if (!project?.mcp_enabled) {
    throw new Error('MCP is not enabled for this project. Enable it in Project Settings.');
  }

  // Resolve start position: explicit → default_start_nord_id → oldest nord in project
  let resolvedStartNord = startNordId || null;
  if (!resolvedStartNord) {
    const oldest = await queryOne<{ id: string }>(`
      SELECT id FROM nords
      WHERE project_id = $1 AND deleted_at IS NULL
      ORDER BY created_at ASC
      LIMIT 1
    `, [projectId]);
    if (oldest) resolvedStartNord = oldest.id;
  }

  const session = await queryOne<McpSession>(`
    INSERT INTO mcp_sessions (project_id, persona_id, current_nord_id)
    VALUES ($1, $2, $3)
    RETURNING *
  `, [projectId, personaId || null, resolvedStartNord]) as McpSession;

  return session;
}


/** Update the session's current nord position */
export async function updateCurrentNord(sessionId: string, nordId: string | null): Promise<McpSession | null> {
  return queryOne<McpSession>(`
    UPDATE mcp_sessions SET current_nord_id = $2 WHERE id = $1 RETURNING *
  `, [sessionId, nordId]);
}

export async function endSession(id: string, status: 'completed' | 'abandoned', summary?: string): Promise<McpSession | null> {
  return queryOne<McpSession>(`
    UPDATE mcp_sessions
    SET ended_at = NOW(), status = $2, summary = $3
    WHERE id = $1
    RETURNING *
  `, [id, status, summary || null]);
}

/** List all sessions for a project, most recent first */
export async function findByProject(projectId: string, limit = 20): Promise<McpSession[]> {
  return query<McpSession>(
    'SELECT * FROM mcp_sessions WHERE project_id = $1 ORDER BY started_at DESC LIMIT $2',
    [projectId, limit]
  );
}

export async function findActiveSession(projectId: string): Promise<McpSession | null> {
  return queryOne<McpSession>(
    `SELECT * FROM mcp_sessions WHERE project_id = $1 AND status = 'active' ORDER BY started_at DESC LIMIT 1`,
    [projectId]
  );
}

export async function findSessionsByProject(projectId: string, limit = 20): Promise<McpSession[]> {
  return query<McpSession>(
    'SELECT * FROM mcp_sessions WHERE project_id = $1 ORDER BY started_at DESC LIMIT $2',
    [projectId, limit]
  );
}

// ── Traversals ──

export async function logTraversal(traversal: Omit<McpTraversal, 'id' | 'traversed_at'>): Promise<McpTraversal> {
  return queryOne<McpTraversal>(`
    INSERT INTO mcp_traversals (session_id, connection_id, source_nord_id, target_nord_id, direction, traversal_type, context)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `, [
    traversal.session_id,
    traversal.connection_id,
    traversal.source_nord_id,
    traversal.target_nord_id,
    traversal.direction,
    traversal.traversal_type,
    JSON.stringify(traversal.context || {}),
  ]) as Promise<McpTraversal>;
}

export async function findTraversalsBySession(sessionId: string): Promise<McpTraversal[]> {
  return query<McpTraversal>(
    'SELECT * FROM mcp_traversals WHERE session_id = $1 ORDER BY traversed_at ASC',
    [sessionId]
  );
}

export async function findTraversalsByConnection(connectionId: string, limit = 50): Promise<McpTraversal[]> {
  return query<McpTraversal>(
    'SELECT * FROM mcp_traversals WHERE connection_id = $1 ORDER BY traversed_at DESC LIMIT $2',
    [connectionId, limit]
  );
}

// ── Nord Visits ──

export async function logNordVisit(visit: Omit<McpNordVisit, 'id' | 'visited_at'>): Promise<McpNordVisit> {
  return queryOne<McpNordVisit>(`
    INSERT INTO mcp_nord_visits (session_id, nord_id, visit_type, properties_before, properties_after, context)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `, [
    visit.session_id,
    visit.nord_id,
    visit.visit_type,
    visit.properties_before ? JSON.stringify(visit.properties_before) : null,
    visit.properties_after ? JSON.stringify(visit.properties_after) : null,
    JSON.stringify(visit.context || {}),
  ]) as Promise<McpNordVisit>;
}

export async function findVisitsBySession(sessionId: string): Promise<McpNordVisit[]> {
  return query<McpNordVisit>(
    'SELECT * FROM mcp_nord_visits WHERE session_id = $1 ORDER BY visited_at ASC',
    [sessionId]
  );
}

export async function findVisitsByNord(nordId: string, limit = 50): Promise<McpNordVisit[]> {
  return query<McpNordVisit>(
    'SELECT * FROM mcp_nord_visits WHERE nord_id = $1 ORDER BY visited_at DESC LIMIT $2',
    [nordId, limit]
  );
}







// ── Session Completion Engine (Option A — Server-Side) ──

/**
 * Check if all required session properties are filled and
 * trigger an End Nord transition if configured.
 *
 * This is called after every upsertSessionNord. Logic:
 * 1. Find all session nords that still have required_count > 0 AND complete = false
 * 2. If none remain → all required props are filled
 * 3. Look up the project's default_end_nord_id
 * 4. If set → update current_nord_id to End Nord and return transition info
 * 5. If not set → return null (no auto-transition)
 */
// ── Persona Switching ──

/** Switch the active persona for a session */
export async function updateSessionPersona(sessionId: string, personaId: string | null): Promise<McpSession | null> {
  return queryOne<McpSession>(`
    UPDATE mcp_sessions SET persona_id = $2 WHERE id = $1 RETURNING *
  `, [sessionId, personaId]);
}

// ── Session Horizon (Sliding-Window Context) ──

/** Resolve a distance value to the nearest stage label */
function resolveStageLabel(distance: number, labels: Array<{ label: string; position: number }>): string | null {
  if (!labels?.length) return null;
  let closest = labels[0];
  for (const label of labels) {
    if (Math.abs(label.position - distance) < Math.abs(closest.position - distance)) {
      closest = label;
    }
  }
  return closest.label;
}

/** Safe JSON parse with fallback */
function safeParseJSON<T>(str: string | null | undefined, fallback: T): T {
  if (!str) return fallback;
  try { return JSON.parse(str); } catch { return fallback; }
}

// ── In-Memory Caches ──

interface CacheEntry<T> { data: T; expires: number; }
const dictionaryCache = new Map<string, CacheEntry<ProjectDictionary>>();
const DICTIONARY_TTL_MS = 5 * 60 * 1000; // 5 minutes

export function invalidateDictionaryCache(projectId: string): void {
  dictionaryCache.delete(projectId);
}

// ── Token budget caps ──
const TRAVERSAL_HISTORY_LIMIT = 5;
const NEIGHBOR_LIMIT = 10;
export interface HorizonNeighbor {
  nord: {
    id: string; title: string; type_id: string; type_name: string;
    properties: Record<string, unknown>;
  };
  relationship: {
    connection_id: string;
    type_name: string;
    verb: string | null;
    direction: string;
    direction_prepositions: { forward: string; reverse: string; both: string } | null;
    measurement_mode: string;
    stage: string | null;
    distance_x: number;
    distance_y: number;
    connection_properties: Record<string, unknown>;
    connection_schema: unknown[]; // connection type's property schema
  };
  session_progress: { filled: number; required: number; complete: boolean } | null;
  persona_bias: number;
  goal_proximity: number;
  spectrum_position: number;
}

export interface SessionHorizon {
  current_nord: {
    id: string; title: string; type_name: string; properties: Record<string, unknown>;
    session_progress: { filled: number; required: number; complete: boolean } | null;
  } | null;
  persona: {
    id: string; name: string; weights: Record<string, number>;
    primary_motivation: string | null; voice_and_tone: string | null;
    mental_models: Array<{ name: string; body: string }>;
    guardrails: Array<{ mode: string; text: string }>;
    exchange_style: string;
  } | null;
  completion: { filled: number; required: number; percentage: number };
  remaining_variables: Array<{
    variable_id: string; name: string; type: string; required: boolean;
    description: string; tags: string[]; goals: string[];
  }>;
  neighbors: HorizonNeighbor[];
  planning_queue: Array<{ nord_id: string; title: string; type_name: string; goal_relevant: boolean }>;
  traversal_history: Array<{
    source_id: string; source_title: string;
    target_id: string; target_title: string;
    traversal_type: string; connection_id: string;
  }>;
  suggested_next: Array<{ nord_id: string; title: string; type_name: string; verb: string | null; explore_score: number }>;
  predicted_path: Array<{ nord_id: string; title: string; type_name: string }>;
  goals: Array<{
    goal_id: string; goal_name: string; icon: string;
    status: string;
    progress: { filled: number; required: number; total: number };
    end_type: 'reset' | 'continue' | null;
    achieved_prompt: string | null;
    persona_weight: number | null;
  }>;
  suggested_persona: {
    persona_id: string; persona_name: string;
    reason: string;
    current_weight: number; suggested_weight: number;
  } | null;
  session_meta: {
    session_id: string;
    project_mode: string;
    project_purpose: string | null;
    end_nord: { id: string; title: string } | null;
    session_status: string;
  };
}

/**
 * Compute the Session Horizon — the AI's full situational awareness.
 *
 * Improvements over v1:
 * - Current nord includes its own session completion state
 * - Neighbors include session_progress and connection properties
 * - Traversal history uses single JOIN (no N+1)
 * - Predicted path: 2-hop lookahead for likely route to completion
 */
export async function getSessionHorizon(sessionId: string): Promise<SessionHorizon> {
  // 1. Get session
  const session = await queryOne<McpSession>(
    'SELECT * FROM mcp_sessions WHERE id = $1',
    [sessionId]
  );
  if (!session) {
    return {
      current_nord: null, persona: null,
      completion: { filled: 0, required: 0, percentage: 0 },
      remaining_variables: [],
      neighbors: [], planning_queue: [], traversal_history: [],
      suggested_next: [], predicted_path: [],
      goals: [],
      suggested_persona: null,
      session_meta: { session_id: sessionId, project_mode: 'collect', project_purpose: null, end_nord: null, session_status: 'unknown' },
    };
  }

  // Fetch project metadata for session_meta
  const projectRow = await queryOne<{
    project_mode: string; purpose: string | null;
    default_end_nord_id: string | null; graph_only: boolean;
  }>(
    'SELECT project_mode, purpose, default_end_nord_id, graph_only FROM projects WHERE id = $1',
    [session.project_id]
  );
  let endNord: { id: string; title: string } | null = null;
  if (projectRow?.default_end_nord_id) {
    const en = await queryOne<{ id: string; title: string }>(
      'SELECT id, title FROM nords WHERE id = $1 AND deleted_at IS NULL',
      [projectRow.default_end_nord_id]
    );
    if (en) endNord = { id: en.id, title: en.title };
  }

  // Pre-fetch session variables for completion tracking
  const sessionVarRows = await query<{ variable_id: string; value: unknown; name: string }>(
    `SELECT sv.variable_id, sv.value, pv.name
     FROM mcp_session_variables sv
     JOIN project_variables pv ON pv.id = sv.variable_id
     WHERE sv.session_id = $1`,
    [sessionId]
  );
  const totalVarCount = sessionVarRows.length;
  const filledVarCount = sessionVarRows.filter(v => v.value != null && v.value !== '').length;

  // 2. Current nord with properties (read-only context)
  let currentNord: SessionHorizon['current_nord'] = null;
  if (session.current_nord_id) {
    const nord = await queryOne<{ id: string; title: string; type_id: string; properties: Record<string, unknown> }>(
      'SELECT id, title, type_id, properties FROM nords WHERE id = $1 AND deleted_at IS NULL',
      [session.current_nord_id]
    );
    if (nord) {
      const nordType = await queryOne<{ name: string; properties_schema: string }>('SELECT name, properties_schema::text FROM nord_types WHERE id = $1', [nord.type_id]);
      currentNord = {
        id: nord.id, title: nord.title, type_name: nordType?.name || 'Unknown', properties: nord.properties,
        session_progress: totalVarCount > 0 ? { filled: filledVarCount, required: totalVarCount, complete: filledVarCount >= totalVarCount } : null,
      };
    }
  }

  // 3. Persona with category weights
  let persona: SessionHorizon['persona'] = null;
  const personaWeights: Record<string, number> = {};
  if (session.persona_id) {
    const p = await queryOne<{ id: string; name: string; primary_motivation: string | null; voice_and_tone: string | null; guardrails: string | null; exchange_style: string | null }>(
      'SELECT id, name, primary_motivation, voice_and_tone, guardrails::text, exchange_style FROM personas WHERE id = $1 AND deleted_at IS NULL',
      [session.persona_id]
    );
    if (p) {
      const weights = await query<{ connection_type_id: string; weight: number }>(
        'SELECT connection_type_id, weight FROM persona_category_weights WHERE persona_id = $1',
        [p.id]
      );
      for (const w of weights) personaWeights[w.connection_type_id] = w.weight;

      const mentalModels = await query<{ name: string; body: string }>(
        'SELECT name, body FROM persona_mental_models WHERE persona_id = $1 ORDER BY sort_order',
        [p.id]
      );

      let guardrails: Array<{ mode: string; text: string }> = [];
      try { guardrails = JSON.parse(p.guardrails || '[]'); } catch { /* ignore */ }

      persona = {
        id: p.id, name: p.name, weights: personaWeights,
        primary_motivation: p.primary_motivation,
        voice_and_tone: p.voice_and_tone,
        mental_models: mentalModels,
        guardrails,
        exchange_style: p.exchange_style || 'bi_directional',
      };
    }
  }

  // 4. Neighbors with semantic context + session progress + connection properties (#2, #3)
  const neighbors: HorizonNeighbor[] = [];
  if (session.current_nord_id) {
    const connRows = await query<{
      conn_id: string; conn_type_id: string; conn_type_name: string;
      conn_verb: string | null; conn_measurement_mode: string;
      conn_x_stage_labels: string; conn_direction_prepositions: string | null;
      conn_properties: string;
      distance_x: number; distance_y: number; direction: string;
      neighbor_id: string; neighbor_title: string; neighbor_type_id: string;
      neighbor_type_name: string; neighbor_properties: Record<string, unknown>;
      conn_properties_schema: string;
    }>(`
      SELECT
        c.id AS conn_id, c.type_id AS conn_type_id, ct.name AS conn_type_name,
        ct.verb AS conn_verb, ct.measurement_mode AS conn_measurement_mode,
        ct.x_stage_labels::text AS conn_x_stage_labels,
        ct.direction_prepositions::text AS conn_direction_prepositions,
        c.properties::text AS conn_properties,
        ct.properties_schema::text AS conn_properties_schema,
        c.distance_x, c.distance_y, c.direction,
        n.id AS neighbor_id, n.title AS neighbor_title, n.type_id AS neighbor_type_id,
        nt.name AS neighbor_type_name, n.properties AS neighbor_properties
      FROM connections c
      JOIN nords n ON n.id = CASE
        WHEN c.source_nord_id = $1 THEN c.target_nord_id
        ELSE c.source_nord_id
      END
      JOIN nord_types nt ON nt.id = n.type_id
      JOIN connection_types ct ON ct.id = c.type_id
      WHERE (c.source_nord_id = $1 OR c.target_nord_id = $1)
        AND c.deleted_at IS NULL AND n.deleted_at IS NULL
      ORDER BY c.distance_x ASC
    `, [session.current_nord_id]);

    for (const row of connRows) {
      const rawWeight = personaWeights[row.conn_type_id] ?? 0;
      const persona_bias = Math.max(0, Math.min(1, 0.5 + (rawWeight / 200)));
      const stageLabels = safeParseJSON<Array<{ label: string; position: number }>>(row.conn_x_stage_labels, []);
      const stage = resolveStageLabel(row.distance_x, stageLabels);
      const dirPreps = safeParseJSON<{ forward: string; reverse: string; both: string } | null>(row.conn_direction_prepositions, null);

      // #2: session progress (now global, not per-neighbor)
      const session_progress = totalVarCount > 0 ? { filled: filledVarCount, required: totalVarCount, complete: filledVarCount >= totalVarCount } : null;

      neighbors.push({
        nord: {
          id: row.neighbor_id, title: row.neighbor_title, type_id: row.neighbor_type_id, type_name: row.neighbor_type_name,
          properties: row.neighbor_properties,
        },
        relationship: {
          connection_id: row.conn_id, type_name: row.conn_type_name, verb: row.conn_verb,
          direction: row.direction, direction_prepositions: dirPreps,
          measurement_mode: row.conn_measurement_mode, stage,
          distance_x: row.distance_x, distance_y: row.distance_y,
          connection_properties: safeParseJSON(row.conn_properties, {}), // #3
          connection_schema: safeParseJSON(row.conn_properties_schema, []),
        },
        session_progress,
        persona_bias,
        goal_proximity: 0, // updated below for guided mode
        spectrum_position: row.distance_x,
      });
    }

    // ── Goal proximity boost: nords linked to active goals via goal_relevant_nords ──
    let goalBoundNordIds = new Set<string>();
    const activeGoalNords = await query<{ nord_id: string }>(`
      SELECT DISTINCT grn.nord_id
      FROM goal_relevant_nords grn
      JOIN mcp_session_goals sg ON sg.goal_id = grn.goal_id
      WHERE sg.session_id = $1 AND sg.status = 'active'
    `, [sessionId]);
    goalBoundNordIds = new Set(activeGoalNords.map(b => b.nord_id));

    // Apply goal_proximity as a gentle nudge — NOT a steering force.
    // Persona weights (connection type bias) should always dominate navigation.
    // Goals are milestones you notice in the rearview mirror, not GPS destinations.
    for (const n of neighbors) {
      n.goal_proximity = goalBoundNordIds.has(n.nord.id) ? 0.1 : 0;
    }

    // Sort: (persona_bias + goal_proximity) → incomplete first → alphabetical
    neighbors.sort((a, b) => {
      const aScore = a.persona_bias + a.goal_proximity;
      const bScore = b.persona_bias + b.goal_proximity;
      const scoreDiff = bScore - aScore;
      if (Math.abs(scoreDiff) > 0.001) return scoreDiff;
      // Prefer incomplete nords
      const aComplete = a.session_progress?.complete ?? false;
      const bComplete = b.session_progress?.complete ?? false;
      if (aComplete !== bComplete) return aComplete ? 1 : -1;
      // Alphabetical tiebreak
      return a.nord.title.localeCompare(b.nord.title);
    });
    neighbors.splice(NEIGHBOR_LIMIT);
  }

  // 5. Completion stats — variable-based
  const projectVars = await variablesRepo.findByProject(session.project_id);
  const requiredVarCount = projectVars.filter(v => v.required).length;
  const sessionVars = await query<{ variable_id: string; value: unknown }>(`
    SELECT variable_id, value FROM mcp_session_variables WHERE session_id = $1
  `, [sessionId]);
  const filledVarIds = new Set(
    sessionVars
      .filter(sv => sv.value !== undefined && sv.value !== null && sv.value !== '')
      .map(sv => sv.variable_id)
  );
  const filledRequiredCount = projectVars.filter(v => v.required && filledVarIds.has(v.id)).length;
  const completion = {
    filled: filledRequiredCount,
    required: requiredVarCount,
    percentage: requiredVarCount > 0 ? Math.round((filledRequiredCount / requiredVarCount) * 100) : 100,
  };

  // 5b. Remaining variables — uncollected project variables
  // In guided mode, filter out variables exclusively bound to pending/cancelled goals
  // so the AI doesn't try to collect them before prerequisites are met.
  const activeGoalIds = await query<{ goal_id: string }>(`
    SELECT goal_id FROM mcp_session_goals
    WHERE session_id = $1 AND status = 'active'
  `, [sessionId]);
  const activeGoalIdSet = new Set(activeGoalIds.map(r => r.goal_id));
  const hasAnySessionGoals = activeGoalIdSet.size > 0 || (await query<{ id: string }>(
    'SELECT id FROM mcp_session_goals WHERE session_id = $1 LIMIT 1', [sessionId]
  )).length > 0;

  // Load all variable→goal bindings to know which variables are gated
  const allVarBindings = hasAnySessionGoals
    ? await query<{ variable_id: string; goal_id: string }>(`
        SELECT variable_id, goal_id FROM goal_variable_bindings
        WHERE goal_id IN (SELECT goal_id FROM mcp_session_goals WHERE session_id = $1)
      `, [sessionId])
    : [];
  const varToGoals = new Map<string, string[]>();
  for (const b of allVarBindings) {
    const arr = varToGoals.get(b.variable_id) || [];
    arr.push(b.goal_id);
    varToGoals.set(b.variable_id, arr);
  }

  // Build goal_id → goal_name map for variable enrichment
  // (sessionGoals is loaded later at line ~755, so we query goal names here)
  const goalNameRows = hasAnySessionGoals
    ? await query<{ id: string; name: string }>(`
        SELECT g.id, g.name FROM goals g
        JOIN mcp_session_goals sg ON sg.goal_id = g.id
        WHERE sg.session_id = $1
      `, [sessionId])
    : [];
  const goalIdToName = new Map(goalNameRows.map(r => [r.id, r.name]));

  const remaining_variables = projectVars
    .filter(v => !filledVarIds.has(v.id))
    .filter(v => {
      const boundGoals = varToGoals.get(v.id);
      if (!boundGoals || boundGoals.length === 0) return true; // unbound = always show
      // Show if at least one bound goal is active
      return boundGoals.some(gid => activeGoalIdSet.has(gid));
    })
    .map(v => {
      const boundGoalIds = varToGoals.get(v.id) || [];
      const goalNames = boundGoalIds
        .map(gid => goalIdToName.get(gid))
        .filter((n): n is string => !!n);
      return {
        variable_id: v.id, name: v.name, type: v.type, required: v.required,
        description: v.description, tags: v.tags, goals: goalNames,
        ...(v.options ? { options: v.options } : {}),
      };
    });

  // 6. Traversal history — single JOIN query, capped at last N entries
  const traversalRows = await query<{
    source_id: string; source_title: string;
    target_id: string; target_title: string;
    traversal_type: string; connection_id: string;
  }>(`
    SELECT
      t.source_nord_id AS source_id, sn.title AS source_title,
      t.target_nord_id AS target_id, tn.title AS target_title,
      t.traversal_type, t.connection_id
    FROM mcp_traversals t
    LEFT JOIN nords sn ON sn.id = t.source_nord_id
    LEFT JOIN nords tn ON tn.id = t.target_nord_id
    WHERE t.session_id = $1
    ORDER BY t.traversed_at DESC
    LIMIT $2
  `, [sessionId, TRAVERSAL_HISTORY_LIMIT]);
  // Reverse back to chronological after DESC LIMIT
  traversalRows.reverse();
  const traversal_history = traversalRows.map(r => ({
    source_id: r.source_id || '',
    source_title: r.source_title || '?',
    target_id: r.target_id || '',
    target_title: r.target_title || '?',
    traversal_type: r.traversal_type,
    connection_id: r.connection_id || '',
  }));

  // 7. Suggested next — ranked list of connected nords by persona-weighted exploration score
  // Score = persona_bias × (1 - distance_x) — closer nords on high-weight connections score higher.
  // The LLM sees the full palette in preference order; conversation context sways the pick.
  const suggested_next: SessionHorizon['suggested_next'] = neighbors
    .map(n => ({
      nord_id: n.nord.id,
      title: n.nord.title,
      type_name: n.nord.type_name,
      verb: n.relationship.verb,
      explore_score: Math.round(n.persona_bias * (1 - n.spectrum_position) * 100) / 100,
    }))
    .sort((a, b) => b.explore_score - a.explore_score);

  // 8. Predicted path — 2-hop lookahead from top suggested (predictive)
  const predicted_path: SessionHorizon['predicted_path'] = [];
  const topSuggested = suggested_next[0];
  if (topSuggested) {
    const hop2 = await query<{ nord_id: string; title: string; type_name: string }>(`
      SELECT DISTINCT n.id AS nord_id, n.title, nt.name AS type_name
      FROM connections c
      JOIN nords n ON n.id = CASE
        WHEN c.source_nord_id = $1 THEN c.target_nord_id
        ELSE c.source_nord_id
      END
      JOIN nord_types nt ON nt.id = n.type_id
      WHERE (c.source_nord_id = $1 OR c.target_nord_id = $1)
        AND c.deleted_at IS NULL AND n.deleted_at IS NULL
        AND n.id != $2
      LIMIT 5
    `, [topSuggested.nord_id, session.current_nord_id || '']);
    predicted_path.push(
      { nord_id: topSuggested.nord_id, title: topSuggested.title, type_name: topSuggested.type_name },
      ...hop2
    );
  }

  // 9. Planning queue — topology-first, goal-aware
  // Goal relevance is a tiebreaker, NOT the primary sort.
  // The graph topology (connection count, persona bias) drives exploration.
  const planningQueue = await query<{ nord_id: string; title: string; type_name: string; goal_relevant: boolean }>(`
    SELECT n.id AS nord_id, n.title, nt.name AS type_name,
           EXISTS (
             SELECT 1 FROM goal_relevant_nords grn
             JOIN mcp_session_goals sg ON sg.goal_id = grn.goal_id
             WHERE grn.nord_id = n.id AND sg.session_id = $2 AND sg.status = 'active'
           ) AS goal_relevant
    FROM nords n
    JOIN nord_types nt ON nt.id = n.type_id
    WHERE n.project_id = $1 AND n.deleted_at IS NULL
    ORDER BY
      n.title
    LIMIT 15
  `, [session.project_id, sessionId]);

  // 10. Goals — fetch session goal state with variable progress + persona weights
  const sessionGoals = await goalsRepo.findSessionGoals(sessionId, session.project_id, session.persona_id);
  const goals = sessionGoals
    .filter(g => !g.is_implicit)
    .map(g => {
      const filled = g.variables?.filter(v => v.collected).length || 0;
      const required = g.variables?.filter(v => v.required).length || 0;
      const total = g.variables?.length || 0;
      return {
        goal_id: g.goal_id,
        goal_name: g.goal_name,
        icon: g.goal_icon || '🎯',
        status: g.status,
        progress: { filled, required, total },
        end_type: g.end_type,
        achieved_prompt: g.achieved_prompt,
        persona_weight: g.persona_weight,
      };
    });

  // 11. Suggested persona — two signals:
  //   A) Goal affinity: another persona weights the top active goal significantly higher
  //   B) Behavioral: user's recent traversals align more with a different persona's connection weights
  let suggested_persona: SessionHorizon['suggested_persona'] = null;
  if (session.persona_id) {
    // Signal A: Goal-based
    const activeGoals = goals.filter(g => g.status === 'active');
    if (activeGoals.length > 0) {
      const topGoal = activeGoals[0]; // already sorted by persona_weight desc
      const allPersonaWeights = await query<{ persona_id: string; persona_name: string; weight: number }>(`
        SELECT pgw.persona_id, p.name AS persona_name, pgw.weight
        FROM persona_goal_weights pgw
        JOIN personas p ON p.id = pgw.persona_id AND p.deleted_at IS NULL
        WHERE pgw.goal_id = $1
        ORDER BY pgw.weight DESC
      `, [topGoal.goal_id]);

      const currentWeight = topGoal.persona_weight ?? 0;
      const bestAlt = allPersonaWeights.find(w => w.persona_id !== session.persona_id);
      if (bestAlt && bestAlt.weight > 50 && (bestAlt.weight - currentWeight) > 30) {
        suggested_persona = {
          persona_id: bestAlt.persona_id,
          persona_name: bestAlt.persona_name,
          reason: `Higher affinity for "${topGoal.goal_name}" (weight: ${bestAlt.weight} vs current: ${currentWeight})`,
          current_weight: currentWeight,
          suggested_weight: bestAlt.weight,
        };
      }
    }

    // Signal B: Behavioral — did the user consistently pick neighbors that
    // would have ranked higher under a different persona's lens?
    // Only check if goal-based didn't already trigger (behavioral is a weaker signal)
    if (!suggested_persona) {
      // Per-persona nudge settings
      const personaRow = await queryOne<{ behavioral_nudge_threshold: number; behavioral_nudge_window: number }>(`
        SELECT behavioral_nudge_threshold, behavioral_nudge_window FROM personas WHERE id = $1
      `, [session.persona_id]);
      const nudgeThreshold = personaRow?.behavioral_nudge_threshold ?? 3;
      const nudgeWindow = personaRow?.behavioral_nudge_window ?? 5;

      // Fetch recent traversals with the connection type AND target nord
      const recentTraversals = await query<{
        source_nord_id: string;
        target_nord_id: string;
        connection_type_id: string;
      }>(`
        SELECT t.source_nord_id, t.target_nord_id, c.type_id AS connection_type_id
        FROM mcp_traversals t
        JOIN connections c ON c.id = t.connection_id
        WHERE t.session_id = $1
        ORDER BY t.traversed_at DESC
        LIMIT $2
      `, [sessionId, nudgeWindow]);

      if (recentTraversals.length >= nudgeThreshold) {
        // Get all personas' connection weights for ranking
        const allCategoryWeights = await query<{
          persona_id: string; persona_name: string;
          connection_type_id: string; weight: number;
        }>(`
          SELECT pcw.persona_id, p.name AS persona_name, pcw.connection_type_id, pcw.weight
          FROM persona_category_weights pcw
          JOIN personas p ON p.id = pcw.persona_id AND p.deleted_at IS NULL AND p.project_id = $1
        `, [session.project_id]);

        // Build weight lookup: persona_id → connection_type_id → weight
        const weightMap = new Map<string, Map<string, number>>();
        const personaNames = new Map<string, string>();
        for (const cw of allCategoryWeights) {
          personaNames.set(cw.persona_id, cw.persona_name);
          if (!weightMap.has(cw.persona_id)) weightMap.set(cw.persona_id, new Map());
          weightMap.get(cw.persona_id)!.set(cw.connection_type_id, cw.weight);
        }

        // For each traversal: get all neighbors at the source, rank them per persona,
        // check if the chosen target ranked higher under another persona.
        // We approximate ranking by comparing persona_bias of the chosen connection type
        // vs the other neighbors' connection types — if another persona would have made
        // the chosen path its #1, that counts as a "misaligned pick."
        const misalignedCounts = new Map<string, number>(); // persona_id → count
        for (const pid of weightMap.keys()) {
          if (pid !== session.persona_id) misalignedCounts.set(pid, 0);
        }

        for (const trav of recentTraversals) {
          // Get the connection type weight for the chosen path under each persona
          const chosenTypeId = trav.connection_type_id;

          for (const [pid, weights] of weightMap) {
            if (pid === session.persona_id) continue;

            const altWeight = weights.get(chosenTypeId) ?? 0;
            const currentWeight = weightMap.get(session.persona_id)?.get(chosenTypeId) ?? 0;

            // "Would have placed higher" = the alternative persona weights this
            // connection type more than the current persona does
            if (altWeight > currentWeight) {
              misalignedCounts.set(pid, (misalignedCounts.get(pid) ?? 0) + 1);
            }
          }
        }

        // Find the persona with the most misaligned picks
        let bestBehavioral: { id: string; name: string; count: number } | null = null;
        for (const [pid, count] of misalignedCounts) {
          if (count >= nudgeThreshold && (!bestBehavioral || count > bestBehavioral.count)) {
            bestBehavioral = { id: pid, name: personaNames.get(pid) || 'Unknown', count };
          }
        }

        if (bestBehavioral) {
          suggested_persona = {
            persona_id: bestBehavioral.id,
            persona_name: bestBehavioral.name,
            reason: `User chose paths that "${bestBehavioral.name}" would have prioritized higher in ${bestBehavioral.count} of the last ${recentTraversals.length} moves`,
            current_weight: 0,
            suggested_weight: bestBehavioral.count,
          };
        }
      }
    }
  }

  // Auto-infer project mode for session_meta
  const hasExplicitGoals = goals.length > 0;
  const hasVariables = projectVars.length > 0;
  const inferredMode = projectRow?.graph_only
    ? 'explore'
    : hasExplicitGoals
      ? 'guided'
      : hasVariables
        ? 'collect'
        : 'explore';

  const session_meta = {
    session_id: sessionId,
    project_mode: inferredMode,
    project_purpose: projectRow?.purpose || null,
    end_nord: endNord,
    session_status: session.status || 'active',
  };

  return {
    current_nord: currentNord, persona, completion, remaining_variables,
    neighbors, planning_queue: planningQueue, traversal_history,
    suggested_next, predicted_path,
    goals, suggested_persona, session_meta,
  };
}

// ── Lean Horizon Types ──

export interface LeanHorizonNeighbor {
  nord: {
    id: string; title: string; type_name: string;
  };
  relationship: {
    connection_id: string;
    type_name: string;
    verb: string | null;
    direction: string;
    distance_x: number;
  };
  persona_bias: number;
  goal_proximity: number;
}

export interface LeanSessionHorizon {
  current_nord: {
    id: string; title: string; type_name: string;
    properties: Record<string, unknown>;
    session_progress: { filled: number; required: number; complete: boolean } | null;
  } | null;
  completion: { filled: number; required: number; percentage: number };
  neighbors: LeanHorizonNeighbor[];
  suggested_next: Array<{ nord_id: string; title: string; type_name: string; verb: string | null; explore_score: number }>;
  predicted_path: Array<{ nord_id: string; title: string; type_name: string }>;
  traversal_history: Array<{
    source_id: string; source_title: string;
    target_id: string; target_title: string;
    traversal_type: string; connection_id: string;
  }>;
  goals: Array<{
    goal_id: string; goal_name: string; icon: string;
    status: string;
    progress: { filled: number; required: number; total: number };
    end_type: 'reset' | 'continue' | null;
    achieved_prompt: string | null;
    persona_weight: number | null;
  }>;
  suggested_persona: {
    persona_id: string; persona_name: string;
    reason: string;
    current_weight: number; suggested_weight: number;
  } | null;
  session_meta: {
    session_id: string;
    project_mode: string;
    project_purpose: string | null;
    end_nord: { id: string; title: string } | null;
    session_status: string;
  };
  context_hint: {
    stale: boolean;
    reason?: string;
  };
}

/**
 * Get Lean Session Horizon — the slim per-turn payload.
 *
 * Strips: persona block, remaining_variables, planning_queue,
 * connection_schema, connection_properties, direction_prepositions,
 * measurement_mode, distance_y, spectrum_position from neighbors.
 *
 * Includes context_hint.stale to tell the LLM when to call nords_get_context.
 */
export async function getSessionHorizonLean(sessionId: string): Promise<LeanSessionHorizon> {
  // Build the full horizon, then extract the lean subset
  const full = await getSessionHorizon(sessionId);

  // Determine context staleness
  const session = await queryOne<{ context_version: number; last_context_served: number }>(
    'SELECT context_version, last_context_served FROM mcp_sessions WHERE id = $1',
    [sessionId]
  );
  const contextVersion = session?.context_version ?? 0;
  const lastServed = session?.last_context_served ?? 0;
  const stale = contextVersion > lastServed;

  // Infer staleness reason from what changed
  let reason: string | undefined;
  if (stale) {
    // Simple heuristic: check what bumped the version
    // We could track this more precisely, but the LLM only needs to know "stale"
    reason = 'context_changed';
  }

  // Slim neighbors — strip schemas, connection properties, prepositions
  const leanNeighbors: LeanHorizonNeighbor[] = full.neighbors.map(n => ({
    nord: {
      id: n.nord.id,
      title: n.nord.title,
      type_name: n.nord.type_name,
    },
    relationship: {
      connection_id: n.relationship.connection_id,
      type_name: n.relationship.type_name,
      verb: n.relationship.verb,
      direction: n.relationship.direction,
      distance_x: n.relationship.distance_x,
    },
    persona_bias: n.persona_bias,
    goal_proximity: n.goal_proximity,
  }));

  // Slim current_nord — properties are read-only context (design-time metadata)
  const leanCurrentNord = full.current_nord ? {
    id: full.current_nord.id,
    title: full.current_nord.title,
    type_name: full.current_nord.type_name,
    properties: full.current_nord.properties,
    session_progress: full.current_nord.session_progress,
  } : null;

  return {
    current_nord: leanCurrentNord,
    completion: full.completion,
    neighbors: leanNeighbors,
    suggested_next: full.suggested_next,
    predicted_path: full.predicted_path,
    traversal_history: full.traversal_history,
    goals: full.goals,
    suggested_persona: full.suggested_persona,
    session_meta: full.session_meta,
    context_hint: { stale, reason },
  };
}

// ── Session Context Types ──

export interface SessionContext {
  persona: SessionHorizon['persona'];
  remaining_variables: SessionHorizon['remaining_variables'];
  planning_queue: SessionHorizon['planning_queue'];
  connection_schemas: Record<string, { verb: string | null; schema: unknown[] }>;
  neighbor_details: Array<{
    nord_id: string;
    connection_properties: Record<string, unknown>;
    direction_prepositions: { forward: string; reverse: string; both: string } | null;
    measurement_mode: string;
    distance_y: number;
  }>;
  context_version: number;
}

/**
 * Get Session Context — the rich on-demand payload.
 *
 * Returns persona details, remaining variables with descriptions,
 * planning queue, and deduplicated connection schemas.
 * Marks the context as served so subsequent lean horizons report stale=false.
 */
export async function getSessionContext(sessionId: string): Promise<SessionContext> {
  const full = await getSessionHorizon(sessionId);

  // Deduplicate connection schemas by type name
  const connectionSchemas: Record<string, { verb: string | null; schema: unknown[] }> = {};
  for (const n of full.neighbors) {
    const typeName = n.relationship.type_name;
    if (!connectionSchemas[typeName]) {
      connectionSchemas[typeName] = {
        verb: n.relationship.verb,
        schema: n.relationship.connection_schema,
      };
    }
  }

  // Rich neighbor details (the parts stripped from the lean horizon)
  const neighborDetails = full.neighbors.map(n => ({
    nord_id: n.nord.id,
    connection_properties: n.relationship.connection_properties,
    direction_prepositions: n.relationship.direction_prepositions,
    measurement_mode: n.relationship.measurement_mode,
    distance_y: n.relationship.distance_y,
  }));

  // Mark context as served
  await markContextServed(sessionId);

  // Get the current context version
  const session = await queryOne<{ context_version: number }>(
    'SELECT context_version FROM mcp_sessions WHERE id = $1',
    [sessionId]
  );

  return {
    persona: full.persona,
    remaining_variables: full.remaining_variables,
    planning_queue: full.planning_queue,
    connection_schemas: connectionSchemas,
    neighbor_details: neighborDetails,
    context_version: session?.context_version ?? 0,
  };
}



export async function checkSessionCompletion(
  sessionId: string
): Promise<{ shouldTransition: boolean; endNordId: string | null; incompleteCount: number }> {
  // Completion is now tracked via goal variable bindings (mcp_session_variables).
  // Check if all active goals are complete.
  const session = await queryOne<McpSession>(
    'SELECT * FROM mcp_sessions WHERE id = $1',
    [sessionId]
  );
  if (!session) {
    return { shouldTransition: false, endNordId: null, incompleteCount: 0 };
  }

  const sessionGoals = await goalsRepo.findSessionGoals(sessionId, session.project_id, session.persona_id);
  const activeGoals = sessionGoals.filter(g => !g.is_implicit && g.status === 'active');
  const incompleteGoals = activeGoals.filter(g => {
    const filled = g.variables?.filter(v => v.collected).length || 0;
    const total = g.variables?.length || 0;
    return total === 0 || filled < total;
  });

  if (incompleteGoals.length > 0) {
    return { shouldTransition: false, endNordId: null, incompleteCount: incompleteGoals.length };
  }

  // All goals complete — look up project's end nord
  const project = await queryOne<Project>(
    'SELECT default_end_nord_id FROM projects WHERE id = $1',
    [session.project_id]
  );

  const endNordId = project?.default_end_nord_id ?? null;
  if (!endNordId) {
    return { shouldTransition: false, endNordId: null, incompleteCount: 0 };
  }

  // Transition: update current nord to End Nord
  await updateCurrentNord(sessionId, endNordId);

  return { shouldTransition: true, endNordId, incompleteCount: 0 };
}

// ── Project Dictionary (Ontology for AI) ──

export interface ProjectDictionary {
  nord_types: Array<{
    id: string;
    name: string;
    description: string | null;
    icon: string | null;
    accent_color: string | null;
    properties_schema: Record<string, unknown>[];
  }>;
  connection_types: Array<{
    id: string;
    name: string;
    description: string;
    verb: string | null;
    direction_prepositions: { forward: string; reverse: string; both: string } | null;
    measurement_mode: string;
    x_stage_labels: Array<{ label: string; position: number }>;
    y_stage_labels: Array<{ label: string; position: number }>;
    properties_schema: Record<string, unknown>[];
  }>;
  personas: Array<{
    id: string;
    name: string;
    background: string;
    primary_motivation: string;
    voice_and_tone: string;
    exchange_style: string;
    guardrails: Array<{ mode: string; text: string }>;
    mental_models: Array<{ name: string; body: string }>;
    category_weights: Array<{ connection_type_id: string; connection_type_name: string; weight: number }>;
  }>;
  goals: Array<{
    id: string;
    name: string;
    description: string;
    end_type: 'reset' | 'continue' | null;
    achieved_prompt: string | null;
    prerequisite_gate: 'all' | 'any';
    fork_type: 'parallel' | 'exclusive';
    variable_bindings: Array<{
      variable_id: string;
      variable_name: string;
      required: boolean;
    }>;
    relevant_nords: Array<{ nord_id: string; nord_title: string }>;
    relevant_nord_types: Array<{ nord_type_id: string; nord_type_name: string }>;
  }>;
  goal_edges: Array<{
    source_goal_id: string;
    target_goal_id: string;
  }>;
  collection_variables: Array<{
    id: string;
    name: string;
    description: string;
    type: string;
    options: unknown[] | null;
    required: boolean;
    hint: string;
    tags: string[];
  }>;
}

/**
 * Get the project dictionary — the full ontology the AI needs to
 * understand the vocabulary and mission of a project.
 *
 * This should be the FIRST tool the AI calls. It answers:
 * - "What kinds of nords exist and what properties do they have?"
 * - "What kinds of connections exist, what do they measure, and what are their stages?"
 * - "What personas are available, what do they care about, and how should they speak?"
 * - "What goals exist, what variables drive their completion, and how are they sequenced?"
 * - "What collection variables need to be gathered from the user?"
 */
export async function getProjectDictionary(projectId: string): Promise<ProjectDictionary> {
  // Check cache first
  const cached = dictionaryCache.get(projectId);
  if (cached && Date.now() < cached.expires) {
    return cached.data;
  }

  const result = await _fetchProjectDictionary(projectId);

  // Store in cache
  dictionaryCache.set(projectId, { data: result, expires: Date.now() + DICTIONARY_TTL_MS });
  return result;
}

/** Internal: fetches dictionary from DB (uncached) */
async function _fetchProjectDictionary(projectId: string): Promise<ProjectDictionary> {
  // Nord types
  const nordTypes = await query<{
    id: string; name: string; description: string | null;
    icon: string | null; accent_color: string | null;
    properties_schema: string;
  }>(
    'SELECT id, name, description, icon, accent_color, properties_schema::text FROM nord_types WHERE project_id = $1 AND deleted_at IS NULL ORDER BY sort_order',
    [projectId]
  );

  // Connection types
  const connTypes = await query<{
    id: string; name: string; description: string;
    verb: string | null; direction_prepositions: string | null;
    measurement_mode: string; x_stage_labels: string; y_stage_labels: string;
    properties_schema: string;
  }>(
    'SELECT id, name, description, verb, direction_prepositions::text, measurement_mode, x_stage_labels::text, y_stage_labels::text, properties_schema::text FROM connection_types WHERE project_id = $1 AND deleted_at IS NULL ORDER BY sort_order',
    [projectId]
  );

  // Personas with mental models and category weights (joined to connection type names)
  const personas = await query<{
    id: string; name: string; background: string;
    primary_motivation: string; voice_and_tone: string;
    exchange_style: string; guardrails: string;
  }>(
    'SELECT id, name, background, primary_motivation, voice_and_tone, exchange_style, guardrails::text FROM personas WHERE project_id = $1 AND deleted_at IS NULL ORDER BY sort_order, name',
    [projectId]
  );

  const personaIds = personas.map(p => p.id);

  // Mental models
  const mentalModels = personaIds.length > 0
    ? await query<{ persona_id: string; name: string; body: string }>(
        'SELECT persona_id, name, body FROM persona_mental_models WHERE persona_id = ANY($1) ORDER BY sort_order',
        [personaIds]
      )
    : [];

  // Category weights with connection type names
  const catWeights = personaIds.length > 0
    ? await query<{ persona_id: string; connection_type_id: string; connection_type_name: string; weight: number }>(
        `SELECT cw.persona_id, cw.connection_type_id, ct.name AS connection_type_name, cw.weight
         FROM persona_category_weights cw
         JOIN connection_types ct ON ct.id = cw.connection_type_id
         WHERE cw.persona_id = ANY($1)`,
        [personaIds]
      )
    : [];

  // Group mental models and weights by persona
  const modelsByPersona = new Map<string, Array<{ name: string; body: string }>>();
  for (const m of mentalModels) {
    const arr = modelsByPersona.get(m.persona_id) || [];
    arr.push({ name: m.name, body: m.body });
    modelsByPersona.set(m.persona_id, arr);
  }

  const weightsByPersona = new Map<string, Array<{ connection_type_id: string; connection_type_name: string; weight: number }>>();
  for (const w of catWeights) {
    const arr = weightsByPersona.get(w.persona_id) || [];
    arr.push({ connection_type_id: w.connection_type_id, connection_type_name: w.connection_type_name, weight: w.weight });
    weightsByPersona.set(w.persona_id, arr);
  }

  // ── Goals, variable bindings, relevant nords/types, DAG edges ──

  const goalRows = await query<{
    id: string; name: string; description: string;
    end_type: string | null; achieved_prompt: string | null;
    prerequisite_gate: string; fork_type: string; is_implicit: boolean;
  }>(
    'SELECT id, name, description, end_type, achieved_prompt, prerequisite_gate, fork_type, is_implicit FROM goals WHERE project_id = $1 ORDER BY sort_order, created_at',
    [projectId]
  );

  // Filter out implicit goals — they're auto-managed, not design-time definitions
  const explicitGoals = goalRows.filter(g => !g.is_implicit);
  const goalIds = explicitGoals.map(g => g.id);

  const [varBindings, relevantNords, relevantNordTypes, goalEdges] = await Promise.all([
    goalIds.length > 0
      ? query<{ goal_id: string; variable_id: string; variable_name: string; required: boolean }>(
          `SELECT gvb.goal_id, gvb.variable_id, pv.name AS variable_name, gvb.required
           FROM goal_variable_bindings gvb
           JOIN project_variables pv ON pv.id = gvb.variable_id
           WHERE gvb.goal_id = ANY($1)
           ORDER BY gvb.created_at`,
          [goalIds]
        )
      : Promise.resolve([]),
    goalIds.length > 0
      ? query<{ goal_id: string; nord_id: string; nord_title: string }>(
          `SELECT grn.goal_id, grn.nord_id, n.title AS nord_title
           FROM goal_relevant_nords grn
           JOIN nords n ON n.id = grn.nord_id
           WHERE grn.goal_id = ANY($1)`,
          [goalIds]
        )
      : Promise.resolve([]),
    goalIds.length > 0
      ? query<{ goal_id: string; nord_type_id: string; nord_type_name: string }>(
          `SELECT grnt.goal_id, grnt.nord_type_id, nt.name AS nord_type_name
           FROM goal_relevant_nord_types grnt
           JOIN nord_types nt ON nt.id = grnt.nord_type_id
           WHERE grnt.goal_id = ANY($1)`,
          [goalIds]
        )
      : Promise.resolve([]),
    query<{ source_goal_id: string; target_goal_id: string }>(
      'SELECT source_goal_id, target_goal_id FROM goal_edges WHERE project_id = $1',
      [projectId]
    ),
  ]);

  // Group bindings, relevant nords, and relevant types by goal
  const bindingsByGoal = new Map<string, Array<{ variable_id: string; variable_name: string; required: boolean }>>();
  for (const b of varBindings) {
    const arr = bindingsByGoal.get(b.goal_id) || [];
    arr.push({ variable_id: b.variable_id, variable_name: b.variable_name, required: b.required });
    bindingsByGoal.set(b.goal_id, arr);
  }

  const nordsByGoal = new Map<string, Array<{ nord_id: string; nord_title: string }>>();
  for (const rn of relevantNords) {
    const arr = nordsByGoal.get(rn.goal_id) || [];
    arr.push({ nord_id: rn.nord_id, nord_title: rn.nord_title });
    nordsByGoal.set(rn.goal_id, arr);
  }

  const typesByGoal = new Map<string, Array<{ nord_type_id: string; nord_type_name: string }>>();
  for (const rt of relevantNordTypes) {
    const arr = typesByGoal.get(rt.goal_id) || [];
    arr.push({ nord_type_id: rt.nord_type_id, nord_type_name: rt.nord_type_name });
    typesByGoal.set(rt.goal_id, arr);
  }

  // ── Collection Variables (project-level registry) ──

  const collectionVars = await query<{
    id: string; name: string; description: string;
    type: string; options: string | null; required: boolean;
    hint: string; tags: string | null;
  }>(
    'SELECT id, name, description, type, options::text, required, hint, tags::text FROM project_variables WHERE project_id = $1 ORDER BY sort_order, created_at',
    [projectId]
  );

  return {
    nord_types: nordTypes.map(t => ({
      id: t.id,
      name: t.name,
      description: t.description,
      icon: t.icon,
      accent_color: t.accent_color,
      properties_schema: safeParseJSON(t.properties_schema, []),
    })),
    connection_types: connTypes.map(t => ({
      id: t.id,
      name: t.name,
      description: t.description,
      verb: t.verb,
      direction_prepositions: safeParseJSON(t.direction_prepositions, null),
      measurement_mode: t.measurement_mode,
      x_stage_labels: safeParseJSON(t.x_stage_labels, []),
      y_stage_labels: safeParseJSON(t.y_stage_labels, []),
      properties_schema: safeParseJSON(t.properties_schema, []),
    })),
    personas: personas.map(p => ({
      id: p.id,
      name: p.name,
      background: p.background,
      primary_motivation: p.primary_motivation,
      voice_and_tone: p.voice_and_tone,
      exchange_style: p.exchange_style || 'bi_directional',
      guardrails: safeParseJSON(p.guardrails, []),
      mental_models: modelsByPersona.get(p.id) || [],
      category_weights: weightsByPersona.get(p.id) || [],
    })),
    goals: explicitGoals.map(g => ({
      id: g.id,
      name: g.name,
      description: g.description,
      end_type: (g.end_type as 'reset' | 'continue') || null,
      achieved_prompt: g.achieved_prompt,
      prerequisite_gate: (g.prerequisite_gate as 'all' | 'any') || 'all',
      fork_type: (g.fork_type as 'parallel' | 'exclusive') || 'parallel',
      variable_bindings: bindingsByGoal.get(g.id) || [],
      relevant_nords: nordsByGoal.get(g.id) || [],
      relevant_nord_types: typesByGoal.get(g.id) || [],
    })),
    goal_edges: goalEdges.map(e => ({
      source_goal_id: e.source_goal_id,
      target_goal_id: e.target_goal_id,
    })),
    collection_variables: collectionVars.map(v => ({
      id: v.id,
      name: v.name,
      description: v.description,
      type: v.type,
      options: safeParseJSON(v.options, null),
      required: v.required,
      hint: v.hint,
      tags: safeParseJSON(v.tags, []),
    })),
  };
}

// ══════════════════════════════════════════════════════════
// Session Variable Capture + Goal Evaluation
// ══════════════════════════════════════════════════════════

export interface McpSessionVariable {
  id: string;
  session_id: string;
  variable_id: string;
  value: unknown;
  nord_id: string | null;
  persona_id: string | null;
  sequence: number;
  collected_at: string;
}

/**
 * Upsert a session variable value (with provenance).
 *
 * After writing the variable, this automatically:
 * 1. Evaluates all session goals (for potential completion cascading)
 * 2. Logs any resulting goal events (completion, activation, cancellation)
 * 3. Checks for persona switching recommendation
 *
 * Returns the updated variable + any goal events.
 */
export async function upsertSessionVariable(
  sessionId: string,
  variableId: string,
  value: unknown,
  nordId: string | null,
  personaId: string | null
): Promise<{ variable: McpSessionVariable; goalEvents: goalsRepo.GoalEvent[] }> {
  // Get sequence number (max + 1)
  const seqRow = await queryOne<{ seq: string }>(`
    SELECT COALESCE(MAX(sequence), 0) + 1 AS seq FROM mcp_session_variables WHERE session_id = $1
  `, [sessionId]);
  const sequence = parseInt(seqRow?.seq || '1', 10);

  const variable = await queryOne<McpSessionVariable>(`
    INSERT INTO mcp_session_variables (session_id, variable_id, value, nord_id, persona_id, sequence)
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (session_id, variable_id) DO UPDATE SET
      value = $3, nord_id = $4, persona_id = $5, sequence = $6, collected_at = NOW()
    RETURNING *
  `, [sessionId, variableId, JSON.stringify(value), nordId, personaId, sequence]) as McpSessionVariable;

  // Get project_id from session
  const session = await queryOne<McpSession>('SELECT * FROM mcp_sessions WHERE id = $1', [sessionId]);
  if (!session) return { variable, goalEvents: [] };

  // Evaluate goals — this handles DAG chaining, structural exclusion, etc.
  const goalEvents = await goalsRepo.evaluateGoals(sessionId, session.project_id);

  // Log each goal event to the session_goal_events table
  for (const event of goalEvents) {
    await logGoalEvent(sessionId, event);
  }

  return { variable, goalEvents };
}

/**
 * Log a goal event to the mcp_session_goal_events table for analytics/replay.
 */
export async function logGoalEvent(
  sessionId: string,
  event: goalsRepo.GoalEvent
): Promise<void> {
  await query(`
    INSERT INTO mcp_session_goal_events (session_id, goal_id, event_type, event_data)
    VALUES ($1, $2, $3, $4)
  `, [
    sessionId,
    event.goal_id,
    event.type,
    JSON.stringify({
      goal_name: event.goal_name,
      achieved_prompt: event.achieved_prompt,
      reason: event.reason,
      excluded_by_goal: event.excluded_by_goal,
      end_type: event.end_type,
      progress: event.progress,
    }),
  ]);
}

/**
 * Automatically switch personas based on suggested_persona from horizon.
 * Called by the MCP tool layer after variable collection when a switch is recommended.
 */
export async function autoSwitchPersona(
  sessionId: string,
  suggestedPersonaId: string
): Promise<McpSession | null> {
  return updateSessionPersona(sessionId, suggestedPersonaId);
}

/**
 * Get all session variables for a session.
 */
export async function findSessionVariables(sessionId: string): Promise<McpSessionVariable[]> {
  return query<McpSessionVariable>(`
    SELECT * FROM mcp_session_variables
    WHERE session_id = $1
    ORDER BY sequence ASC
  `, [sessionId]);
}

/**
 * Get all goal events for a session (analytics/replay).
 */
export async function findGoalEvents(sessionId: string): Promise<Array<{
  id: string;
  session_id: string;
  goal_id: string;
  event_type: string;
  event_data: Record<string, unknown>;
  created_at: string;
}>> {
  return query(`
    SELECT * FROM mcp_session_goal_events
    WHERE session_id = $1
    ORDER BY created_at ASC
  `, [sessionId]);
}
