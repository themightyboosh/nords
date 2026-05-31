/**
 * collectionGroups.ts — CRUD for Collection Groups.
 *
 * Collection groups are organizational containers for project variables,
 * following the same pattern as nord_types and connection_types.
 * Each group has a name, icon, color, and contains project_variables.
 */

import { query, queryOne } from '../db.js';

// ── Types ──

export interface CollectionGroup {
  id: string;
  project_id: string;
  name: string;
  description: string;
  icon: string;
  accent_color: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

// ══════════════════════════════════════════════════════════
// CRUD Operations
// ══════════════════════════════════════════════════════════

export async function findByProject(projectId: string): Promise<CollectionGroup[]> {
  return query<CollectionGroup>(
    'SELECT * FROM collection_groups WHERE project_id = $1 AND deleted_at IS NULL ORDER BY sort_order, created_at',
    [projectId]
  );
}

export async function findById(id: string): Promise<CollectionGroup | null> {
  return queryOne<CollectionGroup>(
    'SELECT * FROM collection_groups WHERE id = $1 AND deleted_at IS NULL',
    [id]
  );
}

export async function create(group: {
  project_id: string;
  name: string;
  description?: string;
  icon?: string;
  accent_color?: string;
  sort_order?: number;
}): Promise<CollectionGroup> {
  return queryOne<CollectionGroup>(`
    INSERT INTO collection_groups (project_id, name, description, icon, accent_color, sort_order)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `, [
    group.project_id,
    group.name,
    group.description ?? '',
    group.icon ?? 'Layers',
    group.accent_color ?? '#a78bfa',
    group.sort_order ?? 0,
  ]) as Promise<CollectionGroup>;
}

export async function update(id: string, updates: Partial<{
  name: string;
  description: string;
  icon: string;
  accent_color: string;
  sort_order: number;
}>): Promise<CollectionGroup | null> {
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let i = 1;

  const fields: Array<[string, unknown]> = [
    ['name', updates.name],
    ['description', updates.description],
    ['icon', updates.icon],
    ['accent_color', updates.accent_color],
    ['sort_order', updates.sort_order],
  ];

  for (const [field, value] of fields) {
    if (value !== undefined) {
      setClauses.push(`${field} = $${i}`);
      values.push(value);
      i++;
    }
  }

  if (setClauses.length === 0) {
    return findById(id);
  }

  values.push(id);

  return queryOne<CollectionGroup>(
    `UPDATE collection_groups SET ${setClauses.join(', ')} WHERE id = $${i} AND deleted_at IS NULL RETURNING *`,
    values
  );
}

export async function softDelete(id: string): Promise<boolean> {
  const result = await queryOne<{ id: string }>(
    'UPDATE collection_groups SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL RETURNING id',
    [id]
  );
  // Unlink variables from this group
  if (result) {
    await query(
      'UPDATE project_variables SET collection_group_id = NULL WHERE collection_group_id = $1',
      [id]
    );
  }
  return !!result;
}

export async function reorder(projectId: string, groupIds: string[]): Promise<void> {
  if (groupIds.length === 0) return;
  const cases = groupIds.map((id, idx) => `WHEN '${id}'::uuid THEN ${idx}`).join(' ');
  await query(
    `UPDATE collection_groups SET sort_order = CASE id ${cases} END
     WHERE project_id = $1 AND id = ANY($2) AND deleted_at IS NULL`,
    [projectId, groupIds]
  );
}
