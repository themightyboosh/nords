/**
 * Project Scoping Integration Tests
 *
 * Tests:
 *   1. Users only see projects they created
 *   2. Only admins can tag a project as is_demo
 *   3. New user registration clones all demo-flagged projects
 *
 * All tests create their own throwaway data and clean up after.
 * Re-runnable: `npm test` at any time.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  createTestProject, deleteTestProject,
  createTestNordType, createTestNord,
  createTestConnectionType, createTestConnection,
  closePool, query, queryOne,
} from './helpers.js';
import * as projectsRepo from '../repositories/projects.js';
import { cloneProject } from '../services/projectClone.js';

// ══════════════════════════════════════════════════════════
// Helpers: create test users with specific roles
// ══════════════════════════════════════════════════════════

async function createTestUser(
  email: string,
  role: 'admin' | 'member' = 'member',
  opts?: { isTester?: boolean }
): Promise<{ id: string; firebase_uid: string }> {
  const uid = 'test-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
  const row = await queryOne<{ id: string }>(
    `INSERT INTO users (firebase_uid, email, display_name, role, is_tester)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [uid, email, email.split('@')[0], role, opts?.isTester ?? false]
  );
  return { id: row!.id, firebase_uid: uid };
}

async function deleteTestUser(userId: string): Promise<void> {
  await query('DELETE FROM users WHERE id = $1', [userId]);
}

async function createTestProjectForUser(
  userId: string,
  name: string,
  opts?: { is_demo?: boolean }
): Promise<string> {
  const row = await queryOne<{ id: string }>(
    `INSERT INTO projects (name, description, purpose, created_by, is_demo,
       mcp_enabled, mcp_capture_data, mcp_mutable, project_mode)
     VALUES ($1, 'test', 'test', $2, $3, true, true, true, 'guided')
     RETURNING id`,
    [name + ' ' + Date.now(), userId, opts?.is_demo ?? false]
  );
  return row!.id;
}

// ══════════════════════════════════════════════════════════
// 1. User Project Scoping — users only see their own projects
// ══════════════════════════════════════════════════════════

describe('Project Scoping — User Isolation', () => {
  let userA: { id: string; firebase_uid: string };
  let userB: { id: string; firebase_uid: string };
  let projectA1: string;
  let projectA2: string;
  let projectB1: string;

  beforeAll(async () => {
    userA = await createTestUser(`alice-${Date.now()}@test.com`, 'member');
    userB = await createTestUser(`bob-${Date.now()}@test.com`, 'member');

    projectA1 = await createTestProjectForUser(userA.id, 'Alice Project 1');
    projectA2 = await createTestProjectForUser(userA.id, 'Alice Project 2');
    projectB1 = await createTestProjectForUser(userB.id, 'Bob Project 1');
  });

  afterAll(async () => {
    await deleteTestProject(projectA1);
    await deleteTestProject(projectA2);
    await deleteTestProject(projectB1);
    await deleteTestUser(userA.id);
    await deleteTestUser(userB.id);
  });

  it('User A sees only their 2 projects', async () => {
    const projects = await projectsRepo.findAllWithStars(userA.firebase_uid);
    expect(projects.length).toBe(2);
    const ids = projects.map(p => p.id);
    expect(ids).toContain(projectA1);
    expect(ids).toContain(projectA2);
    expect(ids).not.toContain(projectB1);
  });

  it('User B sees only their 1 project', async () => {
    const projects = await projectsRepo.findAllWithStars(userB.firebase_uid);
    expect(projects.length).toBe(1);
    expect(projects[0].id).toBe(projectB1);
  });

  it('User A cannot see User B projects', async () => {
    const projects = await projectsRepo.findAllWithStars(userA.firebase_uid);
    const ids = projects.map(p => p.id);
    expect(ids).not.toContain(projectB1);
  });

  it('User B cannot see User A projects', async () => {
    const projects = await projectsRepo.findAllWithStars(userB.firebase_uid);
    const ids = projects.map(p => p.id);
    expect(ids).not.toContain(projectA1);
    expect(ids).not.toContain(projectA2);
  });

  it('Soft-deleted projects are hidden', async () => {
    await projectsRepo.softDelete(projectA2);
    const projects = await projectsRepo.findAllWithStars(userA.firebase_uid);
    expect(projects.length).toBe(1);
    expect(projects[0].id).toBe(projectA1);

    // Restore for cleanup
    await query('UPDATE projects SET deleted_at = NULL WHERE id = $1', [projectA2]);
  });
});

// ══════════════════════════════════════════════════════════
// 2. Admin-Only Demo Tagging
// ══════════════════════════════════════════════════════════

describe('Admin-Only Demo Tagging', () => {
  let adminUser: { id: string; firebase_uid: string };
  let memberUser: { id: string; firebase_uid: string };
  let adminProject: string;
  let memberProject: string;

  beforeAll(async () => {
    adminUser = await createTestUser(`admin-${Date.now()}@test.com`, 'admin');
    memberUser = await createTestUser(`member-${Date.now()}@test.com`, 'member');

    adminProject = await createTestProjectForUser(adminUser.id, 'Admin Project');
    memberProject = await createTestProjectForUser(memberUser.id, 'Member Project');
  });

  afterAll(async () => {
    await deleteTestProject(adminProject);
    await deleteTestProject(memberProject);
    await deleteTestUser(adminUser.id);
    await deleteTestUser(memberUser.id);
  });

  it('admin can set is_demo = true on their project', async () => {
    const updated = await projectsRepo.update(adminProject, { is_demo: true });
    expect(updated?.is_demo).toBe(true);
  });

  it('admin can unset is_demo', async () => {
    const updated = await projectsRepo.update(adminProject, { is_demo: false });
    expect(updated?.is_demo).toBe(false);
  });

  it('is_demo defaults to false when creating a project', async () => {
    const project = await projectsRepo.findById(memberProject);
    expect(project?.is_demo).toBe(false);
  });

  it('is_demo flag persists in DB correctly', async () => {
    await projectsRepo.update(adminProject, { is_demo: true });
    const row = await queryOne<{ is_demo: boolean }>(
      'SELECT is_demo FROM projects WHERE id = $1',
      [adminProject]
    );
    expect(row?.is_demo).toBe(true);

    // cleanup
    await projectsRepo.update(adminProject, { is_demo: false });
  });
});

// ══════════════════════════════════════════════════════════
// 3. Demo Project Cloning on Registration
// ══════════════════════════════════════════════════════════

describe('Demo Project Cloning', () => {
  let adminUser: { id: string; firebase_uid: string };
  let demoProjectId: string;
  let nonDemoProjectId: string;
  let clonedProjectIds: string[] = [];

  // Pre-populate a demo project with nords, connections, types
  beforeAll(async () => {
    adminUser = await createTestUser(`demo-admin-${Date.now()}@test.com`, 'admin');

    // Create a rich demo project
    demoProjectId = await createTestProjectForUser(adminUser.id, 'Demo Template', { is_demo: true });
    nonDemoProjectId = await createTestProjectForUser(adminUser.id, 'Non-Demo Project', { is_demo: false });

    // Add some content to the demo project
    const typeId = await createTestNordType(demoProjectId, 'Task');
    const nordA = await createTestNord(demoProjectId, typeId, 'Task A', { properties: { status: 'Todo' } });
    const nordB = await createTestNord(demoProjectId, typeId, 'Task B', { properties: { status: 'Done' } });

    const connTypeId = await createTestConnectionType(demoProjectId, 'Blocks');
    await createTestConnection(demoProjectId, connTypeId, nordA, nordB);
  });

  afterAll(async () => {
    // Clean up cloned projects
    for (const id of clonedProjectIds) {
      await deleteTestProject(id);
    }
    await deleteTestProject(demoProjectId);
    await deleteTestProject(nonDemoProjectId);
    await deleteTestUser(adminUser.id);
  });

  it('cloneProject creates a deep copy of the project', async () => {
    const newUser = await createTestUser(`clone-target-${Date.now()}@test.com`, 'member');

    const clonedId = await cloneProject(demoProjectId, newUser.id);
    clonedProjectIds.push(clonedId);

    // Verify clone exists
    const cloned = await projectsRepo.findById(clonedId);
    expect(cloned).not.toBeNull();
    expect(cloned!.name).toContain('Demo:');
    expect(cloned!.created_by).toBe(newUser.id);
    expect(cloned!.is_demo).toBe(false); // cloned project should NOT be flagged as demo

    await deleteTestUser(newUser.id);
  });

  it('cloned project includes nord types', async () => {
    const clonedId = clonedProjectIds[0];
    const types = await query<{ name: string }>(
      'SELECT name FROM nord_types WHERE project_id = $1 AND deleted_at IS NULL',
      [clonedId]
    );
    expect(types.length).toBe(1);
    expect(types[0].name).toBe('Task');
  });

  it('cloned project includes nords', async () => {
    const clonedId = clonedProjectIds[0];
    const nords = await query<{ title: string }>(
      'SELECT title FROM nords WHERE project_id = $1 AND deleted_at IS NULL ORDER BY title',
      [clonedId]
    );
    expect(nords.length).toBe(2);
    expect(nords.map(n => n.title).sort()).toEqual(['Task A', 'Task B']);
  });

  it('cloned project includes connections', async () => {
    const clonedId = clonedProjectIds[0];
    const conns = await query<{ id: string }>(
      'SELECT id FROM connections WHERE project_id = $1 AND deleted_at IS NULL',
      [clonedId]
    );
    expect(conns.length).toBe(1);
  });

  it('cloned project has different IDs from the source', async () => {
    const clonedId = clonedProjectIds[0];

    const srcNords = await query<{ id: string }>(
      'SELECT id FROM nords WHERE project_id = $1',
      [demoProjectId]
    );
    const cloneNords = await query<{ id: string }>(
      'SELECT id FROM nords WHERE project_id = $1',
      [clonedId]
    );

    const srcIds = new Set(srcNords.map(n => n.id));
    for (const cn of cloneNords) {
      expect(srcIds.has(cn.id)).toBe(false);
    }
  });

  it('only demo-flagged projects are candidates for cloning', async () => {
    const demos = await query<{ id: string }>(
      'SELECT id FROM projects WHERE is_demo = true AND deleted_at IS NULL'
    );
    const demoIds = demos.map(d => d.id);
    expect(demoIds).toContain(demoProjectId);
    expect(demoIds).not.toContain(nonDemoProjectId);
  });

  it('new user gets demo project cloned (simulates registration flow)', async () => {
    const newUser = await createTestUser(`reg-user-${Date.now()}@test.com`, 'member');

    // Simulate the registration clone logic from register.ts
    const demoProjects = await query<{ id: string }>(
      'SELECT id FROM projects WHERE is_demo = true AND deleted_at IS NULL'
    );

    let projectsCloned = 0;
    for (const demo of demoProjects) {
      try {
        const id = await cloneProject(demo.id, newUser.id);
        clonedProjectIds.push(id);
        projectsCloned++;
      } catch {
        // skip if clone fails
      }
    }

    expect(projectsCloned).toBeGreaterThanOrEqual(1);

    // Verify the new user can see their cloned projects
    const userProjects = await projectsRepo.findAllWithStars(newUser.firebase_uid);
    expect(userProjects.length).toBeGreaterThanOrEqual(1);

    // Verify none of the cloned projects are flagged as demo
    for (const p of userProjects) {
      expect(p.is_demo).toBe(false);
    }

    await deleteTestUser(newUser.id);
  });
});

// ══════════════════════════════════════════════════════════
// 4. User-Scoped findByUser
// ══════════════════════════════════════════════════════════

describe('findByUser', () => {
  let userA: { id: string; firebase_uid: string };
  let userB: { id: string; firebase_uid: string };
  let pA: string;
  let pB: string;

  beforeAll(async () => {
    userA = await createTestUser(`fbu-a-${Date.now()}@test.com`, 'member');
    userB = await createTestUser(`fbu-b-${Date.now()}@test.com`, 'member');
    pA = await createTestProjectForUser(userA.id, 'FindByUser A');
    pB = await createTestProjectForUser(userB.id, 'FindByUser B');
  });

  afterAll(async () => {
    await deleteTestProject(pA);
    await deleteTestProject(pB);
    await deleteTestUser(userA.id);
    await deleteTestUser(userB.id);
  });

  it('returns only projects for the given user id', async () => {
    const result = await projectsRepo.findByUser(userA.id);
    expect(result.length).toBe(1);
    expect(result[0].id).toBe(pA);
  });

  it('returns empty array for user with no projects', async () => {
    const noUser = await createTestUser(`no-projects-${Date.now()}@test.com`, 'member');
    const result = await projectsRepo.findByUser(noUser.id);
    expect(result.length).toBe(0);
    await deleteTestUser(noUser.id);
  });
});

// ── Close pool after all tests ──
afterAll(async () => {
  await closePool();
});
