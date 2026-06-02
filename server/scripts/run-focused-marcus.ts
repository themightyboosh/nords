/**
 * Create a "Focused Marcus" test scenario — contrasts with Wandering Priya.
 * Marcus is goal-oriented from turn 1, driving straight toward verification completion.
 * 
 * Usage: npx tsx scripts/run-focused-marcus.ts
 */
import { query, queryOne, pool } from '../src/db.js';
import { executeTestRun, generateCritique, type TestScenario, type RunProgress } from '../src/lib/testRunner.js';
import { randomUUID } from 'crypto';

const PROJECT_ID = '011097d1-c383-4662-aa7c-84c861a4dec1';
const MARCUS_PERSONA_ID = '9ead317a-b3bb-420d-a864-95fe9027273e';

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
    'Focused Marcus — Goal-Driven from Turn 1',
    'Marcus Cole, VP Engineering, arrives with a clear agenda: complete verification status review. He provides data freely, answers directly, and wants to make progress. Contrasts with Wandering Priya who avoids goals initially.',
    `I'm Marcus Cole, VP Engineering at Meridian Medical. I have 30 minutes before my next call and I want to make real progress on our verification status.

Here's what I know and want to cover:
- All verification tests have been executed. We're done running them.
- We have 3 open critical nonconformances — the sensor wire, adhesive, and the app crash issue.
- The software is Class B (IEC 62304).
- The highest risk subsystem is definitely the Sensor Module — that's where most of our issues live.
- Biocompatibility is NOT confirmed yet — we're waiting on final ISO 10993 results.
- Risk tolerance: we're being conservative. No shortcuts.

I also want to talk about the 510(k) timeline. Predicate is Dexcom G7, pathway is 510(k), targeting Q3 2027, and our target population is Type 1 and Type 2 diabetes patients.

For clinical: IRB is approved, primary endpoint (MARD ≤10%) is expected to be met, enrollment target is 300 subjects.

Let's be efficient. I'll give you what you need, you save it and keep us moving.`,
    'other',
    `You're a senior engineering executive who is efficient, direct, and data-driven. Key behaviors:
- Provide information proactively — don't wait to be asked
- Answer with specific values, not vague descriptions
- If the AI asks a question you've already answered, say "I already told you that"
- Volunteer related information when asked about a topic — batch your answers
- You're cooperative but impatient. If the AI is being chatty instead of saving data, say "Did you save that?" or "Let's keep moving"
- Keep messages 2-4 sentences. Be specific and technical.
- You WANT the AI to collect data efficiently. Push it to be faster.
- After providing your verification data, shift to regulatory topics and provide that data too.`,
    '{}',
    'gemini-2.5-pro',
    'gemini-2.5-pro',
    20,
    null,  // no stop on completion — let it run the full 20
    true,
    50,
    MARCUS_PERSONA_ID,
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
        console.log(`\n👤 [Marcus — Round ${p.round}/${p.maxRounds}]`);
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
