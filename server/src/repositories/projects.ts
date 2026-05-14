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
    INSERT INTO projects (org_id, name, description, purpose, icon, created_by, mcp_enabled, mcp_capture_data, mcp_mutable, mcp_system_prompt, default_persona_id, default_start_nord_id)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
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
    project.mcp_system_prompt ?? null,
    project.default_persona_id ?? null,
    project.default_start_nord_id ?? null,
  ]) as Promise<Project>;
}

type UpdatableProjectFields = Pick<Project, 'name' | 'description' | 'purpose' | 'icon' | 'mcp_enabled' | 'mcp_capture_data' | 'mcp_mutable' | 'mcp_system_prompt' | 'default_persona_id' | 'default_start_nord_id'>;

export async function update(id: string, updates: Partial<UpdatableProjectFields>): Promise<Project | null> {
  const allowedKeys: (keyof UpdatableProjectFields)[] = [
    'name', 'description', 'purpose', 'icon',
    'mcp_enabled', 'mcp_capture_data', 'mcp_mutable', 'mcp_system_prompt',
    'default_persona_id', 'default_start_nord_id',
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
