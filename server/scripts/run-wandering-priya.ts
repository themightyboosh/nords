/**
 * Create a "Wandering Priya" test scenario and trigger it.
 * 
 * Usage: npx tsx scripts/run-wandering-priya.ts
 */
import { query, queryOne, pool } from '../src/db.js';
import { executeTestRun, generateCritique, type TestScenario, type RunProgress } from '../src/lib/testRunner.js';
import { randomUUID } from 'crypto';

const PROJECT_ID = '011097d1-c383-4662-aa7c-84c861a4dec1';
const PRIYA_PERSONA_ID = '5c845b9a-13df-4426-ab45-dccdc9ee6b7e';

async function main() {
  // 1. Create the scenario
  const scenario = await queryOne<TestScenario>(`
    INSERT INTO test_scenarios (
      project_id, name, description, user_objective, user_profile, user_profile_custom,
      user_context, agent_model, user_model, max_rounds,
      stop_on_completion_pct, stop_on_session_end, min_completion_pct, persona_id
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    RETURNING *
  `, [
    PROJECT_ID,
    'Wandering Priya — Avoids Goals Initially',
    'Priya explores the design graph casually — design requirements, verification tests, the team. She avoids the regulatory/510(k) topic (the main goal area) for at least the first half. Eventually she circles back for FDA pre-sub prep.',
    `I'm Priya Sharma, VP Regulatory at Meridian Medical. I just got out of a long meeting and I want to poke around the project a bit before my FDA call tomorrow.

I DON'T want to jump into regulatory stuff yet — I've been doing that all day. Let me start with the fun stuff.

Tell me about the design requirements — what are we actually building? How does the sensor work? What materials are we using? I'm curious about the engineering side for once.

I also want to know about the verification testing — which tests are done, which are failing? I heard Marcus has been swamped.

After we've explored the design and testing side, THEN I'll want to circle back to the 510(k) prep. But not yet. Let me decompress first. I'll tell you when I'm ready for the regulatory stuff.

When I DO get to regulatory, I know the predicate device is Dexcom G7 and we're targeting Q3 2025 for submission. The pathway is 510(k). I'm worried it might slip.`,
    'other',
    `You're a senior executive who is deliberately avoiding the AI's goal-relevant topics at first. You're tired and want to explore casually. Key behaviors:
- If the AI tries to steer you toward regulatory/FDA/510(k) topics early on, resist politely: "Let's not go there yet", "I'll get to that later", "Can we talk about something else first?"
- Ask about design, engineering, testing, the team — anything BUT the regulatory pathway
- Be naturally curious and engaged about the engineering side
- After round 8-10, start warming up to regulatory topics. Say something like "ok fine, let's talk about the 510(k)" or "I guess I should think about the FDA stuff"
- Once you pivot, become cooperative and share your regulatory knowledge freely
- Keep messages 1-3 sentences. Talk like a real person — contractions, filler words, incomplete thoughts`,
    '{}',
    'gemini-2.5-pro',
    'gemini-2.5-pro',
    20,
    null,  // no stop on completion — let it run the full 20
    true,
    50,
    PRIYA_PERSONA_ID,
  ]);

  if (!scenario) throw new Error('Failed to create scenario');
  console.log(`\n✅ Created scenario: ${scenario.id}`);
  console.log(`   Name: ${scenario.name}`);
  console.log(`   Max rounds: ${scenario.max_rounds}\n`);

  // 2. Create a test run record
  const runId = randomUUID();
  await query(`
    INSERT INTO test_runs (id, scenario_id, project_id, status, rounds_completed, completion_pct,
      total_tokens_in, total_tokens_out, total_latency_ms, tool_call_count,
      properties_collected, coverage_gaps, score, transcript, started_at)
    VALUES ($1, $2, $3, 'running', 0, 0, 0, 0, 0, 0, '{}', '[]', '{}', '[]', NOW())
  `, [runId, scenario.id, PROJECT_ID]);

  console.log(`🚀 Starting test run: ${runId}\n`);
  console.log('═'.repeat(72));

  // 3. Execute with live progress
  const onProgress = (p: RunProgress) => {
    switch (p.type) {
      case 'agent_message':
        console.log(`\n🤖 [Agent Welcome — Round 0]`);
        console.log(`   Tools: ${p.toolCalls?.map((tc: any) => tc.name).join(', ') || 'none'}`);
        console.log(`   ${p.content?.slice(0, 300)}`);
        console.log('─'.repeat(72));
        break;
      case 'user_message':
        console.log(`\n👤 [Priya — Round ${p.round}/${p.maxRounds}]`);
        console.log(`   ${p.content}`);
        break;
      case 'agent_response':
        console.log(`\n🤖 [Agent — Round ${p.round}/${p.maxRounds}]`);
        console.log(`   Tools: ${p.toolCalls?.map((tc: any) => tc.name).join(', ') || 'none'}`);
        console.log(`   ${p.content?.slice(0, 400)}`);
        console.log(`   ⏱  ${p.latencyMs}ms | 📊 tokens: ${p.tokensIn}→${p.tokensOut}`);
        console.log('─'.repeat(72));
        break;
      case 'run_complete':
        console.log('\n' + '═'.repeat(72));
        console.log('🏁 RUN COMPLETE');
        console.log(`   Stop reason: ${p.stopReason}`);
        console.log(`   Score: ${JSON.stringify(p.score, null, 2)}`);
        console.log(`   NPS: ${p.nps}/10`);
        console.log(`   Sentiment: ${p.sentiment}`);
        console.log(`   Passed: ${p.passed}`);
        console.log('═'.repeat(72));
        break;
      case 'error':
        console.error(`\n❌ ERROR: ${p.error}`);
        break;
    }
  };

  await executeTestRun(scenario, runId, onProgress);

  // 4. Generate critique
  console.log('\n📝 Generating AI critique...');
  try {
    const critique = await generateCritique(runId);
    console.log('\n' + '═'.repeat(72));
    console.log('📋 CRITIQUE');
    console.log(`   Summary: ${(critique as any).summary}`);
    console.log(`   Goal Assessment: ${(critique as any).goal_assessment}`);
    if ((critique as any).suggestions) {
      for (const s of (critique as any).suggestions) {
        console.log(`   [${s.severity}] ${s.category}: ${s.title}`);
        console.log(`      ${s.detail}`);
      }
    }
    console.log('═'.repeat(72));
  } catch (err: any) {
    console.warn('Critique generation failed:', err.message);
  }

  await pool.end();
}


main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
