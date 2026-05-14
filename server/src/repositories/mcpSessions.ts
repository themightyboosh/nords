import { query, queryOne } from '../db.js';
import type { McpSession, McpTraversal, McpNordVisit, McpSessionNord, Project } from '../types/entities.js';

// ── Sessions ──

export async function createSession(projectId: string, personaId?: string | null, startNordId?: string | null): Promise<McpSession> {
  return queryOne<McpSession>(`
    INSERT INTO mcp_sessions (project_id, persona_id, current_nord_id)
    VALUES ($1, $2, $3)
    RETURNING *
  `, [projectId, personaId || null, startNordId || null]) as Promise<McpSession>;
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

// ── Session-scoped Nord Completion (Instance Layer) ──

/**
 * Upsert session-scoped properties for a Nord.
 * Merges new properties into existing, recalculates filled/complete.
 */
export async function upsertSessionNord(
  sessionId: string,
  nordId: string,
  properties: Record<string, unknown>,
  requiredCount: number,
  filledCount: number
): Promise<McpSessionNord> {
  return queryOne<McpSessionNord>(`
    INSERT INTO mcp_session_nords (session_id, nord_id, properties, required_count, filled_count, complete)
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (session_id, nord_id) DO UPDATE SET
      properties = mcp_session_nords.properties || $3::jsonb,
      required_count = $4,
      filled_count = $5,
      complete = $6,
      last_visited = NOW()
    RETURNING *
  `, [
    sessionId,
    nordId,
    JSON.stringify(properties),
    requiredCount,
    filledCount,
    filledCount >= requiredCount && requiredCount > 0,
  ]) as Promise<McpSessionNord>;
}

/** Get a single Nord's completion state within a session */
export async function findSessionNord(sessionId: string, nordId: string): Promise<McpSessionNord | null> {
  return queryOne<McpSessionNord>(
    'SELECT * FROM mcp_session_nords WHERE session_id = $1 AND nord_id = $2',
    [sessionId, nordId]
  );
}

/** Get all Nord completion states for a session */
export async function findSessionNords(sessionId: string): Promise<McpSessionNord[]> {
  return query<McpSessionNord>(
    'SELECT * FROM mcp_session_nords WHERE session_id = $1 ORDER BY last_visited DESC',
    [sessionId]
  );
}

/** Get only incomplete Nords for a session (gate-readiness check) */
export async function findIncompleteSessionNords(sessionId: string): Promise<McpSessionNord[]> {
  return query<McpSessionNord>(
    'SELECT * FROM mcp_session_nords WHERE session_id = $1 AND complete = FALSE ORDER BY last_visited DESC',
    [sessionId]
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

export interface HorizonNeighbor {
  nord: { id: string; title: string; type_id: string; type_name: string; properties: Record<string, unknown> };
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
    connection_properties: Record<string, unknown>; // #3: connection-level properties
  };
  session_progress: { filled: number; required: number; complete: boolean } | null; // #2: session state for this neighbor
  persona_bias: number;
  spectrum_position: number;
}

export interface SessionHorizon {
  current_nord: {
    id: string; title: string; type_name: string; properties: Record<string, unknown>;
    session_progress: { filled: number; required: number; complete: boolean } | null; // #7: current nord completion
  } | null;
  persona: { id: string; name: string; weights: Record<string, number> } | null;
  completion: { filled: number; required: number; percentage: number };
  neighbors: HorizonNeighbor[];
  traversal_history: string[];
  suggested_next: { nord_id: string; title: string; reason: string } | null;
  predicted_path: Array<{ nord_id: string; title: string; type_name: string }>; // predictive 2-hop lookahead
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
    return { current_nord: null, persona: null, completion: { filled: 0, required: 0, percentage: 0 }, neighbors: [], traversal_history: [], suggested_next: null, predicted_path: [] };
  }

  // Pre-fetch all session nords (used for completion + neighbor progress)
  const sessionNords = await findSessionNords(sessionId);
  const sessionNordMap = new Map(sessionNords.map(sn => [sn.nord_id, sn]));

  // 2. Current nord WITH session completion (#7)
  let currentNord: SessionHorizon['current_nord'] = null;
  if (session.current_nord_id) {
    const nord = await queryOne<{ id: string; title: string; type_id: string; properties: Record<string, unknown> }>(
      'SELECT id, title, type_id, properties FROM nords WHERE id = $1 AND deleted_at IS NULL',
      [session.current_nord_id]
    );
    if (nord) {
      const nordType = await queryOne<{ name: string }>('SELECT name FROM nord_types WHERE id = $1', [nord.type_id]);
      const sn = sessionNordMap.get(nord.id);
      currentNord = {
        id: nord.id, title: nord.title, type_name: nordType?.name || 'Unknown', properties: nord.properties,
        session_progress: sn ? { filled: sn.filled_count, required: sn.required_count, complete: sn.complete } : null,
      };
    }
  }

  // 3. Persona with category weights
  let persona: SessionHorizon['persona'] = null;
  const personaWeights: Record<string, number> = {};
  if (session.persona_id) {
    const p = await queryOne<{ id: string; name: string }>('SELECT id, name FROM personas WHERE id = $1 AND deleted_at IS NULL', [session.persona_id]);
    if (p) {
      const weights = await query<{ connection_type_id: string; weight: number }>(
        'SELECT connection_type_id, weight FROM persona_category_weights WHERE persona_id = $1',
        [p.id]
      );
      for (const w of weights) personaWeights[w.connection_type_id] = w.weight;
      persona = { id: p.id, name: p.name, weights: personaWeights };
    }
  }

  // 4. Neighbors with semantic context + session progress + connection properties (#2, #3)
  const neighbors: HorizonNeighbor[] = [];
  if (session.current_nord_id) {
    const connRows = await query<{
      conn_id: string; conn_type_id: string; conn_type_name: string;
      conn_verb: string | null; conn_measurement_mode: string;
      conn_x_stage_labels: string; conn_direction_prepositions: string | null;
      conn_properties: string; // #3: connection-level properties
      distance_x: number; distance_y: number; direction: string;
      neighbor_id: string; neighbor_title: string; neighbor_type_id: string;
      neighbor_type_name: string; neighbor_properties: Record<string, unknown>;
    }>(`
      SELECT
        c.id AS conn_id, c.type_id AS conn_type_id, ct.name AS conn_type_name,
        ct.verb AS conn_verb, ct.measurement_mode AS conn_measurement_mode,
        ct.x_stage_labels::text AS conn_x_stage_labels,
        ct.direction_prepositions::text AS conn_direction_prepositions,
        c.properties::text AS conn_properties,
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

      // #2: session progress for this neighbor
      const sn = sessionNordMap.get(row.neighbor_id);
      const session_progress = sn ? { filled: sn.filled_count, required: sn.required_count, complete: sn.complete } : null;

      neighbors.push({
        nord: { id: row.neighbor_id, title: row.neighbor_title, type_id: row.neighbor_type_id, type_name: row.neighbor_type_name, properties: row.neighbor_properties },
        relationship: {
          connection_id: row.conn_id, type_name: row.conn_type_name, verb: row.conn_verb,
          direction: row.direction, direction_prepositions: dirPreps,
          measurement_mode: row.conn_measurement_mode, stage,
          distance_x: row.distance_x, distance_y: row.distance_y,
          connection_properties: safeParseJSON(row.conn_properties, {}), // #3
        },
        session_progress,
        persona_bias,
        spectrum_position: row.distance_x,
      });
    }

    neighbors.sort((a, b) => b.persona_bias - a.persona_bias);
  }

  // 5. Completion stats
  const totalRequired = sessionNords.reduce((sum, sn) => sum + sn.required_count, 0);
  const totalFilled = sessionNords.reduce((sum, sn) => sum + sn.filled_count, 0);
  const completion = {
    filled: totalFilled,
    required: totalRequired,
    percentage: totalRequired > 0 ? Math.round((totalFilled / totalRequired) * 100) : 100,
  };

  // 6. Traversal history — single JOIN query (#6: fixes N+1)
  const traversalRows = await query<{
    source_title: string; target_title: string; traversal_type: string;
  }>(`
    SELECT
      sn.title AS source_title, tn.title AS target_title, t.traversal_type
    FROM mcp_traversals t
    LEFT JOIN nords sn ON sn.id = t.source_nord_id
    LEFT JOIN nords tn ON tn.id = t.target_nord_id
    WHERE t.session_id = $1
    ORDER BY t.traversed_at ASC
  `, [sessionId]);
  const traversal_history = traversalRows.map(r =>
    `${r.source_title || '?'} →(${r.traversal_type}) ${r.target_title || '?'}`
  );

  // 7. Suggested next — highest persona_bias incomplete neighbor
  const incompleteNordIds = new Set(
    sessionNords.filter(sn => !sn.complete && sn.required_count > 0).map(sn => sn.nord_id)
  );

  let suggested_next: SessionHorizon['suggested_next'] = null;
  for (const n of neighbors) {
    if (incompleteNordIds.has(n.nord.id)) {
      suggested_next = {
        nord_id: n.nord.id, title: n.nord.title,
        reason: `Highest persona bias neighbor (${(n.persona_bias * 100).toFixed(0)}%) with incomplete required properties`,
      };
      break;
    }
  }
  if (!suggested_next && neighbors.length > 0) {
    const top = neighbors[0];
    suggested_next = { nord_id: top.nord.id, title: top.nord.title, reason: `Highest persona bias neighbor (${(top.persona_bias * 100).toFixed(0)}%)` };
  }

  // 8. Predicted path — 2-hop lookahead from suggested_next (predictive)
  const predicted_path: SessionHorizon['predicted_path'] = [];
  if (suggested_next) {
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
    `, [suggested_next.nord_id, session.current_nord_id || '']);
    predicted_path.push(
      { nord_id: suggested_next.nord_id, title: suggested_next.title, type_name: neighbors.find(n => n.nord.id === suggested_next!.nord_id)?.nord.type_name || 'Unknown' },
      ...hop2
    );
  }

  return { current_nord: currentNord, persona, completion, neighbors, traversal_history, suggested_next, predicted_path };
}

export async function checkSessionCompletion(
  sessionId: string
): Promise<{ shouldTransition: boolean; endNordId: string | null; incompleteCount: number }> {
  // 1. Count remaining incomplete nords with required fields
  const incomplete = await query<McpSessionNord>(
    'SELECT * FROM mcp_session_nords WHERE session_id = $1 AND complete = FALSE AND required_count > 0',
    [sessionId]
  );

  if (incomplete.length > 0) {
    return { shouldTransition: false, endNordId: null, incompleteCount: incomplete.length };
  }

  // 2. All required fields filled — look up project's end nord
  const session = await queryOne<McpSession>(
    'SELECT * FROM mcp_sessions WHERE id = $1',
    [sessionId]
  );
  if (!session) {
    return { shouldTransition: false, endNordId: null, incompleteCount: 0 };
  }

  const project = await queryOne<Project>(
    'SELECT default_end_nord_id FROM projects WHERE id = $1',
    [session.project_id]
  );

  const endNordId = project?.default_end_nord_id ?? null;
  if (!endNordId) {
    return { shouldTransition: false, endNordId: null, incompleteCount: 0 };
  }

  // 3. Transition: update current nord to End Nord
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
    temperature: number;
    guardrails: Array<{ mode: string; text: string }>;
    mental_models: Array<{ name: string; body: string }>;
    category_weights: Array<{ connection_type_id: string; connection_type_name: string; weight: number }>;
  }>;
}

/**
 * Get the project dictionary — the full ontology the AI needs to
 * understand the vocabulary of nord types, connection types, and personas.
 *
 * This should be the FIRST tool the AI calls. It answers:
 * - "What kinds of nords exist and what properties do they have?"
 * - "What kinds of connections exist, what do they measure, and what are their stages?"
 * - "What personas are available, what do they care about, and how should they speak?"
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
    temperature: number; guardrails: string;
  }>(
    'SELECT id, name, background, primary_motivation, voice_and_tone, temperature, guardrails::text FROM personas WHERE project_id = $1 AND deleted_at IS NULL ORDER BY sort_order, name',
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
      temperature: p.temperature,
      guardrails: safeParseJSON(p.guardrails, []),
      mental_models: modelsByPersona.get(p.id) || [],
      category_weights: weightsByPersona.get(p.id) || [],
    })),
  };
}
