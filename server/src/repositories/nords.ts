import { query, queryOne } from '../db.js';
import type { Nord } from '../types/entities.js';

export async function findById(id: string): Promise<Nord | null> {
  return queryOne<Nord>('SELECT * FROM nords WHERE id = $1 AND deleted_at IS NULL', [id]);
}

export async function findByProject(projectId: string): Promise<Nord[]> {
  return query<Nord>('SELECT * FROM nords WHERE project_id = $1 AND deleted_at IS NULL', [projectId]);
}

export async function create(nord: Omit<Nord, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>): Promise<Nord> {
  return queryOne<Nord>(`
    INSERT INTO nords (project_id, type_id, title, properties, position_x, position_y, scale, created_by)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
  `, [
    nord.project_id,
    nord.type_id,
    nord.title,
    nord.properties,
    nord.position_x,
    nord.position_y,
    nord.scale,
    nord.created_by
  ]) as Promise<Nord>;
}

export async function update(id: string, updates: Partial<Pick<Nord, 'title' | 'properties' | 'position_x' | 'position_y' | 'scale'>>): Promise<Nord | null> {
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let paramIdx = 1;

  for (const [key, value] of Object.entries(updates)) {
    if (key === 'properties') {
      // Merge into existing JSONB instead of replacing — preserves all other saved keys
      setClauses.push(`properties = properties || $${paramIdx}::jsonb`);
      values.push(JSON.stringify(value));
    } else {
      setClauses.push(`${key} = $${paramIdx}`);
      values.push(value);
    }
    paramIdx++;
  }

  if (setClauses.length === 0) {
    return findById(id);
  }

  setClauses.push(`updated_at = CURRENT_TIMESTAMP`);
  values.push(id);

  const sql = `
    UPDATE nords
    SET ${setClauses.join(', ')}
    WHERE id = $${paramIdx} AND deleted_at IS NULL
    RETURNING *
  `;

  return queryOne<Nord>(sql, values);
}

export async function softDelete(id: string): Promise<boolean> {
  const result = await queryOne<{ id: string }>('UPDATE nords SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 AND deleted_at IS NULL RETURNING id', [id]);
  return result !== null;
}
