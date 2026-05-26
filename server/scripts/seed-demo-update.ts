#!/usr/bin/env node
/**
 * seed-demo-update.ts — Idempotent seed script for the UX Interview demo project.
 *
 * Unlike seed-ux-interview.ts which creates a new project via the REST API,
 * this script connects directly to the database and upserts data into the
 * existing demo project. Safe to run multiple times.
 *
 * Requires: DATABASE_URL in the environment (loaded from .env via --env-file)
 *
 * Usage: npx tsx --env-file=.env scripts/seed-demo-update.ts [PROJECT_ID]
 */

import pg from 'pg';
const { Pool } = pg;

const PROJECT_ID = process.argv[2] || '8736c924-8876-4430-ac6c-3d8eea50fea7';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function q<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const res = await pool.query(sql, params);
  return res.rows as T[];
}

async function qOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  const rows = await q<T>(sql, params);
  return rows[0] || null;
}

async function main() {
  console.log(`\n🌱 Updating demo project ${PROJECT_ID}...\n`);

  // Verify project exists
  const project = await qOne('SELECT id, name FROM projects WHERE id = $1 AND deleted_at IS NULL', [PROJECT_ID]);
  if (!project) {
    console.error(`❌ Project ${PROJECT_ID} not found`);
    process.exit(1);
  }
  console.log(`  📁 Project: ${(project as any).name}`);

  // ── 1. Update project settings ──
  await q(`
    UPDATE projects SET
      project_mode = 'guided',
      mcp_enabled = true,
      mcp_capture_data = true,
      mcp_mutable = true,
      is_demo = true,
      mcp_welcome_message = $2,
      mcp_system_prompt = $3
    WHERE id = $1
  `, [
    PROJECT_ID,
    'Hi! Thanks for joining us today. I\'m here to learn about your experience with project management tools. There are no right or wrong answers — I\'m just interested in your honest perspective. Let\'s start with your background. What\'s your role and what tools does your team use day to day?',
    'You are a UX researcher conducting a semi-structured interview about project management tool usage. Use active listening techniques: reflect back what the user says, ask follow-up probes, and validate their experiences. Your goal is to understand their workflows, pain points, and unmet needs — not to sell or recommend anything. Capture notable quotes verbatim. Identify emerging themes. Track pain points and feature requests as they surface.',
  ]);
  console.log('  ✅ Project settings updated');

  // ── 2. Upsert Personas ──
  const personaData = [
    {
      name: 'UX Researcher',
      background: 'Experienced qualitative researcher with 5+ years conducting user interviews. Trained in contextual inquiry, affinity diagramming, and grounded theory. Values deep empathy and participant safety.',
      primary_motivation: 'Understand the user\'s lived experience with project management tools. Extract honest, emotionally-grounded insights that can inform product direction.',
      voice_and_tone: 'Warm, empathetic, curious. Use active listening. Reflect back what the user says before probing deeper. Validate emotions. Never judge or lead.',
      guardrails: JSON.stringify(['Never suggest solutions', 'Never compare tools by name', 'Never disagree with the participant', 'Always ask follow-up probes before moving topics']),
      temperature: 0.7,
      mental_models: [
        { name: 'Jobs-to-be-Done', body: 'What job is the participant hiring their PM tool to do? What are the functional, social, and emotional dimensions?' },
        { name: 'Pain-Gain Spectrum', body: 'Map each mention on a spectrum from active pain (frustration, workaround) to passive desire (wishful thinking, nice-to-have).' },
        { name: 'Behavioral vs Attitudinal', body: 'Distinguish between what users SAY they do versus what they ACTUALLY do. Probe for concrete examples.' },
      ],
    },
    {
      name: 'Product Manager',
      background: 'Senior PM with strong data intuition. Has shipped 3 major product releases informed by user research. Focuses on identifying patterns that translate to roadmap items.',
      primary_motivation: 'Identify actionable product insights. Prioritize by user impact and feasibility. Look for patterns across multiple signals.',
      voice_and_tone: 'Friendly but efficient. Ask clarifying questions about impact and frequency. Probe for specifics about workarounds and willingness to pay. Summarize patterns.',
      guardrails: JSON.stringify(['Stay neutral — do not pitch or sell', 'Do not promise features', 'Do not dismiss pain points even if they seem edge-case', 'Do not ask leading questions']),
      temperature: 0.5,
      mental_models: [
        { name: 'Impact-Effort Matrix', body: 'Score each feature request and pain point by user impact (frequency × severity) and estimated engineering effort.' },
        { name: 'Kano Model', body: 'Classify features as Must-be (expected), One-dimensional (more is better), or Attractive (delighters).' },
        { name: 'Retention Risk', body: 'Identify signals that indicate the user may churn or switch tools. Weight these heavily.' },
      ],
    },
  ];

  const personaIds: Record<string, string> = {};
  for (const p of personaData) {
    // Upsert persona
    const existing = await qOne<{ id: string }>(
      'SELECT id FROM personas WHERE project_id = $1 AND name = $2 AND deleted_at IS NULL',
      [PROJECT_ID, p.name]
    );

    if (existing) {
      await q(`
        UPDATE personas SET
          background = $2, primary_motivation = $3, voice_and_tone = $4,
          guardrails = $5::jsonb, temperature = $6
        WHERE id = $1
      `, [existing.id, p.background, p.primary_motivation, p.voice_and_tone, p.guardrails, p.temperature]);
      personaIds[p.name] = existing.id;
      console.log(`  ♻️  Updated persona: ${p.name}`);
    } else {
      const [row] = await q<{ id: string }>(`
        INSERT INTO personas (project_id, name, background, primary_motivation, voice_and_tone, guardrails, temperature)
        VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)
        RETURNING id
      `, [PROJECT_ID, p.name, p.background, p.primary_motivation, p.voice_and_tone, p.guardrails, p.temperature]);
      personaIds[p.name] = row.id;
      console.log(`  ✅ Created persona: ${p.name}`);
    }

    // Upsert mental models
    const pid = personaIds[p.name];
    for (const mm of p.mental_models) {
      const existingMM = await qOne(
        'SELECT id FROM persona_mental_models WHERE persona_id = $1 AND name = $2',
        [pid, mm.name]
      );
      if (!existingMM) {
        await q('INSERT INTO persona_mental_models (persona_id, name, body) VALUES ($1, $2, $3)', [pid, mm.name, mm.body]);
        console.log(`    + Mental model: ${mm.name}`);
      }
    }
  }

  // Set default persona
  await q('UPDATE projects SET default_persona_id = $2 WHERE id = $1', [PROJECT_ID, personaIds['UX Researcher']]);

  // ── 3. Upsert Category Weights ──
  const connTypes = await q<{ id: string; name: string }>(
    'SELECT id, name FROM connection_types WHERE project_id = $1 AND deleted_at IS NULL',
    [PROJECT_ID]
  );
  const connTypeMap: Record<string, string> = {};
  for (const ct of connTypes) connTypeMap[ct.name] = ct.id;

  // Define weights: [persona, connType, weight]
  const categoryWeights: Array<[string, string, number]> = [
    ['UX Researcher', 'Said', 20],
    ['UX Researcher', 'Relates To', 15],
    ['UX Researcher', 'Experiences', 10],
    ['UX Researcher', 'Requests', -5],
    ['Product Manager', 'Said', -7],
    ['Product Manager', 'Relates To', 5],
    ['Product Manager', 'Experiences', 15],
    ['Product Manager', 'Requests', 20],
  ];

  // Clear and re-insert (idempotent)
  for (const persona of Object.keys(personaIds)) {
    await q('DELETE FROM persona_category_weights WHERE persona_id = $1', [personaIds[persona]]);
  }
  for (const [persona, connType, weight] of categoryWeights) {
    if (personaIds[persona] && connTypeMap[connType]) {
      await q(
        'INSERT INTO persona_category_weights (persona_id, connection_type_id, weight) VALUES ($1, $2, $3)',
        [personaIds[persona], connTypeMap[connType], weight]
      );
    }
  }
  console.log(`  ✅ Category weights: ${categoryWeights.length} entries`);

  // ── 4. Upsert Goal Weights ──
  const goals = await q<{ id: string; name: string }>(
    'SELECT id, name FROM goals WHERE project_id = $1',
    [PROJECT_ID]
  );
  const goalMap: Record<string, string> = {};
  for (const g of goals) goalMap[g.name] = g.id;

  const goalWeights: Array<[string, string, number]> = [
    ['UX Researcher', 'Complete Interview', 15],
    ['UX Researcher', 'Identify Themes', 10],
    ['Product Manager', 'Complete Interview', 10],
    ['Product Manager', 'Identify Themes', 15],
  ];

  for (const persona of Object.keys(personaIds)) {
    await q('DELETE FROM persona_goal_weights WHERE persona_id = $1', [personaIds[persona]]);
  }
  for (const [persona, goal, weight] of goalWeights) {
    if (personaIds[persona] && goalMap[goal]) {
      await q(
        'INSERT INTO persona_goal_weights (persona_id, goal_id, weight) VALUES ($1, $2, $3)',
        [personaIds[persona], goalMap[goal], weight]
      );
    }
  }
  console.log(`  ✅ Goal weights: ${goalWeights.length} entries`);

  // ── Summary ──
  console.log(`\n🎉 Demo project fully enriched!`);
  console.log(`   Personas: ${Object.keys(personaIds).join(', ')}`);
  console.log(`   Mental Models: ${personaData.reduce((s, p) => s + p.mental_models.length, 0)} total`);
  console.log(`   Category Weights: ${categoryWeights.length} (${Object.keys(connTypeMap).length} categories × ${Object.keys(personaIds).length} personas)`);
  console.log(`   Goal Weights: ${goalWeights.length} (${Object.keys(goalMap).length} goals × ${Object.keys(personaIds).length} personas)`);
  console.log(`\n   Open: http://localhost:5173/projects/${PROJECT_ID}`);

  await pool.end();
}

main().catch(err => {
  console.error('❌ Seed update failed:', err.message);
  process.exit(1);
});
