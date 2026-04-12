import { query, queryOne } from '../db.js';
import type { Connection } from '../types/entities.js';

export async function findById(id: string): Promise<Connection | null> {
  return queryOne<Connection>('SELECT * FROM connections WHERE id = $1 AND deleted_at IS NULL', [id]);
}

export async function findByProject(projectId: string): Promise<Connection[]> {
  return query<Connection>('SELECT * FROM connections WHERE project_id = $1 AND deleted_at IS NULL', [projectId]);
}

export async function create(connection: Omit<Connection, 'id' | 'created_at' | 'deleted_at'>): Promise<Connection> {
  return queryOne<Connection>(`
    INSERT INTO connections (project_id, type_id, source_nord_id, target_nord_id, direction, distance_x, distance_y, properties)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
  `, [
    connection.project_id,
    connection.type_id,
    connection.source_nord_id,
    connection.target_nord_id,
    connection.direction,
    connection.distance_x,
    connection.distance_y,
    connection.properties
  ]) as Promise<Connection>;
}

export async function update(id: string, updates: Partial<Pick<Connection, 'direction' | 'distance_x' | 'distance_y' | 'properties'>>): Promise<Connection | null> {
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

  values.push(id);

  const sql = `
    UPDATE connections
    SET ${setClauses.join(', ')}
    WHERE id = $${paramIdx} AND deleted_at IS NULL
    RETURNING *
  `;

  return queryOne<Connection>(sql, values);
}

export async function softDelete(id: string): Promise<boolean> {
  const result = await queryOne<{ id: string }>('UPDATE connections SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 AND deleted_at IS NULL RETURNING id', [id]);
  return result !== null;
}
