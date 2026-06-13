/**
 * Horizon Regression Tests — Phase 5 DBA Improvements
 *
 * Validates that getSessionHorizon() returns the correct response shape
 * after query consolidation. Uses a test project with a real session.
 *
 * Domain note: Nords are graph nodes that are TRAVERSED (navigated to),
 * not "completed". Completion is a concept on goals and variables.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getSessionHorizon } from '../repositories/mcpSessions.js';
import {
  createTestProject, createTestNordType, createTestNord,
  createTestConnectionType, createTestConnection,
  createTestSession, createTestPersona, createTestVariable,
  setSessionCurrentNord, setSessionPersona,
  deleteTestProject, closePool, queryOne,
} from './helpers.js';

// ── Test fixtures ──
let projectId: string;
let typeId: string;
let nordA: string;
let nordB: string;
let connTypeId: string;
let connectionId: string;
let personaId: string;
let sessionId: string;
let variableId: string;

// Dev user for owned projects
const DEV_USER_DB_ID = '95a61e26-455f-4b5a-aa0e-49cae435f730';

beforeAll(async () => {
  // Create a project with enough fixtures to exercise all horizon paths
  const row = await queryOne<{ id: string }>(`
    INSERT INTO projects (name, description, purpose, mcp_enabled, mcp_capture_data, mcp_mutable, project_mode, created_by)
    VALUES ($1, 'test', 'test purpose', true, true, true, 'guided', $2)
    RETURNING id
  `, ['Horizon Regression ' + Date.now(), DEV_USER_DB_ID]);
  projectId = row!.id;

  typeId = await createTestNordType(projectId, 'Requirement');
  nordA = await createTestNord(projectId, typeId, 'Nord Alpha', { properties: { status: 'draft' } });
  nordB = await createTestNord(projectId, typeId, 'Nord Beta', { properties: { status: 'active' } });
  connTypeId = await createTestConnectionType(projectId, 'relates_to', { verb: 'relates to' });
  connectionId = await createTestConnection(projectId, connTypeId, nordA, nordB);
  personaId = await createTestPersona(projectId, 'TestPersona', { primaryMotivation: 'test' });
  variableId = await createTestVariable(projectId, 'test_var', { required: true });

  sessionId = await createTestSession(projectId, { personaId, startNordId: nordA });
  await setSessionCurrentNord(sessionId, nordA);
  await setSessionPersona(sessionId, personaId);
});

afterAll(async () => {
  await deleteTestProject(projectId);
  await closePool();
});

describe('Horizon Response Shape (Phase 5 Regression)', () => {

  it('returns all expected top-level keys', async () => {
    const h = await getSessionHorizon(sessionId);
    expect(h).toHaveProperty('current_nord');
    expect(h).toHaveProperty('persona');
    expect(h).toHaveProperty('completion');
    expect(h).toHaveProperty('remaining_variables');
    expect(h).toHaveProperty('neighbors');
    expect(h).toHaveProperty('planning_queue');
    expect(h).toHaveProperty('traversal_history');
    expect(h).toHaveProperty('suggested_next');
    expect(h).toHaveProperty('predicted_path');
    expect(h).toHaveProperty('goals');
    expect(h).toHaveProperty('suggested_persona');
    expect(h).toHaveProperty('session_meta');
  });

  it('current_nord includes id, title, type_name, properties', async () => {
    const h = await getSessionHorizon(sessionId);
    expect(h.current_nord).not.toBeNull();
    expect(h.current_nord!.id).toBe(nordA);
    expect(h.current_nord!.title).toBe('Nord Alpha');
    expect(h.current_nord!.type_name).toBe('Requirement');
    expect(h.current_nord!.properties).toHaveProperty('status', 'draft');
  });

  it('persona includes name, weights, mental_models', async () => {
    const h = await getSessionHorizon(sessionId);
    expect(h.persona).not.toBeNull();
    expect(h.persona!.name).toBe('TestPersona');
    expect(h.persona!.weights).toBeDefined();
    expect(h.persona!.mental_models).toBeDefined();
  });

  it('neighbors include the connected nord', async () => {
    const h = await getSessionHorizon(sessionId);
    expect(h.neighbors.length).toBeGreaterThan(0);
    const neighbor = h.neighbors.find(n => n.nord.id === nordB);
    expect(neighbor).toBeDefined();
    expect(neighbor!.nord.title).toBe('Nord Beta');
    expect(neighbor!.relationship.type_name).toBe('relates_to');
    expect(neighbor!.relationship.connection_id).toBe(connectionId);
  });

  it('completion tracks variable progress', async () => {
    const h = await getSessionHorizon(sessionId);
    expect(h.completion).toBeDefined();
    expect(typeof h.completion.filled).toBe('number');
    expect(typeof h.completion.required).toBe('number');
    expect(typeof h.completion.percentage).toBe('number');
  });

  it('remaining_variables lists uncollected variables', async () => {
    const h = await getSessionHorizon(sessionId);
    expect(h.remaining_variables).toBeDefined();
    // We created 1 required variable and haven't filled it
    const testVar = h.remaining_variables.find(v => v.name === 'test_var');
    expect(testVar).toBeDefined();
    expect(testVar!.required).toBe(true);
  });

  it('session_meta includes inferred project_mode and purpose', async () => {
    const h = await getSessionHorizon(sessionId);
    expect(h.session_meta.session_id).toBe(sessionId);
    // project_mode is INFERRED: graph_only→'explore', goals→'guided', vars→'collect'
    // Our test project has variables but no goals, so it infers 'collect'
    expect(h.session_meta.project_mode).toBe('collect');
    expect(h.session_meta.project_purpose).toBe('test purpose');
    expect(h.session_meta.session_status).toBeDefined();
  });

  it('traversal_history is an array', async () => {
    const h = await getSessionHorizon(sessionId);
    expect(Array.isArray(h.traversal_history)).toBe(true);
  });

  it('suggested_next is an array', async () => {
    const h = await getSessionHorizon(sessionId);
    expect(Array.isArray(h.suggested_next)).toBe(true);
  });
});
