/**
 * DBA Smoke Tests — Phase 2 DBA Improvements
 *
 * Validates the demo project (Pulse Sense CGM) is healthy at the
 * database level. This test suite is the gatekeeper for all subsequent
 * DBA phases — if this fails, we stop.
 */
import { describe, it, expect, afterAll } from 'vitest';
import { query, queryOne, closePool } from './helpers.js';

afterAll(async () => {
  await closePool();
});

describe('DBA Smoke — Database Health', () => {

  it('schema_migrations table exists and has rows', async () => {
    const rows = await query<{ version: string }>('SELECT version FROM schema_migrations ORDER BY id');
    expect(rows.length).toBeGreaterThan(0);
  });

  it('demo project (Pulse Sense CGM) exists', async () => {
    const project = await queryOne<{ id: string; name: string }>(
      "SELECT id, name FROM projects WHERE name LIKE '%Pulse Sense%' AND deleted_at IS NULL"
    );
    expect(project).toBeDefined();
    expect(project!.name).toContain('Pulse Sense');
  });
});

describe('DBA Smoke — Demo Project Integrity', () => {
  let demoProjectId: string;

  it('resolves demo project ID', async () => {
    const project = await queryOne<{ id: string }>(
      "SELECT id FROM projects WHERE name LIKE '%Pulse Sense%' AND deleted_at IS NULL LIMIT 1"
    );
    expect(project).toBeDefined();
    demoProjectId = project!.id;
  });

  it('has nord types', async () => {
    const rows = await query<{ id: string }>(
      'SELECT id FROM nord_types WHERE project_id = $1 AND deleted_at IS NULL',
      [demoProjectId]
    );
    expect(rows.length).toBeGreaterThan(0);
  });

  it('has nords', async () => {
    const rows = await query<{ id: string }>(
      'SELECT id FROM nords WHERE project_id = $1 AND deleted_at IS NULL',
      [demoProjectId]
    );
    expect(rows.length).toBeGreaterThan(0);
  });

  it('has connection types', async () => {
    const rows = await query<{ id: string }>(
      'SELECT id FROM connection_types WHERE project_id = $1 AND deleted_at IS NULL',
      [demoProjectId]
    );
    expect(rows.length).toBeGreaterThan(0);
  });

  it('has connections', async () => {
    const rows = await query<{ id: string }>(
      'SELECT id FROM connections WHERE project_id = $1 AND deleted_at IS NULL',
      [demoProjectId]
    );
    expect(rows.length).toBeGreaterThan(0);
  });

  it('has personas', async () => {
    const rows = await query<{ id: string }>(
      'SELECT id FROM personas WHERE project_id = $1 AND deleted_at IS NULL',
      [demoProjectId]
    );
    expect(rows.length).toBeGreaterThan(0);
  });

  it('has goals', async () => {
    const rows = await query<{ id: string }>(
      'SELECT id FROM goals WHERE project_id = $1',
      [demoProjectId]
    );
    expect(rows.length).toBeGreaterThan(0);
  });

  it('has project variables', async () => {
    const rows = await query<{ id: string }>(
      'SELECT id FROM project_variables WHERE project_id = $1',
      [demoProjectId]
    );
    expect(rows.length).toBeGreaterThan(0);
  });
});

describe('DBA Smoke — Stored Procedures', () => {
  let demoProjectId: string;

  it('resolves demo project ID', async () => {
    const project = await queryOne<{ id: string }>(
      "SELECT id FROM projects WHERE name LIKE '%Pulse Sense%' AND deleted_at IS NULL LIMIT 1"
    );
    demoProjectId = project!.id;
  });

  it('fn_load_project_graph returns valid JSON', async () => {
    const result = await queryOne<{ fn_load_project_graph: Record<string, unknown> }>(
      'SELECT fn_load_project_graph($1)',
      [demoProjectId]
    );
    expect(result).toBeDefined();
    const graph = result!.fn_load_project_graph;
    expect(graph).toHaveProperty('nords');
    expect(graph).toHaveProperty('connections');
    expect(graph).toHaveProperty('nord_types');
    expect(graph).toHaveProperty('connection_types');
  });

  it('fn_navigate_resolve executes without error', async () => {
    // Create a temporary session for the test
    const session = await queryOne<{ id: string }>(`
      INSERT INTO mcp_sessions (project_id, status)
      VALUES ($1, 'active')
      RETURNING id
    `, [demoProjectId]);

    try {
      const results = await query<{ nord_id: string; title: string }>(
        'SELECT * FROM fn_navigate_resolve($1, $2, $3)',
        [demoProjectId, session!.id, 'Requirement']
      );
      // Should return results (the demo project has nords with various titles)
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    } finally {
      // Clean up temp session
      await query('DELETE FROM mcp_sessions WHERE id = $1', [session!.id]);
    }
  });

  it('fn_batch_update_positions executes without error', async () => {
    const result = await queryOne<{ fn_batch_update_positions: number }>(
      "SELECT fn_batch_update_positions('[]'::jsonb)",
    );
    expect(result).toBeDefined();
    expect(result!.fn_batch_update_positions).toBe(0);
  });
});
