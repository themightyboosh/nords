/**
 * smoke_board_columns.mjs
 *
 * Smoke test for:
 *   1. Many-column board layout (8-stage spectrum → 8 columns per lane)
 *   2. Instance-level property editability (create → update → verify round-trip)
 *
 * Run: node scripts/smoke_board_columns.mjs
 */

const BASE = 'http://localhost:3000/api';
let passed = 0, failed = 0;
const cleanup = { nordIds: [], connIds: [], nordTypeIds: [], connTypeIds: [] };

async function api(method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  if (!res.ok && !(method === 'DELETE' && res.status === 404))
    throw new Error(`${method} ${path} → ${res.status}: ${await res.text()}`);
  if (method === 'DELETE') return null;
  return res.json();
}

function assert(label, actual, expected) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) { console.log(`  ✅ ${label}`); passed++; }
  else { console.log(`  ❌ ${label} — expected ${e}, got ${a}`); failed++; }
}
function ok(label, val) {
  if (val) { console.log(`  ✅ ${label}`); passed++; }
  else { console.log(`  ❌ ${label} — falsy`); failed++; }
}

async function main() {
  console.log('═'.repeat(60));
  console.log('🧪 Board Columns & Instance Property Editability');
  console.log('═'.repeat(60));

  const projects = await api('GET', '/projects');
  if (!projects.length) throw new Error('No projects found.');
  const pid = projects[0].id;
  console.log(`\n📦 Project: ${projects[0].name} (${pid})\n`);

  // ── PHASE 1: Create nord types with rich property schemas ──
  console.log('── PHASE 1: Create Nord Types with Editable Properties ──');

  const taskType = await api('POST', `/projects/${pid}/nord-types`, {
    name: `SmokeTask_${Date.now()}`, icon: 'CheckSquare', accent_color: '#6366f1',
    properties_schema: [
      { name: 'Priority', type: 'select', options: ['P0','P1','P2','P3'], card_row: 1 },
      { name: 'Assignee', type: 'short_text', card_row: 1 },
      { name: 'Estimate', type: 'number', card_row: 2 },
      { name: 'Due Date', type: 'date' },
      { name: 'Tags', type: 'multi_select', options: ['frontend','backend','infra','design'] },
      { name: 'Notes', type: 'long_text' },
    ],
  });
  cleanup.nordTypeIds.push(taskType.id);
  assert('Task type has 6 properties', taskType.properties_schema.length, 6);

  const bugType = await api('POST', `/projects/${pid}/nord-types`, {
    name: `SmokeBug_${Date.now()}`, icon: 'Bug', accent_color: '#ef4444',
    properties_schema: [
      { name: 'Severity', type: 'select', options: ['Critical','Major','Minor','Trivial'], card_row: 1 },
      { name: 'Browser', type: 'short_text', card_row: 1 },
      { name: 'Steps', type: 'long_text' },
    ],
  });
  cleanup.nordTypeIds.push(bugType.id);

  // ── PHASE 2: Create connection type with 8-stage spectrum (many columns) ──
  console.log('\n── PHASE 2: Create 8-Column Category ──');

  const pipelineType = await api('POST', `/projects/${pid}/connection-types`, {
    name: `SmokePipeline_${Date.now()}`, accent_color: '#8b5cf6', stroke_style: 'solid',
    verb: 'flows through', default_direction: 'forward',
    x_stage_labels: [
      { label: 'Backlog',     position: 0.0 },
      { label: 'Grooming',    position: 0.14 },
      { label: 'Ready',       position: 0.28 },
      { label: 'In Progress', position: 0.42 },
      { label: 'Review',      position: 0.57 },
      { label: 'QA',          position: 0.71 },
      { label: 'Staging',     position: 0.85 },
      { label: 'Shipped',     position: 1.0 },
    ],
    properties_schema: [
      { name: 'Sprint', type: 'short_text' },
    ],
  });
  cleanup.connTypeIds.push(pipelineType.id);
  ok('Pipeline category created with 8 stages', pipelineType.id);

  // Also a 5-column category
  const riskType = await api('POST', `/projects/${pid}/connection-types`, {
    name: `SmokeRisk_${Date.now()}`, accent_color: '#f59e0b', stroke_style: 'dashed',
    verb: 'risks', default_direction: 'forward',
    x_stage_labels: [
      { label: 'Identified', position: 0.0 },
      { label: 'Assessed',   position: 0.25 },
      { label: 'Mitigating',  position: 0.5 },
      { label: 'Monitoring',  position: 0.75 },
      { label: 'Resolved',   position: 1.0 },
    ],
    properties_schema: [],
  });
  cleanup.connTypeIds.push(riskType.id);

  // ── PHASE 3: Create nords with instance-level properties ──
  console.log('\n── PHASE 3: Create Nord Instances ──');

  const nords = [];
  const taskData = [
    { title: 'Auth Refactor',    props: { Priority: 'P0', Assignee: 'Alice', Estimate: 8, 'Due Date': '2026-06-01', Tags: ['backend','infra'], Notes: 'Critical path item' } },
    { title: 'Dashboard Charts',  props: { Priority: 'P1', Assignee: 'Bob',   Estimate: 5, 'Due Date': '2026-06-15', Tags: ['frontend'],        Notes: 'Use D3.js' } },
    { title: 'API Rate Limiting', props: { Priority: 'P1', Assignee: 'Carol', Estimate: 3, 'Due Date': '2026-06-10', Tags: ['backend'],         Notes: 'Token bucket algorithm' } },
    { title: 'CI Pipeline Fix',   props: { Priority: 'P2', Assignee: 'Dave',  Estimate: 2, 'Due Date': '2026-06-08', Tags: ['infra'],            Notes: 'Flaky integration tests' } },
    { title: 'Onboarding Flow',   props: { Priority: 'P1', Assignee: 'Eve',   Estimate: 13, 'Due Date': '2026-07-01', Tags: ['frontend','design'], Notes: 'Multi-step wizard' } },
    { title: 'Search Indexer',    props: { Priority: 'P2', Assignee: 'Frank', Estimate: 8, 'Due Date': '2026-06-20', Tags: ['backend'],         Notes: 'Elasticsearch migration' } },
  ];

  for (const td of taskData) {
    const n = await api('POST', `/projects/${pid}/nords`, {
      type_id: taskType.id, title: td.title, properties: td.props,
      position_x: Math.random(), position_y: Math.random(),
    });
    cleanup.nordIds.push(n.id);
    nords.push(n);
  }

  // Bugs
  const bug1 = await api('POST', `/projects/${pid}/nords`, {
    type_id: bugType.id, title: 'Login 500 on Safari',
    properties: { Severity: 'Critical', Browser: 'Safari 17', Steps: '1. Open login\n2. Enter creds\n3. Click submit → 500' },
    position_x: 0.3, position_y: 0.6,
  });
  cleanup.nordIds.push(bug1.id);
  nords.push(bug1);

  console.log(`  Created ${nords.length} nords`);

  // ── PHASE 4: Connect nords across columns (spread across 8 stages) ──
  console.log('\n── PHASE 4: Create Connections Across 8 Columns ──');

  const stagePositions = [0.0, 0.14, 0.28, 0.42, 0.57, 0.71, 0.85, 1.0];
  for (let i = 0; i < nords.length - 1; i++) {
    const conn = await api('POST', `/projects/${pid}/connections`, {
      type_id: pipelineType.id,
      source_nord_id: nords[i].id, target_nord_id: nords[i + 1].id,
      direction: 'forward',
      distance_x: stagePositions[i % stagePositions.length],
      properties: { Sprint: `Sprint ${Math.ceil((i + 1) / 2)}` },
    });
    cleanup.connIds.push(conn.id);
  }
  // Risk connections (5-col)
  const riskConn = await api('POST', `/projects/${pid}/connections`, {
    type_id: riskType.id,
    source_nord_id: nords[0].id, target_nord_id: bug1.id,
    direction: 'forward', distance_x: 0.0,
  });
  cleanup.connIds.push(riskConn.id);

  console.log(`  Created ${cleanup.connIds.length} connections across 8+5 columns`);

  // ── PHASE 5: Instance-level property edits ──
  console.log('\n── PHASE 5: Instance-Level Property Editability ──');

  // Edit each property type on the first task
  const original = nords[0];
  assert('Original Priority', original.properties?.Priority, 'P0');
  assert('Original Assignee', original.properties?.Assignee, 'Alice');
  assert('Original Estimate', original.properties?.Estimate, 8);

  // Update string property
  const u1 = await api('PUT', `/nords/${original.id}`, {
    properties: { ...original.properties, Assignee: 'Zara (reassigned)' },
  });
  assert('Updated Assignee', u1.properties?.Assignee, 'Zara (reassigned)');

  // Update select property
  const u2 = await api('PUT', `/nords/${original.id}`, {
    properties: { ...u1.properties, Priority: 'P3' },
  });
  assert('Updated Priority P0→P3', u2.properties?.Priority, 'P3');

  // Update number property
  const u3 = await api('PUT', `/nords/${original.id}`, {
    properties: { ...u2.properties, Estimate: 21 },
  });
  assert('Updated Estimate 8→21', u3.properties?.Estimate, 21);

  // Update date property
  const u4 = await api('PUT', `/nords/${original.id}`, {
    properties: { ...u3.properties, 'Due Date': '2026-12-31' },
  });
  assert('Updated Due Date', u4.properties?.['Due Date'], '2026-12-31');

  // Update multi-select (tags)
  const u5 = await api('PUT', `/nords/${original.id}`, {
    properties: { ...u4.properties, Tags: ['frontend', 'backend', 'design'] },
  });
  assert('Updated Tags count', u5.properties?.Tags?.length, 3);
  ok('Tags contains design', u5.properties?.Tags?.includes('design'));

  // Update long text
  const u6 = await api('PUT', `/nords/${original.id}`, {
    properties: { ...u5.properties, Notes: '# Revised Plan\n\nNow includes **OAuth2** flow.' },
  });
  ok('Updated Notes with markdown', u6.properties?.Notes?.includes('**OAuth2**'));

  // Update title (non-property field)
  const u7 = await api('PUT', `/nords/${original.id}`, { title: 'Auth Refactor (REVISED)' });
  assert('Updated title', u7.title, 'Auth Refactor (REVISED)');

  // ── PHASE 6: Verify round-trip persistence via /graph ──
  console.log('\n── PHASE 6: Graph Round-Trip Verification ──');

  const graph = await api('GET', `/projects/${pid}/graph`);

  const gNord = graph.nords.find(n => n.id === original.id);
  ok('Nord found in graph', gNord);
  assert('Graph: title persisted',    gNord?.title, 'Auth Refactor (REVISED)');
  assert('Graph: Priority persisted', gNord?.properties?.Priority, 'P3');
  assert('Graph: Assignee persisted', gNord?.properties?.Assignee, 'Zara (reassigned)');
  assert('Graph: Estimate persisted', gNord?.properties?.Estimate, 21);
  assert('Graph: Due Date persisted', gNord?.properties?.['Due Date'], '2026-12-31');
  assert('Graph: Tags persisted',     gNord?.properties?.Tags?.length, 3);
  ok('Graph: Notes markdown',         gNord?.properties?.Notes?.includes('**OAuth2**'));

  // Verify OTHER nords were NOT affected by edits
  const gNord2 = graph.nords.find(n => n.id === nords[1].id);
  assert('Nord 2 untouched Priority', gNord2?.properties?.Priority, 'P1');
  assert('Nord 2 untouched Assignee', gNord2?.properties?.Assignee, 'Bob');

  // Verify column spread
  const pipelineConns = graph.connections.filter(c => c.type_id === pipelineType.id);
  const uniqueDistances = new Set(pipelineConns.map(c => c.distance_x));
  ok(`Connections spread across ${uniqueDistances.size} distinct columns`, uniqueDistances.size >= 5);

  // ── PHASE 7: Edit bug properties (different type, same API) ──
  console.log('\n── PHASE 7: Cross-Type Property Edits ──');

  const bugUpdate = await api('PUT', `/nords/${bug1.id}`, {
    properties: { Severity: 'Trivial', Browser: 'Chrome 125', Steps: 'Fixed — was a CORS issue.' },
  });
  assert('Bug Severity updated', bugUpdate.properties?.Severity, 'Trivial');
  assert('Bug Browser updated',  bugUpdate.properties?.Browser, 'Chrome 125');

  // ── CLEANUP ──
  console.log('\n── CLEANUP ──');

  for (const id of cleanup.connIds) await api('DELETE', `/connections/${id}`);
  console.log(`  🗑️  ${cleanup.connIds.length} connections`);
  for (const id of cleanup.nordIds) await api('DELETE', `/nords/${id}`);
  console.log(`  🗑️  ${cleanup.nordIds.length} nords`);
  for (const id of cleanup.connTypeIds) await api('DELETE', `/connection-types/${id}`);
  console.log(`  🗑️  ${cleanup.connTypeIds.length} connection types`);
  for (const id of cleanup.nordTypeIds) await api('DELETE', `/nord-types/${id}`);
  console.log(`  🗑️  ${cleanup.nordTypeIds.length} nord types`);

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`✨ Board Columns & Property Editability: ${passed} passed, ${failed} failed`);
  console.log('═'.repeat(60));
  if (failed > 0) process.exit(1);
}

main().catch(err => { console.error('❌ Test failed:', err.message); process.exit(1); });
