/**
 * Goal Engine Integration Tests
 *
 * Tests the complete goal evaluation lifecycle:
 *   - Variable CRUD + binding
 *   - Session goal initialization (root/gated detection)
 *   - Variable-based completion
 *   - DAG cascading (child activation, join-node logic)
 *   - Structural exclusion (sibling cancellation)
 *   - Terminal goals (goal_completed with end_type)
 *   - Implicit goal (collect mode auto-completion)
 *
 * All tests create their own throwaway project and clean up after.
 * Re-runnable: `npm test` at any time.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as goalsRepo from '../repositories/goals.js';
import * as variablesRepo from '../repositories/variables.js';
import {
  createTestProject, createTestVariable, createTestGoal, createTestEdge,
  bindVariable, createTestSession, setSessionVariable, deleteTestProject,
  closePool, query, queryOne,
} from './helpers.js';

// ══════════════════════════════════════════════════════════
// 1. Variable CRUD
// ══════════════════════════════════════════════════════════

describe('Variable CRUD', () => {
  let projectId: string;

  beforeAll(async () => { projectId = await createTestProject('VarCRUD'); });
  afterAll(async () => { await deleteTestProject(projectId); });

  it('creates a variable', async () => {
    const v = await variablesRepo.create({
      project_id: projectId,
      name: 'Test Var',
      type: 'string',
      required: true,
    });
    expect(v).toBeDefined();
    expect(v.name).toBe('Test Var');
    expect(v.required).toBe(true);
    expect(v.project_id).toBe(projectId);
  });

  it('finds variables by project', async () => {
    const vars = await variablesRepo.findByProject(projectId);
    expect(vars.length).toBeGreaterThanOrEqual(1);
    expect(vars[0].name).toBe('Test Var');
  });

  it('updates a variable', async () => {
    const vars = await variablesRepo.findByProject(projectId);
    const updated = await variablesRepo.update(vars[0].id, { name: 'Renamed Var' });
    expect(updated?.name).toBe('Renamed Var');
  });

  it('deletes a variable', async () => {
    const v = await variablesRepo.create({ project_id: projectId, name: 'ToDelete' });
    const deleted = await variablesRepo.remove(v.id);
    expect(deleted).toBe(true);
    const found = await variablesRepo.findById(v.id);
    expect(found).toBeNull();
  });
});

// ══════════════════════════════════════════════════════════
// 2. Goal + Variable Binding CRUD
// ══════════════════════════════════════════════════════════

describe('Goal Variable Bindings', () => {
  let projectId: string;
  let goalId: string;
  let varIds: string[];

  beforeAll(async () => {
    projectId = await createTestProject('GoalBindings');
    goalId = await createTestGoal(projectId, 'Test Goal');
    varIds = [
      await createTestVariable(projectId, 'Var A', { required: true }),
      await createTestVariable(projectId, 'Var B', { required: true }),
      await createTestVariable(projectId, 'Var C', { required: false }),
    ];
  });
  afterAll(async () => { await deleteTestProject(projectId); });

  it('binds variables to a goal', async () => {
    for (const vid of varIds) {
      const bid = await bindVariable(goalId, vid, vid !== varIds[2]);
      expect(bid).toBeDefined();
    }
    const bindings = await goalsRepo.findVariableBindingsByGoal(goalId);
    expect(bindings.length).toBe(3);
  });

  it('fetches goal with bindings', async () => {
    const goals = await goalsRepo.findByProjectWithBindings(projectId);
    expect(goals.length).toBe(1);
    expect(goals[0].variable_bindings.length).toBe(3);
  });

  it('removes a binding', async () => {
    const bindings = await goalsRepo.findVariableBindingsByGoal(goalId);
    const removed = await goalsRepo.removeVariableBinding(bindings[2].id);
    expect(removed).toBe(true);
    const after = await goalsRepo.findVariableBindingsByGoal(goalId);
    expect(after.length).toBe(2);
  });
});

// ══════════════════════════════════════════════════════════
// 3. Session Goal Initialization
// ══════════════════════════════════════════════════════════

describe('Session Goal Initialization', () => {
  let projectId: string;
  let rootGoalId: string;
  let childGoalId: string;

  beforeAll(async () => {
    projectId = await createTestProject('GoalInit');
    const varId = await createTestVariable(projectId, 'InitVar', { required: true });
    rootGoalId = await createTestGoal(projectId, 'Root Goal', { sort_order: 0 });
    childGoalId = await createTestGoal(projectId, 'Child Goal', { sort_order: 1 });
    await bindVariable(rootGoalId, varId);
    await bindVariable(childGoalId, varId);
    await createTestEdge(projectId, rootGoalId, childGoalId);
  });
  afterAll(async () => { await deleteTestProject(projectId); });

  it('root goals start active, gated goals start pending', async () => {
    const sessionId = await createTestSession(projectId);
    await goalsRepo.initializeSessionGoals(sessionId, projectId, 'guided');

    const sessionGoals = await query<{ goal_id: string; status: string }>(`
      SELECT goal_id, status FROM mcp_session_goals WHERE session_id = $1
    `, [sessionId]);

    const root = sessionGoals.find(sg => sg.goal_id === rootGoalId);
    const child = sessionGoals.find(sg => sg.goal_id === childGoalId);

    expect(root?.status).toBe('active');
    expect(child?.status).toBe('pending');
  });
});

// ══════════════════════════════════════════════════════════
// 4. Goal Completion — Variable-based
// ══════════════════════════════════════════════════════════

describe('Goal Completion', () => {
  let projectId: string;
  let goalId: string;
  let varAId: string;
  let varBId: string;
  let sessionId: string;

  beforeAll(async () => {
    projectId = await createTestProject('GoalComplete');
    varAId = await createTestVariable(projectId, 'Required A', { required: true });
    varBId = await createTestVariable(projectId, 'Required B', { required: true });
    goalId = await createTestGoal(projectId, 'Completable Goal', { achieved_prompt: 'Well done!' });
    await bindVariable(goalId, varAId, true);
    await bindVariable(goalId, varBId, true);

    sessionId = await createTestSession(projectId);
    await goalsRepo.initializeSessionGoals(sessionId, projectId, 'guided');
  });
  afterAll(async () => { await deleteTestProject(projectId); });

  it('does not complete with partial variables', async () => {
    await setSessionVariable(sessionId, varAId, 'hello');
    const events = await goalsRepo.evaluateGoals(sessionId, projectId);
    const completed = events.filter(e => e.type === 'goal_completed');
    expect(completed.length).toBe(0);
  });

  it('completes when all required variables are filled', async () => {
    await setSessionVariable(sessionId, varBId, 'world');
    const events = await goalsRepo.evaluateGoals(sessionId, projectId);
    const completed = events.filter(e => e.type === 'goal_completed');
    expect(completed.length).toBe(1);
    expect(completed[0].goal_name).toBe('Completable Goal');
    expect(completed[0].achieved_prompt).toBe('Well done!');
  });
});

// ══════════════════════════════════════════════════════════
// 5. DAG Cascading — Child Activation + Join Nodes
// ══════════════════════════════════════════════════════════

describe('DAG Cascading', () => {
  let projectId: string;
  let rootId: string;
  let childId: string;
  let varRootId: string;
  let varChildId: string;
  let sessionId: string;

  beforeAll(async () => {
    projectId = await createTestProject('DAGCascade');
    varRootId = await createTestVariable(projectId, 'Root Var', { required: true });
    varChildId = await createTestVariable(projectId, 'Child Var', { required: true });

    rootId = await createTestGoal(projectId, 'DAG Root');
    childId = await createTestGoal(projectId, 'DAG Child');

    await bindVariable(rootId, varRootId);
    await bindVariable(childId, varChildId);
    await createTestEdge(projectId, rootId, childId);

    sessionId = await createTestSession(projectId);
    await goalsRepo.initializeSessionGoals(sessionId, projectId, 'guided');
  });
  afterAll(async () => { await deleteTestProject(projectId); });

  it('child stays pending until parent completes', async () => {
    const goals = await query<{ goal_id: string; status: string }>(`
      SELECT goal_id, status FROM mcp_session_goals WHERE session_id = $1
    `, [sessionId]);
    const child = goals.find(g => g.goal_id === childId);
    expect(child?.status).toBe('pending');
  });

  it('child activates when parent completes', async () => {
    await setSessionVariable(sessionId, varRootId, 'done');
    const events = await goalsRepo.evaluateGoals(sessionId, projectId);

    const completed = events.filter(e => e.type === 'goal_completed');
    expect(completed.length).toBe(1);
    expect(completed[0].goal_name).toBe('DAG Root');

    const activated = events.filter(e => e.type === 'goal_activated');
    expect(activated.length).toBe(1);
    expect(activated[0].goal_name).toBe('DAG Child');
  });
});

// ══════════════════════════════════════════════════════════
// 6. Join Node — Multiple Parents
// ══════════════════════════════════════════════════════════

describe('Join Node', () => {
  let projectId: string;
  let parentAId: string;
  let parentBId: string;
  let joinId: string;
  let varAId: string;
  let varBId: string;
  let varJoinId: string;
  let sessionId: string;

  beforeAll(async () => {
    projectId = await createTestProject('JoinNode');
    varAId = await createTestVariable(projectId, 'Parent A Var', { required: true });
    varBId = await createTestVariable(projectId, 'Parent B Var', { required: true });
    varJoinId = await createTestVariable(projectId, 'Join Var', { required: true });

    parentAId = await createTestGoal(projectId, 'Parent A');
    parentBId = await createTestGoal(projectId, 'Parent B');
    joinId = await createTestGoal(projectId, 'Join Goal');

    await bindVariable(parentAId, varAId);
    await bindVariable(parentBId, varBId);
    await bindVariable(joinId, varJoinId);

    // Both parents → join
    await createTestEdge(projectId, parentAId, joinId);
    await createTestEdge(projectId, parentBId, joinId);

    sessionId = await createTestSession(projectId);
    await goalsRepo.initializeSessionGoals(sessionId, projectId, 'guided');
  });
  afterAll(async () => { await deleteTestProject(projectId); });

  it('join stays pending when only one parent completes', async () => {
    await setSessionVariable(sessionId, varAId, 'done');
    const events = await goalsRepo.evaluateGoals(sessionId, projectId);

    expect(events.some(e => e.type === 'goal_completed' && e.goal_name === 'Parent A')).toBe(true);
    // Join should NOT activate yet
    expect(events.some(e => e.type === 'goal_activated' && e.goal_name === 'Join Goal')).toBe(false);
  });

  it('join activates when ALL parents complete', async () => {
    await setSessionVariable(sessionId, varBId, 'done');
    const events = await goalsRepo.evaluateGoals(sessionId, projectId);

    expect(events.some(e => e.type === 'goal_completed' && e.goal_name === 'Parent B')).toBe(true);
    expect(events.some(e => e.type === 'goal_activated' && e.goal_name === 'Join Goal')).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════
// 7. Structural Exclusion — Sibling Cancellation
// ══════════════════════════════════════════════════════════

describe('Structural Exclusion', () => {
  let projectId: string;
  let parentId: string;
  let sibAId: string;
  let sibBId: string;
  let varParentId: string;
  let varAId: string;
  let varBId: string;
  let sessionId: string;

  beforeAll(async () => {
    projectId = await createTestProject('SiblingExcl');
    varParentId = await createTestVariable(projectId, 'Parent Var', { required: true });
    varAId = await createTestVariable(projectId, 'Sib A Var', { required: true });
    varBId = await createTestVariable(projectId, 'Sib B Var', { required: true });

    parentId = await createTestGoal(projectId, 'Parent');
    sibAId = await createTestGoal(projectId, 'Sibling A');
    sibBId = await createTestGoal(projectId, 'Sibling B');

    // Set parent to exclusive fork — siblings compete
    await goalsRepo.update(parentId, { fork_type: 'exclusive' });

    await bindVariable(parentId, varParentId);
    await bindVariable(sibAId, varAId);
    await bindVariable(sibBId, varBId);

    // Parent → Sibling A, Parent → Sibling B
    await createTestEdge(projectId, parentId, sibAId);
    await createTestEdge(projectId, parentId, sibBId);

    sessionId = await createTestSession(projectId);
    await goalsRepo.initializeSessionGoals(sessionId, projectId, 'guided');
  });
  afterAll(async () => { await deleteTestProject(projectId); });

  it('both siblings activate after parent completes', async () => {
    await setSessionVariable(sessionId, varParentId, 'done');
    const events = await goalsRepo.evaluateGoals(sessionId, projectId);

    expect(events.some(e => e.type === 'goal_completed' && e.goal_name === 'Parent')).toBe(true);

    const activated = events.filter(e => e.type === 'goal_activated');
    expect(activated.length).toBe(2);
  });

  it('completing one sibling cancels the other', async () => {
    await setSessionVariable(sessionId, varAId, 'done');
    const events = await goalsRepo.evaluateGoals(sessionId, projectId);

    const completed = events.filter(e => e.type === 'goal_completed');
    expect(completed.length).toBe(1);
    expect(completed[0].goal_name).toBe('Sibling A');

    const cancelled = events.filter(e => e.type === 'goal_cancelled');
    expect(cancelled.length).toBe(1);
    expect(cancelled[0].goal_name).toBe('Sibling B');
    expect(cancelled[0].reason).toBe('sibling_excluded');
    expect(cancelled[0].excluded_by_goal).toBe('Sibling A');
  });
});

// ══════════════════════════════════════════════════════════
// 8. Terminal Goal — Session Termination Event
// ══════════════════════════════════════════════════════════

describe('Terminal Goal', () => {
  let projectId: string;
  let termGoalId: string;
  let varId: string;
  let sessionId: string;

  beforeAll(async () => {
    projectId = await createTestProject('TerminalGoal');
    varId = await createTestVariable(projectId, 'Term Var', { required: true });
    termGoalId = await createTestGoal(projectId, 'Exit Goal', {
      end_type: 'reset',
      achieved_prompt: 'Session complete. Goodbye!',
    });
    await bindVariable(termGoalId, varId);

    sessionId = await createTestSession(projectId);
    await goalsRepo.initializeSessionGoals(sessionId, projectId, 'guided');
  });
  afterAll(async () => { await deleteTestProject(projectId); });

  it('fires goal_completed with end_type on completion', async () => {
    await setSessionVariable(sessionId, varId, 'final value');
    const events = await goalsRepo.evaluateGoals(sessionId, projectId);

    const completed = events.filter(e => e.type === 'goal_completed');
    expect(completed.length).toBe(1);
    expect(completed[0].end_type).toBe('reset');
    expect(completed[0].achieved_prompt).toBe('Session complete. Goodbye!');
  });
});

// ══════════════════════════════════════════════════════════
// 9. Implicit Goal — Collect Mode Auto-Completion
// ══════════════════════════════════════════════════════════

describe('Implicit Goal (Collect Mode)', () => {
  let projectId: string;
  let varAId: string;
  let varBId: string;
  let varOptId: string;
  let sessionId: string;

  beforeAll(async () => {
    projectId = await createTestProject('ImplicitGoal');
    varAId = await createTestVariable(projectId, 'Required 1', { required: true });
    varBId = await createTestVariable(projectId, 'Required 2', { required: true });
    varOptId = await createTestVariable(projectId, 'Optional', { required: false });

    // No explicit goals — implicit goal should auto-create
    sessionId = await createTestSession(projectId);
    await goalsRepo.initializeSessionGoals(sessionId, projectId, 'collect');
  });
  afterAll(async () => { await deleteTestProject(projectId); });

  it('creates an implicit session goal', async () => {
    const sessionGoals = await query<{ goal_id: string; status: string }>(`
      SELECT sg.goal_id, sg.status FROM mcp_session_goals sg
      JOIN goals g ON g.id = sg.goal_id
      WHERE sg.session_id = $1 AND g.is_implicit = true
    `, [sessionId]);
    expect(sessionGoals.length).toBe(1);
    expect(sessionGoals[0].status).toBe('active');
  });

  it('does not complete until all required variables are filled', async () => {
    await setSessionVariable(sessionId, varAId, 'value1');
    const events1 = await goalsRepo.evaluateGoals(sessionId, projectId);
    expect(events1.some(e => e.type === 'goal_completed')).toBe(false);

    // Optional doesn't matter
    await setSessionVariable(sessionId, varOptId, 'optional value');
    const events2 = await goalsRepo.evaluateGoals(sessionId, projectId);
    expect(events2.some(e => e.type === 'goal_completed')).toBe(false);
  });

  it('completes when all required variables are filled', async () => {
    await setSessionVariable(sessionId, varBId, 'value2');
    const events = await goalsRepo.evaluateGoals(sessionId, projectId);
    const completed = events.filter(e => e.type === 'goal_completed');
    expect(completed.length).toBe(1);
  });
});

// ══════════════════════════════════════════════════════════
// 10. Edge Cases
// ══════════════════════════════════════════════════════════

describe('Edge Cases', () => {
  let projectId: string;

  beforeAll(async () => { projectId = await createTestProject('EdgeCases'); });
  afterAll(async () => { await deleteTestProject(projectId); });

  it('graph_only project skips goal initialization', async () => {
    await query('UPDATE projects SET graph_only = true WHERE id = $1', [projectId]);
    const sessionId = await createTestSession(projectId);
    await goalsRepo.initializeSessionGoals(sessionId, projectId, 'explore');

    const sessionGoals = await query<{ id: string }>(`
      SELECT id FROM mcp_session_goals WHERE session_id = $1
    `, [sessionId]);
    expect(sessionGoals.length).toBe(0);
    await query('UPDATE projects SET graph_only = false WHERE id = $1', [projectId]);
  });

  it('goal with no bindings never auto-completes', async () => {
    const goalId = await createTestGoal(projectId, 'Empty Goal');
    const varId = await createTestVariable(projectId, 'Dummy Var', { required: true });
    // Goal has NO bindings — add variable to project so implicit goal doesn't interfere
    const sessionId = await createTestSession(projectId);

    // Manually create session goal as active
    await query(`
      INSERT INTO mcp_session_goals (session_id, goal_id, status) VALUES ($1, $2, 'active')
    `, [sessionId, goalId]);

    await setSessionVariable(sessionId, varId, 'something');
    const events = await goalsRepo.evaluateGoals(sessionId, projectId);
    const completed = events.filter(e => e.goal_id === goalId && e.type === 'goal_completed');
    expect(completed.length).toBe(0);
  });

  it('goal with only optional bindings never auto-completes', async () => {
    const optVar = await createTestVariable(projectId, 'AllOptional', { required: false });
    const goalId = await createTestGoal(projectId, 'Optional-Only Goal');
    await bindVariable(goalId, optVar, false);

    const sessionId = await createTestSession(projectId);
    await query(`
      INSERT INTO mcp_session_goals (session_id, goal_id, status) VALUES ($1, $2, 'active')
    `, [sessionId, goalId]);

    await setSessionVariable(sessionId, optVar, 'filled');
    const events = await goalsRepo.evaluateGoals(sessionId, projectId);
    const completed = events.filter(e => e.goal_id === goalId && e.type === 'goal_completed');
    expect(completed.length).toBe(0);
  });

  it('already-completed goals are not re-evaluated', async () => {
    const varId = await createTestVariable(projectId, 'CompletedVar', { required: true });
    const goalId = await createTestGoal(projectId, 'Already Done');
    await bindVariable(goalId, varId);

    const sessionId = await createTestSession(projectId);
    await query(`
      INSERT INTO mcp_session_goals (session_id, goal_id, status) VALUES ($1, $2, 'complete')
    `, [sessionId, goalId]);

    await setSessionVariable(sessionId, varId, 'value');
    const events = await goalsRepo.evaluateGoals(sessionId, projectId);
    const completed = events.filter(e => e.goal_id === goalId);
    expect(completed.length).toBe(0);
  });
});

// ══════════════════════════════════════════════════════════
// 11. Full DAG Lifecycle — End-to-end
// ══════════════════════════════════════════════════════════

describe('Full DAG Lifecycle (E2E)', () => {
  let projectId: string;
  let rootId: string;
  let branchAId: string;
  let branchBId: string;
  let leafId: string;
  let varRoot: string;
  let varA: string;
  let varB: string;
  let varLeaf: string;
  let sessionId: string;

  beforeAll(async () => {
    projectId = await createTestProject('E2E-DAG');

    // Variables
    varRoot = await createTestVariable(projectId, 'E2E Root Var', { required: true });
    varA = await createTestVariable(projectId, 'E2E Branch A Var', { required: true });
    varB = await createTestVariable(projectId, 'E2E Branch B Var', { required: true });
    varLeaf = await createTestVariable(projectId, 'E2E Leaf Var', { required: true });

    // Goals: Root → Branch A → Leaf (reset)
    //         Root → Branch B (sibling of A)
    rootId = await createTestGoal(projectId, 'E2E Root', { sort_order: 0 });
    branchAId = await createTestGoal(projectId, 'E2E Branch A', { sort_order: 1 });
    branchBId = await createTestGoal(projectId, 'E2E Branch B', { sort_order: 2 });
    leafId = await createTestGoal(projectId, 'E2E Leaf', { sort_order: 3, end_type: 'reset' });

    // Bindings
    await bindVariable(rootId, varRoot);
    await bindVariable(branchAId, varA);
    await bindVariable(branchBId, varB);
    await bindVariable(leafId, varLeaf);

    // Root uses exclusive fork — branches compete
    await goalsRepo.update(rootId, { fork_type: 'exclusive' });

    // Edges
    await createTestEdge(projectId, rootId, branchAId);
    await createTestEdge(projectId, rootId, branchBId);
    await createTestEdge(projectId, branchAId, leafId);

    // Session
    sessionId = await createTestSession(projectId);
    await goalsRepo.initializeSessionGoals(sessionId, projectId, 'guided');
  });
  afterAll(async () => { await deleteTestProject(projectId); });

  it('step 1: root is active, all others pending', async () => {
    const goals = await query<{ goal_id: string; status: string }>(`
      SELECT goal_id, status FROM mcp_session_goals WHERE session_id = $1
    `, [sessionId]);

    expect(goals.find(g => g.goal_id === rootId)?.status).toBe('active');
    expect(goals.find(g => g.goal_id === branchAId)?.status).toBe('pending');
    expect(goals.find(g => g.goal_id === branchBId)?.status).toBe('pending');
    expect(goals.find(g => g.goal_id === leafId)?.status).toBe('pending');
  });

  it('step 2: complete root → both branches activate', async () => {
    await setSessionVariable(sessionId, varRoot, 'done');
    const events = await goalsRepo.evaluateGoals(sessionId, projectId);

    expect(events.some(e => e.type === 'goal_completed' && e.goal_name === 'E2E Root')).toBe(true);
    const activated = events.filter(e => e.type === 'goal_activated');
    expect(activated.length).toBe(2);
    expect(activated.map(a => a.goal_name).sort()).toEqual(['E2E Branch A', 'E2E Branch B']);
  });

  it('step 3: complete branch A → branch B cancelled, leaf activated', async () => {
    await setSessionVariable(sessionId, varA, 'done');
    const events = await goalsRepo.evaluateGoals(sessionId, projectId);

    expect(events.some(e => e.type === 'goal_completed' && e.goal_name === 'E2E Branch A')).toBe(true);
    expect(events.some(e => e.type === 'goal_cancelled' && e.goal_name === 'E2E Branch B')).toBe(true);
    expect(events.some(e => e.type === 'goal_activated' && e.goal_name === 'E2E Leaf')).toBe(true);
  });

  it('step 4: complete leaf → goal_completed with end_type', async () => {
    await setSessionVariable(sessionId, varLeaf, 'done');
    const events = await goalsRepo.evaluateGoals(sessionId, projectId);

    const leafCompleted = events.find(e => e.type === 'goal_completed' && e.goal_name === 'E2E Leaf');
    expect(leafCompleted).toBeDefined();
    expect(leafCompleted!.end_type).toBe('reset');
  });

  it('step 5: verify final session goal states', async () => {
    const goals = await query<{ goal_id: string; status: string }>(`
      SELECT goal_id, status FROM mcp_session_goals WHERE session_id = $1
    `, [sessionId]);

    expect(goals.find(g => g.goal_id === rootId)?.status).toBe('complete');
    expect(goals.find(g => g.goal_id === branchAId)?.status).toBe('complete');
    expect(goals.find(g => g.goal_id === branchBId)?.status).toBe('cancelled');
    expect(goals.find(g => g.goal_id === leafId)?.status).toBe('complete');
  });
});

// ══════════════════════════════════════════════════════════
// 12. Session Goal State API (findSessionGoals)
// ══════════════════════════════════════════════════════════

describe('findSessionGoals', () => {
  let projectId: string;
  let goalId: string;
  let varId: string;
  let sessionId: string;

  beforeAll(async () => {
    projectId = await createTestProject('SessionGoalState');
    varId = await createTestVariable(projectId, 'StateVar', { required: true });
    goalId = await createTestGoal(projectId, 'State Goal');
    await bindVariable(goalId, varId);
    sessionId = await createTestSession(projectId);
    await goalsRepo.initializeSessionGoals(sessionId, projectId, 'guided');
  });
  afterAll(async () => { await deleteTestProject(projectId); });

  it('returns goal with variable collection status', async () => {
    const states = await goalsRepo.findSessionGoals(sessionId, projectId);
    expect(states.length).toBe(1);
    expect(states[0].goal_name).toBe('State Goal');
    expect(states[0].status).toBe('active');
    expect(states[0].variables.length).toBe(1);
    expect(states[0].variables[0].collected).toBe(false);
  });

  it('reflects collected=true after variable fill', async () => {
    await setSessionVariable(sessionId, varId, 'filled!');
    const states = await goalsRepo.findSessionGoals(sessionId, projectId);
    expect(states[0].variables[0].collected).toBe(true);
    expect(states[0].variables[0].value).toBe('filled!');
  });
});

// ══════════════════════════════════════════════════════════
// 13. Cycle Detection
// ══════════════════════════════════════════════════════════

describe('Cycle Detection', () => {
  let projectId: string;
  let goalAId: string;
  let goalBId: string;
  let goalCId: string;

  beforeAll(async () => {
    projectId = await createTestProject('CycleDetect');
    goalAId = await createTestGoal(projectId, 'Cycle A');
    goalBId = await createTestGoal(projectId, 'Cycle B');
    goalCId = await createTestGoal(projectId, 'Cycle C');
  });
  afterAll(async () => { await deleteTestProject(projectId); });

  it('detects direct cycle (A→B, B→A)', async () => {
    await createTestEdge(projectId, goalAId, goalBId);
    await expect(
      goalsRepo.createEdge(projectId, goalBId, goalAId)
    ).rejects.toThrow('circular dependency');
  });

  it('detects indirect cycle (A→B→C, C→A)', async () => {
    await createTestEdge(projectId, goalBId, goalCId);
    await expect(
      goalsRepo.createEdge(projectId, goalCId, goalAId)
    ).rejects.toThrow('circular dependency');
  });

  it('rejects self-loop', async () => {
    await expect(
      goalsRepo.createEdge(projectId, goalAId, goalAId)
    ).rejects.toThrow('own prerequisite');
  });

  it('allows valid edge (no cycle)', async () => {
    const goalDId = await createTestGoal(projectId, 'Cycle D');
    const edge = await goalsRepo.createEdge(projectId, goalCId, goalDId);
    expect(edge).toBeDefined();
    expect(edge.target_goal_id).toBe(goalDId);
  });

  it('pure function: wouldCreateCycle detects cycles without DB', () => {
    const edges = [
      { source_goal_id: 'a', target_goal_id: 'b' },
      { source_goal_id: 'b', target_goal_id: 'c' },
    ] as any[];

    expect(goalsRepo.wouldCreateCycle('c', 'a', edges)).toBe(true);  // c→a creates cycle
    expect(goalsRepo.wouldCreateCycle('a', 'a', edges)).toBe(true);  // self-loop
    expect(goalsRepo.wouldCreateCycle('c', 'd', edges)).toBe(false); // no cycle
    expect(goalsRepo.wouldCreateCycle('a', 'c', edges)).toBe(false); // already exists, no new cycle
  });
});

// ══════════════════════════════════════════════════════════
// 14. OR Gate — Any Prerequisite Activates
// ══════════════════════════════════════════════════════════

describe('OR Gate (prerequisite_gate=any)', () => {
  let projectId: string;
  let parentAId: string;
  let parentBId: string;
  let orChildId: string;
  let varAId: string;
  let varBId: string;
  let varChildId: string;
  let sessionId: string;

  beforeAll(async () => {
    projectId = await createTestProject('ORGate');
    varAId = await createTestVariable(projectId, 'OR Parent A Var', { required: true });
    varBId = await createTestVariable(projectId, 'OR Parent B Var', { required: true });
    varChildId = await createTestVariable(projectId, 'OR Child Var', { required: true });

    parentAId = await createTestGoal(projectId, 'OR Parent A');
    parentBId = await createTestGoal(projectId, 'OR Parent B');
    orChildId = await createTestGoal(projectId, 'OR Child');

    // Set child to OR gate — any parent completes → child activates
    await goalsRepo.update(orChildId, { prerequisite_gate: 'any' });

    await bindVariable(parentAId, varAId);
    await bindVariable(parentBId, varBId);
    await bindVariable(orChildId, varChildId);

    // Both parents → child
    await createTestEdge(projectId, parentAId, orChildId);
    await createTestEdge(projectId, parentBId, orChildId);

    sessionId = await createTestSession(projectId);
    await goalsRepo.initializeSessionGoals(sessionId, projectId, 'guided');
  });
  afterAll(async () => { await deleteTestProject(projectId); });

  it('OR child activates when first parent completes', async () => {
    await setSessionVariable(sessionId, varAId, 'done');
    const events = await goalsRepo.evaluateGoals(sessionId, projectId);

    expect(events.some(e => e.type === 'goal_completed' && e.goal_name === 'OR Parent A')).toBe(true);
    // OR gate: child should activate after just one parent
    expect(events.some(e => e.type === 'goal_activated' && e.goal_name === 'OR Child')).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════
// 15. AND Gate (default) — Requires ALL Prerequisites
// ══════════════════════════════════════════════════════════

describe('AND Gate (prerequisite_gate=all, default)', () => {
  let projectId: string;
  let parentAId: string;
  let parentBId: string;
  let andChildId: string;
  let varAId: string;
  let varBId: string;
  let varChildId: string;
  let sessionId: string;

  beforeAll(async () => {
    projectId = await createTestProject('ANDGate');
    varAId = await createTestVariable(projectId, 'AND Parent A Var', { required: true });
    varBId = await createTestVariable(projectId, 'AND Parent B Var', { required: true });
    varChildId = await createTestVariable(projectId, 'AND Child Var', { required: true });

    parentAId = await createTestGoal(projectId, 'AND Parent A');
    parentBId = await createTestGoal(projectId, 'AND Parent B');
    andChildId = await createTestGoal(projectId, 'AND Child');
    // Default gate is 'all' — no need to set it explicitly

    await bindVariable(parentAId, varAId);
    await bindVariable(parentBId, varBId);
    await bindVariable(andChildId, varChildId);

    // Both parents → child
    await createTestEdge(projectId, parentAId, andChildId);
    await createTestEdge(projectId, parentBId, andChildId);

    sessionId = await createTestSession(projectId);
    await goalsRepo.initializeSessionGoals(sessionId, projectId, 'guided');
  });
  afterAll(async () => { await deleteTestProject(projectId); });

  it('AND child does NOT activate when only one parent completes', async () => {
    await setSessionVariable(sessionId, varAId, 'done');
    const events = await goalsRepo.evaluateGoals(sessionId, projectId);

    expect(events.some(e => e.type === 'goal_completed' && e.goal_name === 'AND Parent A')).toBe(true);
    // AND gate: child should NOT activate yet
    expect(events.some(e => e.type === 'goal_activated' && e.goal_name === 'AND Child')).toBe(false);
  });

  it('AND child activates when ALL parents complete', async () => {
    await setSessionVariable(sessionId, varBId, 'done');
    const events = await goalsRepo.evaluateGoals(sessionId, projectId);

    expect(events.some(e => e.type === 'goal_completed' && e.goal_name === 'AND Parent B')).toBe(true);
    expect(events.some(e => e.type === 'goal_activated' && e.goal_name === 'AND Child')).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════
// 16. Parallel Fork (default) — No Sibling Exclusion
// ══════════════════════════════════════════════════════════

describe('Parallel Fork (fork_type=parallel, default)', () => {
  let projectId: string;
  let parentId: string;
  let sibAId: string;
  let sibBId: string;
  let varParentId: string;
  let varAId: string;
  let varBId: string;
  let sessionId: string;

  beforeAll(async () => {
    projectId = await createTestProject('ParallelFork');
    varParentId = await createTestVariable(projectId, 'PF Parent Var', { required: true });
    varAId = await createTestVariable(projectId, 'PF Sib A Var', { required: true });
    varBId = await createTestVariable(projectId, 'PF Sib B Var', { required: true });

    parentId = await createTestGoal(projectId, 'PF Parent');
    sibAId = await createTestGoal(projectId, 'PF Sibling A');
    sibBId = await createTestGoal(projectId, 'PF Sibling B');
    // Default fork_type is 'parallel' — no sibling exclusion

    await bindVariable(parentId, varParentId);
    await bindVariable(sibAId, varAId);
    await bindVariable(sibBId, varBId);

    await createTestEdge(projectId, parentId, sibAId);
    await createTestEdge(projectId, parentId, sibBId);

    sessionId = await createTestSession(projectId);
    await goalsRepo.initializeSessionGoals(sessionId, projectId, 'guided');
  });
  afterAll(async () => { await deleteTestProject(projectId); });

  it('both siblings activate after parent completes', async () => {
    await setSessionVariable(sessionId, varParentId, 'done');
    const events = await goalsRepo.evaluateGoals(sessionId, projectId);

    expect(events.some(e => e.type === 'goal_completed' && e.goal_name === 'PF Parent')).toBe(true);
    const activated = events.filter(e => e.type === 'goal_activated');
    expect(activated.length).toBe(2);
  });

  it('completing one sibling does NOT cancel the other (parallel)', async () => {
    await setSessionVariable(sessionId, varAId, 'done');
    const events = await goalsRepo.evaluateGoals(sessionId, projectId);

    expect(events.some(e => e.type === 'goal_completed' && e.goal_name === 'PF Sibling A')).toBe(true);
    // NO cancellation events — parallel fork
    const cancelled = events.filter(e => e.type === 'goal_cancelled');
    expect(cancelled.length).toBe(0);

    // Sibling B should still be active
    const goals = await query<{ goal_id: string; status: string }>(`
      SELECT goal_id, status FROM mcp_session_goals WHERE session_id = $1
    `, [sessionId]);
    expect(goals.find(g => g.goal_id === sibBId)?.status).toBe('active');
  });

  it('second sibling can complete independently', async () => {
    await setSessionVariable(sessionId, varBId, 'done');
    const events = await goalsRepo.evaluateGoals(sessionId, projectId);

    expect(events.some(e => e.type === 'goal_completed' && e.goal_name === 'PF Sibling B')).toBe(true);
  });
});

// ── Close pool after all tests ──
afterAll(async () => {
  await closePool();
});
