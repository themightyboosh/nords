/**
 * Standalone test-run script — bypasses HTTP auth.
 * Usage: npx tsx --env-file=.env scripts/run-test.ts
 */
import { query, queryOne } from '../src/db.js';
import { executeTestRun, type TestScenario, type RunProgress } from '../src/lib/testRunner.js';

const SCENARIO_ID = '3ab7b425-3686-4c01-bb8e-46d210dd0b0a'; // Hallucination Detection (12 rounds)

async function main() {
  console.log('🧪 Fetching scenario...');
  const scenario = await queryOne<TestScenario>(
    'SELECT * FROM test_scenarios WHERE id = $1',
    [SCENARIO_ID]
  );
  if (!scenario) throw new Error('Scenario not found');
  console.log(`📋 Scenario: "${scenario.name}" (${scenario.max_rounds} rounds)`);

  // Create run record
  const run = await queryOne<{ id: string }>(
    `INSERT INTO test_runs (scenario_id, project_id) VALUES ($1, $2) RETURNING id`,
    [scenario.id, scenario.project_id]
  );
  if (!run) throw new Error('Failed to create run record');
  const runId = run.id;
  console.log(`🚀 Run ID: ${runId}`);

  const onProgress = (p: RunProgress) => {
    if (p.type === 'user_message') {
      console.log(`\n👤 [Round ${p.round}/${p.maxRounds}] User: ${(p as any).content?.slice(0, 100)}...`);
    } else if (p.type === 'agent_message' || p.type === 'agent_response') {
      console.log(`🤖 [Round ${p.round}/${p.maxRounds}] Agent: ${(p as any).content?.slice(0, 100)}...`);
      if ((p as any).tokensIn) {
        console.log(`   📊 Tokens: ${(p as any).tokensIn}in/${(p as any).tokensOut}out  Latency: ${(p as any).latencyMs}ms`);
      }
    } else if (p.type === 'run_complete') {
      console.log(`\n✅ RUN COMPLETE`);
      console.log(`   Score:`, JSON.stringify((p as any).score, null, 2));
      console.log(`   NPS: ${(p as any).nps}`);
      console.log(`   Hallucination: ${(p as any).hallucinationScore}`);
      console.log(`   Passed: ${(p as any).passed}`);
      console.log(`   Stop Reason: ${(p as any).stopReason}`);
    } else if (p.type === 'error') {
      console.error(`❌ Error: ${(p as any).error}`);
    } else {
      console.log(`📌 ${p.type}`);
    }
  };

  console.log('\n--- Starting test run ---\n');
  await executeTestRun(scenario, runId, onProgress);

  // Verify final DB state
  const finalRun = await queryOne<any>(
    'SELECT status, stop_reason, rounds_completed, completion_pct, passed, synthetic_nps, hallucination_score, score FROM test_runs WHERE id = $1',
    [runId]
  );
  console.log('\n--- Final DB state ---');
  console.log(JSON.stringify(finalRun, null, 2));

  process.exit(0);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
