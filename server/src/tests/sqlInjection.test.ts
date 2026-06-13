/**
 * SQL Injection Regression Tests — Phase 1 DBA Improvements
 *
 * Validates that the /nords/query endpoint rejects malicious
 * property names and sort parameters while still accepting valid ones.
 *
 * Tests run against the live dev server (localhost:3000) with SKIP_AUTH=true.
 * The test project is created with created_by set to the dev user so
 * the projectOwnership middleware passes.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  createTestNordType, createTestNord,
  deleteTestProject, closePool, query, queryOne,
} from './helpers.js';

// ── Test data ──
let projectId: string;
let typeId: string;
let nordId: string;

// Dev user ID (matches SKIP_AUTH passthrough in auth middleware)
const DEV_USER_DB_ID = '95a61e26-455f-4b5a-aa0e-49cae435f730';

beforeAll(async () => {
  // Create project owned by the dev user so ownership middleware passes
  const row = await queryOne<{ id: string }>(`
    INSERT INTO projects (name, description, purpose, mcp_enabled, mcp_capture_data, mcp_mutable, project_mode, created_by)
    VALUES ($1, 'test', 'test', true, true, true, 'guided', $2)
    RETURNING id
  `, ['SQLi Test ' + Date.now(), DEV_USER_DB_ID]);
  projectId = row!.id;

  typeId = await createTestNordType(projectId, 'Widget', {
    propertiesSchema: [
      { name: 'status', type: 'select', required: false },
      { name: 'priority', type: 'number', required: false },
    ],
  });
  nordId = await createTestNord(projectId, typeId, 'Test Widget', {
    properties: { status: 'active', priority: 5 },
  });
});

afterAll(async () => {
  await deleteTestProject(projectId);
  await closePool();
});

// ── Helper: build query URL ──
const BASE = 'http://localhost:3000/api';
function queryUrl(pid: string, params: Record<string, string | string[]>) {
  const url = new URL(`${BASE}/projects/${pid}/nords/query`);
  for (const [k, v] of Object.entries(params)) {
    if (Array.isArray(v)) {
      for (const item of v) url.searchParams.append(k, item);
    } else {
      url.searchParams.set(k, v);
    }
  }
  return url.toString();
}

describe('SQL Injection Prevention — /nords/query', () => {

  // ── Valid cases (should succeed) ──

  it('accepts a valid equality filter', async () => {
    const res = await fetch(queryUrl(projectId, { filter: 'status = active' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.results).toBeDefined();
  });

  it('accepts a valid numeric filter', async () => {
    const res = await fetch(queryUrl(projectId, { filter: 'priority > 3' }));
    expect(res.status).toBe(200);
  });

  it('accepts a valid contains filter', async () => {
    const res = await fetch(queryUrl(projectId, { filter: 'status contains active' }));
    expect(res.status).toBe(200);
  });

  it('accepts a valid sort parameter', async () => {
    const res = await fetch(queryUrl(projectId, { sort: 'status asc' }));
    expect(res.status).toBe(200);
  });

  it('accepts property names with underscores', async () => {
    const res = await fetch(queryUrl(projectId, { filter: 'my_prop = test' }));
    expect(res.status).toBe(200);
  });

  // ── Injection attempts (should return 400) ──

  it('rejects SQL injection in filter property name', async () => {
    const res = await fetch(queryUrl(projectId, {
      filter: "'; DROP TABLE nords; -- = x",
    }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Invalid property name');
  });

  it('rejects SQL injection with UNION in property name', async () => {
    const res = await fetch(queryUrl(projectId, {
      filter: "x' UNION SELECT * FROM users-- = val",
    }));
    expect(res.status).toBe(400);
  });

  it('rejects SQL injection in sort property name', async () => {
    const res = await fetch(queryUrl(projectId, {
      sort: "name; DROP TABLE nords-- asc",
    }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Invalid sort property');
  });

  it('rejects property names with parentheses', async () => {
    const res = await fetch(queryUrl(projectId, {
      filter: 'func() = 1',
    }));
    expect(res.status).toBe(400);
  });

  it('rejects property names with single quotes', async () => {
    const res = await fetch(queryUrl(projectId, {
      filter: "it's = bad",
    }));
    expect(res.status).toBe(400);
  });

  it('rejects property names exceeding 64 characters', async () => {
    const longName = 'a'.repeat(65);
    const res = await fetch(queryUrl(projectId, {
      filter: `${longName} = test`,
    }));
    expect(res.status).toBe(400);
  });

  // ── Smoke: demo project still works ──

  it('demo project graph still loads', async () => {
    const projectsRes = await fetch(`${BASE}/projects`);
    expect(projectsRes.status).toBe(200);
    const projects = await projectsRes.json();
    const demo = projects.find((p: any) => p.name?.includes('Pulse Sense'));
    expect(demo).toBeDefined();

    const graphRes = await fetch(`${BASE}/projects/${demo.id}/graph`);
    expect(graphRes.status).toBe(200);
    const graph = await graphRes.json();
    expect(graph.nords).toBeDefined();
    expect(graph.nords.length).toBeGreaterThan(0);
  });
});
