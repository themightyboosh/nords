#!/usr/bin/env node
/**
 * Board Test Seeder — Creates a quadrant connection type and connections
 * for testing swimlanes in the board view.
 * 
 * Works with the pre-migration-009 schema (project_id on types, no user_id).
 * 
 * Usage: npx tsx db/seed-board-test.ts
 */

import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://nords_admin:6a7f5bb7f2ecde0a4a6c04450afdfe32@127.0.0.1:5433/nords_main',
});

const PROJECT_ID = '5413fc94-3245-4153-9641-b9d025367e1d';

async function seed() {
  const client = await pool.connect();
  try {
    // Check if Priority type already exists
    const existing = await client.query(
      `SELECT id FROM connection_types WHERE project_id = $1 AND name = 'Priority' AND deleted_at IS NULL`,
      [PROJECT_ID]
    );
    
    let priorityTypeId: string;
    
    if (existing.rows.length > 0) {
      priorityTypeId = existing.rows[0].id;
      console.log('Priority type already exists:', priorityTypeId);
      
      // Update to add y labels if they're empty
      await client.query(
        `UPDATE connection_types SET y_stage_labels = $1 WHERE id = $2`,
        [JSON.stringify(['Minor', 'Moderate', 'Severe']), priorityTypeId]
      );
      console.log('Updated y_stage_labels');
    } else {
      // Create Priority connection type with BOTH x and y labels (quadrant mode)
      const ctResult = await client.query(
        `INSERT INTO connection_types (project_id, name, accent_color, stroke_style, default_direction, x_stage_labels, y_stage_labels, properties_schema, sort_order)
         VALUES ($1, 'Priority', '#f59e0b', 'solid', 'none', $2, $3, '[]', 5)
         RETURNING id`,
        [
          PROJECT_ID,
          JSON.stringify(['Low', 'Medium', 'High', 'Critical']),
          JSON.stringify(['Minor', 'Moderate', 'Severe']),
        ]
      );
      priorityTypeId = ctResult.rows[0].id;
      console.log('Created Priority type:', priorityTypeId);
    }

    // Get all existing nords
    const nords = await client.query(
      `SELECT id, title, type_id FROM nords WHERE project_id = $1 AND deleted_at IS NULL`,
      [PROJECT_ID]
    );
    console.log(`Found ${nords.rows.length} nords`);

    if (nords.rows.length < 2) {
      console.log('Not enough nords to create connections');
      return;
    }

    // Create connections between nords on Priority type with varying x/y positions
    const distances = [
      { dx: 0.1, dy: 0.15 },  // Low / Minor
      { dx: 0.2, dy: 0.5 },   // Low / Moderate
      { dx: 0.4, dy: 0.2 },   // Medium / Minor
      { dx: 0.5, dy: 0.85 },  // Medium / Severe
      { dx: 0.6, dy: 0.45 },  // High / Moderate
      { dx: 0.75, dy: 0.1 },  // High / Minor
      { dx: 0.8, dy: 0.7 },   // High / Severe
      { dx: 0.92, dy: 0.5 },  // Critical / Moderate
      { dx: 0.95, dy: 0.9 },  // Critical / Severe
      { dx: 0.3, dy: 0.8 },   // Medium / Severe
    ];

    let created = 0;
    for (let i = 0; i < Math.min(distances.length, nords.rows.length - 1); i++) {
      const source = nords.rows[i];
      const target = nords.rows[(i + 1) % nords.rows.length];
      const d = distances[i];
      
      try {
        await client.query(
          `INSERT INTO connections (project_id, type_id, source_nord_id, target_nord_id, direction, distance_x, distance_y, properties)
           VALUES ($1, $2, $3, $4, 'none', $5, $6, '{}')`,
          [PROJECT_ID, priorityTypeId, source.id, target.id, d.dx, d.dy]
        );
        created++;
        console.log(`  ${source.title} → ${target.title} (x:${d.dx}, y:${d.dy})`);
      } catch (err: any) {
        if (err.code === '23505') {
          console.log(`  Skip (exists): ${source.title} → ${target.title}`);
        } else {
          console.log(`  Error: ${err.message?.slice(0, 80)}`);
        }
      }
    }
    
    console.log(`\nCreated ${created} Priority connections for swimlane testing`);
    console.log('Total connections:', (await client.query(`SELECT COUNT(*) as c FROM connections WHERE type_id = $1 AND deleted_at IS NULL`, [priorityTypeId])).rows[0].c);

  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(console.error);
