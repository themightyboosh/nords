/**
 * test_type_persistence.mjs
 *
 * End-to-end test for the full type → instance pipeline:
 *
 *   PHASE 1: Create Nord Types and Connection Types (Categories)
 *   PHASE 2: Verify they persist and are linked to the project
 *   PHASE 3: Create Nord instances with unique property values
 *   PHASE 4: Create Connection instances with unique property values
 *   PHASE 5: Verify full round-trip via the /graph endpoint
 *   PHASE 6: Clean up test data
 *
 * Run: node scripts/test_type_persistence.mjs
 */

const BASE = 'http://localhost:3000/api';
let passed = 0;
let failed = 0;
const cleanup = { nordIds: [], connIds: [], nordTypeIds: [], connTypeIds: [] };

// ── HTTP helpers ──

async function get(path) {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}: ${await res.text()}`);
  return res.json();
}

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${path} → ${res.status}: ${await res.text()}`);
  return res.json();
}

async function put(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PUT ${path} → ${res.status}: ${await res.text()}`);
  return res.json();
}

async function del(path) {
  const res = await fetch(`${BASE}${path}`, { method: 'DELETE' });
  if (!res.ok && res.status !== 404) throw new Error(`DELETE ${path} → ${res.status}: ${await res.text()}`);
}

// ── Assertions ──

function assert(label, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.log(`  ❌ ${label}  — expected ${e}, got ${a}`);
    failed++;
  }
}

function assertTruthy(label, value) {
  if (value) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.log(`  ❌ ${label}  — value was falsy`);
    failed++;
  }
}

// ── Main ──

async function main() {
  console.log('═'.repeat(60));
  console.log('🧪 Type Persistence & Instance Pipeline Test');
  console.log('═'.repeat(60));

  // ── Discover project ──
  const projects = await get('/projects');
  if (!projects.length) throw new Error('No projects found.');
  const projectId = projects[0].id;
  console.log(`\n📦 Project: ${projects[0].name} (${projectId})\n`);

  // ══════════════════════════════════════════════════════════════
  // PHASE 1: Create Nord Types with property schemas
  // ══════════════════════════════════════════════════════════════
  console.log('── PHASE 1: Create Nord Types ──');

  const epicType = await post(`/projects/${projectId}/nord-types`, {
    name: `TestEpic_${Date.now()}`,
    icon: 'Flag',
    accent_color: '#e74c3c',
    properties_schema: [
      { name: 'Status', type: 'select', options: ['Draft', 'Active', 'Done'], card_row: 1 },
      { name: 'Owner', type: 'string', card_row: 1 },
      { name: 'Start Date', type: 'date' },
    ],
  });
  cleanup.nordTypeIds.push(epicType.id);
  assertTruthy('Epic type created with ID', epicType.id);
  assert('Epic has 3 properties', epicType.properties_schema.length, 3);

  const personType = await post(`/projects/${projectId}/nord-types`, {
    name: `TestPerson_${Date.now()}`,
    icon: 'User',
    accent_color: '#3498db',
    properties_schema: [
      { name: 'Role', type: 'string', card_row: 1 },
      { name: 'Email', type: 'url' },
      { name: 'Skills', type: 'tags' },
    ],
  });
  cleanup.nordTypeIds.push(personType.id);
  assertTruthy('Person type created with ID', personType.id);

  console.log('');

  // ══════════════════════════════════════════════════════════════
  // PHASE 2: Verify persistence — re-fetch types and check
  // ══════════════════════════════════════════════════════════════
  console.log('── PHASE 2: Verify Type Persistence ──');

  const typesAfterCreate = await get(`/projects/${projectId}/types`);
  const foundEpic = typesAfterCreate.nord_types.find(t => t.id === epicType.id);
  const foundPerson = typesAfterCreate.nord_types.find(t => t.id === personType.id);

  assertTruthy('Epic type persisted in project', foundEpic);
  assertTruthy('Person type persisted in project', foundPerson);
  assert('Persisted Epic has correct name', foundEpic?.name, epicType.name);
  assert('Persisted Epic has correct icon', foundEpic?.icon, 'Flag');
  assert('Persisted Epic has correct color', foundEpic?.accent_color, '#e74c3c');
  assert('Persisted Epic schema preserved', foundEpic?.properties_schema?.length, 3);
  assert('Persisted Epic Status is select', foundEpic?.properties_schema?.[0]?.type, 'select');
  assert('Persisted Epic Status has 3 options', foundEpic?.properties_schema?.[0]?.options?.length, 3);

  console.log('');

  // ══════════════════════════════════════════════════════════════
  // PHASE 3: Create Connection Types (Categories) with schemas
  // ══════════════════════════════════════════════════════════════
  console.log('── PHASE 3: Create Connection Types (Categories) ──');

  const blocksType = await post(`/projects/${projectId}/connection-types`, {
    name: `TestBlocks_${Date.now()}`,
    accent_color: '#e67e22',
    stroke_style: 'dashed',
    properties_schema: [
      { name: 'Severity', type: 'select', options: ['Critical', 'Major', 'Minor'] },
      { name: 'Notes', type: 'markdown' },
    ],
  });
  cleanup.connTypeIds.push(blocksType.id);
  assertTruthy('Blocks category created', blocksType.id);
  assert('Blocks has 2 properties', blocksType.properties_schema.length, 2);
  assert('Blocks stroke is dashed', blocksType.stroke_style, 'dashed');

  const ownsType = await post(`/projects/${projectId}/connection-types`, {
    name: `TestOwns_${Date.now()}`,
    accent_color: '#2ecc71',
    stroke_style: 'solid',
    properties_schema: [
      { name: 'Since', type: 'date' },
      { name: 'Capacity', type: 'number' },
    ],
  });
  cleanup.connTypeIds.push(ownsType.id);
  assertTruthy('Owns category created', ownsType.id);

  // Verify connection types persisted
  const typesAfterConn = await get(`/projects/${projectId}/types`);
  const foundBlocks = typesAfterConn.connection_types.find(t => t.id === blocksType.id);
  const foundOwns = typesAfterConn.connection_types.find(t => t.id === ownsType.id);

  assertTruthy('Blocks category persisted', foundBlocks);
  assertTruthy('Owns category persisted', foundOwns);
  assert('Persisted Blocks has correct color', foundBlocks?.accent_color, '#e67e22');
  assert('Persisted Blocks schema preserved', foundBlocks?.properties_schema?.length, 2);

  console.log('');

  // ══════════════════════════════════════════════════════════════
  // PHASE 4: Create Nord instances with UNIQUE property values
  // ══════════════════════════════════════════════════════════════
  console.log('── PHASE 4: Create Nord Instances with Unique Values ──');

  const epic1 = await post(`/projects/${projectId}/nords`, {
    type_id: epicType.id,
    title: 'Auth System Overhaul',
    description: 'Rebuild authentication with OAuth2 + MFA',
    properties: {
      Status: 'Active',
      Owner: 'Alice Chen',
      'Start Date': '2026-06-01',
    },
    position_x: 0.3,
    position_y: 0.4,
  });
  cleanup.nordIds.push(epic1.id);
  assertTruthy('Epic instance 1 created', epic1.id);
  assert('Epic 1 title', epic1.title, 'Auth System Overhaul');
  assert('Epic 1 Status value', epic1.properties?.Status, 'Active');
  assert('Epic 1 Owner value', epic1.properties?.Owner, 'Alice Chen');

  const epic2 = await post(`/projects/${projectId}/nords`, {
    type_id: epicType.id,
    title: 'API Gateway Migration',
    properties: {
      Status: 'Draft',
      Owner: 'Bob Martinez',
      'Start Date': '2026-07-15',
    },
    position_x: 0.6,
    position_y: 0.3,
  });
  cleanup.nordIds.push(epic2.id);
  assert('Epic 2 has DIFFERENT Status', epic2.properties?.Status, 'Draft');
  assert('Epic 2 has DIFFERENT Owner', epic2.properties?.Owner, 'Bob Martinez');

  const person1 = await post(`/projects/${projectId}/nords`, {
    type_id: personType.id,
    title: 'Alice Chen',
    properties: {
      Role: 'Tech Lead',
      Email: 'https://alice.example.com',
      Skills: ['TypeScript', 'GraphQL', 'PostgreSQL'],
    },
    position_x: 0.5,
    position_y: 0.7,
  });
  cleanup.nordIds.push(person1.id);
  assert('Person Role value', person1.properties?.Role, 'Tech Lead');
  assert('Person Skills is array', Array.isArray(person1.properties?.Skills), true);
  assert('Person Skills count', person1.properties?.Skills?.length, 3);

  console.log('');

  // ══════════════════════════════════════════════════════════════
  // PHASE 5: Create Connection instances with unique properties
  // ══════════════════════════════════════════════════════════════
  console.log('── PHASE 5: Create Connection Instances with Unique Values ──');

  const conn1 = await post(`/projects/${projectId}/connections`, {
    type_id: blocksType.id,
    source_nord_id: epic1.id,
    target_nord_id: epic2.id,
    direction: 'forward',
    distance_x: 0.8,
    properties: {
      Severity: 'Critical',
      Notes: '**Auth must ship first** — API gateway depends on new token format.',
    },
  });
  cleanup.connIds.push(conn1.id);
  assertTruthy('Block connection created', conn1.id);
  assert('Connection Severity', conn1.properties?.Severity, 'Critical');
  assertTruthy('Connection Notes is markdown', conn1.properties?.Notes?.includes('**Auth must ship first**'));

  const conn2 = await post(`/projects/${projectId}/connections`, {
    type_id: ownsType.id,
    source_nord_id: person1.id,
    target_nord_id: epic1.id,
    direction: 'forward',
    distance_x: 0.6,
    properties: {
      Since: '2026-05-01',
      Capacity: 80,
    },
  });
  cleanup.connIds.push(conn2.id);
  assert('Owns connection Since date', conn2.properties?.Since, '2026-05-01');
  assert('Owns connection Capacity', conn2.properties?.Capacity, 80);

  console.log('');

  // ══════════════════════════════════════════════════════════════
  // PHASE 6: Full round-trip via /graph endpoint
  // ══════════════════════════════════════════════════════════════
  console.log('── PHASE 6: Verify Full Round-Trip via /graph ──');

  const graph = await get(`/projects/${projectId}/graph`);

  // Nord types in graph
  const graphEpicType = graph.nord_types.find(t => t.id === epicType.id);
  assertTruthy('Graph contains Epic type', graphEpicType);
  assert('Graph Epic type has schema', graphEpicType?.properties_schema?.length, 3);

  // Connection types in graph
  const graphBlocksType = graph.connection_types.find(t => t.id === blocksType.id);
  assertTruthy('Graph contains Blocks category', graphBlocksType);
  assert('Graph Blocks has schema', graphBlocksType?.properties_schema?.length, 2);

  // Nord instances in graph with their values
  const graphEpic1 = graph.nords.find(n => n.id === epic1.id);
  assertTruthy('Graph contains Epic 1', graphEpic1);
  assert('Graph Epic 1 title preserved', graphEpic1?.title, 'Auth System Overhaul');
  assert('Graph Epic 1 Status preserved', graphEpic1?.properties?.Status, 'Active');
  assert('Graph Epic 1 Owner preserved', graphEpic1?.properties?.Owner, 'Alice Chen');
  assert('Graph Epic 1 Start Date preserved', graphEpic1?.properties?.['Start Date'], '2026-06-01');

  const graphEpic2 = graph.nords.find(n => n.id === epic2.id);
  assert('Graph Epic 2 has DIFFERENT Status', graphEpic2?.properties?.Status, 'Draft');
  assert('Graph Epic 2 has DIFFERENT Owner', graphEpic2?.properties?.Owner, 'Bob Martinez');

  const graphPerson = graph.nords.find(n => n.id === person1.id);
  assert('Graph Person Skills preserved', graphPerson?.properties?.Skills?.length, 3);

  // Connection instances in graph with their values
  const graphConn1 = graph.connections.find(c => c.id === conn1.id);
  assertTruthy('Graph contains Block connection', graphConn1);
  assert('Graph Block Severity preserved', graphConn1?.properties?.Severity, 'Critical');
  assert('Graph Block direction preserved', graphConn1?.direction, 'forward');

  const graphConn2 = graph.connections.find(c => c.id === conn2.id);
  assert('Graph Owns Capacity preserved', graphConn2?.properties?.Capacity, 80);

  console.log('');

  // ══════════════════════════════════════════════════════════════
  // PHASE 7: Update instance values (ensure mutability)
  // ══════════════════════════════════════════════════════════════
  console.log('── PHASE 7: Update Instance Values ──');

  const updatedEpic1 = await put(`/nords/${epic1.id}`, {
    title: 'Auth System Overhaul (v2)',
    properties: { Status: 'Done', Owner: 'Alice Chen' },
  });
  assert('Updated title', updatedEpic1.title, 'Auth System Overhaul (v2)');
  assert('Updated Status to Done', updatedEpic1.properties?.Status, 'Done');

  // Re-fetch to confirm persistence
  const graphAfterUpdate = await get(`/projects/${projectId}/graph`);
  const refetchedEpic1 = graphAfterUpdate.nords.find(n => n.id === epic1.id);
  assert('Re-fetched title persisted', refetchedEpic1?.title, 'Auth System Overhaul (v2)');
  assert('Re-fetched Status persisted', refetchedEpic1?.properties?.Status, 'Done');

  console.log('');

  // ══════════════════════════════════════════════════════════════
  // CLEANUP
  // ══════════════════════════════════════════════════════════════
  console.log('── CLEANUP ──');

  for (const id of cleanup.connIds) {
    await del(`/connections/${id}`);
  }
  console.log(`  🗑️  Deleted ${cleanup.connIds.length} connections`);

  for (const id of cleanup.nordIds) {
    await del(`/nords/${id}`);
  }
  console.log(`  🗑️  Deleted ${cleanup.nordIds.length} nords`);

  for (const id of cleanup.connTypeIds) {
    await del(`/connection-types/${id}`);
  }
  console.log(`  🗑️  Deleted ${cleanup.connTypeIds.length} connection types`);

  for (const id of cleanup.nordTypeIds) {
    await del(`/nord-types/${id}`);
  }
  console.log(`  🗑️  Deleted ${cleanup.nordTypeIds.length} nord types`);

  // ── Summary ──
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`✨ Type Persistence & Instance Test Complete`);
  console.log(`   ${passed} passed, ${failed} failed`);
  console.log(`${'═'.repeat(60)}`);

  if (failed > 0) process.exit(1);
}

main().catch(err => {
  console.error('❌ Test failed:', err.message);
  process.exit(1);
});
