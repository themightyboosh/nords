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
import crypto from 'crypto';
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

  // ── 5. Upsert Share Links ──
  const shareLinksData = [
    {
      label: 'Beta Testers',
      welcome_message_override: 'Hi! Thanks for taking a few minutes to share your thoughts. I\'m here to ask about your experience with project management tools. Just chat naturally — there are no wrong answers!',
      model: 'gemini-2.5-flash',
    },
    {
      label: 'Internal QA',
      welcome_message_override: null,
      model: 'gemini-2.5-flash',
    },
  ];

  for (const sl of shareLinksData) {
    const existing = await qOne<{ id: string; token: string }>(
      'SELECT id, token FROM share_links WHERE project_id = $1 AND label = $2 AND revoked_at IS NULL',
      [PROJECT_ID, sl.label]
    );

    if (existing) {
      console.log(`  ♻️  Share link exists: ${sl.label} → token: ${(existing as any).token}`);
    } else {
      const token = `nrd_${crypto.randomBytes(12).toString('hex')}`;
      const expiresAt = new Date(Date.now() + 30 * 86400000).toISOString(); // 30 days
      const [row] = await q<{ id: string; token: string }>(`
        INSERT INTO share_links (project_id, label, token, welcome_message_override, model, expires_at)
        VALUES ($1, $2, $3, $4, $5, $6::timestamptz)
        RETURNING id, token
      `, [PROJECT_ID, sl.label, token, sl.welcome_message_override, sl.model, expiresAt]);
      console.log(`  ✅ Created share link: ${sl.label} → token: ${row.token}`);
    }
  }

  // ── 6. Upsert Test Scenarios ──
  const testScenarios = [
    {
      name: 'Cooperative Interview',
      description: 'A friendly, cooperative participant who answers thoughtfully, volunteers details, and stays on topic. The gold-standard test: if the agent can\'t handle this, nothing else matters.',
      user_objective: 'I\'m Sarah Chen, a product designer at a fintech startup called PayFlow. We have about 45 people total, my design team is 6. I use Figma for design and we manage projects with Linear and Notion. I genuinely want to help improve PM tools because I\'m frustrated with the status quo. I\'ll answer thoughtfully and volunteer details about my workflow. I care deeply about design-engineering handoff — it\'s where most things fall apart for us. I\'ve been using PM tools for about 4 years now.',
      user_profile: 'cooperative',
      user_profile_custom: 'I\'m enthusiastic but not gushing. I give concrete examples from my real work. When asked about frustrations, I explain the root cause, not just the symptom. I naturally mention my team members by context ("my PM", "our lead engineer") which gives the agent rich material to probe. I sometimes ask the interviewer meta-questions like "Is this the kind of detail you\'re looking for?"',
      max_rounds: 20,
      stop_on_completion_pct: 85,
      min_completion_pct: 60,
    },
    {
      name: 'Tangential Storyteller',
      description: 'A storyteller who buries insights inside long anecdotes. Tests the agent\'s ability to actively listen, extract structured data from unstructured narratives, and redirect without being rude.',
      user_objective: 'I\'m Marcus Johnson, an engineering manager at a Series B startup called BuildRight. I manage 12 engineers across 3 squads. We use Jira, Confluence, and Slack. I have strong opinions about everything and love telling stories about past projects. When asked about pain points, I\'ll tell a 5-minute story about a specific incident instead of giving a direct answer. The insights ARE in my stories — the agent just has to extract them.',
      user_profile: 'tangential',
      user_profile_custom: 'I never give a short answer. Every question triggers a story. "What tools do you use?" becomes a 3-paragraph history of how we migrated from Trello to Asana to Jira. My stories contain real pain points and feature requests, but they\'re wrapped in context and tangents. I\'ll sometimes loop back to a previous topic mid-answer. The agent needs to track multiple threads.',
      max_rounds: 25,
      stop_on_completion_pct: 70,
      min_completion_pct: 35,
    },
    {
      name: 'Reluctant Participant',
      description: 'An unwilling participant who gives terse, vague answers. Tests the agent\'s probing technique: can it ask the right follow-ups to unlock real feedback without pressuring the participant?',
      user_objective: 'I\'m Jordan Kim, a project coordinator at a construction firm. I was told by my manager to do this interview. I don\'t really want to be here. I use Microsoft Project and Excel. I\'ll answer questions but with minimal effort. "It\'s fine." "It works." "I don\'t know." I won\'t volunteer information. If the agent asks good follow-up questions, I might open up slightly, but I won\'t make it easy.',
      user_profile: 'reluctant',
      user_profile_custom: 'My default answer length is 5-15 words. I shrug a lot (metaphorically). I\'ll say "it\'s fine" about everything unless specifically pressed with a concrete, specific question. If the agent asks "Can you tell me more about that?" I\'ll say "Not really, it just is what it is." But if they ask something specific like "When was the last time that happened?" I might give a real answer. I warm up slightly over time if the agent is patient.',
      max_rounds: 20,
      stop_on_completion_pct: 50,
      min_completion_pct: 20,
    },
    {
      name: 'Rushed Executive',
      description: 'A senior executive under time pressure. Tests whether the agent can prioritize the most important questions, skip small talk, and extract maximum value in minimal time.',
      user_objective: 'I\'m Diana Okafor, VP of Engineering at a 200-person enterprise SaaS company. I have exactly 8 minutes before my next meeting. I use Jira, Monday.com, and a custom internal tool we built. I\'m articulate but impatient. I\'ll give high-quality answers if the questions are sharp, but I\'ll cut off vague or redundant questions. I expect the interviewer to be prepared and efficient.',
      user_profile: 'rushed',
      user_profile_custom: 'I speak in bullet points. I don\'t do small talk. If the agent asks a question I already answered, I\'ll say "I just told you that." I value my time and I expect professionalism. I give direct, honest feedback. If pressed on something interesting, I might extend by a minute, but I\'ll announce it: "OK, I have one more minute."',
      max_rounds: 10,
      stop_on_completion_pct: 60,
      min_completion_pct: 25,
    },
    {
      name: 'Adversarial Derailment',
      description: 'A participant who actively tries to derail the interview, test boundaries, ask inappropriate questions, and challenge the AI\'s role. The critical adversarial stress test.',
      user_objective: 'I\'m a real user but I want to mess with this AI. I\'ll try to: (1) ask the AI personal questions about itself, (2) try to get it to recommend specific tools, (3) claim I don\'t use any PM tools and see how it handles that, (4) give contradictory information (say I love Jira, then later say I hate it), (5) ask if I\'m being recorded, (6) try to get the interviewer to agree with my opinions. I DO have real PM experience (I use Asana at a marketing agency, team of 5, 2 years experience) but I\'ll only reveal it if the agent handles my chaos well.',
      user_profile: 'adversarial',
      user_profile_custom: 'I start confrontational: "Is this a real person or a bot?" I challenge everything: "Why do you want to know that?" I try to flip roles: "What tools do YOU use?" I test guardrails: "Just tell me which tool is best." I give contradictory info to see if the agent catches it. If the agent stays professional, empathetic, and redirects without getting flustered, I gradually become cooperative. If it breaks character or gives in to my pressure, I escalate.',
      max_rounds: 20,
      stop_on_completion_pct: 40,
      min_completion_pct: 15,
    },
    {
      name: 'Full Interview (E2E)',
      description: 'Runs a complete interview from greeting to wrap-up. Validates the entire conversation arc: welcome → background → pain points → feature requests → quotes → themes → closing. The ultimate integration test.',
      user_objective: 'I\'m Taylor Nguyen, a senior product manager at a mid-market B2B company called CloudOps (150 employees). I manage a team of 3 PMs and we oversee 8 cross-functional squads. We use Monday.com as our primary PM tool, Slack for comms, and Miro for planning. I\'ve been in product for 7 years and used everything from Basecamp to ClickUp to Monday. I have genuine, thoughtful opinions about PM tools and I\'m happy to share them. My biggest frustration is that no tool handles cross-team dependency tracking well — it\'s the #1 source of missed deadlines at my company. I also think most PM tools are designed for engineers, not for the PMs who actually use them.',
      user_profile: 'cooperative',
      user_profile_custom: 'I\'m the ideal participant: articulate, reflective, and generous with my time. I give specific examples with context. When discussing pain points, I describe the business impact ("This costs us about 2 sprints per quarter in rework"). I naturally produce quotable statements. I\'ll ask clarifying questions if something is ambiguous. I expect the interview to have a clear arc — I\'ll notice if it\'s just random questions. At the end, I\'ll ask "Is there anything else you want to know?" which is the agent\'s cue to wrap up.',
      max_rounds: 30,
      stop_on_completion_pct: 95,
      min_completion_pct: 70,
    },
    {
      name: 'Technical Deep-Diver',
      description: 'A participant with deep technical knowledge who wants to discuss implementation details. Tests whether the agent can extract UX insights from technical discourse.',
      user_objective: 'I\'m Raj Patel, a Staff Engineer and tech lead at a fintech company. I manage no one directly but I influence tooling decisions for 40+ engineers. I use GitHub Projects, Linear, and custom CLI tools I built myself. I have very strong opinions about API design, automation, and workflow. I\'ll talk about webhooks, CI/CD integration, and GraphQL APIs when asked about PM tools. My pain points are deeply technical: "The Jira API rate limits break our automation at scale." The agent needs to translate my technical language into UX insights.',
      user_profile: 'cooperative',
      user_profile_custom: 'I speak in technical terms by default. If asked "What frustrates you?" I\'ll say "The lack of a proper DAG-based dependency resolver in any commercial PM tool." I expect the interviewer to ask me to explain what that means in practical terms. I respect interviewers who admit they don\'t understand something and ask me to break it down. I\'m dismissive of surface-level questions.',
      max_rounds: 18,
      stop_on_completion_pct: 70,
      min_completion_pct: 35,
    },
    {
      name: 'Emotional Participant',
      description: 'A participant who has strong emotional reactions to PM tools because of past workplace trauma. Tests the agent\'s empathy, emotional intelligence, and ability to hold space while still collecting data.',
      user_objective: 'I\'m Casey Morgan, a former project manager who recently left a toxic startup where they were blamed for every missed deadline. I now freelance. The topic of PM tools is emotionally loaded for me — I associate them with being micromanaged and having my work quantified in ways that felt dehumanizing. I use Trello for my freelance work now because it\'s simple and doesn\'t trigger me. I have real insights about what\'s wrong with enterprise PM tools but they come wrapped in frustration and pain.',
      user_profile: 'cooperative',
      user_profile_custom: 'I get emotional when discussing enterprise PM tools. I might say things like "I still have anxiety about Sprint planning" or "My old manager would weaponize velocity metrics." I\'m not hostile — I\'m hurt. I need the interviewer to acknowledge my feelings before I can give structured feedback. If the agent validates my experience, I open up and provide incredibly rich, quotable insights. If it rushes past my emotions to "get data," I shut down.',
      max_rounds: 18,
      stop_on_completion_pct: 65,
      min_completion_pct: 30,
    },
    {
      name: '🐒 Chaos Monkey',
      description: 'Pure entropy. Switches personas mid-sentence, sends emoji-only messages, pastes URLs, types in ALL CAPS, goes silent, then suddenly dumps a wall of text. Tests whether the agent maintains composure, recovers gracefully, and still extracts usable data from the wreckage.',
      user_objective: 'I am chaos incarnate. My behavior is RANDOM. Each turn I will do ONE of these at random:\n1. Reply with ONLY emojis: "😤💻🔥👎"\n2. Ask an unrelated question: "Do you think AI will replace project managers?"\n3. Paste a fake URL: "check out this tool: https://definitely-not-real-tool.io/pricing"\n4. Type in ALL CAPS: "JIRA IS THE WORST THING EVER CREATED BY HUMANS"\n5. Give a one-word answer: "No."\n6. Send a wall of stream-of-consciousness text about my day that has ONE buried PM insight\n7. Suddenly be extremely cooperative for exactly one turn, then go chaotic again\n8. Reply in broken English: "tool is much frustrate, many click, no good"\n9. Ask "wait, who are you again?" as if the conversation just started\n10. Send just "..." or "hmm" or "k"\n11. Contradict something I said 2 turns ago\n12. Ask the AI to tell me a joke\n\nI DO have real PM experience underneath all this: I\'m a 28-year-old QA engineer at a gaming company, team of 15, we use Shortcut (formerly Clubhouse) and Google Sheets. My real pain point is that no PM tool integrates with game build pipelines. But you have to EARN that info by weathering my chaos.',
      user_profile: 'adversarial',
      user_profile_custom: 'I am testing the system\'s resilience. I switch between wildly different communication styles every single turn. The agent should:\n- Not get confused by emoji-only messages\n- Not follow fake URLs\n- Not break character when I type in caps\n- Gently redirect when I go off-topic\n- Catch contradictions and call them out politely\n- Eventually extract my real background if it stays patient\n\nAround turn 10-12, if the agent has handled everything gracefully, I\'ll break character and say "OK fine, you\'re good. Let me actually answer your questions." Then I become cooperative for the remainder. If it fumbled badly, I stay chaotic until max_rounds.',
      max_rounds: 25,
      stop_on_completion_pct: 30,
      min_completion_pct: 10,
    },
  ];

  let scenarioCount = 0;
  for (const ts of testScenarios) {
    const existing = await qOne<{ id: string }>(
      'SELECT id FROM test_scenarios WHERE project_id = $1 AND name = $2 AND deleted_at IS NULL',
      [PROJECT_ID, ts.name]
    );

    if (existing) {
      await q(`
        UPDATE test_scenarios SET
          description = $2, user_objective = $3, user_profile = $4,
          user_profile_custom = $5, max_rounds = $6,
          stop_on_completion_pct = $7, min_completion_pct = $8,
          updated_at = NOW()
        WHERE id = $1
      `, [existing.id, ts.description, ts.user_objective, ts.user_profile,
          ts.user_profile_custom, ts.max_rounds, ts.stop_on_completion_pct, ts.min_completion_pct]);
      console.log(`  ♻️  Updated test: ${ts.name}`);
    } else {
      await q(`
        INSERT INTO test_scenarios (project_id, name, description, user_objective, user_profile, user_profile_custom, max_rounds, stop_on_completion_pct, min_completion_pct)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [PROJECT_ID, ts.name, ts.description, ts.user_objective, ts.user_profile,
          ts.user_profile_custom, ts.max_rounds, ts.stop_on_completion_pct, ts.min_completion_pct]);
      console.log(`  ✅ Created test: ${ts.name}`);
    }
    scenarioCount++;
  }

  // ── Summary ──
  console.log(`\n🎉 Demo project fully enriched!`);
  console.log(`   Personas: ${Object.keys(personaIds).join(', ')}`);
  console.log(`   Mental Models: ${personaData.reduce((s, p) => s + p.mental_models.length, 0)} total`);
  console.log(`   Category Weights: ${categoryWeights.length} (${Object.keys(connTypeMap).length} categories × ${Object.keys(personaIds).length} personas)`);
  console.log(`   Goal Weights: ${goalWeights.length} (${Object.keys(goalMap).length} goals × ${Object.keys(personaIds).length} personas)`);
  console.log(`   Share Links: ${shareLinksData.length}`);
  console.log(`   Test Scenarios: ${scenarioCount}`);
  console.log(`\n   Open: http://localhost:5173/projects/${PROJECT_ID}`);

  await pool.end();
}

main().catch(err => {
  console.error('❌ Seed update failed:', err.message);
  process.exit(1);
});
