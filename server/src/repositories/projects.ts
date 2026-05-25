import { query, queryOne } from '../db.js';
import type { Project } from '../types/entities.js';

export async function findById(id: string): Promise<Project | null> {
  return queryOne<Project>('SELECT * FROM projects WHERE id = $1 AND deleted_at IS NULL', [id]);
}

export async function findAll(): Promise<Project[]> {
  return query<Project>('SELECT * FROM projects WHERE deleted_at IS NULL ORDER BY updated_at DESC');
}

export async function findByOrg(orgId: string): Promise<Project[]> {
  return query<Project>('SELECT * FROM projects WHERE org_id = $1 AND deleted_at IS NULL', [orgId]);
}

export async function create(project: Omit<Project, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>): Promise<Project> {
  return queryOne<Project>(`
    INSERT INTO projects (org_id, name, description, purpose, icon, created_by, mcp_enabled, mcp_capture_data, mcp_mutable, goals_enabled, mcp_system_prompt, mcp_welcome_message, project_mode, end_prompt_suggestion, default_persona_id, default_start_nord_id, default_end_nord_id, accent_color)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
    RETURNING *
  `, [
    project.org_id,
    project.name,
    project.description,
    project.purpose,
    project.icon,
    project.created_by,
    project.mcp_enabled ?? false,
    project.mcp_capture_data ?? false,
    project.mcp_mutable ?? false,
    project.goals_enabled ?? false,
    project.mcp_system_prompt ?? null,
    project.mcp_welcome_message ?? null,
    project.project_mode ?? 'collect',
    project.end_prompt_suggestion ?? null,
    project.default_persona_id ?? null,
    project.default_start_nord_id ?? null,
    project.default_end_nord_id ?? null,
    project.accent_color ?? '#6b7aed',
  ]) as Promise<Project>;
}

type UpdatableProjectFields = Pick<Project, 'name' | 'description' | 'purpose' | 'icon' | 'accent_color' | 'mcp_enabled' | 'mcp_capture_data' | 'mcp_mutable' | 'goals_enabled' | 'mcp_system_prompt' | 'mcp_welcome_message' | 'project_mode' | 'end_prompt_suggestion' | 'default_persona_id' | 'default_start_nord_id' | 'default_end_nord_id' | 'is_demo'>;

export async function update(id: string, updates: Partial<UpdatableProjectFields>): Promise<Project | null> {
  const allowedKeys: (keyof UpdatableProjectFields)[] = [
    'name', 'description', 'purpose', 'icon', 'accent_color',
    'mcp_enabled', 'mcp_capture_data', 'mcp_mutable', 'goals_enabled', 'mcp_system_prompt', 'mcp_welcome_message',
    'project_mode', 'end_prompt_suggestion',
    'default_persona_id', 'default_start_nord_id', 'default_end_nord_id',
    'is_demo',
  ];

  const setClauses: string[] = [];
  const values: unknown[] = [];
  let paramIdx = 1;

  for (const [key, value] of Object.entries(updates)) {
    if (!allowedKeys.includes(key as keyof UpdatableProjectFields)) continue;
    setClauses.push(`${key} = $${paramIdx}`);
    values.push(value);
    paramIdx++;
  }

  if (setClauses.length === 0) {
    return findById(id);
  }

  setClauses.push(`updated_at = CURRENT_TIMESTAMP`);
  values.push(id);

  const sql = `
    UPDATE projects
    SET ${setClauses.join(', ')}
    WHERE id = $${paramIdx} AND deleted_at IS NULL
    RETURNING *
  `;

  return queryOne<Project>(sql, values);
}

export async function softDelete(id: string): Promise<boolean> {
  const result = await queryOne<{ id: string }>('UPDATE projects SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 AND deleted_at IS NULL RETURNING id', [id]);
  return result !== null;
}

// ── Favorites ──

const DEV_USER_ID = '00000000-0000-0000-0000-000000000001';

export async function findAllWithStars(userId?: string): Promise<(Project & { is_starred: boolean })[]> {
  const uid = userId || DEV_USER_ID;
  return query<Project & { is_starred: boolean }>(
    `SELECT p.*, (uf.user_id IS NOT NULL) AS is_starred
     FROM projects p
     LEFT JOIN user_favorites uf ON uf.project_id = p.id AND uf.user_id = $1
     WHERE p.deleted_at IS NULL
     ORDER BY p.updated_at DESC`,
    [uid]
  );
}

export async function toggleStar(projectId: string, userId?: string): Promise<boolean> {
  const uid = userId || DEV_USER_ID;
  // Try to delete first — if a row was deleted, it was starred → now unstarred
  const removed = await queryOne<{ project_id: string }>(
    'DELETE FROM user_favorites WHERE user_id = $1 AND project_id = $2 RETURNING project_id',
    [uid, projectId]
  );
  if (removed) return false; // was starred → unstarred
  // Otherwise insert
  await queryOne(
    'INSERT INTO user_favorites (user_id, project_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
    [uid, projectId]
  );
  return true; // now starred
}
