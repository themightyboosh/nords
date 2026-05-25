import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/nords'
});

async function runTests() {
  const projectId = 'b479167a-9cdb-4bc1-8cbc-b2b707dbca97';

  const res = await pool.query('SELECT id, name FROM test_scenarios WHERE project_id = $1 ORDER BY created_at ASC', [projectId]);
  const scenarios = res.rows;

  console.log(`Found ${scenarios.length} scenarios. Triggering runs...`);

  const runIds = [];
  for (const s of scenarios) {
    console.log(`Starting: ${s.name} (${s.id})`);
    try {
      const resp = await fetch(`http://localhost:3000/api/test-scenarios/${s.id}/run`, { method: 'POST' });
      const data = await resp.json();
      if (data.runId) {
        runIds.push(data.runId);
        console.log(`  -> Run ID: ${data.runId}`);
      } else {
        console.error('Failed to start run:', data);
      }
    } catch (e) {
      console.error('Error triggering run:', e);
    }
  }

  console.log('Waiting for runs to complete (checking every 10s)...');
  
  while (true) {
    const runsRes = await pool.query('SELECT id, status, passed, rounds_completed FROM test_runs WHERE id = ANY($1)', [runIds]);
    const runs = runsRes.rows;
    
    const completed = runs.filter(r => r.status === 'completed' || r.status === 'failed' || r.status === 'error');
    console.log(`Progress: ${completed.length}/${runs.length} completed.`);
    
    if (completed.length === runs.length) {
      console.log('\n================ RESULTS ================');
      for (const r of runs) {
        const s = scenarios.find(sc => sc.id === r.scenario_id);
        console.log(`Run ${r.id}: Status=${r.status}, Passed=${r.passed}, Rounds=${r.rounds_completed}`);
      }
      break;
    }
    
    await new Promise(r => setTimeout(r, 10000));
  }
  
  process.exit(0);
}

runTests().catch(console.error);
