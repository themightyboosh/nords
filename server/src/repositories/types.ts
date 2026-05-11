/**
 * types.ts — Repository functions for Nord and Connection type CRUD.
 *
 * Types are user-level global components. They belong to a user account
 * and are associated with projects via the project_types join table.
 * They control icon, accent color, properties schema, and scale behavior.
 */

import { query, queryOne } from '../db.js';

// ── Nord Types ──

export interface NordType {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  accent_color: string;
  properties_schema: Record<string, unknown>[];
  scale_property: string | null;
  description: string | null;
  sort_order: number;
  deleted_at: string | null;
}

export const nordTypesRepo = {
  async findByProject(projectId: string): Promise<NordType[]> {
    return query<NordType>(
      `SELECT * FROM nord_types
       WHERE project_id = $1 AND deleted_at IS NULL
       ORDER BY sort_order`,
      [projectId]
    );
  },

  async findByUser(userId: string): Promise<NordType[]> {
    return query<NordType>(
      'SELECT * FROM nord_types WHERE deleted_at IS NULL ORDER BY sort_order'
    );
  },

  async findById(id: string): Promise<NordType | null> {
    return queryOne<NordType>(
      'SELECT * FROM nord_types WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );
  },

  async create(data: {
    user_id: string;
    project_id?: string;  // optional — if provided, auto-associate with project
    name: string;
    description?: string;
    icon?: string;
    accent_color?: string;
    properties_schema?: Record<string, unknown>[];
    scale_property?: string | null;
  }): Promise<NordType> {
    const result = await queryOne<NordType>(
      `INSERT INTO nord_types (project_id, name, description, icon, accent_color, properties_schema, scale_property, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 0)
       RETURNING *`,
      [
        data.project_id || null,
        data.name,
        data.description || '',
        data.icon || 'Square',
        data.accent_color || '#4da6ff',
        JSON.stringify(data.properties_schema || []),
        data.scale_property || null,
      ]
    );
    return result!;
  },

  async update(id: string, updates: Partial<Pick<NordType, 'name' | 'description' | 'icon' | 'accent_color' | 'properties_schema' | 'scale_property' | 'sort_order'>>): Promise<NordType | null> {
    const setClauses: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (updates.name !== undefined) { setClauses.push(`name = $${idx++}`); values.push(updates.name); }
    if (updates.description !== undefined) { setClauses.push(`description = $${idx++}`); values.push(updates.description); }
    if (updates.icon !== undefined) { setClauses.push(`icon = $${idx++}`); values.push(updates.icon); }
    if (updates.accent_color !== undefined) { setClauses.push(`accent_color = $${idx++}`); values.push(updates.accent_color); }
    if (updates.properties_schema !== undefined) { setClauses.push(`properties_schema = $${idx++}`); values.push(JSON.stringify(updates.properties_schema)); }
    if (updates.scale_property !== undefined) { setClauses.push(`scale_property = $${idx++}`); values.push(updates.scale_property); }
    if (updates.sort_order !== undefined) { setClauses.push(`sort_order = $${idx++}`); values.push(updates.sort_order); }

    if (setClauses.length === 0) return this.findById(id);

    values.push(id);
    return queryOne<NordType>(
      `UPDATE nord_types SET ${setClauses.join(', ')} WHERE id = $${idx} AND deleted_at IS NULL RETURNING *`,
      values
    );
  },

  async delete(id: string): Promise<boolean> {
    // Check for instances first
    const instanceCount = await queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM nords WHERE type_id = $1 AND deleted_at IS NULL',
      [id]
    );
    if (instanceCount && parseInt(instanceCount.count) > 0) {
      throw new Error(`Cannot delete type: ${instanceCount.count} nords still use this type`);
    }
    const result = await queryOne<{ id: string }>(
      'UPDATE nord_types SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL RETURNING id',
      [id]
    );
    return !!result;
  },
};


// ── Connection Types ──

export interface ConnectionType {
  id: string;
  user_id: string;
  name: string;
  verb: string | null;
  accent_color: string;
  stroke_style: string;
  default_direction: string;
  direction_filter: string;
  direction_prepositions: {
    forward: string;
    reverse: string;
    both: string;
  };
  description: string;
  measurement_mode: string;
  x_stage_labels: string[];
  y_stage_labels: string[];
  properties_schema: Record<string, unknown>[];
  is_system: boolean;
  sort_order: number;
  deleted_at: string | null;
}

export const connectionTypesRepo = {
  async findByProject(projectId: string): Promise<ConnectionType[]> {
    return query<ConnectionType>(
      `SELECT * FROM connection_types
       WHERE project_id = $1 AND deleted_at IS NULL
       ORDER BY sort_order`,
      [projectId]
    );
  },

  async findByUser(userId: string): Promise<ConnectionType[]> {
    return query<ConnectionType>(
      'SELECT * FROM connection_types WHERE deleted_at IS NULL ORDER BY sort_order'
    );
  },

  async findById(id: string): Promise<ConnectionType | null> {
    return queryOne<ConnectionType>(
      'SELECT * FROM connection_types WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );
  },

  async create(data: {
    user_id?: string;
    project_id?: string;
    name: string;
    description?: string;
    accent_color?: string;
    stroke_style?: string;
    default_direction?: string;
    verb?: string | null;
    direction_filter?: string;
    measurement_mode?: string;
    x_stage_labels?: string[];
    y_stage_labels?: string[];
    properties_schema?: Record<string, unknown>[];
  }): Promise<ConnectionType> {
    const result = await queryOne<ConnectionType>(
      `INSERT INTO connection_types (project_id, name, description, accent_color, stroke_style, default_direction, verb, direction_filter, measurement_mode, x_stage_labels, y_stage_labels, properties_schema, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 0)
       RETURNING *`,
      [
        data.project_id || null,
        data.name,
        data.description || '',
        data.accent_color || '#888888',
        data.stroke_style || 'solid',
        data.default_direction || 'none',
        data.verb || null,
        data.direction_filter || 'all',
        data.measurement_mode || 'spectrum',
        JSON.stringify(data.x_stage_labels || []),
        JSON.stringify(data.y_stage_labels || []),
        JSON.stringify(data.properties_schema || []),
      ]
    );
    return result!;
  },

  async update(id: string, updates: Partial<Pick<ConnectionType, 'name' | 'description' | 'verb' | 'accent_color' | 'stroke_style' | 'default_direction' | 'direction_filter' | 'direction_prepositions' | 'measurement_mode' | 'x_stage_labels' | 'y_stage_labels' | 'properties_schema' | 'sort_order'>>): Promise<ConnectionType | null> {
    const setClauses: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (updates.name !== undefined) { setClauses.push(`name = $${idx++}`); values.push(updates.name); }
    if (updates.description !== undefined) { setClauses.push(`description = $${idx++}`); values.push(updates.description); }
    if (updates.verb !== undefined) { setClauses.push(`verb = $${idx++}`); values.push(updates.verb); }
    if (updates.accent_color !== undefined) { setClauses.push(`accent_color = $${idx++}`); values.push(updates.accent_color); }
    if (updates.stroke_style !== undefined) { setClauses.push(`stroke_style = $${idx++}`); values.push(updates.stroke_style); }
    if ((updates as any).default_direction !== undefined) { setClauses.push(`default_direction = $${idx++}`); values.push((updates as any).default_direction); }
    if (updates.direction_filter !== undefined) { setClauses.push(`direction_filter = $${idx++}`); values.push(updates.direction_filter); }
    if (updates.direction_prepositions !== undefined) { setClauses.push(`direction_prepositions = $${idx++}`); values.push(JSON.stringify(updates.direction_prepositions)); }
    if (updates.measurement_mode !== undefined) { setClauses.push(`measurement_mode = $${idx++}`); values.push(updates.measurement_mode); }
    if (updates.x_stage_labels !== undefined) { setClauses.push(`x_stage_labels = $${idx++}`); values.push(JSON.stringify(updates.x_stage_labels)); }
    if (updates.y_stage_labels !== undefined) { setClauses.push(`y_stage_labels = $${idx++}`); values.push(JSON.stringify(updates.y_stage_labels)); }
    if (updates.properties_schema !== undefined) { setClauses.push(`properties_schema = $${idx++}`); values.push(JSON.stringify(updates.properties_schema)); }
    if (updates.sort_order !== undefined) { setClauses.push(`sort_order = $${idx++}`); values.push(updates.sort_order); }

    if (setClauses.length === 0) return this.findById(id);

    values.push(id);
    return queryOne<ConnectionType>(
      `UPDATE connection_types SET ${setClauses.join(', ')} WHERE id = $${idx} AND deleted_at IS NULL RETURNING *`,
      values
    );
  },

  async delete(id: string): Promise<boolean> {
    const instanceCount = await queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM connections WHERE type_id = $1 AND deleted_at IS NULL',
      [id]
    );
    if (instanceCount && parseInt(instanceCount.count) > 0) {
      throw new Error(`Cannot delete type: ${instanceCount.count} connections still use this type`);
    }
    // Remove the type
    const result = await queryOne<{ id: string }>(
      'UPDATE connection_types SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL RETURNING id',
      [id]
    );
    return !!result;
  },

  /**
   * Ensure the system "Relevance" connection type exists for a user.
   * Called during user creation or first project load.
   */
  async ensureRelevanceType(userId: string): Promise<ConnectionType> {
    const existing = await queryOne<ConnectionType>(
      `SELECT * FROM connection_types WHERE name = 'Relevance' AND deleted_at IS NULL`
    );
    if (existing) return existing;
    return this.create({
      name: 'Relevance',
      accent_color: '#666666',
      stroke_style: 'solid',
    });
  },

  /**
   * Ensure the Relevance type is associated with a project.
   * Called when loading a project.
   */
  async ensureRelevanceForProject(userId: string, projectId: string): Promise<void> {
    const relevance = await this.ensureRelevanceType(userId);
    // Update project_id if not already set
    await queryOne(
      `UPDATE connection_types SET project_id = $1 WHERE id = $2 AND (project_id IS NULL OR project_id != $1)`,
      [projectId, relevance.id]
    );
  },
};
