/**
 * seed_smoke_data.mjs
 * Creates a large volume of realistic smoke test data via the live API.
 * Run: node server/scripts/seed_smoke_data.mjs
 */

const BASE = 'http://localhost:3000/api';
const PROJECT_ID = '5413fc94-3245-4153-9641-b9d025367e1d';

// ── Known type IDs (from graph) ──────────────────────────────────────────────
const NT = {
  Bug:       '6da4e80b-1680-44c3-a60e-19713f8b8132',
  Person:    '50dc3bf2-7943-405d-9aa3-4cb221e794eb',
  Artifact:  '1db1a1cd-d341-4de3-9014-bae563db5ef8',
  Milestone: '2fa31a68-7189-435c-9397-c83af08e753b',
  Task:      '069aa2b4-023e-4d29-87ae-9da6eb958815',
};

const CT = {
  Depends:  { id: 'd1daa79e-efdd-470c-8471-605bf0949ed1', labels: [0.17, 0.5, 0.83] },
  Priority: { id: 'a24264e5-3b04-4ed2-83ec-16541c1367b3', labels: [0.13, 0.38, 0.63, 0.88] },
  Relates:  { id: 'd4ec08c6-386f-407e-8edc-03e2d6bd03e1', labels: [0.17, 0.5, 0.83] },
  Assigned: { id: '4ac25c78-3527-48db-aaa9-832b3affb7b1', labels: [0.125, 0.375, 0.625, 0.875] },
  Blocks:   { id: '08ffa416-a09e-40a1-a81d-305814121ba1', labels: [0.25, 0.75] },
};

// ── Nord definitions ─────────────────────────────────────────────────────────
const nordDefs = [
  // Bugs
  { type: NT.Bug,  title: 'Login page crash on Safari', props: { Severity: 'Critical', Browser: 'Safari' } },
  { type: NT.Bug,  title: 'Dark mode flicker on load',  props: { Severity: 'Minor',    Browser: 'Chrome' } },
  { type: NT.Bug,  title: 'Missing pagination on search results', props: { Severity: 'Major', Browser: 'Firefox' } },
  { type: NT.Bug,  title: 'Upload fails over 10MB',     props: { Severity: 'Major',    Browser: 'All' } },
  { type: NT.Bug,  title: 'Tooltip overlaps nav bar',   props: { Severity: 'Trivial',  Browser: 'Edge' } },

  // People
  { type: NT.Person, title: 'Alice Wong',     props: { Role: 'Lead Engineer',  Team: 'Platform' } },
  { type: NT.Person, title: 'Ben Okafor',     props: { Role: 'Designer',       Team: 'Product' } },
  { type: NT.Person, title: 'Carla Reyes',    props: { Role: 'QA Engineer',    Team: 'Quality' } },
  { type: NT.Person, title: 'David Park',     props: { Role: 'Backend Dev',    Team: 'Platform' } },
  { type: NT.Person, title: 'Emma Larsson',   props: { Role: 'Product Manager', Team: 'Product' } },
  { type: NT.Person, title: 'Felix Müller',   props: { Role: 'DevOps',         Team: 'Infrastructure' } },

  // Tasks
  { type: NT.Task, title: 'Implement OAuth flow',      props: {} },
  { type: NT.Task, title: 'Design system audit',       props: {} },
  { type: NT.Task, title: 'Write API documentation',   props: {} },
  { type: NT.Task, title: 'Set up CI/CD pipeline',     props: {} },
  { type: NT.Task, title: 'Performance baseline test',  props: {} },
  { type: NT.Task, title: 'Accessibility review',      props: {} },
  { type: NT.Task, title: 'Migrate to Postgres 16',    props: {} },
  { type: NT.Task, title: 'Rate limiting middleware',  props: {} },

  // Artifacts
  { type: NT.Artifact, title: 'API Design Doc v2',       props: {} },
  { type: NT.Artifact, title: 'System Architecture diagram', props: {} },
  { type: NT.Artifact, title: 'Test Coverage Report',    props: {} },
  { type: NT.Artifact, title: 'Security Audit Results',  props: {} },

  // Milestones
  { type: NT.Milestone, title: 'Alpha Release',    props: {} },
  { type: NT.Milestone, title: 'Beta Launch',      props: {} },
  { type: NT.Milestone, title: 'GA / v1.0',        props: {} },
  { type: NT.Milestone, title: 'Q3 Retrospective', props: {} },
];

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`POST ${path} → ${res.status}: ${txt}`);
  }
  return res.json();
}

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function pickN(arr, n) {
  const copy = [...arr]; const out = [];
  for (let i = 0; i < n && copy.length; i++) {
    const idx = Math.floor(Math.random() * copy.length);
    out.push(copy.splice(idx, 1)[0]);
  }
  return out;
}

async function main() {
  console.log('🌱 Seeding smoke test data...\n');

  // 1. Create all nords
  const nords = [];
  for (const def of nordDefs) {
    const nord = await post(`/projects/${PROJECT_ID}/nords`, {
      type_id: def.type,
      title: def.title,
      properties: def.props,
      position_x: Math.random() * 1600 - 800,
      position_y: Math.random() * 1600 - 800,
    });
    nords.push(nord);
    console.log(`  ✅ Nord: ${nord.title}`);
  }

  // 2. Create connections between nords
  const people   = nords.filter(n => n.type_id === NT.Person);
  const tasks    = nords.filter(n => n.type_id === NT.Task);
  const bugs     = nords.filter(n => n.type_id === NT.Bug);
  const artifacts  = nords.filter(n => n.type_id === NT.Artifact);
  const milestones = nords.filter(n => n.type_id === NT.Milestone);

  const connections = [];

  // Assigned: people → tasks  (who owns what)
  for (const person of people) {
    const owned = pickN(tasks, Math.ceil(Math.random() * 3));
    for (const task of owned) {
      const dx = pick(CT.Assigned.labels);
      connections.push({ src: person.id, tgt: task.id, ct: CT.Assigned, dx });
    }
  }

  // Blocks: bugs → tasks  (bugs blocking work)
  for (const bug of bugs) {
    if (Math.random() > 0.3) {
      const task = pick(tasks);
      const dx = pick(CT.Blocks.labels);
      connections.push({ src: bug.id, tgt: task.id, ct: CT.Blocks, dx });
    }
  }

  // Depends: tasks → milestones  (what needs to land before milestone)
  for (const task of tasks) {
    if (Math.random() > 0.4) {
      const mile = pick(milestones);
      const dx = pick(CT.Depends.labels);
      connections.push({ src: task.id, tgt: mile.id, ct: CT.Depends, dx });
    }
  }

  // Relates: artifacts ↔ tasks / milestones
  for (const art of artifacts) {
    const target = Math.random() > 0.5 ? pick(tasks) : pick(milestones);
    const dx = pick(CT.Relates.labels);
    connections.push({ src: art.id, tgt: target.id, ct: CT.Relates, dx });
  }

  // Priority: bugs + tasks get priority ratings
  for (const node of [...bugs, ...tasks]) {
    if (Math.random() > 0.3) {
      const target = pick([...tasks, ...milestones].filter(n => n.id !== node.id));
      if (target) {
        const dx = pick(CT.Priority.labels);
        connections.push({ src: node.id, tgt: target.id, ct: CT.Priority, dx });
      }
    }
  }

  console.log(`\n🔗 Creating ${connections.length} connections...\n`);
  for (const c of connections) {
    const conn = await post(`/projects/${PROJECT_ID}/connections`, {
      type_id: c.ct.id,
      source_nord_id: c.src,
      target_nord_id: c.tgt,
      direction: 'forward',
      distance_x: c.dx,
      distance_y: 0.5,
      properties: {},
    });
    console.log(`  🔗 ${conn.id.slice(0,8)} dx=${c.dx}`);
  }

  console.log('\n✨ Seeding complete!');
  console.log(`   ${nords.length} nords, ${connections.length} connections`);
}

main().catch(err => { console.error('❌ Seed failed:', err.message); process.exit(1); });
