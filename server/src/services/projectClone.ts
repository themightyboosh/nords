/**
 * projectClone.ts — Deep-copy a project and all its entities.
 *
 * Used to clone "demo" projects for new users. Copies:
 *   1. Project (new ID, name prefixed "Demo: ")
 *   2. Nord types (remapped)
 *   3. Connection types (remapped)
 *   4. Personas (remapped) + mental models + category weights + goal weights
 *   5. Nords (remapped type_id)
 *   6. Connections (remapped type_id, source, target)
 *   7. Goals + goal edges + goal properties (remapped)
 *   8. Test scenarios (remapped project + goal refs)
 *
 * All in a single transaction for consistency.
 */

import { pool } from '../db.js';
import { randomUUID } from 'crypto';
import logger from '../lib/logger.js';

export async function cloneProject(sourceProjectId: string, targetOrgId: string, createdBy: string | null): Promise<string> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ── 1. Clone Project ──
    const { rows: [srcProject] } = await client.query(
      'SELECT * FROM projects WHERE id = $1 AND deleted_at IS NULL',
      [sourceProjectId]
    );
    if (!srcProject) throw new Error(`Source project ${sourceProjectId} not found`);

    const newProjectId = randomUUID();
    await client.query(`
      INSERT INTO projects (id, org_id, name, description, purpose, icon, accent_color, created_by,
        mcp_enabled, mcp_capture_data, mcp_mutable, goals_enabled, mcp_system_prompt, mcp_welcome_message,
        project_mode, end_prompt_suggestion, is_demo)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, false)
    `, [
      newProjectId, targetOrgId, `Demo: ${srcProject.name}`, srcProject.description, srcProject.purpose,
      srcProject.icon, srcProject.accent_color, createdBy,
      srcProject.mcp_enabled, srcProject.mcp_capture_data, srcProject.mcp_mutable, srcProject.goals_enabled,
      srcProject.mcp_system_prompt, srcProject.mcp_welcome_message,
      srcProject.project_mode, srcProject.end_prompt_suggestion,
    ]);

    // ── 2. Clone Nord Types ──
    const nordTypeMap = new Map<string, string>();
    const { rows: nordTypes } = await client.query(
      'SELECT * FROM nord_types WHERE project_id = $1 AND deleted_at IS NULL',
      [sourceProjectId]
    );
    for (const nt of nordTypes) {
      const newId = randomUUID();
      nordTypeMap.set(nt.id, newId);
      await client.query(`
        INSERT INTO nord_types (id, project_id, user_id, name, description, icon, accent_color,
          properties_schema, scale_property, sort_order)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [newId, newProjectId, nt.user_id, nt.name, nt.description, nt.icon, nt.accent_color,
          JSON.stringify(nt.properties_schema), nt.scale_property, nt.sort_order]);
    }

    // ── 3. Clone Connection Types ──
    const connTypeMap = new Map<string, string>();
    const { rows: connTypes } = await client.query(
      'SELECT * FROM connection_types WHERE project_id = $1 AND deleted_at IS NULL',
      [sourceProjectId]
    );
    for (const ct of connTypes) {
      const newId = randomUUID();
      connTypeMap.set(ct.id, newId);
      await client.query(`
        INSERT INTO connection_types (id, project_id, user_id, name, description, accent_color,
          stroke_style, measurement_mode, x_stage_labels, y_stage_labels,
          properties_schema, verb, is_system, sort_order, default_direction, direction_filter, icon)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      `, [newId, newProjectId, ct.user_id, ct.name, ct.description, ct.accent_color,
          ct.stroke_style, ct.measurement_mode,
          JSON.stringify(ct.x_stage_labels), JSON.stringify(ct.y_stage_labels),
          JSON.stringify(ct.properties_schema), ct.verb, ct.is_system, ct.sort_order,
          ct.default_direction, ct.direction_filter, ct.icon]);
    }

    // ── 4. Clone Personas ──
    const personaMap = new Map<string, string>();
    const { rows: personas } = await client.query(
      'SELECT * FROM personas WHERE project_id = $1',
      [sourceProjectId]
    );
    for (const p of personas) {
      const newId = randomUUID();
      personaMap.set(p.id, newId);
      await client.query(`
        INSERT INTO personas (id, project_id, name, avatar_seed, background, primary_motivation,
          voice_and_tone, guardrails, sort_order, temperature)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [newId, newProjectId, p.name, p.avatar_seed || '', p.background || '', p.primary_motivation || '',
          p.voice_and_tone || '', JSON.stringify(p.guardrails || []), p.sort_order, p.temperature]);
    }

    // ── 5. Clone Nords ──
    const nordMap = new Map<string, string>();
    const { rows: nords } = await client.query(
      'SELECT * FROM nords WHERE project_id = $1 AND deleted_at IS NULL',
      [sourceProjectId]
    );
    for (const n of nords) {
      const newId = randomUUID();
      nordMap.set(n.id, newId);
      await client.query(`
        INSERT INTO nords (id, project_id, type_id, title, properties, position_x, position_y, scale, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [newId, newProjectId, nordTypeMap.get(n.type_id) || n.type_id,
          n.title, JSON.stringify(n.properties), n.position_x, n.position_y, n.scale, createdBy]);
    }

    // ── 6. Clone Connections ──
    const { rows: connections } = await client.query(
      'SELECT * FROM connections WHERE project_id = $1 AND deleted_at IS NULL',
      [sourceProjectId]
    );
    for (const c of connections) {
      const newId = randomUUID();
      await client.query(`
        INSERT INTO connections (id, project_id, type_id, source_nord_id, target_nord_id,
          direction, distance_x, distance_y, sort_order, properties)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [newId, newProjectId,
          connTypeMap.get(c.type_id) || c.type_id,
          nordMap.get(c.source_nord_id) || c.source_nord_id,
          nordMap.get(c.target_nord_id) || c.target_nord_id,
          c.direction, c.distance_x, c.distance_y, c.sort_order,
          JSON.stringify(c.properties)]);
    }

    // ── 7. Clone Goals + Goal Edges ──
    const goalMap = new Map<string, string>();
    const { rows: goals } = await client.query(
      'SELECT * FROM goals WHERE project_id = $1',
      [sourceProjectId]
    );
    for (const g of goals) {
      const newId = randomUUID();
      goalMap.set(g.id, newId);
      await client.query(`
        INSERT INTO goals (id, project_id, name, description, icon, accent_color,
          sort_order, end_type, achieved_prompt, is_implicit)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [newId, newProjectId, g.name, g.description, g.icon, g.accent_color,
          g.sort_order, g.end_type, g.achieved_prompt, g.is_implicit]);
    }

    const { rows: goalEdges } = await client.query(
      'SELECT * FROM goal_edges WHERE project_id = $1',
      [sourceProjectId]
    );
    for (const ge of goalEdges) {
      await client.query(`
        INSERT INTO goal_edges (id, project_id, source_goal_id, target_goal_id)
        VALUES ($1, $2, $3, $4)
      `, [randomUUID(), newProjectId,
          goalMap.get(ge.source_goal_id) || ge.source_goal_id,
          goalMap.get(ge.target_goal_id) || ge.target_goal_id]);
    }

    // ── 8. Clone Goal Properties (bind goals to specific nord properties) ──
    let goalPropsCount = 0;
    for (const [oldGoalId, newGoalId] of goalMap) {
      const { rows: goalProps } = await client.query(
        'SELECT * FROM goal_properties WHERE goal_id = $1',
        [oldGoalId]
      );
      for (const gp of goalProps) {
        const newNordId = nordMap.get(gp.nord_id);
        if (!newNordId) continue; // skip if nord wasn't cloned
        await client.query(`
          INSERT INTO goal_properties (id, goal_id, nord_id, property_name)
          VALUES ($1, $2, $3, $4)
        `, [randomUUID(), newGoalId, newNordId, gp.property_name]);
        goalPropsCount++;
      }
    }

    // ── 9. Clone Persona Mental Models ──
    let mentalModelsCount = 0;
    for (const [oldPersonaId, newPersonaId] of personaMap) {
      const { rows: models } = await client.query(
        'SELECT * FROM persona_mental_models WHERE persona_id = $1',
        [oldPersonaId]
      );
      for (const m of models) {
        await client.query(`
          INSERT INTO persona_mental_models (id, persona_id, name, body, sort_order)
          VALUES ($1, $2, $3, $4, $5)
        `, [randomUUID(), newPersonaId, m.name, m.body, m.sort_order]);
        mentalModelsCount++;
      }
    }

    // ── 10. Clone Persona Category Weights ──
    let categoryWeightsCount = 0;
    for (const [oldPersonaId, newPersonaId] of personaMap) {
      const { rows: weights } = await client.query(
        'SELECT * FROM persona_category_weights WHERE persona_id = $1',
        [oldPersonaId]
      );
      for (const w of weights) {
        const newConnTypeId = connTypeMap.get(w.connection_type_id);
        if (!newConnTypeId) continue;
        await client.query(`
          INSERT INTO persona_category_weights (id, persona_id, connection_type_id, weight)
          VALUES ($1, $2, $3, $4)
        `, [randomUUID(), newPersonaId, newConnTypeId, w.weight]);
        categoryWeightsCount++;
      }
    }

    // ── 11. Clone Persona Goal Weights ──
    let goalWeightsCount = 0;
    for (const [oldPersonaId, newPersonaId] of personaMap) {
      const { rows: weights } = await client.query(
        'SELECT * FROM persona_goal_weights WHERE persona_id = $1',
        [oldPersonaId]
      );
      for (const w of weights) {
        const newGoalId = goalMap.get(w.goal_id);
        if (!newGoalId) continue;
        await client.query(`
          INSERT INTO persona_goal_weights (id, persona_id, goal_id, weight)
          VALUES ($1, $2, $3, $4)
        `, [randomUUID(), newPersonaId, newGoalId, w.weight]);
        goalWeightsCount++;
      }
    }

    // ── 12. Clone Test Scenarios ──
    let testScenariosCount = 0;
    const { rows: testScenarios } = await client.query(
      'SELECT * FROM test_scenarios WHERE project_id = $1 AND deleted_at IS NULL',
      [sourceProjectId]
    );
    for (const ts of testScenarios) {
      await client.query(`
        INSERT INTO test_scenarios (
          id, project_id, name, description, user_objective, user_profile, user_profile_custom,
          user_context, agent_model, user_model, max_rounds,
          stop_on_completion_pct, stop_on_goal_id, stop_on_session_end, min_completion_pct
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
      `, [
        randomUUID(), newProjectId, ts.name, ts.description, ts.user_objective,
        ts.user_profile, ts.user_profile_custom,
        JSON.stringify(ts.user_context || {}),
        ts.agent_model, ts.user_model, ts.max_rounds,
        ts.stop_on_completion_pct,
        ts.stop_on_goal_id ? (goalMap.get(ts.stop_on_goal_id) || null) : null,
        ts.stop_on_session_end, ts.min_completion_pct,
      ]);
      testScenariosCount++;
    }

    await client.query('COMMIT');

    logger.info('Project cloned successfully', {
      sourceProjectId,
      newProjectId,
      nordTypes: nordTypeMap.size,
      connTypes: connTypeMap.size,
      personas: personaMap.size,
      nords: nordMap.size,
      connections: connections.length,
      goals: goalMap.size,
      goalProperties: goalPropsCount,
      mentalModels: mentalModelsCount,
      categoryWeights: categoryWeightsCount,
      goalWeights: goalWeightsCount,
      testScenarios: testScenariosCount,
    });

    return newProjectId;
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('Project clone failed', { sourceProjectId, error: err instanceof Error ? err.message : String(err) });
    throw err;
  } finally {
    client.release();
  }
}
