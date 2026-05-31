import { query, queryOne } from '../db.js';
import type { ProjectVariable } from '../types/entities.js';

// ══════════════════════════════════════════════════════════
// Project Variables — Global Registry CRUD
// ══════════════════════════════════════════════════════════

export async function findByProject(projectId: string): Promise<ProjectVariable[]> {
  return query<ProjectVariable>(
    'SELECT * FROM project_variables WHERE project_id = $1 ORDER BY sort_order, created_at',
    [projectId]
  );
}

export async function findById(id: string): Promise<ProjectVariable | null> {
  return queryOne<ProjectVariable>('SELECT * FROM project_variables WHERE id = $1', [id]);
}

export async function findByIds(ids: string[]): Promise<ProjectVariable[]> {
  if (ids.length === 0) return [];
  return query<ProjectVariable>(
    `SELECT * FROM project_variables WHERE id = ANY($1) ORDER BY sort_order`,
    [ids]
  );
}

export async function findByName(projectId: string, name: string): Promise<ProjectVariable | null> {
  return queryOne<ProjectVariable>(
    'SELECT * FROM project_variables WHERE project_id = $1 AND name = $2',
    [projectId, name]
  );
}

export async function create(variable: {
  project_id: string;
  name: string;
  description?: string;
  type?: string;
  options?: unknown[] | null;
  required?: boolean;
  tags?: string[];
  hint?: string;
  priority?: number;
  depends_on?: string | null;
  sort_order?: number;
  collection_group_id?: string | null;
}): Promise<ProjectVariable> {
  return queryOne<ProjectVariable>(`
    INSERT INTO project_variables
      (project_id, name, description, type, options, required, tags, hint, priority, depends_on, sort_order, collection_group_id)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING *
  `, [
    variable.project_id,
    variable.name,
    variable.description ?? '',
    variable.type ?? 'string',
    variable.options ? JSON.stringify(variable.options) : null,
    variable.required ?? false,
    variable.tags ?? [],
    variable.hint ?? '',
    variable.priority ?? 0,
    variable.depends_on ?? null,
    variable.sort_order ?? 0,
    variable.collection_group_id ?? null,
  ]) as Promise<ProjectVariable>;
}

export async function update(id: string, updates: Partial<{
  name: string;
  description: string;
  type: string;
  options: unknown[] | null;
  required: boolean;
  tags: string[];
  hint: string;
  priority: number;
  depends_on: string | null;
  sort_order: number;
  collection_group_id: string | null;
}>): Promise<ProjectVariable | null> {
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let i = 1;

  const fields: Array<[string, unknown]> = [
    ['name', updates.name],
    ['description', updates.description],
    ['type', updates.type],
    ['required', updates.required],
    ['tags', updates.tags],
    ['hint', updates.hint],
    ['priority', updates.priority],
    ['depends_on', updates.depends_on],
    ['sort_order', updates.sort_order],
    ['collection_group_id', updates.collection_group_id],
  ];

  for (const [field, value] of fields) {
    if (value !== undefined) {
      setClauses.push(`${field} = $${i}`);
      values.push(value);
      i++;
    }
  }

  // Handle options specially (needs JSON.stringify)
  if (updates.options !== undefined) {
    setClauses.push(`options = $${i}`);
    values.push(updates.options ? JSON.stringify(updates.options) : null);
    i++;
  }

  if (setClauses.length === 0) {
    return findById(id);
  }

  setClauses.push(`updated_at = NOW()`);
  values.push(id);

  return queryOne<ProjectVariable>(
    `UPDATE project_variables SET ${setClauses.join(', ')} WHERE id = $${i} RETURNING *`,
    values
  );
}

export async function remove(id: string): Promise<boolean> {
  const result = await queryOne<{ id: string }>(
    'DELETE FROM project_variables WHERE id = $1 RETURNING id',
    [id]
  );
  return !!result;
}

export async function reorder(projectId: string, variableIds: string[]): Promise<void> {
  const cases = variableIds.map((id, idx) => `WHEN '${id}'::uuid THEN ${idx}`).join(' ');
  await query(
    `UPDATE project_variables SET sort_order = CASE id ${cases} END, updated_at = NOW()
     WHERE project_id = $1 AND id = ANY($2)`,
    [projectId, variableIds]
  );
}

// ── Bulk Operations (for property table pattern) ──

export async function bulkUpsert(projectId: string, variables: Array<{
  id?: string;
  name: string;
  description?: string;
  type?: string;
  options?: unknown[] | null;
  required?: boolean;
  tags?: string[];
  hint?: string;
  priority?: number;
  depends_on?: string | null;
  sort_order?: number;
}>): Promise<ProjectVariable[]> {
  const results: ProjectVariable[] = [];
  for (const v of variables) {
    if (v.id) {
      const updated = await update(v.id, v);
      if (updated) results.push(updated);
    } else {
      const created = await create({ project_id: projectId, ...v });
      results.push(created);
    }
  }
  return results;
}
