import { query, queryOne } from '../db.js';
import type { McpSession, McpTraversal, McpNordVisit, McpSessionNord } from '../types/entities.js';

// ── Sessions ──

export async function createSession(projectId: string, personaId?: string | null): Promise<McpSession> {
  return queryOne<McpSession>(`
    INSERT INTO mcp_sessions (project_id, persona_id)
    VALUES ($1, $2)
    RETURNING *
  `, [projectId, personaId || null]) as Promise<McpSession>;
}

export async function endSession(id: string, status: 'completed' | 'abandoned', summary?: string): Promise<McpSession | null> {
  return queryOne<McpSession>(`
    UPDATE mcp_sessions
    SET ended_at = NOW(), status = $2, summary = $3
    WHERE id = $1
    RETURNING *
  `, [id, status, summary || null]);
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
