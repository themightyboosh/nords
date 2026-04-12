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
    INSERT INTO projects (org_id, name, description, icon, created_by)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `, [
    project.org_id,
    project.name,
    project.description,
    project.icon,
    project.created_by
  ]) as Promise<Project>;
}

export async function update(id: string, updates: Partial<Pick<Project, 'name' | 'description' | 'icon'>>): Promise<Project | null> {
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let paramIdx = 1;

  for (const [key, value] of Object.entries(updates)) {
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
