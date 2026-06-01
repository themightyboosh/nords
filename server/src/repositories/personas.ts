/**
 * personas.ts — Repository for Persona CRUD, mental models, and category weights.
 *
 * Personas are project-scoped AI persona definitions.
 * Mental models are ordered sub-records (max 5 per persona, enforced here).
 * Category weights are a join table linking personas to connection_types with a -100..100 weight.
 */

import { query, queryOne } from '../db.js';

// ── Types ──

export interface Persona {
  id: string;
  project_id: string;
  name: string;
  avatar_seed: string;
  accent_color: string;
  background: string;
  primary_motivation: string;
  voice_and_tone: string;
  guardrails: Array<{ mode: 'always' | 'never'; text: string }>;
  temperature: number;
  behavioral_nudge_threshold: number;
  behavioral_nudge_window: number;
  exchange_style: 'free_form' | 'bi_directional' | 'interrogate';
  sort_order: number;
  created_at: string;
  updated_at: string;
  mental_models?: MentalModel[];
  category_weights?: CategoryWeight[];
}

export interface MentalModel {
  id: string;
  persona_id: string;
  name: string;
  body: string;
  sort_order: number;
}

export interface CategoryWeight {
  id: string;
  persona_id: string;
  connection_type_id: string;
  weight: number;
}

// ── Personas ──

export const personasRepo = {

  async findByProject(projectId: string): Promise<Persona[]> {
    const personas = await query<Persona>(
      `SELECT * FROM personas WHERE project_id = $1 AND deleted_at IS NULL ORDER BY sort_order, name`,
      [projectId]
    );

    // Batch-load mental models and weights for all personas
    const personaIds = personas.map(p => p.id);
    if (personaIds.length === 0) return [];

    const models = await query<MentalModel>(
      `SELECT * FROM persona_mental_models WHERE persona_id = ANY($1) ORDER BY sort_order`,
      [personaIds]
    );

    const weights = await query<CategoryWeight>(
      `SELECT * FROM persona_category_weights WHERE persona_id = ANY($1)`,
      [personaIds]
    );

    // Group by persona
    const modelsByPersona = new Map<string, MentalModel[]>();
    for (const m of models) {
      const arr = modelsByPersona.get(m.persona_id) || [];
      arr.push(m);
      modelsByPersona.set(m.persona_id, arr);
    }

    const weightsByPersona = new Map<string, CategoryWeight[]>();
    for (const w of weights) {
      const arr = weightsByPersona.get(w.persona_id) || [];
      arr.push(w);
      weightsByPersona.set(w.persona_id, arr);
    }

    return personas.map(p => ({
      ...p,
      mental_models: modelsByPersona.get(p.id) || [],
      category_weights: weightsByPersona.get(p.id) || [],
    }));
  },

  async findById(id: string): Promise<Persona | null> {
    const persona = await queryOne<Persona>(
      `SELECT * FROM personas WHERE id = $1 AND deleted_at IS NULL`,
      [id]
    );
    if (!persona) return null;

    const models = await query<MentalModel>(
      `SELECT * FROM persona_mental_models WHERE persona_id = $1 ORDER BY sort_order`,
      [id]
    );
    const weights = await query<CategoryWeight>(
      `SELECT * FROM persona_category_weights WHERE persona_id = $1`,
      [id]
    );

    return { ...persona, mental_models: models, category_weights: weights };
  },

  async create(data: {
    project_id: string;
    name?: string;
    avatar_seed?: string;
  }): Promise<Persona> {
    const seed = data.avatar_seed || crypto.randomUUID();
    const row = await queryOne<Persona>(
      `INSERT INTO personas (project_id, name, avatar_seed)
       VALUES ($1, $2, $3) RETURNING *`,
      [data.project_id, data.name || 'New Persona', seed]
    );
    return { ...row!, mental_models: [], category_weights: [] };
  },

  async update(id: string, data: Partial<Pick<Persona,
    'name' | 'avatar_seed' | 'accent_color' | 'background' | 'primary_motivation' | 'voice_and_tone' | 'guardrails' | 'temperature' | 'behavioral_nudge_threshold' | 'behavioral_nudge_window' | 'exchange_style' | 'sort_order'
  >>): Promise<Persona | null> {
    const setClauses: string[] = [];
    const values: any[] = [];
    let idx = 1;

    const fields: Array<[string, any]> = [
      ['name', data.name],
      ['avatar_seed', data.avatar_seed],
      ['accent_color', data.accent_color],
      ['background', data.background],
      ['primary_motivation', data.primary_motivation],
      ['voice_and_tone', data.voice_and_tone],
      ['guardrails', data.guardrails ? JSON.stringify(data.guardrails) : undefined],
      ['temperature', data.temperature],
      ['behavioral_nudge_threshold', data.behavioral_nudge_threshold],
      ['behavioral_nudge_window', data.behavioral_nudge_window],
      ['exchange_style', data.exchange_style],
      ['sort_order', data.sort_order],
    ];

    for (const [key, val] of fields) {
      if (val !== undefined) {
        setClauses.push(`${key} = $${idx++}`);
        values.push(val);
      }
    }

    if (setClauses.length === 0) return this.findById(id);

    setClauses.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    return queryOne<Persona>(
      `UPDATE personas SET ${setClauses.join(', ')} WHERE id = $${idx} AND deleted_at IS NULL RETURNING *`,
      values
    );
  },

  async delete(id: string): Promise<void> {
    await query(
      `UPDATE personas SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [id]
    );
  },

  // ── Mental Models ──

  async addMentalModel(personaId: string, data: { name?: string; body?: string }): Promise<MentalModel | null> {
    // Enforce max 5
    const existing = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM persona_mental_models WHERE persona_id = $1`,
      [personaId]
    );
    if (parseInt(existing[0]?.count || '0') >= 5) {
      return null; // caller should return 400
    }

    // Auto sort_order = next
    const maxOrder = await queryOne<{ max: number }>(
      `SELECT COALESCE(MAX(sort_order), -1) + 1 AS max FROM persona_mental_models WHERE persona_id = $1`,
      [personaId]
    );

    return queryOne<MentalModel>(
      `INSERT INTO persona_mental_models (persona_id, name, body, sort_order)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [personaId, data.name || '', data.body || '', maxOrder?.max ?? 0]
    );
  },

  async updateMentalModel(id: string, data: Partial<Pick<MentalModel, 'name' | 'body'>>): Promise<MentalModel | null> {
    const setClauses: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (data.name !== undefined) { setClauses.push(`name = $${idx++}`); values.push(data.name); }
    if (data.body !== undefined) { setClauses.push(`body = $${idx++}`); values.push(data.body); }

    if (setClauses.length === 0) return queryOne<MentalModel>(`SELECT * FROM persona_mental_models WHERE id = $1`, [id]);

    values.push(id);
    return queryOne<MentalModel>(
      `UPDATE persona_mental_models SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );
  },

  async deleteMentalModel(id: string): Promise<void> {
    await query(`DELETE FROM persona_mental_models WHERE id = $1`, [id]);
  },

  async reorderMentalModels(personaId: string, orderedIds: string[]): Promise<void> {
    // Update sort_order for each ID in the given order
    for (let i = 0; i < orderedIds.length; i++) {
      await query(
        `UPDATE persona_mental_models SET sort_order = $1 WHERE id = $2 AND persona_id = $3`,
        [i, orderedIds[i], personaId]
      );
    }
  },

  // ── Category Weights ──

  async upsertCategoryWeight(personaId: string, connectionTypeId: string, weight: number): Promise<CategoryWeight | null> {
    return queryOne<CategoryWeight>(
      `INSERT INTO persona_category_weights (persona_id, connection_type_id, weight)
       VALUES ($1, $2, $3)
       ON CONFLICT (persona_id, connection_type_id) DO UPDATE SET weight = EXCLUDED.weight
       RETURNING *`,
      [personaId, connectionTypeId, Math.max(-100, Math.min(100, weight))]
    );
  },
};
