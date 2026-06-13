/**
 * goalE2E.test.ts — End-to-end trace: Goals → Horizon → Variable Advancement
 *
 * Validates the full chain:
 *   1. Goals appear in the horizon response with correct shape
 *   2. Goal-relevant nords get a goal_proximity boost in neighbors/suggested_next
 *   3. Required variables advance a goal; optional variables do NOT
 *   4. Filling all required variables completes the goal
 *   5. Completed goal activates DAG children (pending → active)
 *   6. Goal completion status is reflected in the next horizon call
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as mcpRepo from '../repositories/mcpSessions.js';
import * as goalsRepo from '../repositories/goals.js';
import {
  createTestProject, createTestVariable, createTestGoal, createTestEdge,
  bindVariable, createTestSession, setSessionVariable, deleteTestProject,
  createTestNordType, createTestNord, createTestConnectionType, createTestConnection,
  closePool, query,
} from './helpers.js';

afterAll(closePool);

describe('Goal End-to-End Trace', () => {
  let projectId: string;
  let sessionId: string;

  // Graph nodes
  let centerNordId: string;
  let relevantNordId: string;
  let irrelevantNordId: string;

  // Variables
  let reqVarAId: string;   // required — bound to goalA
  let reqVarBId: string;   // required — bound to goalA
  let optVarCId: string;   // optional — bound to goalA

  // Goals
  let goalAId: string;     // root goal, has variable bindings + relevant nord
  let goalBId: string;     // child of goalA, pending until A completes

  beforeAll(async () => {
    projectId = await createTestProject('GoalE2E');

    // -- Variables --
    reqVarAId = await createTestVariable(projectId, 'Device Name', { required: true });
    reqVarBId = await createTestVariable(projectId, 'Regulatory Class', { required: true });
    optVarCId = await createTestVariable(projectId, 'Notes', { required: false });

    // -- Graph structure --
    const nodeType = await createTestNordType(projectId, 'Node');
    const connType = await createTestConnectionType(projectId, 'Links', { verb: 'leads to' });

    centerNordId = await createTestNord(projectId, nodeType, 'Dashboard');
    relevantNordId = await createTestNord(projectId, nodeType, 'Regulatory Lab');
    irrelevantNordId = await createTestNord(projectId, nodeType, 'Break Room');

    await createTestConnection(projectId, connType, centerNordId, relevantNordId, {
      direction: 'forward', distanceX: 0.3,
    });
    await createTestConnection(projectId, connType, centerNordId, irrelevantNordId, {
      direction: 'forward', distanceX: 0.7,
    });

    // -- Goals --
    // GoalA: root, requires reqVarA (required) + reqVarB (required) + optVarC (optional)
    goalAId = await createTestGoal(projectId, 'Identify Device');
    await goalsRepo.addVariableBinding(goalAId, reqVarAId, true);   // required
    await goalsRepo.addVariableBinding(goalAId, reqVarBId, true);   // required
    await goalsRepo.addVariableBinding(goalAId, optVarCId, false);  // optional

    // GoalA is relevant to 'Regulatory Lab'
    await goalsRepo.addRelevantNord(goalAId, relevantNordId);

    // GoalB: child of GoalA, should start pending
    goalBId = await createTestGoal(projectId, 'Submit Filing');
    await createTestEdge(projectId, goalAId, goalBId);

    // -- Session --
    sessionId = await createTestSession(projectId, { startNordId: centerNordId });
    await goalsRepo.initializeSessionGoals(sessionId, projectId, 'guided');
  });

  afterAll(async () => { await deleteTestProject(projectId); });

  // ─── 1. Goals are surfaced in the horizon ───

  it('horizon.goals contains both goals with correct statuses', async () => {
    const horizon = await mcpRepo.getSessionHorizon(sessionId);

    expect(horizon.goals).toBeDefined();
    expect(horizon.goals.length).toBe(2);

    const goalA = horizon.goals.find(g => g.goal_name === 'Identify Device');
    const goalB = horizon.goals.find(g => g.goal_name === 'Submit Filing');

    expect(goalA).toBeDefined();
    expect(goalA!.status).toBe('active');
    expect(goalA!.progress.required).toBe(2);    // 2 required bindings
    expect(goalA!.progress.filled).toBe(0);       // nothing filled yet
    expect(goalA!.progress.total).toBe(3);         // 3 total bindings

    expect(goalB).toBeDefined();
    expect(goalB!.status).toBe('pending');         // child waits for parent
  });

  // ─── 2. Goal-relevant nords affect the horizon ───

  it('relevant nord gets goal_proximity boost, irrelevant does not', async () => {
    const horizon = await mcpRepo.getSessionHorizon(sessionId);

    const lab = horizon.neighbors.find(n => n.nord.title === 'Regulatory Lab');
    const breakRoom = horizon.neighbors.find(n => n.nord.title === 'Break Room');

    expect(lab).toBeDefined();
    expect(breakRoom).toBeDefined();
    expect(lab!.goal_proximity).toBeGreaterThan(0);
    expect(breakRoom!.goal_proximity).toBe(0);
  });

  it('relevant nord ranks higher in suggested_next', async () => {
    const horizon = await mcpRepo.getSessionHorizon(sessionId);
    const titles = horizon.suggested_next.map(s => s.title);

    expect(titles.indexOf('Regulatory Lab')).toBeLessThan(titles.indexOf('Break Room'));
  });

  // ─── 3. Optional variable does NOT advance goal completion ───

  it('filling only the optional variable does not complete the goal', async () => {
    await setSessionVariable(sessionId, optVarCId, 'Some notes');

    const events = await goalsRepo.evaluateGoals(sessionId, projectId);
    const completed = events.filter(e => e.type === 'goal_completed');
    expect(completed.length).toBe(0);

    // Goal progress: 1 filled (optional), but still 0/2 required
    const horizon = await mcpRepo.getSessionHorizon(sessionId);
    const goalA = horizon.goals.find(g => g.goal_name === 'Identify Device');
    expect(goalA!.status).toBe('active');
    expect(goalA!.progress.filled).toBe(1);      // optional counts as filled
    expect(goalA!.progress.required).toBe(2);     // still 2 required
  });

  // ─── 4. Required variables advance goal; one isn't enough ───

  it('filling one required variable moves progress but does not complete', async () => {
    await setSessionVariable(sessionId, reqVarAId, 'PulseSense CGM');

    const events = await goalsRepo.evaluateGoals(sessionId, projectId);
    const completed = events.filter(e => e.type === 'goal_completed');
    expect(completed.length).toBe(0);

    const horizon = await mcpRepo.getSessionHorizon(sessionId);
    const goalA = horizon.goals.find(g => g.goal_name === 'Identify Device');
    expect(goalA!.status).toBe('active');
    expect(goalA!.progress.filled).toBe(2);       // 1 required + 1 optional
    expect(goalA!.progress.required).toBe(2);
  });

  // ─── 5. Filling all required variables completes the goal ───

  it('filling final required variable completes the goal', async () => {
    await setSessionVariable(sessionId, reqVarBId, 'Class II');

    const events = await goalsRepo.evaluateGoals(sessionId, projectId);
    const completed = events.filter(e => e.type === 'goal_completed');
    expect(completed.length).toBe(1);
    expect(completed[0].goal_name).toBe('Identify Device');
  });

  // ─── 6. Goal completion activates DAG children ───

  it('child goal transitions from pending to active after parent completes', async () => {
    // evaluateGoals already ran above and should have activated the child
    const horizon = await mcpRepo.getSessionHorizon(sessionId);

    const goalA = horizon.goals.find(g => g.goal_name === 'Identify Device');
    const goalB = horizon.goals.find(g => g.goal_name === 'Submit Filing');

    expect(goalA!.status).toBe('complete');
    expect(goalB!.status).toBe('active');  // was pending, now active
  });

  // ─── 7. Remaining variables reflect goal-filtered state ───

  it('remaining_variables only shows variables from active goals', async () => {
    const horizon = await mcpRepo.getSessionHorizon(sessionId);

    // reqVarA and reqVarB are filled. optVarC is filled.
    // Identify Device is complete, so its variables should be gone.
    // Submit Filing has no variable bindings, so only unbound vars remain.
    // The only remaining is Website if unbound, or nothing.
    // Actually we have 3 project variables total, all filled, so remaining should be empty.
    const remaining = horizon.remaining_variables;

    // All 3 variables are filled
    expect(remaining.length).toBe(0);
  });

  // ─── 8. Completion tracks across the session ───

  it('completion reflects all required variables filled', async () => {
    const horizon = await mcpRepo.getSessionHorizon(sessionId);

    // 2 required variables, both filled
    expect(horizon.completion.filled).toBe(2);
    expect(horizon.completion.required).toBe(2);
    expect(horizon.completion.percentage).toBe(100);
  });
});
