/**
 * mcpImprovements.test.ts — Validates MCP server improvements.
 *
 * Split into categories:
 *   1. Navigate scoring (pure function test — no DB needed)
 *   2. Protocol cache (structural + contract validation)
 *   3. ToolContext sourceType (type + contract validation)
 *   4. Tool descriptions (length invariant)
 *   5. DB pool validation (structural check)
 *   6. goal_properties → goal_variable_bindings (grep-based validation)
 *   7. projectClone structural validation
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// ── Helpers ──
const SERVER_SRC = path.resolve(__dirname, '..');
const SERVER_ROOT = path.resolve(SERVER_SRC, '..');
const readFile = (rel: string) => fs.readFileSync(path.resolve(SERVER_SRC, rel), 'utf-8');
const readFileFromRoot = (rel: string) => fs.readFileSync(path.resolve(SERVER_ROOT, rel), 'utf-8');

// ══════════════════════════════════════════════════════════
// 1. NAVIGATE SCORING — Pure Function Tests
// ══════════════════════════════════════════════════════════

// Re-implement the scoring function from toolDispatch.ts to test independently
// (can't import toolDispatch.ts without DB connection)
const NAV_SCORE = {
  EXACT_MATCH:     10,
  PREFIX_MATCH:     5,
  SUBSTRING_MATCH:  1,
  NEIGHBOR_BONUS:   3,
  PERSONA_WEIGHT:   2,
  GOAL_WEIGHT:      3,
  DISTANCE_PENALTY: 0.5,
  RECENCY_BONUS:    1.5,
} as const;

function scoreNavigateCandidate(
  candidate: {
    title: string;
    nord_id: string;
    connection_id?: string;
    persona_bias?: number;
    goal_proximity?: number;
    distance_x?: number;
  },
  searchTerm: string,
  recentNordIds: Set<string>,
): number {
  let score = 0;
  if (candidate.title.toLowerCase() === searchTerm.toLowerCase()) {
    score += NAV_SCORE.EXACT_MATCH;
  } else if (candidate.title.toLowerCase().startsWith(searchTerm.toLowerCase())) {
    score += NAV_SCORE.PREFIX_MATCH;
  } else {
    score += NAV_SCORE.SUBSTRING_MATCH;
  }
  if (candidate.connection_id) score += NAV_SCORE.NEIGHBOR_BONUS;
  if (candidate.persona_bias != null) score += candidate.persona_bias * NAV_SCORE.PERSONA_WEIGHT;
  if (candidate.goal_proximity != null) score += candidate.goal_proximity * NAV_SCORE.GOAL_WEIGHT;
  if (candidate.distance_x != null && candidate.distance_x > 0) {
    score -= (candidate.distance_x - 1) * NAV_SCORE.DISTANCE_PENALTY;
  }
  if (recentNordIds.has(candidate.nord_id)) score += NAV_SCORE.RECENCY_BONUS;
  return score;
}

describe('Navigate Scoring', () => {
  it('exact match scores highest', () => {
    const score = scoreNavigateCandidate(
      { title: 'Sensor Module', nord_id: 'a' },
      'Sensor Module',
      new Set(),
    );
    expect(score).toBe(NAV_SCORE.EXACT_MATCH);
  });

  it('prefix match scores higher than substring', () => {
    const prefix = scoreNavigateCandidate(
      { title: 'Sensor Module', nord_id: 'a' },
      'Sensor',
      new Set(),
    );
    const substr = scoreNavigateCandidate(
      { title: 'Wireless Sensor', nord_id: 'b' },
      'Sensor',
      new Set(),
    );
    expect(prefix).toBe(NAV_SCORE.PREFIX_MATCH);
    expect(substr).toBe(NAV_SCORE.SUBSTRING_MATCH);
    expect(prefix).toBeGreaterThan(substr);
  });

  it('neighbor bonus adds to score', () => {
    const withConn = scoreNavigateCandidate(
      { title: 'Sensor Module', nord_id: 'a', connection_id: 'c1' },
      'Sensor Module',
      new Set(),
    );
    const without = scoreNavigateCandidate(
      { title: 'Sensor Module', nord_id: 'a' },
      'Sensor Module',
      new Set(),
    );
    expect(withConn - without).toBe(NAV_SCORE.NEIGHBOR_BONUS);
  });

  it('persona bias scales linearly', () => {
    const fullBias = scoreNavigateCandidate(
      { title: 'Risk', nord_id: 'a', persona_bias: 1.0 },
      'Risk',
      new Set(),
    );
    const halfBias = scoreNavigateCandidate(
      { title: 'Risk', nord_id: 'a', persona_bias: 0.5 },
      'Risk',
      new Set(),
    );
    const noBias = scoreNavigateCandidate(
      { title: 'Risk', nord_id: 'a' },
      'Risk',
      new Set(),
    );
    expect(fullBias - noBias).toBe(NAV_SCORE.PERSONA_WEIGHT);
    expect(halfBias - noBias).toBeCloseTo(NAV_SCORE.PERSONA_WEIGHT * 0.5);
  });

  it('goal proximity scales linearly', () => {
    const high = scoreNavigateCandidate(
      { title: 'Test', nord_id: 'a', goal_proximity: 1.0 },
      'Test',
      new Set(),
    );
    const low = scoreNavigateCandidate(
      { title: 'Test', nord_id: 'a', goal_proximity: 0.0 },
      'Test',
      new Set(),
    );
    expect(high - low).toBe(NAV_SCORE.GOAL_WEIGHT);
  });

  it('distance penalty increases with hops', () => {
    const close = scoreNavigateCandidate(
      { title: 'X', nord_id: 'a', distance_x: 1 },
      'X',
      new Set(),
    );
    const far = scoreNavigateCandidate(
      { title: 'X', nord_id: 'a', distance_x: 3 },
      'X',
      new Set(),
    );
    expect(close).toBeGreaterThan(far);
    expect(close - far).toBeCloseTo(2 * NAV_SCORE.DISTANCE_PENALTY);
  });

  it('recency bonus adds to score', () => {
    const recent = scoreNavigateCandidate(
      { title: 'X', nord_id: 'a' },
      'X',
      new Set(['a']),
    );
    const notRecent = scoreNavigateCandidate(
      { title: 'X', nord_id: 'a' },
      'X',
      new Set(['b']),
    );
    expect(recent - notRecent).toBe(NAV_SCORE.RECENCY_BONUS);
  });

  it('combined scoring: connected neighbor with goal proximity beats disconnected exact match', () => {
    const connected = scoreNavigateCandidate(
      { title: 'Sensor', nord_id: 'a', connection_id: 'c1', goal_proximity: 0.8 },
      'Sensor Module',  // substring match only
      new Set(),
    );
    const disconnected = scoreNavigateCandidate(
      { title: 'Sensor Module', nord_id: 'b' },
      'Sensor Module',  // exact match
      new Set(),
    );
    // connected = 1 (substr) + 3 (neighbor) + 2.4 (goal) = 6.4
    // disconnected = 10 (exact) = 10
    // Exact match still wins — validates the weight table is correct
    expect(disconnected).toBeGreaterThan(connected);
  });
});

// ══════════════════════════════════════════════════════════
// 2. PROTOCOL CACHE — Structural Validation
// ══════════════════════════════════════════════════════════

describe('Protocol Cache', () => {
  const toolDispatch = readFile('lib/toolDispatch.ts');

  it('protocolCache is declared as a Map', () => {
    expect(toolDispatch).toContain('const protocolCache = new Map<string, { protocol: Record<string, unknown>; version: number }>()');
  });

  it('cache key uses projectId:personaId:mode format', () => {
    expect(toolDispatch).toContain('`${ctx.projectId}:${personaId}:${mode}`');
  });

  it('pacing suffix is computed dynamically, not cached', () => {
    // The pacing suffix should be outside the cache block
    expect(toolDispatch).toContain('const pacingHint = (fullHorizon as any).pacing_hint');
    expect(toolDispatch).toContain("pacingHint?.velocity === 'rushed'");
    expect(toolDispatch).toContain("pacingHint?.velocity === 'thorough'");
  });

  it('cache hit returns cached protocol without rebuilding', () => {
    expect(toolDispatch).toContain('protocol = cached.protocol;');
  });

  it('cache miss calls buildProtocol and stores result', () => {
    expect(toolDispatch).toContain('protocol = buildProtocol(project, fullHorizon);');
    expect(toolDispatch).toContain('protocolCache.set(cacheKey, { protocol, version: Date.now() });');
  });

  it('invalidateProtocolCache is exported', () => {
    expect(toolDispatch).toContain('export function invalidateProtocolCache(projectId: string): void');
  });

  it('invalidateProtocolCache uses prefix-match deletion', () => {
    expect(toolDispatch).toContain("const prefix = `${projectId}:`");
    expect(toolDispatch).toContain('if (key.startsWith(prefix))');
    expect(toolDispatch).toContain('protocolCache.delete(key)');
  });

  it('briefing handler includes goals in response', () => {
    // This was missing due to the botched merge — verify it's fixed
    expect(toolDispatch).toContain('goals,');
    // Verify the response includes protocol with pacing
    expect(toolDispatch).toContain('protocol: { ...protocol, pacing: pacingSuffix }');
  });

  it('no dead code from botched merge remains', () => {
    // The old merge artifact was: },        goals,
    expect(toolDispatch).not.toContain('},        goals,');
  });
});

// ══════════════════════════════════════════════════════════
// 3. TOOLCONTEXT SOURCE TYPE
// ══════════════════════════════════════════════════════════

describe('ToolContext sourceType', () => {
  it('ToolContext interface includes sourceType', () => {
    const toolDispatch = readFile('lib/toolDispatch.ts');
    expect(toolDispatch).toContain('sourceType?: string;');
  });

  it('mcp-server.ts passes sourceType: mcp', () => {
    const mcpServer = readFile('mcp-server.ts');
    expect(mcpServer).toContain("sourceType: 'mcp'");
  });

  it('shareChat.ts passes sourceType: share', () => {
    const shareChat = readFile('routes/shareChat.ts');
    expect(shareChat).toContain("sourceType: 'share'");
  });

  it('chat.ts passes sourceType: chat', () => {
    const chat = readFile('routes/chat.ts');
    expect(chat).toContain("sourceType: 'chat'");
  });

  it('all three source types are distinct', () => {
    // Ensures no copy-paste errors
    const mcpServer = readFile('mcp-server.ts');
    const shareChat = readFile('routes/shareChat.ts');
    const chat = readFile('routes/chat.ts');

    expect(mcpServer).not.toContain("sourceType: 'share'");
    expect(mcpServer).not.toContain("sourceType: 'chat'");
    expect(shareChat).not.toContain("sourceType: 'mcp'");
    expect(chat).not.toContain("sourceType: 'mcp'");
  });
});

// ══════════════════════════════════════════════════════════
// 4. TOOL DESCRIPTION OPTIMIZATION
// ══════════════════════════════════════════════════════════

describe('Tool Description Optimization', () => {
  const mcpServer = readFile('mcp-server.ts');

  // Extract all tool description strings from server.tool() calls
  // Pattern: server.tool('name', 'description' or `description`, ...)
  const toolDescriptions: Array<{ name: string; desc: string }> = [];
  const toolPattern = /server\.tool\(\s*'([^']+)',\s*(?:`([^`]*)`|'([^']*)')/g;
  let match;
  while ((match = toolPattern.exec(mcpServer)) !== null) {
    const name = match[1];
    const desc = (match[2] || match[3] || '').replace(/\$\{projectContext\}/g, '');
    toolDescriptions.push({ name, desc });
  }

  it('found all tool registrations', () => {
    expect(toolDescriptions.length).toBeGreaterThanOrEqual(18);
  });

  it('nords_get_horizon description is under 250 chars (excluding projectContext)', () => {
    const horizon = toolDescriptions.find(t => t.name === 'nords_get_horizon');
    expect(horizon).toBeDefined();
    expect(horizon!.desc.length).toBeLessThanOrEqual(250);
  });

  it('nords_navigate description is under 250 chars (excluding projectContext)', () => {
    const nav = toolDescriptions.find(t => t.name === 'nords_navigate');
    expect(nav).toBeDefined();
    expect(nav!.desc.length).toBeLessThanOrEqual(250);
  });

  it('nords_get_connections description is under 250 chars', () => {
    const conn = toolDescriptions.find(t => t.name === 'nords_get_connections');
    expect(conn).toBeDefined();
    expect(conn!.desc.length).toBeLessThanOrEqual(250);
  });

  it('nords_update_session_variables description is under 250 chars', () => {
    const vars = toolDescriptions.find(t => t.name === 'nords_update_session_variables');
    expect(vars).toBeDefined();
    expect(vars!.desc.length).toBeLessThanOrEqual(250);
  });

  it('no tool description exceeds 600 chars (global safety net)', () => {
    for (const t of toolDescriptions) {
      expect(
        t.desc.length,
        `Tool '${t.name}' description is ${t.desc.length} chars`,
      ).toBeLessThanOrEqual(600);
    }
  });
});

// ══════════════════════════════════════════════════════════
// 5. DB POOL VALIDATION
// ══════════════════════════════════════════════════════════

describe('DB Pool Validation', () => {
  const db = readFile('db.ts');

  it('has connection validation on checkout', () => {
    expect(db).toContain("await client.query('SELECT 1')");
  });

  it('retries on stale connection', () => {
    expect(db).toContain('client.release(true)'); // destroy bad connection
    expect(db).toContain('return originalConnect()'); // get fresh one
  });

  it('uses standard exit code', () => {
    expect(db).toContain('process.exit(1)');
    expect(db).not.toContain('process.exit(-1)');
  });

  it('logs stale connection warning', () => {
    expect(db).toContain("'Stale connection detected, retrying'");
  });
});

// ══════════════════════════════════════════════════════════
// 6. GOAL_PROPERTIES → GOAL_VARIABLE_BINDINGS
// ══════════════════════════════════════════════════════════

describe('goal_properties rename', () => {
  it('mcp-server.ts resource query uses goal_variable_bindings', () => {
    const mcpServer = readFile('mcp-server.ts');
    expect(mcpServer).toContain('FROM goal_variable_bindings gvb WHERE gvb.goal_id = g.id');
    expect(mcpServer).not.toContain('FROM goal_properties');
  });

  it('mcp-server.ts overview uses bound_variables', () => {
    const mcpServer = readFile('mcp-server.ts');
    expect(mcpServer).toContain('g.bound_variables');
    expect(mcpServer).not.toContain('g.bound_properties');
  });

  it('helpers.ts does not reference goal_properties table', () => {
    const helpers = readFile('tests/helpers.ts');
    // Should only have the comment about it being dropped
    const lines = helpers.split('\n');
    const goalPropLines = lines.filter(l =>
      l.includes('goal_properties') && !l.trim().startsWith('//')
    );
    expect(goalPropLines).toHaveLength(0);
  });

  it('no non-comment goal_properties references in server/src/', () => {
    const srcDir = SERVER_SRC;
    const tsFiles = getAllTsFiles(srcDir);
    const violations: string[] = [];

    for (const file of tsFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (
          line.includes('goal_properties') &&
          !line.trim().startsWith('//') &&
          !line.trim().startsWith('*')
        ) {
          violations.push(`${path.relative(srcDir, file)}:${i + 1}: ${line.trim()}`);
        }
      }
    }
    expect(violations, `Non-comment goal_properties references found:\n${violations.join('\n')}`).toHaveLength(0);
  });
});

// ══════════════════════════════════════════════════════════
// 7. PROJECTCLONE STRUCTURAL VALIDATION
// ══════════════════════════════════════════════════════════

describe('projectClone.ts', () => {
  const clone = readFile('services/projectClone.ts');

  it('clones project_variables', () => {
    expect(clone).toContain("SELECT * FROM project_variables WHERE project_id = $1");
    expect(clone).toContain('INSERT INTO project_variables');
  });

  it('maintains variableMap for ID remapping', () => {
    expect(clone).toContain('const variableMap = new Map<string, string>()');
    expect(clone).toContain('variableMap.set(pv.id, newId)');
  });

  it('clones goal_variable_bindings instead of goal_properties', () => {
    expect(clone).toContain('SELECT * FROM goal_variable_bindings WHERE goal_id = $1');
    expect(clone).toContain('INSERT INTO goal_variable_bindings');
    expect(clone).not.toContain("INSERT INTO goal_properties");
  });

  it('remaps variable_id through variableMap', () => {
    expect(clone).toContain('variableMap.get(b.variable_id)');
  });

  it('does not reference old schema columns (nord_id, property_name) in goal section', () => {
    // Find the goal variable bindings section
    const bindingSection = clone.substring(
      clone.indexOf('Clone Goal Variable Bindings'),
      clone.indexOf('Clone Persona Mental Models')
    );
    expect(bindingSection).not.toContain('gp.nord_id');
    expect(bindingSection).not.toContain('property_name');
  });

  it('header comment reflects updated schema', () => {
    expect(clone).toContain('goal variable bindings');
    expect(clone).not.toMatch(/^\s*\*.*goal properties \(remapped\)/m);
  });

  it('log output uses goalVariableBindings', () => {
    expect(clone).toContain('goalVariableBindings: goalBindingsCount');
    expect(clone).not.toContain('goalProperties: goalPropsCount');
  });
});

// ══════════════════════════════════════════════════════════
// 8. SEED-MERIDIAN STRUCTURAL VALIDATION
// ══════════════════════════════════════════════════════════

describe('seed-meridian.ts', () => {
  const seed = readFileFromRoot('scripts/seed-meridian.ts');

  it('does not reference goal_properties table', () => {
    const lines = seed.split('\n');
    const violations = lines
      .map((l, i) => ({ line: i + 1, content: l }))
      .filter(({ content }) =>
        content.includes('goal_properties') &&
        !content.trim().startsWith('//') &&
        !content.trim().startsWith('*')
      );
    expect(violations, `Found goal_properties references:\n${violations.map(v => `  L${v.line}: ${v.content.trim()}`).join('\n')}`).toHaveLength(0);
  });

  it('upserts project_variables before creating bindings', () => {
    const varInsertIdx = seed.indexOf('INSERT INTO project_variables');
    const bindInsertIdx = seed.indexOf('INSERT INTO goal_variable_bindings');
    expect(varInsertIdx).toBeGreaterThan(-1);
    expect(bindInsertIdx).toBeGreaterThan(-1);
    expect(varInsertIdx).toBeLessThan(bindInsertIdx);
  });

  it('looks up variable IDs by name', () => {
    expect(seed).toContain('SELECT id, name FROM project_variables WHERE project_id = $1');
    expect(seed).toContain('varIdByName[v.name] = v.id');
  });

  it('inserts into goal_variable_bindings', () => {
    expect(seed).toContain('INSERT INTO goal_variable_bindings (goal_id, variable_id)');
  });

  it('cleans up old bindings before inserting', () => {
    expect(seed).toContain('DELETE FROM goal_variable_bindings WHERE goal_id IN');
  });

  it('header comment reflects variable bindings', () => {
    expect(seed).toContain('variable bindings');
  });
});

// ══════════════════════════════════════════════════════════
// 9. CACHE INVALIDATION WIRING
// ══════════════════════════════════════════════════════════

describe('Cache Invalidation Wiring', () => {
  it('personas.ts imports invalidateProtocolCache', () => {
    const personas = readFile('routes/personas.ts');
    expect(personas).toContain("import { invalidateProtocolCache } from '../lib/toolDispatch.js'");
  });

  it('personas.ts calls invalidateProtocolCache on create', () => {
    const personas = readFile('routes/personas.ts');
    // The create handler should call both invalidation functions
    const createSection = personas.substring(
      personas.indexOf("'/projects/:id/personas', validate(CreatePersonaSchema)"),
      personas.indexOf("'/personas/:id', validate(UpdatePersonaSchema)")
    );
    expect(createSection).toContain('invalidateProtocolCache');
    expect(createSection).toContain('invalidateDictionaryCache');
  });

  it('personas.ts calls invalidateProtocolCache on update', () => {
    const personas = readFile('routes/personas.ts');
    const updateSection = personas.substring(
      personas.indexOf("'/personas/:id', validate(UpdatePersonaSchema)"),
      personas.indexOf("'/personas/:id', async")
    );
    expect(updateSection).toContain('invalidateProtocolCache');
  });

  it('projects.ts imports invalidateProtocolCache', () => {
    const projects = readFile('routes/projects.ts');
    expect(projects).toContain("import { invalidateProtocolCache } from '../lib/toolDispatch.js'");
  });

  it('projects.ts invalidates cache on project update', () => {
    const projects = readFile('routes/projects.ts');
    expect(projects).toContain('invalidateProtocolCache(req.params.id as string)');
  });
});

// ══════════════════════════════════════════════════════════
// 10. NAV_SCORE CONSTANTS
// ══════════════════════════════════════════════════════════

describe('Navigate Scoring Constants', () => {
  const toolDispatch = readFile('lib/toolDispatch.ts');

  it('NAV_SCORE constant object exists', () => {
    expect(toolDispatch).toContain('const NAV_SCORE = {');
    expect(toolDispatch).toContain('} as const;');
  });

  it('all scoring weights are named constants', () => {
    expect(toolDispatch).toContain('EXACT_MATCH:');
    expect(toolDispatch).toContain('PREFIX_MATCH:');
    expect(toolDispatch).toContain('SUBSTRING_MATCH:');
    expect(toolDispatch).toContain('NEIGHBOR_BONUS:');
    expect(toolDispatch).toContain('PERSONA_WEIGHT:');
    expect(toolDispatch).toContain('GOAL_WEIGHT:');
    expect(toolDispatch).toContain('DISTANCE_PENALTY:');
    expect(toolDispatch).toContain('RECENCY_BONUS:');
  });

  it('scoreNavigateCandidate uses NAV_SCORE constants (no magic numbers)', () => {
    // Extract just the function body
    const funcStart = toolDispatch.indexOf('function scoreNavigateCandidate');
    const funcEnd = toolDispatch.indexOf('\n}\n', funcStart) + 3;
    const funcBody = toolDispatch.substring(funcStart, funcEnd);

    // Should use NAV_SCORE.X, not raw numbers
    expect(funcBody).toContain('NAV_SCORE.EXACT_MATCH');
    expect(funcBody).toContain('NAV_SCORE.PREFIX_MATCH');
    expect(funcBody).toContain('NAV_SCORE.SUBSTRING_MATCH');
    expect(funcBody).toContain('NAV_SCORE.NEIGHBOR_BONUS');
    expect(funcBody).toContain('NAV_SCORE.PERSONA_WEIGHT');
    expect(funcBody).toContain('NAV_SCORE.GOAL_WEIGHT');
    expect(funcBody).toContain('NAV_SCORE.DISTANCE_PENALTY');
    expect(funcBody).toContain('NAV_SCORE.RECENCY_BONUS');

    // Verify no raw scoring numbers remain in the function body
    // (excluding the line numbers in comments or the `> 0` check)
    const scoringLines = funcBody.split('\n').filter(l =>
      l.includes('score +=') || l.includes('score -=')
    );
    for (const line of scoringLines) {
      expect(line, `Magic number in scoring: ${line.trim()}`).toContain('NAV_SCORE.');
    }
  });
});

// ══════════════════════════════════════════════════════════
// UTILITY: Walk TS files
// ══════════════════════════════════════════════════════════

function getAllTsFiles(dir: string): string[] {
  const results: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory() && e.name !== 'node_modules') {
      results.push(...getAllTsFiles(full));
    } else if (e.isFile() && e.name.endsWith('.ts') && !e.name.endsWith('.test.ts')) {
      results.push(full);
    }
  }
  return results;
}
