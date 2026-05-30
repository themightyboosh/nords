/**
 * seed.ts — Development-only seed route for realistic test data.
 * 
 * POST /api/seed — accepts bulk types and nords, inserts them directly.
 * This creates multiple nord types, connection types, nords, and connections
 * for visually testing the canvas with realistic data.
 *
 * ⚠️  Development only. Do NOT expose in production.
 */

import { Router, Request, Response } from 'express';
import { query, queryOne } from '../db.js';
import logger from '../lib/logger.js';

export const seedRouter = Router();

seedRouter.post('/seed', async (req: Request, res: Response) => {
  const { project_id, user_id: rawUserId, nord_types = [], connection_types = [], nords = [], connections = [] } = req.body;

  if (!project_id) {
    res.status(400).json({ error: 'project_id required' });
    return;
  }
  // Use the authenticated user's UID or the body-supplied user_id
  const user_id = rawUserId || req.user!.uid;

  const results: Record<string, unknown[]> = {
    nord_types: [],
    connection_types: [],
    nords: [],
    connections: [],
  };

  try {
    // ── Insert Nord Types ──
    for (let i = 0; i < nord_types.length; i++) {
      const t = nord_types[i];
      const existing = await queryOne<{ id: string }>(
        `SELECT id FROM nord_types
         WHERE project_id = $1 AND name = $2 AND deleted_at IS NULL`,
        [project_id, t.name]
      );
      if (existing) {
        results.nord_types.push({ id: existing.id, name: t.name, status: 'exists' });
        continue;
      }
      const row = await queryOne<{ id: string }>(
        `INSERT INTO nord_types (user_id, project_id, name, icon, accent_color, properties_schema, scale_property, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          user_id,
          project_id,
          t.name,
          t.icon || 'Square',
          t.accent_color || '#888888',
          JSON.stringify(t.properties_schema || []),
          t.scale_property || null,
          i + 1,
        ]
      );
      results.nord_types.push(row);
    }

    // ── Insert Connection Types ──
    for (let i = 0; i < connection_types.length; i++) {
      const t = connection_types[i];
      const existing = await queryOne<{ id: string }>(
        `SELECT id FROM connection_types
         WHERE project_id = $1 AND name = $2 AND deleted_at IS NULL`,
        [project_id, t.name]
      );
      if (existing) {
        results.connection_types.push({ id: existing.id, name: t.name, status: 'exists' });
        continue;
      }
      const row = await queryOne<{ id: string }>(
        `INSERT INTO connection_types (user_id, project_id, name, accent_color, stroke_style, x_stage_labels, y_stage_labels, properties_schema, is_system, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
          user_id,
          project_id,
          t.name,
          t.accent_color || '#888888',
          t.stroke_style || 'solid',
          JSON.stringify(t.x_stage_labels || []),
          JSON.stringify(t.y_stage_labels || []),
          JSON.stringify(t.properties_schema || []),
          false,
          i + 1,
        ]
      );
      results.connection_types.push(row);
    }

    // ── Insert Nords ──
    for (const n of nords) {
      const row = await queryOne<{ id: string }>(
        `INSERT INTO nords (project_id, type_id, title, description, properties, position_x, position_y, scale)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          project_id,
          n.type_id,
          n.title || 'Untitled',
          n.description || '',
          JSON.stringify(n.properties || {}),
          n.position_x ?? 0.5,
          n.position_y ?? 0.5,
          n.scale ?? 0.5,
        ]
      );
      results.nords.push(row);
    }

    // ── Insert Connections ──
    for (const c of connections) {
      const row = await queryOne<{ id: string }>(
        `INSERT INTO connections (project_id, type_id, source_nord_id, target_nord_id, direction, distance_x, distance_y, properties)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          project_id,
          c.type_id,
          c.source_nord_id,
          c.target_nord_id,
          c.direction || 'none',
          c.distance_x ?? 0.5,
          c.distance_y ?? 0.5,
          JSON.stringify(c.properties || {}),
        ]
      );
      results.connections.push(row);
    }

    res.json({ ok: true, created: results });
  } catch (err: any) {
    logger.error('Seed failed', { error: err instanceof Error ? err.message : String(err) });
    res.status(500).json({ error: 'Seed failed', details: String(err) });
  }
});
