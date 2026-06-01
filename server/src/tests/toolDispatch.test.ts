/**
 * toolDispatch.test.ts — Integration tests for the 18 expanded MCP tools.
 *
 * Tests call dispatchTool() directly (bypassing HTTP/MCP transport) so
 * we exercise the real SQL queries against a live DB.
 *
 * Each describe block creates its own project/graph/session fixtures.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { dispatchTool, type ToolContext } from '../lib/toolDispatch.js';
import * as goalsRepo from '../repositories/goals.js';
import {
  createTestProject, createTestVariable, createTestGoal, createTestEdge,
  createTestNordType, createTestNord, createTestConnectionType, createTestConnection,
  createTestTraversal, createTestPersona,
  bindVariable, createTestSession, setSessionVariable, setSessionCurrentNord,
  deleteTestProject, closePool, query, queryOne,
} from './helpers.js';

// ── Helpers ──

function makeCtx(projectId: string, sessionId: string): ToolContext {
  return { projectId, sessionId, mcpMutable: false, mcpCaptureData: true };
}

// ══════════════════════════════════════════════════════════
// 1. nords_get_connected
// ══════════════════════════════════════════════════════════

describe('Tool: nords_get_connected', () => {
  let pid: string, sid: string;
  let typeId: string, connTypeId: string;
  let nordA: string, nordB: string, nordC: string;

  beforeAll(async () => {
    pid = await createTestProject('ToolConnected');
    typeId = await createTestNordType(pid, 'Topic');
    connTypeId = await createTestConnectionType(pid, 'relates', { verb: 'relates to' });
    nordA = await createTestNord(pid, typeId, 'Alpha');
    nordB = await createTestNord(pid, typeId, 'Beta');
    nordC = await createTestNord(pid, typeId, 'Gamma');
    await createTestConnection(pid, connTypeId, nordA, nordB);
    await createTestConnection(pid, connTypeId, nordA, nordC);
    sid = await createTestSession(pid);
  });
  afterAll(async () => { await deleteTestProject(pid); });

  it('returns connected nords for a given nord', async () => {
    const res = await dispatchTool('nords_get_connected', makeCtx(pid, sid), { nord_id: nordA });
    expect(res.success).toBe(true);
    const data = res.data as any;
    expect(data.count).toBe(2);
    const titles = data.connected.map((c: any) => c.title).sort();
    expect(titles).toEqual(['Beta', 'Gamma']);
  });

  it('filters by connection_type_name', async () => {
    const res = await dispatchTool('nords_get_connected', makeCtx(pid, sid), { nord_id: nordA, connection_type_name: 'relates' });
    expect(res.success).toBe(true);
    expect((res.data as any).count).toBe(2);
  });

  it('returns empty for isolated nord', async () => {
    const isolated = await createTestNord(pid, typeId, 'Isolated');
    const res = await dispatchTool('nords_get_connected', makeCtx(pid, sid), { nord_id: isolated });
    expect(res.success).toBe(true);
    expect((res.data as any).count).toBe(0);
  });

  it('rejects missing nord_id', async () => {
    const res = await dispatchTool('nords_get_connected', makeCtx(pid, sid), {});
    expect(res.success).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════
// 2. nords_search
// ══════════════════════════════════════════════════════════

describe('Tool: nords_search', () => {
  let pid: string, sid: string;
  let typeId: string;

  beforeAll(async () => {
    pid = await createTestProject('ToolSearch');
    typeId = await createTestNordType(pid, 'Article');
    await createTestNord(pid, typeId, 'Quantum Computing Basics', { properties: { description: 'An introduction to quantum computing' } });
    await createTestNord(pid, typeId, 'Machine Learning 101', { properties: { description: 'Beginner guide to ML' } });
    await createTestNord(pid, typeId, 'Classical Physics', { properties: { description: 'Newtonian mechanics overview' } });
    sid = await createTestSession(pid);
    // Allow tsvector to catch up (trigger-based)
    await new Promise(r => setTimeout(r, 100));
  });
  afterAll(async () => { await deleteTestProject(pid); });

  it('finds nords by title keyword (ILIKE fallback)', async () => {
    const res = await dispatchTool('nords_search', makeCtx(pid, sid), { query: 'Quantum' });
    expect(res.success).toBe(true);
    const data = res.data as any;
    expect(data.count).toBeGreaterThanOrEqual(1);
    expect(data.results.some((r: any) => r.title.includes('Quantum'))).toBe(true);
  });

  it('returns empty for no-match query', async () => {
    const res = await dispatchTool('nords_search', makeCtx(pid, sid), { query: 'xyznonexistent42' });
    expect(res.success).toBe(true);
    expect((res.data as any).count).toBe(0);
  });

  it('rejects missing query', async () => {
    const res = await dispatchTool('nords_search', makeCtx(pid, sid), {});
    expect(res.success).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════
// 3. nords_get_nords (batch get)
// ══════════════════════════════════════════════════════════

describe('Tool: nords_get_nords', () => {
  let pid: string, sid: string;
  let typeId: string;
  let nordA: string, nordB: string;

  beforeAll(async () => {
    pid = await createTestProject('ToolBatchGet');
    typeId = await createTestNordType(pid, 'Item');
    nordA = await createTestNord(pid, typeId, 'Item A');
    nordB = await createTestNord(pid, typeId, 'Item B');
    sid = await createTestSession(pid);
  });
  afterAll(async () => { await deleteTestProject(pid); });

  it('fetches multiple nords by ID', async () => {
    const res = await dispatchTool('nords_get_nords', makeCtx(pid, sid), { nord_ids: `${nordA},${nordB}` });
    expect(res.success).toBe(true);
    const data = res.data as any;
    expect(data.count).toBe(2);
    const titles = data.nords.map((n: any) => n.title).sort();
    expect(titles).toEqual(['Item A', 'Item B']);
  });

  it('handles partial IDs (one valid, one bogus)', async () => {
    const res = await dispatchTool('nords_get_nords', makeCtx(pid, sid), { nord_ids: `${nordA},00000000-0000-0000-0000-000000000000` });
    expect(res.success).toBe(true);
    expect((res.data as any).count).toBe(1);
  });

  it('rejects empty input', async () => {
    const res = await dispatchTool('nords_get_nords', makeCtx(pid, sid), {});
    expect(res.success).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════
// 4. nords_get_summary
// ══════════════════════════════════════════════════════════

describe('Tool: nords_get_summary', () => {
  let pid: string, sid: string;

  beforeAll(async () => {
    pid = await createTestProject('ToolSummary');
    const typeA = await createTestNordType(pid, 'Fruit');
    const typeB = await createTestNordType(pid, 'Veggie');
    await createTestNord(pid, typeA, 'Apple', { properties: { color: 'red' } });
    await createTestNord(pid, typeA, 'Banana', { properties: { color: 'yellow' } });
    await createTestNord(pid, typeB, 'Carrot', { properties: { color: 'orange' } });
    sid = await createTestSession(pid);
  });
  afterAll(async () => { await deleteTestProject(pid); });

  it('returns type counts', async () => {
    const res = await dispatchTool('nords_get_summary', makeCtx(pid, sid), {});
    expect(res.success).toBe(true);
    const data = res.data as any;
    expect(data.total_nords).toBe(3);
    expect(data.types.length).toBe(2);
  });

  it('groups by property when requested', async () => {
    const res = await dispatchTool('nords_get_summary', makeCtx(pid, sid), { group_by_property: 'color' });
    expect(res.success).toBe(true);
    const data = res.data as any;
    expect(data.property_breakdown).toBeDefined();
    expect(data.property_breakdown.length).toBeGreaterThanOrEqual(3);
  });
});

// ══════════════════════════════════════════════════════════
// 5. nords_find_path
// ══════════════════════════════════════════════════════════

describe('Tool: nords_find_path', () => {
  let pid: string, sid: string;
  let typeId: string, connTypeId: string;
  let n1: string, n2: string, n3: string, n4: string;

  beforeAll(async () => {
    pid = await createTestProject('ToolFindPath');
    typeId = await createTestNordType(pid, 'Node');
    connTypeId = await createTestConnectionType(pid, 'leads-to', { verb: 'leads to' });
    n1 = await createTestNord(pid, typeId, 'Start');
    n2 = await createTestNord(pid, typeId, 'Middle');
    n3 = await createTestNord(pid, typeId, 'End');
    n4 = await createTestNord(pid, typeId, 'Detached');
    await createTestConnection(pid, connTypeId, n1, n2);
    await createTestConnection(pid, connTypeId, n2, n3);
    // n4 has no connections
    sid = await createTestSession(pid);
  });
  afterAll(async () => { await deleteTestProject(pid); });

  it('finds a path between connected nords', async () => {
    const res = await dispatchTool('nords_find_path', makeCtx(pid, sid), { from_nord_id: n1, to_nord_id: n3 });
    expect(res.success).toBe(true);
    const data = res.data as any;
    expect(data.path).toBeDefined();
    expect(data.hops).toBe(2);
    expect(data.path.length).toBe(3);
    expect(data.path[0].title).toBe('Start');
    expect(data.path[2].title).toBe('End');
  });

  it('returns null path for disconnected nords', async () => {
    const res = await dispatchTool('nords_find_path', makeCtx(pid, sid), { from_nord_id: n1, to_nord_id: n4 });
    expect(res.success).toBe(true);
    expect((res.data as any).path).toBeNull();
  });

  it('rejects missing arguments', async () => {
    const res = await dispatchTool('nords_find_path', makeCtx(pid, sid), { from_nord_id: n1 });
    expect(res.success).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════
// 6. nords_get_goal_progress
// ══════════════════════════════════════════════════════════

describe('Tool: nords_get_goal_progress', () => {
  let pid: string, sid: string;
  let goalId: string, varA: string, varB: string;

  beforeAll(async () => {
    pid = await createTestProject('ToolGoalProgress');
    varA = await createTestVariable(pid, 'Prog Var A', { required: true });
    varB = await createTestVariable(pid, 'Prog Var B', { required: true });
    goalId = await createTestGoal(pid, 'Progress Goal');
    await bindVariable(goalId, varA);
    await bindVariable(goalId, varB);
    sid = await createTestSession(pid);
    await goalsRepo.initializeSessionGoals(sid, pid, 'guided');
  });
  afterAll(async () => { await deleteTestProject(pid); });

  it('shows 0% completion initially', async () => {
    const res = await dispatchTool('nords_get_goal_progress', makeCtx(pid, sid), {});
    expect(res.success).toBe(true);
    const data = res.data as any;
    const goal = data.goals.find((g: any) => g.id === goalId);
    expect(goal).toBeDefined();
    expect(goal.completion_pct).toBe(0);
    expect(goal.variables.remaining.length).toBe(2);
  });

  it('shows 50% after one variable collected', async () => {
    await setSessionVariable(sid, varA, 'value1');
    const res = await dispatchTool('nords_get_goal_progress', makeCtx(pid, sid), {});
    const goal = (res.data as any).goals.find((g: any) => g.id === goalId);
    expect(goal.completion_pct).toBe(50);
    expect(goal.variables.collected.length).toBe(1);
    expect(goal.variables.remaining.length).toBe(1);
  });

  it('shows 100% after all variables collected', async () => {
    await setSessionVariable(sid, varB, 'value2');
    const res = await dispatchTool('nords_get_goal_progress', makeCtx(pid, sid), {});
    const goal = (res.data as any).goals.find((g: any) => g.id === goalId);
    expect(goal.completion_pct).toBe(100);
  });
});

// ══════════════════════════════════════════════════════════
// 7. nords_get_goal_recommendations
// ══════════════════════════════════════════════════════════

describe('Tool: nords_get_goal_recommendations', () => {
  let pid: string, sid: string;
  let goalId: string, varId: string;

  beforeAll(async () => {
    pid = await createTestProject('ToolGoalRecs');
    varId = await createTestVariable(pid, 'Rec Var', { required: true });
    goalId = await createTestGoal(pid, 'Rec Goal');
    await bindVariable(goalId, varId);
    sid = await createTestSession(pid);
    await goalsRepo.initializeSessionGoals(sid, pid, 'guided');
  });
  afterAll(async () => { await deleteTestProject(pid); });

  it('returns remaining variables for the goal', async () => {
    const res = await dispatchTool('nords_get_goal_recommendations', makeCtx(pid, sid), {});
    expect(res.success).toBe(true);
    const data = res.data as any;
    expect(data.goal_name).toBe('Rec Goal');
    expect(data.remaining_variables.length).toBe(1);
    expect(data.remaining_variables[0].name).toBe('Rec Var');
  });

  it('returns "all collected" after variable filled', async () => {
    await setSessionVariable(sid, varId, 'done');
    const res = await dispatchTool('nords_get_goal_recommendations', makeCtx(pid, sid), {});
    expect(res.success).toBe(true);
    const data = res.data as any;
    expect(data.message).toContain('All variables collected');
  });
});

// ══════════════════════════════════════════════════════════
// 8. nords_get_goal_dependencies
// ══════════════════════════════════════════════════════════

describe('Tool: nords_get_goal_dependencies', () => {
  let pid: string, sid: string;
  let rootId: string, childId: string;

  beforeAll(async () => {
    pid = await createTestProject('ToolGoalDeps');
    const v1 = await createTestVariable(pid, 'Dep Root Var', { required: true });
    const v2 = await createTestVariable(pid, 'Dep Child Var', { required: true });
    rootId = await createTestGoal(pid, 'Dep Root');
    childId = await createTestGoal(pid, 'Dep Child');
    await bindVariable(rootId, v1);
    await bindVariable(childId, v2);
    await createTestEdge(pid, rootId, childId);
    sid = await createTestSession(pid);
    await goalsRepo.initializeSessionGoals(sid, pid, 'guided');
  });
  afterAll(async () => { await deleteTestProject(pid); });

  it('returns DAG nodes and edges', async () => {
    const res = await dispatchTool('nords_get_goal_dependencies', makeCtx(pid, sid), {});
    expect(res.success).toBe(true);
    const data = res.data as any;
    expect(data.nodes.length).toBe(2);
    expect(data.edges.length).toBe(1);
    // Child should be blocked
    const child = data.nodes.find((n: any) => n.id === childId);
    expect(child.blocked).toBe(true);
    expect(child.blockers.length).toBe(1);
  });
});

// ══════════════════════════════════════════════════════════
// 9. nords_get_next_goal
// ══════════════════════════════════════════════════════════

describe('Tool: nords_get_next_goal', () => {
  let pid: string, sid: string;
  let goalA: string, goalB: string;
  let varA: string, varB1: string, varB2: string;

  beforeAll(async () => {
    pid = await createTestProject('ToolNextGoal');
    varA = await createTestVariable(pid, 'Next A Var', { required: true });
    varB1 = await createTestVariable(pid, 'Next B1 Var', { required: true });
    varB2 = await createTestVariable(pid, 'Next B2 Var', { required: true });
    goalA = await createTestGoal(pid, 'One-Var Goal', { sort_order: 0 });
    goalB = await createTestGoal(pid, 'Two-Var Goal', { sort_order: 1 });
    await bindVariable(goalA, varA);
    await bindVariable(goalB, varB1);
    await bindVariable(goalB, varB2);
    sid = await createTestSession(pid);
    await goalsRepo.initializeSessionGoals(sid, pid, 'guided');
  });
  afterAll(async () => { await deleteTestProject(pid); });

  it('recommends the easiest actionable goal', async () => {
    const res = await dispatchTool('nords_get_next_goal', makeCtx(pid, sid), {});
    expect(res.success).toBe(true);
    const data = res.data as any;
    expect(data.next_goal).toBeDefined();
    expect(data.next_goal.name).toBe('One-Var Goal');
    expect(data.next_goal.remaining_variables.length).toBe(1);
  });

  it('returns null when all goals are complete', async () => {
    await setSessionVariable(sid, varA, 'done');
    await goalsRepo.evaluateGoals(sid, pid);
    await setSessionVariable(sid, varB1, 'done');
    await setSessionVariable(sid, varB2, 'done');
    await goalsRepo.evaluateGoals(sid, pid);
    const res = await dispatchTool('nords_get_next_goal', makeCtx(pid, sid), {});
    expect(res.success).toBe(true);
    expect((res.data as any).next_goal).toBeNull();
  });
});

// ══════════════════════════════════════════════════════════
// 10. nords_get_variable_status
// ══════════════════════════════════════════════════════════

describe('Tool: nords_get_variable_status', () => {
  let pid: string, sid: string;
  let varRequired: string, varOptional: string;
  let goalId: string;

  beforeAll(async () => {
    pid = await createTestProject('ToolVarStatus');
    varRequired = await createTestVariable(pid, 'Required Var', { required: true });
    varOptional = await createTestVariable(pid, 'Optional Var', { required: false });
    goalId = await createTestGoal(pid, 'Status Goal');
    await bindVariable(goalId, varRequired);
    await bindVariable(goalId, varOptional);
    sid = await createTestSession(pid);
  });
  afterAll(async () => { await deleteTestProject(pid); });

  it('shows all remaining initially', async () => {
    const res = await dispatchTool('nords_get_variable_status', makeCtx(pid, sid), {});
    expect(res.success).toBe(true);
    const data = res.data as any;
    expect(data.stats.total).toBe(2);
    expect(data.stats.collected).toBe(0);
    expect(data.remaining.length).toBe(2);
    // Each remaining var should have goals_impacted
    expect(data.remaining[0].goals_impacted.length).toBeGreaterThanOrEqual(1);
  });

  it('moves to collected after filling', async () => {
    await setSessionVariable(sid, varRequired, 'filled');
    const res = await dispatchTool('nords_get_variable_status', makeCtx(pid, sid), {});
    const data = res.data as any;
    expect(data.stats.collected).toBe(1);
    expect(data.collected.length).toBe(1);
    expect(data.collected[0].name).toBe('Required Var');
    expect(data.remaining.length).toBe(1);
    expect(data.stats.required_remaining).toBe(0);
  });
});

// ══════════════════════════════════════════════════════════
// 11. nords_get_variable_context
// ══════════════════════════════════════════════════════════

describe('Tool: nords_get_variable_context', () => {
  let pid: string, sid: string;
  let typeId: string, nordId: string;
  let varId: string;

  beforeAll(async () => {
    pid = await createTestProject('ToolVarContext');
    typeId = await createTestNordType(pid, 'Location');
    nordId = await createTestNord(pid, typeId, 'HQ Office');
    varId = await createTestVariable(pid, 'Office Name', { required: true });
    sid = await createTestSession(pid, { startNordId: nordId });
  });
  afterAll(async () => { await deleteTestProject(pid); });

  it('returns suggested variables ranked by relevance', async () => {
    const res = await dispatchTool('nords_get_variable_context', makeCtx(pid, sid), {});
    expect(res.success).toBe(true);
    const data = res.data as any;
    expect(data.current_nord).toBeDefined();
    expect(data.current_nord.title).toBe('HQ Office');
    expect(data.suggested_variables.length).toBeGreaterThanOrEqual(1);
  });
});

// ══════════════════════════════════════════════════════════
// 12. nords_validate_variable
// ══════════════════════════════════════════════════════════

describe('Tool: nords_validate_variable', () => {
  let pid: string, sid: string;
  let varSelect: string, varNumber: string, varBool: string, varShort: string;

  beforeAll(async () => {
    pid = await createTestProject('ToolValidate');
    // Create variables of various types via direct SQL for options
    const selectRow = await queryOne<{ id: string }>(`
      INSERT INTO project_variables (project_id, name, type, options, required)
      VALUES ($1, 'Color Choice', 'select', '["red","green","blue"]', true)
      RETURNING id
    `, [pid]);
    varSelect = selectRow!.id;

    varNumber = await createTestVariable(pid, 'Score', { required: true, type: 'number' as any });
    // override type for boolean
    const boolRow = await queryOne<{ id: string }>(`
      INSERT INTO project_variables (project_id, name, type, required)
      VALUES ($1, 'Agree', 'boolean', true)
      RETURNING id
    `, [pid]);
    varBool = boolRow!.id;

    const shortRow = await queryOne<{ id: string }>(`
      INSERT INTO project_variables (project_id, name, type, required)
      VALUES ($1, 'Brief', 'short_text', true)
      RETURNING id
    `, [pid]);
    varShort = shortRow!.id;

    sid = await createTestSession(pid);
  });
  afterAll(async () => { await deleteTestProject(pid); });

  it('validates select — valid value', async () => {
    const res = await dispatchTool('nords_validate_variable', makeCtx(pid, sid), { variable_id: varSelect, value: 'red' });
    expect(res.success).toBe(true);
    expect((res.data as any).valid).toBe(true);
  });

  it('validates select — invalid value', async () => {
    const res = await dispatchTool('nords_validate_variable', makeCtx(pid, sid), { variable_id: varSelect, value: 'purple' });
    expect(res.success).toBe(true);
    expect((res.data as any).valid).toBe(false);
    expect((res.data as any).reason).toContain('purple');
  });

  it('validates number — valid', async () => {
    const res = await dispatchTool('nords_validate_variable', makeCtx(pid, sid), { variable_id: varNumber, value: 42 });
    expect((res.data as any).valid).toBe(true);
  });

  it('validates number — invalid', async () => {
    const res = await dispatchTool('nords_validate_variable', makeCtx(pid, sid), { variable_id: varNumber, value: 'not-a-number' });
    expect((res.data as any).valid).toBe(false);
  });

  it('validates boolean — valid', async () => {
    const res = await dispatchTool('nords_validate_variable', makeCtx(pid, sid), { variable_id: varBool, value: 'yes' });
    expect((res.data as any).valid).toBe(true);
  });

  it('validates boolean — invalid', async () => {
    const res = await dispatchTool('nords_validate_variable', makeCtx(pid, sid), { variable_id: varBool, value: 'maybe' });
    expect((res.data as any).valid).toBe(false);
  });

  it('validates short_text — within limit', async () => {
    const res = await dispatchTool('nords_validate_variable', makeCtx(pid, sid), { variable_id: varShort, value: 'hello' });
    expect((res.data as any).valid).toBe(true);
  });

  it('validates short_text — exceeds limit', async () => {
    const longText = 'x'.repeat(501);
    const res = await dispatchTool('nords_validate_variable', makeCtx(pid, sid), { variable_id: varShort, value: longText });
    expect((res.data as any).valid).toBe(false);
  });

  it('rejects missing variable_id', async () => {
    const res = await dispatchTool('nords_validate_variable', makeCtx(pid, sid), { value: 'test' });
    expect(res.success).toBe(false);
  });

  it('rejects missing value', async () => {
    const res = await dispatchTool('nords_validate_variable', makeCtx(pid, sid), { variable_id: varSelect });
    expect(res.success).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════
// 13. nords_get_collection_summary
// ══════════════════════════════════════════════════════════

describe('Tool: nords_get_collection_summary', () => {
  let pid: string, sid: string;
  let varA: string, varB: string;

  beforeAll(async () => {
    pid = await createTestProject('ToolCollSummary');
    varA = await createTestVariable(pid, 'Summary A', { required: true });
    varB = await createTestVariable(pid, 'Summary B', { required: true });
    sid = await createTestSession(pid);
  });
  afterAll(async () => { await deleteTestProject(pid); });

  it('returns empty when nothing collected', async () => {
    const res = await dispatchTool('nords_get_collection_summary', makeCtx(pid, sid), {});
    expect(res.success).toBe(true);
    expect((res.data as any).count).toBe(0);
  });

  it('returns collected items after filling', async () => {
    await setSessionVariable(sid, varA, 'apple');
    await setSessionVariable(sid, varB, 'banana');
    const res = await dispatchTool('nords_get_collection_summary', makeCtx(pid, sid), {});
    expect(res.success).toBe(true);
    const data = res.data as any;
    expect(data.count).toBe(2);
    const names = data.items.map((i: any) => i.name).sort();
    expect(names).toEqual(['Summary A', 'Summary B']);
    // Each item should have the description field
    expect(data.items[0].description).toBeDefined();
  });
});

// ══════════════════════════════════════════════════════════
// 14. nords_get_session_recap
// ══════════════════════════════════════════════════════════

describe('Tool: nords_get_session_recap', () => {
  let pid: string, sid: string;
  let typeId: string, connTypeId: string;
  let nordA: string, nordB: string, connId: string;
  let varId: string;

  beforeAll(async () => {
    pid = await createTestProject('ToolRecap');
    typeId = await createTestNordType(pid, 'Step');
    connTypeId = await createTestConnectionType(pid, 'flows', { verb: 'flows to' });
    nordA = await createTestNord(pid, typeId, 'Step 1');
    nordB = await createTestNord(pid, typeId, 'Step 2');
    connId = await createTestConnection(pid, connTypeId, nordA, nordB);
    varId = await createTestVariable(pid, 'Recap Var', { required: true });
    sid = await createTestSession(pid, { startNordId: nordA });
    // Simulate a traversal
    await createTestTraversal(sid, connId, nordA, nordB);
    await setSessionCurrentNord(sid, nordB);
    await setSessionVariable(sid, varId, 'collected value');
  });
  afterAll(async () => { await deleteTestProject(pid); });

  it('returns full session recap', async () => {
    const res = await dispatchTool('nords_get_session_recap', makeCtx(pid, sid), {});
    expect(res.success).toBe(true);
    const data = res.data as any;
    expect(data.rounds_elapsed).toBe(1);
    expect(data.current_position.title).toBe('Step 2');
    expect(data.nords_visited.length).toBe(1);
    expect(data.nords_visited[0].title).toBe('Step 2');
    expect(data.variables_collected.length).toBe(1);
    expect(data.variables_collected[0].name).toBe('Recap Var');
  });
});

// ══════════════════════════════════════════════════════════
// 15. nords_get_traversal_history
// ══════════════════════════════════════════════════════════

describe('Tool: nords_get_traversal_history', () => {
  let pid: string, sid: string;
  let typeId: string, connTypeId: string;
  let n1: string, n2: string, n3: string;
  let c1: string, c2: string;

  beforeAll(async () => {
    pid = await createTestProject('ToolTraversalHist');
    typeId = await createTestNordType(pid, 'Place');
    connTypeId = await createTestConnectionType(pid, 'path', { verb: 'leads to' });
    n1 = await createTestNord(pid, typeId, 'Home');
    n2 = await createTestNord(pid, typeId, 'Park');
    n3 = await createTestNord(pid, typeId, 'Mall');
    c1 = await createTestConnection(pid, connTypeId, n1, n2);
    c2 = await createTestConnection(pid, connTypeId, n2, n3);
    sid = await createTestSession(pid, { startNordId: n1 });
    await createTestTraversal(sid, c1, n1, n2);
    await createTestTraversal(sid, c2, n2, n3);
  });
  afterAll(async () => { await deleteTestProject(pid); });

  it('returns chronological traversal steps', async () => {
    const res = await dispatchTool('nords_get_traversal_history', makeCtx(pid, sid), {});
    expect(res.success).toBe(true);
    const data = res.data as any;
    expect(data.total_steps).toBe(2);
    expect(data.steps[0].from).toBe('Home');
    expect(data.steps[0].to).toBe('Park');
    expect(data.steps[1].from).toBe('Park');
    expect(data.steps[1].to).toBe('Mall');
  });
});

// ══════════════════════════════════════════════════════════
// 16. nords_compare
// ══════════════════════════════════════════════════════════

describe('Tool: nords_compare', () => {
  let pid: string, sid: string;
  let typeId: string;
  let nordA: string, nordB: string;

  beforeAll(async () => {
    pid = await createTestProject('ToolCompare');
    typeId = await createTestNordType(pid, 'Product');
    nordA = await createTestNord(pid, typeId, 'Widget A', { properties: { price: 10, color: 'red', material: 'steel' } });
    nordB = await createTestNord(pid, typeId, 'Widget B', { properties: { price: 20, color: 'red', size: 'large' } });
    sid = await createTestSession(pid);
  });
  afterAll(async () => { await deleteTestProject(pid); });

  it('compares two nords property-by-property', async () => {
    const res = await dispatchTool('nords_compare', makeCtx(pid, sid), { nord_id_a: nordA, nord_id_b: nordB });
    expect(res.success).toBe(true);
    const data = res.data as any;
    expect(data.nord_a.title).toBe('Widget A');
    expect(data.nord_b.title).toBe('Widget B');
    const { shared, different, only_in_a, only_in_b } = data.comparison;
    // color is the same in both
    expect(shared.some((s: any) => s.key === 'color')).toBe(true);
    // price differs
    expect(different.some((d: any) => d.key === 'price')).toBe(true);
    // material only in A
    expect(only_in_a.some((a: any) => a.key === 'material')).toBe(true);
    // size only in B
    expect(only_in_b.some((b: any) => b.key === 'size')).toBe(true);
  });

  it('rejects missing IDs', async () => {
    const res = await dispatchTool('nords_compare', makeCtx(pid, sid), { nord_id_a: nordA });
    expect(res.success).toBe(false);
  });

  it('handles non-existent nord gracefully', async () => {
    const res = await dispatchTool('nords_compare', makeCtx(pid, sid), {
      nord_id_a: nordA,
      nord_id_b: '00000000-0000-0000-0000-000000000000',
    });
    expect(res.success).toBe(false);
    expect(res.error).toContain('not found');
  });
});

// ══════════════════════════════════════════════════════════
// 17. nords_get_session_progress
// ══════════════════════════════════════════════════════════

describe('Tool: nords_get_session_progress', () => {
  let pid: string, sid: string;
  let typeId: string, connTypeId: string;
  let nordId: string, connId: string;
  let varId: string, goalId: string;

  beforeAll(async () => {
    pid = await createTestProject('ToolSessionProgress');
    typeId = await createTestNordType(pid, 'Step');
    connTypeId = await createTestConnectionType(pid, 'next');
    nordId = await createTestNord(pid, typeId, 'Only Node');
    const nordB = await createTestNord(pid, typeId, 'Node B');
    connId = await createTestConnection(pid, connTypeId, nordId, nordB);
    varId = await createTestVariable(pid, 'Prog Var', { required: true });
    goalId = await createTestGoal(pid, 'Prog Goal');
    await bindVariable(goalId, varId);
    sid = await createTestSession(pid, { startNordId: nordId });
    await goalsRepo.initializeSessionGoals(sid, pid, 'guided');
  });
  afterAll(async () => { await deleteTestProject(pid); });

  it('returns comprehensive progress metrics', async () => {
    const res = await dispatchTool('nords_get_session_progress', makeCtx(pid, sid), {});
    expect(res.success).toBe(true);
    const data = res.data as any;
    expect(data.nords.total).toBe(2);
    expect(data.nords.visited).toBe(0);
    expect(data.variables.total).toBe(1);
    expect(data.variables.collected).toBe(0);
    expect(data.variables.required_remaining).toBe(1);
    expect(data.goals.total).toBe(1);
    expect(data.goals.completed).toBe(0);
    expect(data.goals.active).toBe(1);
    expect(data.completion_pct).toBeDefined();
    expect(data.rounds_elapsed).toBe(0);
  });

  it('updates after traversal and variable collection', async () => {
    const nordB = (await query<{ id: string }>(`SELECT id FROM nords WHERE project_id = $1 AND title = 'Node B'`, [pid]))[0].id;
    await createTestTraversal(sid, connId, nordId, nordB);
    await setSessionVariable(sid, varId, 'done');
    await goalsRepo.evaluateGoals(sid, pid);

    const res = await dispatchTool('nords_get_session_progress', makeCtx(pid, sid), {});
    const data = res.data as any;
    expect(data.nords.visited).toBe(1);
    expect(data.variables.collected).toBe(1);
    expect(data.variables.required_remaining).toBe(0);
    expect(data.goals.completed).toBe(1);
    expect(data.completion_pct).toBe(100);
  });
});

// ══════════════════════════════════════════════════════════
// 18. nords_query_nords (property-aware upgrade)
// ══════════════════════════════════════════════════════════

describe('Tool: nords_query_nords (property-aware)', () => {
  let pid: string, sid: string;
  let typeId: string;

  beforeAll(async () => {
    pid = await createTestProject('ToolQueryNords');
    typeId = await createTestNordType(pid, 'Car');
    await createTestNord(pid, typeId, 'Tesla Model S', { properties: { brand: 'Tesla', year: 2024 } });
    await createTestNord(pid, typeId, 'BMW i4', { properties: { brand: 'BMW', year: 2023 } });
    await createTestNord(pid, typeId, 'Tesla Model 3', { properties: { brand: 'Tesla', year: 2025 } });
    sid = await createTestSession(pid);
  });
  afterAll(async () => { await deleteTestProject(pid); });

  it('filters by type_name', async () => {
    const res = await dispatchTool('nords_query_nords', makeCtx(pid, sid), { type_name: 'Car' });
    expect(res.success).toBe(true);
    const data = res.data as any[];
    expect(data.length).toBe(3);
  });

  it('filters by title substring', async () => {
    const res = await dispatchTool('nords_query_nords', makeCtx(pid, sid), { title: 'Tesla' });
    expect(res.success).toBe(true);
    const data = res.data as any[];
    expect(data.length).toBe(2);
    expect(data.every((n: any) => n.title.includes('Tesla'))).toBe(true);
  });

  it('filters by property value', async () => {
    const res = await dispatchTool('nords_query_nords', makeCtx(pid, sid), { property_name: 'brand', property_value: 'BMW' });
    expect(res.success).toBe(true);
    const data = res.data as any[];
    expect(data.length).toBe(1);
    expect(data[0].title).toBe('BMW i4');
  });

  it('combines type_name + property filter', async () => {
    const res = await dispatchTool('nords_query_nords', makeCtx(pid, sid), { type_name: 'Car', property_name: 'brand', property_value: 'Tesla' });
    expect(res.success).toBe(true);
    expect((res.data as any[]).length).toBe(2);
  });
});

// ── Close pool after all tests ──
afterAll(async () => {
  await closePool();
});
