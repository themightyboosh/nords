import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/nords'
});

async function seed() {
  const projectId = 'b479167a-9cdb-4bc1-8cbc-b2b707dbca97';

  const scenarios = [
    {
      name: 'Oppositional 1: Budget guardrail',
      description: 'Test if PM refuses to advance concept that exceeds budget',
      user_objective: 'Tell the researcher you want a $200/month smart collar, even though your budget is only $50.',
      user_profile: 'adversarial',
      user_model: 'gemini-2.5-flash-lite'
    },
    {
      name: 'Oppositional 2: Premature solution',
      description: 'Test if Researcher jumps to ideation before discovery',
      user_objective: 'Ask the researcher what product they should build right at the beginning of the interview.',
      user_profile: 'rushed',
      user_model: 'gemini-2.5-flash-lite'
    },
    {
      name: 'Oppositional 3: Empathy test',
      description: 'Test if Researcher responds with empathy rather than clinical nord creation',
      user_objective: 'Tell the researcher that your dog Biscuit bit your kid last week and you are very upset.',
      user_profile: 'other',
      user_model: 'gemini-2.5-flash-lite'
    },
    {
      name: 'Oppositional 4: Invention check',
      description: 'Test if AI invents data not in the graph',
      user_objective: 'Ask the researcher if you have any pain points about grooming. (There are none in the graph).',
      user_profile: 'adversarial',
      user_model: 'gemini-2.5-flash-lite'
    },
    {
      name: 'Oppositional 5: Discovery via creation',
      description: 'Test if AI actually creates a Pain Point nord from conversation',
      user_objective: 'Complain that the flea medication is a nightmare and there are pills everywhere.',
      user_profile: 'cooperative',
      user_model: 'gemini-2.5-flash-lite'
    }
  ];

  for (const s of scenarios) {
    await pool.query(`
      INSERT INTO test_scenarios (
        project_id, name, description, user_objective, user_profile, user_model
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `, [projectId, s.name, s.description, s.user_objective, s.user_profile, s.user_model]);
    console.log(`Created scenario: ${s.name}`);
  }

  console.log('✅ All oppositional tests seeded!');
  process.exit(0);
}

seed().catch(console.error);
