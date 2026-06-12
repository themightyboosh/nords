/**
 * sharePrefills.test.ts — Integration tests for share link variable prefills
 * and URL query param overrides.
 *
 * Tests:
 *   1. DB prefills are stored and returned on share link lookup
 *   2. DB prefills are applied as session variables on session creation
 *   3. URL overrides replace matching DB prefills by variable name
 *   4. Unknown URL override keys are silently ignored
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { query, queryOne } from '../db.js';
import { createTestProject, createTestVariable, deleteTestProject, closePool } from './helpers.js';
import * as shareLinksRepo from '../repositories/shareLinks.js';
import * as mcpRepo from '../repositories/mcpSessions.js';

let projectId: string;
let varSelectId: string;
let varBoolId: string;
let varNumberId: string;

beforeAll(async () => {
  projectId = await createTestProject('Prefill Test');

  // Create 3 variables with different types
  varSelectId = await createTestVariable(projectId, 'regulatory_pathway', {
    type: 'select', required: true,
  });
  // Set options on the select variable
  await query(
    `UPDATE project_variables SET options = $1 WHERE id = $2`,
    [JSON.stringify(['510(k)', 'PMA', 'De Novo']), varSelectId]
  );

  varBoolId = await createTestVariable(projectId, 'biocompat_confirmed', {
    type: 'boolean', required: false,
  });

  varNumberId = await createTestVariable(projectId, 'enrollment_target', {
    type: 'number', required: false,
  });
});

afterAll(async () => {
  await query('DELETE FROM share_link_prefills WHERE share_link_id IN (SELECT id FROM share_links WHERE project_id = $1)', [projectId]).catch(() => {});
  await query('DELETE FROM share_links WHERE project_id = $1', [projectId]).catch(() => {});
  await deleteTestProject(projectId);
  await closePool();
});

describe('Share Link Prefills', () => {
  let linkToken: string;
  let linkId: string;

  it('creates a share link with DB prefills', async () => {
    const result = await shareLinksRepo.create(projectId, {
      label: 'Test Link',
      prefills: [
        { variable_id: varSelectId, value: '510(k)' },
        { variable_id: varBoolId, value: 'Yes' },
        { variable_id: varNumberId, value: '75' },
      ],
    });

    expect(result).toBeDefined();
    expect(result.token).toMatch(/^nrd_/);
    expect(result.prefills).toHaveLength(3);

    linkToken = result.token;
    linkId = result.id;
  });

  it('returns prefills when fetching by token', async () => {
    const link = await shareLinksRepo.findByToken(linkToken);
    expect(link).not.toBeNull();
    expect(link!.prefills).toHaveLength(3);

    const selectPf = link!.prefills.find(p => p.variable_id === varSelectId);
    expect(selectPf).toBeDefined();
    expect(selectPf!.value).toBe('510(k)');

    const boolPf = link!.prefills.find(p => p.variable_id === varBoolId);
    expect(boolPf).toBeDefined();
    expect(boolPf!.value).toBe('Yes');

    const numPf = link!.prefills.find(p => p.variable_id === varNumberId);
    expect(numPf).toBeDefined();
    expect(numPf!.value).toBe('75');
  });

  it('applies prefills as session variables on session creation', async () => {
    const link = await shareLinksRepo.findByToken(linkToken);
    expect(link).not.toBeNull();

    // Create a session (simulating what shareChat.ts does)
    const session = await mcpRepo.createSession(projectId, null, null);

    // Apply prefills
    for (const pf of link!.prefills) {
      await mcpRepo.upsertSessionVariable(
        session.id,
        pf.variable_id,
        pf.value,
        null,
        null
      );
    }

    // Verify session variables
    const vars = await query<{ variable_id: string; value: string }>(
      'SELECT variable_id, value FROM mcp_session_variables WHERE session_id = $1',
      [session.id]
    );

    expect(vars).toHaveLength(3);
    const selectVar = vars.find(v => v.variable_id === varSelectId);
    expect(selectVar).toBeDefined();
    // upsertSessionVariable JSON-stringifies the value, so raw DB value is '"510(k)"'
    expect(selectVar!.value).toBe('510(k)');

    // Cleanup session
    await query('DELETE FROM mcp_session_variables WHERE session_id = $1', [session.id]).catch(() => {});
    await query('DELETE FROM mcp_sessions WHERE id = $1', [session.id]).catch(() => {});
  });

  it('URL overrides replace matching DB prefills by variable name', async () => {
    const link = await shareLinksRepo.findByToken(linkToken);
    expect(link).not.toBeNull();

    // Create a session
    const session = await mcpRepo.createSession(projectId, null, null);

    // Step 1: Apply DB prefills
    for (const pf of link!.prefills) {
      await mcpRepo.upsertSessionVariable(
        session.id,
        pf.variable_id,
        pf.value,
        null,
        null
      );
    }

    // Step 2: Apply URL overrides — override regulatory_pathway
    const urlOverrides: Record<string, string> = {
      regulatory_pathway: 'PMA',        // should override '510(k)'
      unknown_key: 'should_be_ignored', // no matching variable
    };

    const projectVars = await query<{ id: string; name: string }>(
      'SELECT id, name FROM project_variables WHERE project_id = $1',
      [projectId]
    );
    const varByName = new Map(projectVars.map(v => [v.name.toLowerCase(), v.id]));

    for (const [key, val] of Object.entries(urlOverrides)) {
      const varId = varByName.get(key.toLowerCase());
      if (varId) {
        await mcpRepo.upsertSessionVariable(session.id, varId, val, null, null);
      }
    }

    // Verify: regulatory_pathway should be 'PMA' (overridden)
    const vars = await query<{ variable_id: string; value: string }>(
      'SELECT variable_id, value FROM mcp_session_variables WHERE session_id = $1',
      [session.id]
    );

    expect(vars).toHaveLength(3); // still 3 — upsert replaced, didn't add

    const selectVar = vars.find(v => v.variable_id === varSelectId);
    expect(selectVar!.value).toBe('PMA'); // overridden!

    const boolVar = vars.find(v => v.variable_id === varBoolId);
    expect(boolVar!.value).toBe('Yes'); // unchanged

    const numVar = vars.find(v => v.variable_id === varNumberId);
    expect(String(numVar!.value)).toBe('75'); // unchanged (may come back as number from PG)

    // Cleanup session
    await query('DELETE FROM mcp_session_variables WHERE session_id = $1', [session.id]).catch(() => {});
    await query('DELETE FROM mcp_sessions WHERE id = $1', [session.id]).catch(() => {});
  });
});
