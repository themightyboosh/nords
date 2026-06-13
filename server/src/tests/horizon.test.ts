/**
 * Horizon, Persona & Cross-Goal Integration Tests
 *
 * Validates behaviors beyond the goal engine:
 *   - Connection verbs & directions appear in horizon
 *   - Persona category weights influence neighbor ordering
 *   - Persona mental models surface in horizon
 *   - Persona goal weights influence goal ordering
 *   - Cross-goal variable sharing (fill once → complete everywhere)
 *   - Session variable capture metadata (sequence, context)
 *
 * All tests create their own throwaway project and clean up after.
 * Re-runnable: `npm test` at any time.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as mcpRepo from '../repositories/mcpSessions.js';
import * as goalsRepo from '../repositories/goals.js';
import {
  createTestProject, createTestVariable, createTestGoal, createTestEdge,
  bindVariable, createTestSession, setSessionVariable, deleteTestProject,
  createTestNordType, createTestNord, createTestConnectionType, createTestConnection,
  createTestPersona, addTestMentalModel, setPersonaCategoryWeight, setPersonaGoalWeight,
  setSessionPersona, setSessionCurrentNord,
  closePool, query,
} from './helpers.js';

// ══════════════════════════════════════════════════════════
// 1. Connection Verbs & Directions in Horizon
// ══════════════════════════════════════════════════════════

describe('Connection Verbs & Directions', () => {
  let projectId: string;
  let nordAId: string;
  let nordBId: string;
  let nordCId: string;
  let sessionId: string;

  beforeAll(async () => {
    projectId = await createTestProject('VerbDirection');

    const typeId = await createTestNordType(projectId, 'Topic');

    // Two connection types with different verbs
    const causesTypeId = await createTestConnectionType(projectId, 'Causation', {
      verb: 'causes',
      defaultDirection: 'to',
    });
    const relatesTypeId = await createTestConnectionType(projectId, 'Relation', {
      verb: 'relates to',
      defaultDirection: 'none',
    });

    nordAId = await createTestNord(projectId, typeId, 'Origin');
    nordBId = await createTestNord(projectId, typeId, 'Effect');
    nordCId = await createTestNord(projectId, typeId, 'Tangent');

    // Origin —causes→ Effect (forward)
    await createTestConnection(projectId, causesTypeId, nordAId, nordBId, { direction: 'forward' });
    // Origin —relates to— Tangent (none/bidirectional)
    await createTestConnection(projectId, relatesTypeId, nordAId, nordCId, { direction: 'none' });

    sessionId = await createTestSession(projectId, { startNordId: nordAId });
  });
  afterAll(async () => { await deleteTestProject(projectId); });

  it('horizon includes connection verbs', async () => {
    const horizon = await mcpRepo.getSessionHorizon(sessionId);
    expect(horizon.neighbors.length).toBe(2);

    const verbs = horizon.neighbors.map(n => n.relationship.verb);
    expect(verbs).toContain('causes');
    expect(verbs).toContain('relates to');
  });

  it('horizon preserves connection direction', async () => {
    const horizon = await mcpRepo.getSessionHorizon(sessionId);

    const effectNeighbor = horizon.neighbors.find(n => n.nord.title === 'Effect');
    expect(effectNeighbor?.relationship.direction).toBe('forward');

    const tangentNeighbor = horizon.neighbors.find(n => n.nord.title === 'Tangent');
    expect(tangentNeighbor?.relationship.direction).toBe('none');
  });

  it('horizon includes connection type names', async () => {
    const horizon = await mcpRepo.getSessionHorizon(sessionId);

    const typeNames = horizon.neighbors.map(n => n.relationship.type_name);
    expect(typeNames).toContain('Causation');
    expect(typeNames).toContain('Relation');
  });
});

// ══════════════════════════════════════════════════════════
// 2. Persona Category Weights → Neighbor Ordering
// ══════════════════════════════════════════════════════════

describe('Persona Category Weights', () => {
  let projectId: string;
  let centerNordId: string;
  let techNordId: string;
  let bizNordId: string;
  let techTypeId: string;
  let bizTypeId: string;
  let techPersonaId: string;
  let sessionId: string;

  beforeAll(async () => {
    projectId = await createTestProject('PersonaWeights');

    const nodeType = await createTestNordType(projectId, 'Node');

    // Two connection categories: "Technical" and "Business"
    techTypeId = await createTestConnectionType(projectId, 'Technical', { verb: 'implements' });
    bizTypeId = await createTestConnectionType(projectId, 'Business', { verb: 'funds' });

    centerNordId = await createTestNord(projectId, nodeType, 'Center');
    techNordId = await createTestNord(projectId, nodeType, 'Tech Feature');
    bizNordId = await createTestNord(projectId, nodeType, 'Revenue Model');

    // Center → Tech Feature (via Technical), Center → Revenue Model (via Business)
    await createTestConnection(projectId, techTypeId, centerNordId, techNordId, { direction: 'forward', distanceX: 0.3 });
    await createTestConnection(projectId, bizTypeId, centerNordId, bizNordId, { direction: 'forward', distanceX: 0.3 });

    // Tech persona: loves Technical (+80), ignores Business (-50)
    techPersonaId = await createTestPersona(projectId, 'Engineer', {
      primaryMotivation: 'Build scalable systems',
      voiceAndTone: 'Precise and technical',
    });
    await setPersonaCategoryWeight(techPersonaId, techTypeId, 80);
    await setPersonaCategoryWeight(techPersonaId, bizTypeId, -50);

    sessionId = await createTestSession(projectId, { startNordId: centerNordId, personaId: techPersonaId });
  });
  afterAll(async () => { await deleteTestProject(projectId); });

  it('weights bias neighbor persona_bias values', async () => {
    const horizon = await mcpRepo.getSessionHorizon(sessionId);

    const techNeighbor = horizon.neighbors.find(n => n.nord.title === 'Tech Feature');
    const bizNeighbor = horizon.neighbors.find(n => n.nord.title === 'Revenue Model');

    expect(techNeighbor).toBeDefined();
    expect(bizNeighbor).toBeDefined();

    // Tech persona has +80 on Technical → persona_bias should be > 0.5
    // Formula: 0.5 + (weight / 200) → 0.5 + (80/200) = 0.9
    expect(techNeighbor!.persona_bias).toBeCloseTo(0.9, 1);
    // Business has -50 → 0.5 + (-50/200) = 0.25
    expect(bizNeighbor!.persona_bias).toBeCloseTo(0.25, 1);
  });

  it('tech neighbor sorts above business neighbor', async () => {
    const horizon = await mcpRepo.getSessionHorizon(sessionId);
    const titles = horizon.neighbors.map(n => n.nord.title);

    // Tech Feature should appear first because it has higher persona_bias
    expect(titles[0]).toBe('Tech Feature');
    expect(titles[1]).toBe('Revenue Model');
  });

  it('persona details appear in horizon', async () => {
    const horizon = await mcpRepo.getSessionHorizon(sessionId);
    expect(horizon.persona).toBeDefined();
    expect(horizon.persona!.name).toBe('Engineer');
    expect(horizon.persona!.primary_motivation).toBe('Build scalable systems');
    expect(horizon.persona!.voice_and_tone).toBe('Precise and technical');
  });

  it('persona weights map appears in horizon', async () => {
    const horizon = await mcpRepo.getSessionHorizon(sessionId);
    const weights = horizon.persona!.weights;

    expect(weights[techTypeId]).toBe(80);
    expect(weights[bizTypeId]).toBe(-50);
  });

  it('suggested_next reflects persona bias', async () => {
    const horizon = await mcpRepo.getSessionHorizon(sessionId);
    // Ranked list — Tech Feature should be first with highest explore_score
    expect(horizon.suggested_next.length).toBe(2);
    expect(horizon.suggested_next[0].title).toBe('Tech Feature');
    expect(horizon.suggested_next[0].explore_score).toBeGreaterThan(horizon.suggested_next[1].explore_score);
    expect(horizon.suggested_next[0].verb).toBe('implements');
  });
});

// ══════════════════════════════════════════════════════════
// 3. Persona Mental Models in Horizon
// ══════════════════════════════════════════════════════════

describe('Persona Mental Models', () => {
  let projectId: string;
  let personaId: string;
  let sessionId: string;

  beforeAll(async () => {
    projectId = await createTestProject('MentalModels');

    personaId = await createTestPersona(projectId, 'Analyst', {
      primaryMotivation: 'Find patterns in data',
      voiceAndTone: 'Methodical and evidence-based',
      background: 'PhD in Behavioral Economics',
    });

    // Add 3 mental models in order
    await addTestMentalModel(personaId, 'Jobs-to-be-Done', 'Focus on the job the customer is hiring the product to do.', 0);
    await addTestMentalModel(personaId, 'First Principles', 'Break problems down to fundamental truths.', 1);
    await addTestMentalModel(personaId, 'Systems Thinking', 'Understand how parts interact as a whole.', 2);

    const nordType = await createTestNordType(projectId, 'Concept');
    const nordId = await createTestNord(projectId, nordType, 'Anchor');

    sessionId = await createTestSession(projectId, { personaId, startNordId: nordId });
  });
  afterAll(async () => { await deleteTestProject(projectId); });

  it('mental models appear in horizon persona', async () => {
    const horizon = await mcpRepo.getSessionHorizon(sessionId);

    expect(horizon.persona).toBeDefined();
    expect(horizon.persona!.mental_models).toBeDefined();
    expect(horizon.persona!.mental_models.length).toBe(3);
  });

  it('mental models are in sort order', async () => {
    const horizon = await mcpRepo.getSessionHorizon(sessionId);
    const names = horizon.persona!.mental_models.map(m => m.name);

    expect(names).toEqual(['Jobs-to-be-Done', 'First Principles', 'Systems Thinking']);
  });

  it('mental model bodies are present', async () => {
    const horizon = await mcpRepo.getSessionHorizon(sessionId);
    const jtbd = horizon.persona!.mental_models.find(m => m.name === 'Jobs-to-be-Done');

    expect(jtbd).toBeDefined();
    expect(jtbd!.body).toContain('hiring the product');
  });
});

// ══════════════════════════════════════════════════════════
// 4. Persona Goal Weights → Goal Ordering
// ══════════════════════════════════════════════════════════

describe('Persona Goal Weights', () => {
  let projectId: string;
  let goalAId: string;
  let goalBId: string;
  let goalCId: string;
  let varAId: string;
  let varBId: string;
  let varCId: string;
  let personaId: string;
  let sessionId: string;

  beforeAll(async () => {
    projectId = await createTestProject('GoalWeights');
    varAId = await createTestVariable(projectId, 'Metric A', { required: true });
    varBId = await createTestVariable(projectId, 'Metric B', { required: true });
    varCId = await createTestVariable(projectId, 'Metric C', { required: true });

    // Three goals: Demographics, Preferences, Satisfaction
    goalAId = await createTestGoal(projectId, 'Demographics', { sort_order: 0 });
    goalBId = await createTestGoal(projectId, 'Preferences', { sort_order: 1 });
    goalCId = await createTestGoal(projectId, 'Satisfaction', { sort_order: 2 });

    await bindVariable(goalAId, varAId);
    await bindVariable(goalBId, varBId);
    await bindVariable(goalCId, varCId);

    // Persona that prioritizes Satisfaction (weight 90) > Preferences (50) > Demographics (10)
    personaId = await createTestPersona(projectId, 'UX Lead');
    await setPersonaGoalWeight(personaId, goalAId, 10);
    await setPersonaGoalWeight(personaId, goalBId, 50);
    await setPersonaGoalWeight(personaId, goalCId, 90);

    sessionId = await createTestSession(projectId, { personaId });
    await goalsRepo.initializeSessionGoals(sessionId, projectId, 'guided');
  });
  afterAll(async () => { await deleteTestProject(projectId); });

  it('goals are sorted by persona weight (descending)', async () => {
    const goals = await goalsRepo.findSessionGoals(sessionId, projectId, personaId);

    expect(goals.length).toBe(3);
    // Satisfaction (90) → Preferences (50) → Demographics (10)
    expect(goals[0].goal_name).toBe('Satisfaction');
    expect(goals[1].goal_name).toBe('Preferences');
    expect(goals[2].goal_name).toBe('Demographics');
  });

  it('persona_weight values are returned', async () => {
    const goals = await goalsRepo.findSessionGoals(sessionId, projectId, personaId);

    expect(goals[0].persona_weight).toBe(90);
    expect(goals[1].persona_weight).toBe(50);
    expect(goals[2].persona_weight).toBe(10);
  });

  it('without persona, goals follow sort_order', async () => {
    const goals = await goalsRepo.findSessionGoals(sessionId, projectId, null);

    expect(goals[0].goal_name).toBe('Demographics');
    expect(goals[1].goal_name).toBe('Preferences');
    expect(goals[2].goal_name).toBe('Satisfaction');
  });
});

// ══════════════════════════════════════════════════════════
// 5. Cross-Goal Variable Sharing
// ══════════════════════════════════════════════════════════

describe('Cross-Goal Variable Sharing', () => {
  let projectId: string;
  let sharedVarId: string;    // "Full Name" — appears in ALL goals
  let goalOnlyVarId: string;  // "Email" — only in Goal A
  let goalAId: string;
  let goalBId: string;
  let goalCId: string;
  let sessionId: string;

  beforeAll(async () => {
    projectId = await createTestProject('CrossGoalVar');
    sharedVarId = await createTestVariable(projectId, 'Full Name', { required: true });
    goalOnlyVarId = await createTestVariable(projectId, 'Email', { required: true });
    const goalCVarId = await createTestVariable(projectId, 'Phone', { required: true });

    // Goal A requires: Full Name + Email
    goalAId = await createTestGoal(projectId, 'Contact Info', { sort_order: 0 });
    await bindVariable(goalAId, sharedVarId);
    await bindVariable(goalAId, goalOnlyVarId);

    // Goal B requires: Full Name only
    goalBId = await createTestGoal(projectId, 'Identity Check', { sort_order: 1 });
    await bindVariable(goalBId, sharedVarId);

    // Goal C requires: Full Name + Phone
    goalCId = await createTestGoal(projectId, 'Follow-up Call', { sort_order: 2 });
    await bindVariable(goalCId, sharedVarId);
    await bindVariable(goalCId, goalCVarId);

    sessionId = await createTestSession(projectId);
    await goalsRepo.initializeSessionGoals(sessionId, projectId, 'guided');
  });
  afterAll(async () => { await deleteTestProject(projectId); });

  it('filling shared variable counts as collected for all goals', async () => {
    // Fill "Full Name" once
    await setSessionVariable(sessionId, sharedVarId, 'Jane Doe');
    const events = await goalsRepo.evaluateGoals(sessionId, projectId);

    // Goal B ("Identity Check") should complete — it only requires Full Name
    const completed = events.filter(e => e.type === 'goal_completed');
    expect(completed.length).toBe(1);
    expect(completed[0].goal_name).toBe('Identity Check');

    // Goal A and C should NOT be complete yet (they need more)
    const goals = await goalsRepo.findSessionGoals(sessionId, projectId);
    const goalA = goals.find(g => g.goal_name === 'Contact Info');
    const goalC = goals.find(g => g.goal_name === 'Follow-up Call');

    // But Full Name should show as collected in ALL goals
    expect(goalA?.variables.find(v => v.variable_name === 'Full Name')?.collected).toBe(true);
    expect(goalC?.variables.find(v => v.variable_name === 'Full Name')?.collected).toBe(true);
  });

  it('filling a goal-specific variable does not affect other goals', async () => {
    // Fill "Email" — only Goal A cares
    await setSessionVariable(sessionId, goalOnlyVarId, 'jane@example.com');
    const events = await goalsRepo.evaluateGoals(sessionId, projectId);

    // Goal A now has Full Name + Email → complete
    const completed = events.filter(e => e.type === 'goal_completed');
    expect(completed.length).toBe(1);
    expect(completed[0].goal_name).toBe('Contact Info');

    // Goal C still needs Phone
    const goals = await goalsRepo.findSessionGoals(sessionId, projectId);
    const goalC = goals.find(g => g.goal_name === 'Follow-up Call');
    expect(goalC?.status).toBe('active');
    expect(goalC?.variables.find(v => v.variable_name === 'Phone')?.collected).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════
// 6. Session Variable Capture — Sequence & Re-runnability
// ══════════════════════════════════════════════════════════

describe('Variable Capture Metadata', () => {
  let projectId: string;
  let varAId: string;
  let varBId: string;
  let sessionId: string;

  beforeAll(async () => {
    projectId = await createTestProject('VarCapture');
    varAId = await createTestVariable(projectId, 'City', { required: true });
    varBId = await createTestVariable(projectId, 'State', { required: true });
    sessionId = await createTestSession(projectId);
  });
  afterAll(async () => { await deleteTestProject(projectId); });

  it('variables are sequenced in collection order', async () => {
    await setSessionVariable(sessionId, varAId, 'Austin');
    await setSessionVariable(sessionId, varBId, 'Texas');

    const vars = await mcpRepo.findSessionVariables(sessionId);
    expect(vars.length).toBe(2);
    // First collected should have lower sequence
    const cityVar = vars.find(v => v.variable_id === varAId);
    const stateVar = vars.find(v => v.variable_id === varBId);
    expect(cityVar!.sequence).toBeLessThan(stateVar!.sequence);
  });

  it('updating a variable preserves the value', async () => {
    // Update City from 'Austin' to 'Dallas'
    await setSessionVariable(sessionId, varAId, 'Dallas');

    const vars = await mcpRepo.findSessionVariables(sessionId);
    const cityVar = vars.find(v => v.variable_id === varAId);
    expect(cityVar!.value).toBe('Dallas');
  });

  it('updated variable stays collected across goals', async () => {
    const goalId = await createTestGoal(projectId, 'Location Goal');
    await bindVariable(goalId, varAId);

    const anotherSession = await createTestSession(projectId);
    await query(`
      INSERT INTO mcp_session_goals (session_id, goal_id, status) VALUES ($1, $2, 'active')
    `, [anotherSession, goalId]);

    // Set then overwrite
    await setSessionVariable(anotherSession, varAId, 'Houston');
    await setSessionVariable(anotherSession, varAId, 'San Antonio');

    const events = await goalsRepo.evaluateGoals(anotherSession, projectId);
    const completed = events.filter(e => e.type === 'goal_completed');
    expect(completed.length).toBe(1);
  });
});

// ══════════════════════════════════════════════════════════
// 7. Horizon Remaining Variables & Completion Tracking
// ══════════════════════════════════════════════════════════

describe('Horizon Variable Tracking', () => {
  let projectId: string;
  let reqVarId: string;
  let optVarId: string;
  let sessionId: string;

  beforeAll(async () => {
    projectId = await createTestProject('HorizonVars');
    reqVarId = await createTestVariable(projectId, 'Company Name', { required: true });
    optVarId = await createTestVariable(projectId, 'Website', { required: false });

    const nordType = await createTestNordType(projectId, 'Item');
    const nordId = await createTestNord(projectId, nordType, 'Start');

    sessionId = await createTestSession(projectId, { startNordId: nordId });
  });
  afterAll(async () => { await deleteTestProject(projectId); });

  it('remaining_variables lists unfilled variables', async () => {
    const horizon = await mcpRepo.getSessionHorizon(sessionId);

    expect(horizon.remaining_variables.length).toBe(2);
    const names = horizon.remaining_variables.map(v => v.name);
    expect(names).toContain('Company Name');
    expect(names).toContain('Website');
  });

  it('filling a variable removes it from remaining_variables', async () => {
    await setSessionVariable(sessionId, reqVarId, 'Nords Inc.');

    const horizon = await mcpRepo.getSessionHorizon(sessionId);
    const names = horizon.remaining_variables.map(v => v.name);
    expect(names).not.toContain('Company Name');
    expect(names).toContain('Website');
  });

  it('completion percentage tracks required variables only', async () => {
    const horizon = await mcpRepo.getSessionHorizon(sessionId);

    // 1 required filled / 1 required total = 100%
    expect(horizon.completion.filled).toBe(1);
    expect(horizon.completion.required).toBe(1);
    expect(horizon.completion.percentage).toBe(100);
  });
});

// ══════════════════════════════════════════════════════════
// 8. Goal Relevant Nords — Proximity in Horizon
// ══════════════════════════════════════════════════════════

describe('Goal Relevant Nords', () => {
  let projectId: string;
  let centerNordId: string;
  let relevantNordId: string;
  let irrelevantNordId: string;
  let goalId: string;
  let sessionId: string;

  beforeAll(async () => {
    projectId = await createTestProject('GoalProximity');
    const varId = await createTestVariable(projectId, 'Data Point', { required: true });

    const nodeType = await createTestNordType(projectId, 'Place');
    const connType = await createTestConnectionType(projectId, 'Path', { verb: 'leads to' });

    centerNordId = await createTestNord(projectId, nodeType, 'Lobby');
    relevantNordId = await createTestNord(projectId, nodeType, 'Lab');
    irrelevantNordId = await createTestNord(projectId, nodeType, 'Breakroom');

    await createTestConnection(projectId, connType, centerNordId, relevantNordId, { direction: 'forward', distanceX: 0.5 });
    await createTestConnection(projectId, connType, centerNordId, irrelevantNordId, { direction: 'forward', distanceX: 0.5 });

    // Goal linked to the Lab nord
    goalId = await createTestGoal(projectId, 'Research Goal');
    await bindVariable(goalId, varId);
    await goalsRepo.addRelevantNord(goalId, relevantNordId);

    sessionId = await createTestSession(projectId, { startNordId: centerNordId });
    await goalsRepo.initializeSessionGoals(sessionId, projectId, 'guided');
  });
  afterAll(async () => { await deleteTestProject(projectId); });

  it('goal-relevant nords get a goal_proximity boost', async () => {
    const horizon = await mcpRepo.getSessionHorizon(sessionId);

    const lab = horizon.neighbors.find(n => n.nord.title === 'Lab');
    const breakroom = horizon.neighbors.find(n => n.nord.title === 'Breakroom');

    expect(lab).toBeDefined();
    expect(breakroom).toBeDefined();
    expect(lab!.goal_proximity).toBe(0.1);
    expect(breakroom!.goal_proximity).toBe(0);
  });

  it('goal-relevant nord sorts above non-relevant', async () => {
    const horizon = await mcpRepo.getSessionHorizon(sessionId);
    const titles = horizon.neighbors.map(n => n.nord.title);

    // Lab has goal_proximity=0.3 + persona_bias, Breakroom has 0
    expect(titles.indexOf('Lab')).toBeLessThan(titles.indexOf('Breakroom'));
  });
});

// ══════════════════════════════════════════════════════════
// 9. Full Persona Lifecycle — E2E
// ══════════════════════════════════════════════════════════

describe('Persona Full Lifecycle', () => {
  let projectId: string;
  let personaAId: string;
  let personaBId: string;
  let techTypeId: string;
  let bizTypeId: string;
  let centerNordId: string;
  let sessionId: string;

  beforeAll(async () => {
    projectId = await createTestProject('PersonaLifecycle');

    const nodeType = await createTestNordType(projectId, 'Topic');
    techTypeId = await createTestConnectionType(projectId, 'Engineering', { verb: 'engineers' });
    bizTypeId = await createTestConnectionType(projectId, 'Sales', { verb: 'sells' });

    centerNordId = await createTestNord(projectId, nodeType, 'Product');
    const techNordId = await createTestNord(projectId, nodeType, 'Backend');
    const bizNordId = await createTestNord(projectId, nodeType, 'Pipeline');

    await createTestConnection(projectId, techTypeId, centerNordId, techNordId, { direction: 'forward', distanceX: 0.3 });
    await createTestConnection(projectId, bizTypeId, centerNordId, bizNordId, { direction: 'forward', distanceX: 0.3 });

    // Persona A: tech-focused
    personaAId = await createTestPersona(projectId, 'Dev Lead');
    await setPersonaCategoryWeight(personaAId, techTypeId, 90);
    await setPersonaCategoryWeight(personaAId, bizTypeId, -40);
    await addTestMentalModel(personaAId, 'SOLID Principles', 'Design with single responsibility and dependency inversion.', 0);

    // Persona B: business-focused
    personaBId = await createTestPersona(projectId, 'Sales VP');
    await setPersonaCategoryWeight(personaBId, techTypeId, -30);
    await setPersonaCategoryWeight(personaBId, bizTypeId, 80);
    await addTestMentalModel(personaBId, 'MEDDIC', 'Qualify deals with Metrics, Economic Buyer, Decision Process, Decision Criteria, Identify Pain, Champion.', 0);

    sessionId = await createTestSession(projectId, { startNordId: centerNordId, personaId: personaAId });
  });
  afterAll(async () => { await deleteTestProject(projectId); });

  it('starts with persona A: Backend ranked first', async () => {
    const horizon = await mcpRepo.getSessionHorizon(sessionId);

    expect(horizon.persona!.name).toBe('Dev Lead');
    expect(horizon.persona!.mental_models[0].name).toBe('SOLID Principles');
    expect(horizon.neighbors[0].nord.title).toBe('Backend');
  });

  it('switching to persona B: Pipeline ranked first', async () => {
    await setSessionPersona(sessionId, personaBId);

    const horizon = await mcpRepo.getSessionHorizon(sessionId);

    expect(horizon.persona!.name).toBe('Sales VP');
    expect(horizon.persona!.mental_models[0].name).toBe('MEDDIC');
    expect(horizon.neighbors[0].nord.title).toBe('Pipeline');
  });

  it('clearing persona gives neutral ordering', async () => {
    await setSessionPersona(sessionId, null);

    const horizon = await mcpRepo.getSessionHorizon(sessionId);

    expect(horizon.persona).toBeNull();
    // All neighbors should have persona_bias = 0.5 (neutral)
    for (const n of horizon.neighbors) {
      expect(n.persona_bias).toBeCloseTo(0.5, 1);
    }
  });
});

// ── Close pool after all tests ──
afterAll(async () => {
  await closePool();
});
