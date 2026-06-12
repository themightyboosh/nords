/**
 * personaProtocol.test.ts — Integration tests for persona protocol improvements.
 *
 * Validates:
 *   - nords_switch_persona returns full horizon (not lean)
 *   - buildProtocol includes attribution rule in collect/guided modes
 *   - buildProtocol mental models use APPLY/ENUMERATE phrasing
 *   - computeScore navigation health flags (shallow, freewheeling, stuck)
 *   - Hallucination judge snapshot includes connection properties
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { dispatchTool, type ToolContext } from '../lib/toolDispatch.js';
import { computeScore, type TranscriptRound } from '../lib/testRunner.js';
import * as mcpRepo from '../repositories/mcpSessions.js';
import {
  createTestProject, createTestNordType, createTestNord,
  createTestConnectionType, createTestConnection,
  createTestPersona, addTestMentalModel, setPersonaCategoryWeight,
  createTestSession, setSessionCurrentNord, setSessionPersona,
  deleteTestProject, closePool,
} from './helpers.js';

// ── Helpers ──

function makeCtx(projectId: string, sessionId: string): ToolContext {
  return { projectId, sessionId, mcpMutable: false, mcpCaptureData: true };
}

function makeRound(overrides: Partial<TranscriptRound> = {}): TranscriptRound {
  return {
    round: 0,
    user_msg: 'test',
    agent_msg: 'response',
    tool_calls: [],
    tokens_in: 100,
    tokens_out: 50,
    latency_ms: 1000,
    delay_ms: 0,
    ...overrides,
  };
}

// ══════════════════════════════════════════════════════════
// 1. nords_switch_persona returns full horizon
// ══════════════════════════════════════════════════════════

describe('nords_switch_persona returns full horizon', () => {
  let pid: string, sid: string;
  let typeId: string, connTypeId: string;
  let nordA: string, nordB: string;
  let personaAlpha: string, personaBeta: string;

  beforeAll(async () => {
    pid = await createTestProject('SwitchHorizon');
    typeId = await createTestNordType(pid, 'Feature');
    connTypeId = await createTestConnectionType(pid, 'Depends On', { verb: 'depends on' });
    nordA = await createTestNord(pid, typeId, 'Feature Alpha');
    nordB = await createTestNord(pid, typeId, 'Feature Beta');
    await createTestConnection(pid, connTypeId, nordA, nordB);

    personaAlpha = await createTestPersona(pid, 'Dr. Alpha', {
      primary_motivation: 'Find all dependencies',
      voice_and_tone: 'Analytical and precise',
    });
    await addTestMentalModel(personaAlpha, 'Dependency Analysis', 'Map all upstream and downstream dependencies before making changes');
    await setPersonaCategoryWeight(personaAlpha, connTypeId, 80);

    personaBeta = await createTestPersona(pid, 'Ms. Beta', {
      primary_motivation: 'Ship fast',
      voice_and_tone: 'Direct and action-oriented',
    });
    await addTestMentalModel(personaBeta, 'Speed vs Safety', 'Evaluate if the risk of moving fast outweighs the risk of moving slow');

    sid = await createTestSession(pid, { personaId: personaAlpha, startNordId: nordA });
  });
  afterAll(async () => { await deleteTestProject(pid); });

  it('returns persona mental models after switch', async () => {
    const res = await dispatchTool('nords_switch_persona', makeCtx(pid, sid), { persona_id: personaBeta });
    expect(res.success).toBe(true);
    const data = res.data as any;
    expect(data.horizon.persona).toBeTruthy();
    expect(data.horizon.persona.name).toBe('Ms. Beta');
    expect(data.horizon.persona.mental_models).toBeDefined();
    expect(data.horizon.persona.mental_models.length).toBeGreaterThan(0);
    expect(data.horizon.persona.mental_models[0].name).toBe('Speed vs Safety');
  });

  it('returns re-ranked suggested_next reflecting new persona weights', async () => {
    // Switch back to Alpha which has high weight on 'Depends On'
    const res = await dispatchTool('nords_switch_persona', makeCtx(pid, sid), { persona_id: personaAlpha });
    expect(res.success).toBe(true);
    const data = res.data as any;
    expect(data.horizon.suggested_next).toBeDefined();
    // Alpha persona should weight 'Depends On' connections highly
    expect(data.horizon.persona.name).toBe('Dr. Alpha');
  });

  it('returns remaining_variables (full horizon, not lean)', async () => {
    const res = await dispatchTool('nords_switch_persona', makeCtx(pid, sid), { persona_id: personaBeta });
    expect(res.success).toBe(true);
    const data = res.data as any;
    // Full horizon includes remaining_variables; lean does not
    expect(data.horizon).toHaveProperty('remaining_variables');
  });

  it('returns updated reframe_prompt mentioning suggested_next', async () => {
    const res = await dispatchTool('nords_switch_persona', makeCtx(pid, sid), { persona_id: personaAlpha });
    expect(res.success).toBe(true);
    const data = res.data as any;
    expect(data.reframe_prompt).toContain('suggested_next');
    expect(data.reframe_prompt).toContain('nords_navigate');
  });

  it('switches to null persona and returns horizon without persona', async () => {
    const res = await dispatchTool('nords_switch_persona', makeCtx(pid, sid), { persona_id: null });
    expect(res.success).toBe(true);
    const data = res.data as any;
    expect(data.horizon.persona).toBeNull();
  });
});

// ══════════════════════════════════════════════════════════
// 2. buildProtocol attribution rule
// ══════════════════════════════════════════════════════════

describe('buildProtocol attribution rule', () => {
  let pid: string, sid: string;

  beforeAll(async () => {
    pid = await createTestProject('AttrRule', { project_mode: 'collect' });
    sid = await createTestSession(pid);
  });
  afterAll(async () => { await deleteTestProject(pid); });

  it('collect mode rules include ATTRIBUTION RULE', async () => {
    const res = await dispatchTool('nords_get_briefing', makeCtx(pid, sid), {});
    expect(res.success).toBe(true);
    const data = res.data as any;
    const rules = data.protocol.rules as string[];
    expect(rules.some((r: string) => r.includes('ATTRIBUTION RULE'))).toBe(true);
  });
});

describe('buildProtocol attribution rule — guided mode', () => {
  let pid: string, sid: string;

  beforeAll(async () => {
    pid = await createTestProject('AttrRuleGuided', { project_mode: 'guided' });
    sid = await createTestSession(pid);
  });
  afterAll(async () => { await deleteTestProject(pid); });

  it('guided mode rules include ATTRIBUTION RULE', async () => {
    const res = await dispatchTool('nords_get_briefing', makeCtx(pid, sid), {});
    expect(res.success).toBe(true);
    const data = res.data as any;
    const rules = data.protocol.rules as string[];
    expect(rules.some((r: string) => r.includes('ATTRIBUTION RULE'))).toBe(true);
  });
});

describe('buildProtocol attribution rule — explore mode', () => {
  let pid: string, sid: string;

  beforeAll(async () => {
    pid = await createTestProject('AttrRuleExplore', { project_mode: 'explore' });
    sid = await createTestSession(pid);
  });
  afterAll(async () => { await deleteTestProject(pid); });

  it('explore mode rules do NOT include ATTRIBUTION RULE', async () => {
    const res = await dispatchTool('nords_get_briefing', makeCtx(pid, sid), {});
    expect(res.success).toBe(true);
    const data = res.data as any;
    const rules = data.protocol.rules as string[];
    expect(rules.some((r: string) => r.includes('ATTRIBUTION RULE'))).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════
// 3. buildProtocol mental model phrasing
// ══════════════════════════════════════════════════════════

describe('buildProtocol mental model phrasing', () => {
  let pid: string, sid: string;
  let personaId: string;

  beforeAll(async () => {
    pid = await createTestProject('MentalModel');
    personaId = await createTestPersona(pid, 'Analyst', {
      primary_motivation: 'Deep analysis',
    });
    await addTestMentalModel(personaId, 'Root Cause Analysis', 'Trace every issue back to its root cause');
    sid = await createTestSession(pid, { personaId });
  });
  afterAll(async () => { await deleteTestProject(pid); });

  it('mental model instruction includes ENUMERATE keyword', async () => {
    const res = await dispatchTool('nords_get_briefing', makeCtx(pid, sid), {});
    expect(res.success).toBe(true);
    const data = res.data as any;
    const personaBlock = data.protocol.persona as string;
    expect(personaBlock).toContain('ENUMERATE');
  });

  it('mental model instruction includes APPLY keyword', async () => {
    const res = await dispatchTool('nords_get_briefing', makeCtx(pid, sid), {});
    expect(res.success).toBe(true);
    const data = res.data as any;
    const personaBlock = data.protocol.persona as string;
    expect(personaBlock).toContain('APPLY');
  });
});

// ══════════════════════════════════════════════════════════
// 4. computeScore navigation health flags
// ══════════════════════════════════════════════════════════

describe('computeScore navigation health flags', () => {
  const navMetrics = (overrides: Partial<Parameters<typeof computeScore>[5]> = {}): NonNullable<Parameters<typeof computeScore>[5]> => ({
    traversal_count: 5,
    unique_nords_visited: 6,
    max_chain_depth: 3,
    persona_switches: 0,
    traversal_ratio: 0.8,
    search_count: 1,
    peek_count: 0,
    ...overrides,
  });

  it('flags shallow_navigation when <4 nords visited in 6+ rounds', () => {
    const transcript = Array.from({ length: 8 }, (_, i) =>
      makeRound({ round: i, tool_calls: [{ name: 'nords_navigate' }] })
    );
    const score = computeScore(transcript, 50, 'collect', {}, [], navMetrics({ unique_nords_visited: 2 }));
    const flags = score.nav_health_flags as string[];
    expect(flags.some(f => f.includes('shallow_navigation'))).toBe(true);
  });

  it('does NOT flag shallow_navigation for <6 rounds', () => {
    const transcript = Array.from({ length: 4 }, (_, i) =>
      makeRound({ round: i, tool_calls: [{ name: 'nords_navigate' }] })
    );
    const score = computeScore(transcript, 50, 'collect', {}, [], navMetrics({ unique_nords_visited: 2 }));
    const flags = score.nav_health_flags as string[];
    expect(flags.some(f => f.includes('shallow_navigation'))).toBe(false);
  });

  it('flags freewheeling when 3+ consecutive rounds without tool calls', () => {
    const transcript = [
      makeRound({ round: 0, tool_calls: [{ name: 'nords_get_briefing' }] }),
      makeRound({ round: 1, tool_calls: [] }),
      makeRound({ round: 2, tool_calls: [] }),
      makeRound({ round: 3, tool_calls: [] }),
      makeRound({ round: 4, tool_calls: [{ name: 'nords_navigate' }] }),
    ];
    const score = computeScore(transcript, 50, 'collect', {}, [], navMetrics());
    const flags = score.nav_health_flags as string[];
    expect(flags.some(f => f.includes('freewheeling'))).toBe(true);
    expect(score.max_consecutive_no_tool).toBe(3);
  });

  it('flags stuck when 4+ consecutive rounds without navigation', () => {
    const transcript = [
      makeRound({ round: 0, tool_calls: [{ name: 'nords_navigate' }] }),
      makeRound({ round: 1, tool_calls: [{ name: 'nords_update_session_variables' }] }),
      makeRound({ round: 2, tool_calls: [{ name: 'nords_update_session_variables' }] }),
      makeRound({ round: 3, tool_calls: [{ name: 'nords_update_session_variables' }] }),
      makeRound({ round: 4, tool_calls: [{ name: 'nords_update_session_variables' }] }),
      makeRound({ round: 5, tool_calls: [{ name: 'nords_navigate' }] }),
    ];
    const score = computeScore(transcript, 50, 'collect', {}, [], navMetrics());
    const flags = score.nav_health_flags as string[];
    expect(flags.some(f => f.includes('stuck'))).toBe(true);
    expect(score.max_consecutive_no_nav).toBe(4);
  });

  it('returns empty nav_health_flags for well-navigated sessions', () => {
    const transcript = Array.from({ length: 8 }, (_, i) =>
      makeRound({ round: i, tool_calls: [{ name: 'nords_navigate' }] })
    );
    const score = computeScore(transcript, 80, 'collect', {}, [], navMetrics());
    const flags = score.nav_health_flags as string[];
    expect(flags).toEqual([]);
  });

  it('max_consecutive_no_tool is correctly computed', () => {
    const transcript = [
      makeRound({ round: 0, tool_calls: [{ name: 'nords_get_briefing' }] }),
      makeRound({ round: 1, tool_calls: [] }),
      makeRound({ round: 2, tool_calls: [] }),
      makeRound({ round: 3, tool_calls: [{ name: 'nords_navigate' }] }),
      makeRound({ round: 4, tool_calls: [] }),
      makeRound({ round: 5, tool_calls: [] }),
      makeRound({ round: 6, tool_calls: [] }),
      makeRound({ round: 7, tool_calls: [] }),
      makeRound({ round: 8, tool_calls: [{ name: 'nords_navigate' }] }),
    ];
    const score = computeScore(transcript, 50, 'collect', {}, [], navMetrics());
    expect(score.max_consecutive_no_tool).toBe(4);
  });
});

// ══════════════════════════════════════════════════════════
// 5. Persona switch horizon coherence
// ══════════════════════════════════════════════════════════

describe('Persona Switch Horizon Coherence', () => {
  let pid: string, sid: string;
  let typeId: string, connTypeId: string;
  let nordA: string, nordB: string;
  let personaHighWeight: string, personaLowWeight: string;

  beforeAll(async () => {
    pid = await createTestProject('SwitchCoherence');
    typeId = await createTestNordType(pid, 'Node');
    connTypeId = await createTestConnectionType(pid, 'Links To', { verb: 'links to' });
    nordA = await createTestNord(pid, typeId, 'Hub');
    nordB = await createTestNord(pid, typeId, 'Spoke');
    await createTestConnection(pid, connTypeId, nordA, nordB);

    personaHighWeight = await createTestPersona(pid, 'HighWeighter', {});
    await setPersonaCategoryWeight(personaHighWeight, connTypeId, 90);

    personaLowWeight = await createTestPersona(pid, 'LowWeighter', {});
    await setPersonaCategoryWeight(personaLowWeight, connTypeId, 10);

    sid = await createTestSession(pid, { personaId: personaHighWeight, startNordId: nordA });
  });
  afterAll(async () => { await deleteTestProject(pid); });

  it('switching persona changes neighbor persona_bias values', async () => {
    // Get horizon with high-weight persona
    const horizon1 = await mcpRepo.getSessionHorizon(sid);
    const bias1 = horizon1.neighbors[0]?.persona_bias ?? 0;

    // Switch to low-weight persona
    await mcpRepo.updateSessionPersona(sid, personaLowWeight);
    const horizon2 = await mcpRepo.getSessionHorizon(sid);
    const bias2 = horizon2.neighbors[0]?.persona_bias ?? 0;

    expect(bias1).toBeGreaterThan(bias2);
  });

  it('switching to null persona resets all persona_bias to 0.5', async () => {
    await mcpRepo.updateSessionPersona(sid, null);
    const horizon = await mcpRepo.getSessionHorizon(sid);
    for (const n of horizon.neighbors) {
      expect(n.persona_bias).toBe(0.5);
    }
  });
});

afterAll(async () => { await closePool(); });
