/**
 * Test Helpers — DB connection + fixture management for integration tests.
 *
 * Every test suite creates its own project/variables/goals and tears them
 * down in afterAll, so tests are fully re-runnable and never conflict.
 */
import { query, queryOne, pool } from '../db.js';

// ── Fixture: Create a throwaway project ──
export async function createTestProject(name: string = 'Test Project'): Promise<string> {
  const row = await queryOne<{ id: string }>(`
    INSERT INTO projects (name, description, purpose, mcp_enabled, mcp_capture_data, mcp_mutable, project_mode)
    VALUES ($1, 'test', 'test', true, true, true, 'guided')
    RETURNING id
  `, [name + ' ' + Date.now()]);
  return row!.id;
}

// ── Fixture: Create a project variable ──
export async function createTestVariable(
  projectId: string,
  name: string,
  opts: { required?: boolean; type?: string; sort_order?: number } = {}
): Promise<string> {
  const row = await queryOne<{ id: string }>(`
    INSERT INTO project_variables (project_id, name, type, required, sort_order)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id
  `, [projectId, name, opts.type ?? 'string', opts.required ?? true, opts.sort_order ?? 0]);
  return row!.id;
}

// ── Fixture: Create a goal ──
export async function createTestGoal(
  projectId: string,
  name: string,
  opts: { end_type?: 'reset' | 'continue' | null; sort_order?: number; achieved_prompt?: string } = {}
): Promise<string> {
  const row = await queryOne<{ id: string }>(`
    INSERT INTO goals (project_id, name, end_type, sort_order, achieved_prompt)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id
  `, [projectId, name, opts.end_type ?? null, opts.sort_order ?? 0, opts.achieved_prompt ?? null]);
  return row!.id;
}

// ── Fixture: Create a goal edge ──
export async function createTestEdge(projectId: string, sourceId: string, targetId: string): Promise<string> {
  const row = await queryOne<{ id: string }>(`
    INSERT INTO goal_edges (project_id, source_goal_id, target_goal_id)
    VALUES ($1, $2, $3)
    ON CONFLICT (source_goal_id, target_goal_id) DO NOTHING
    RETURNING id
  `, [projectId, sourceId, targetId]);
  return row!.id;
}

// ── Fixture: Bind a variable to a goal ──
export async function bindVariable(goalId: string, variableId: string, required: boolean = true): Promise<string> {
  const row = await queryOne<{ id: string }>(`
    INSERT INTO goal_variable_bindings (goal_id, variable_id, required)
    VALUES ($1, $2, $3)
    ON CONFLICT (goal_id, variable_id) DO NOTHING
    RETURNING id
  `, [goalId, variableId, required]);
  return row!.id;
}

// ── Fixture: Create a session ──
export async function createTestSession(projectId: string, opts?: { personaId?: string; startNordId?: string }): Promise<string> {
  const row = await queryOne<{ id: string }>(`
    INSERT INTO mcp_sessions (project_id, persona_id, current_nord_id)
    VALUES ($1, $2, $3)
    RETURNING id
  `, [projectId, opts?.personaId ?? null, opts?.startNordId ?? null]);
  return row!.id;
}

// ── Fixture: Set a session variable ──
export async function setSessionVariable(
  sessionId: string,
  variableId: string,
  value: unknown
): Promise<void> {
  await query(`
    INSERT INTO mcp_session_variables (session_id, variable_id, value, sequence)
    VALUES ($1, $2, $3, (SELECT COALESCE(MAX(sequence), 0) + 1 FROM mcp_session_variables WHERE session_id = $1))
    ON CONFLICT (session_id, variable_id) DO UPDATE SET value = $3, collected_at = NOW()
  `, [sessionId, variableId, JSON.stringify(value)]);
}

// ══════════════════════════════════════════════════════════
// Graph Fixtures — Nord Types, Nords, Connection Types, Connections
// ══════════════════════════════════════════════════════════

/** Create a nord type (schema definition for node cards) */
export async function createTestNordType(
  projectId: string,
  name: string,
  opts?: { propertiesSchema?: unknown[] }
): Promise<string> {
  const row = await queryOne<{ id: string }>(`
    INSERT INTO nord_types (project_id, name, properties_schema)
    VALUES ($1, $2, $3)
    RETURNING id
  `, [projectId, name, JSON.stringify(opts?.propertiesSchema ?? [])]);
  return row!.id;
}

/** Create a nord (node card instance) */
export async function createTestNord(
  projectId: string,
  typeId: string,
  title: string,
  opts?: { properties?: Record<string, unknown> }
): Promise<string> {
  const row = await queryOne<{ id: string }>(`
    INSERT INTO nords (project_id, type_id, title, properties)
    VALUES ($1, $2, $3, $4)
    RETURNING id
  `, [projectId, typeId, title, JSON.stringify(opts?.properties ?? {})]);
  return row!.id;
}

/** Create a connection type (edge schema with verb + direction) */
export async function createTestConnectionType(
  projectId: string,
  name: string,
  opts?: { verb?: string; defaultDirection?: string; measurementMode?: string }
): Promise<string> {
  const row = await queryOne<{ id: string }>(`
    INSERT INTO connection_types (project_id, name, verb, default_direction, measurement_mode)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id
  `, [
    projectId,
    name,
    opts?.verb ?? null,
    opts?.defaultDirection ?? 'none',
    opts?.measurementMode ?? 'none',
  ]);
  return row!.id;
}

/** Create a connection (edge instance) between two nords */
export async function createTestConnection(
  projectId: string,
  typeId: string,
  sourceNordId: string,
  targetNordId: string,
  opts?: { direction?: string; distanceX?: number; distanceY?: number }
): Promise<string> {
  const row = await queryOne<{ id: string }>(`
    INSERT INTO connections (project_id, type_id, source_nord_id, target_nord_id, direction, distance_x, distance_y)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id
  `, [
    projectId,
    typeId,
    sourceNordId,
    targetNordId,
    opts?.direction ?? 'forward',
    opts?.distanceX ?? 0.5,
    opts?.distanceY ?? 0.5,
  ]);
  return row!.id;
}

// ══════════════════════════════════════════════════════════
// Persona Fixtures
// ══════════════════════════════════════════════════════════

/** Create a persona */
export async function createTestPersona(
  projectId: string,
  name: string,
  opts?: { primaryMotivation?: string; voiceAndTone?: string; background?: string }
): Promise<string> {
  const row = await queryOne<{ id: string }>(`
    INSERT INTO personas (project_id, name, primary_motivation, voice_and_tone, background)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id
  `, [
    projectId,
    name,
    opts?.primaryMotivation ?? '',
    opts?.voiceAndTone ?? '',
    opts?.background ?? '',
  ]);
  return row!.id;
}

/** Add a mental model to a persona */
export async function addTestMentalModel(
  personaId: string,
  name: string,
  body: string,
  sortOrder: number = 0
): Promise<string> {
  const row = await queryOne<{ id: string }>(`
    INSERT INTO persona_mental_models (persona_id, name, body, sort_order)
    VALUES ($1, $2, $3, $4)
    RETURNING id
  `, [personaId, name, body, sortOrder]);
  return row!.id;
}

/** Set a persona's category weight for a connection type */
export async function setPersonaCategoryWeight(
  personaId: string,
  connectionTypeId: string,
  weight: number
): Promise<void> {
  await query(`
    INSERT INTO persona_category_weights (persona_id, connection_type_id, weight)
    VALUES ($1, $2, $3)
    ON CONFLICT (persona_id, connection_type_id) DO UPDATE SET weight = $3
  `, [personaId, connectionTypeId, weight]);
}

/** Set a persona's goal weight */
export async function setPersonaGoalWeight(
  personaId: string,
  goalId: string,
  weight: number
): Promise<void> {
  await query(`
    INSERT INTO persona_goal_weights (persona_id, goal_id, weight)
    VALUES ($1, $2, $3)
    ON CONFLICT (persona_id, goal_id) DO UPDATE SET weight = $3
  `, [personaId, goalId, weight]);
}

/** Assign a persona to an existing session */
export async function setSessionPersona(sessionId: string, personaId: string | null): Promise<void> {
  await query('UPDATE mcp_sessions SET persona_id = $2 WHERE id = $1', [sessionId, personaId]);
}

/** Move session to a specific nord */
export async function setSessionCurrentNord(sessionId: string, nordId: string | null): Promise<void> {
  await query('UPDATE mcp_sessions SET current_nord_id = $2 WHERE id = $1', [sessionId, nordId]);
}

// ── Cleanup: Delete a test project (cascades to everything) ──
export async function deleteTestProject(projectId: string): Promise<void> {
  // Delete entities that may not have ON DELETE CASCADE FK constraints
  await query('DELETE FROM goal_properties WHERE goal_id IN (SELECT id FROM goals WHERE project_id = $1)', [projectId]);
  await query('DELETE FROM goal_edges WHERE project_id = $1', [projectId]);
  await query('DELETE FROM goals WHERE project_id = $1', [projectId]);
  await query('DELETE FROM connections WHERE project_id = $1', [projectId]);
  await query('DELETE FROM nords WHERE project_id = $1', [projectId]);
  // Now safe to delete the project itself
  await query('DELETE FROM projects WHERE id = $1', [projectId]);
}

// ── DB lifecycle ──
export async function closePool(): Promise<void> {
  await pool.end();
}

export { query, queryOne };
