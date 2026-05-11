/**
 * smoke_category_properties.mjs
 * 
 * Smoke test: Adds properties_schema to ALL connection types (categories),
 * then creates connections with property values to verify the full pipeline.
 * 
 * Run: node server/scripts/smoke_category_properties.mjs
 */

const BASE = 'http://localhost:3000/api';
const PROJECT_ID = '5413fc94-3245-4153-9641-b9d025367e1d';

async function get(path) {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}: ${await res.text()}`);
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

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${path} → ${res.status}: ${await res.text()}`);
  return res.json();
}

// ── Category-specific schemas ────────────────────────────────────────────────
const CATEGORY_SCHEMAS = {
  Relates: [
    { name: 'Relationship', type: 'select', options: ['References', 'Supports', 'Contradicts', 'Extends'] },
    { name: 'Confidence', type: 'select', options: ['High', 'Medium', 'Low'] },
  ],
  Priority: [
    { name: 'Impact', type: 'select', options: ['Critical', 'High', 'Medium', 'Low', 'None'] },
    { name: 'Urgency', type: 'select', options: ['Immediate', 'Next Sprint', 'Backlog'] },
    { name: 'Effort', type: 'string' },
  ],
  Assigned: [
    { name: 'Capacity', type: 'number' },
    { name: 'Role', type: 'select', options: ['Owner', 'Reviewer', 'Contributor', 'Observer'] },
  ],
  Depends: [
    { name: 'Dependency Type', type: 'select', options: ['Hard', 'Soft', 'Optional'] },
    { name: 'Status', type: 'select', options: ['Pending', 'In Progress', 'Resolved', 'Blocked'] },
  ],
  Blocks: [
    { name: 'Severity', type: 'select', options: ['Critical', 'Major', 'Minor'] },
    { name: 'Workaround', type: 'string' },
  ],
};

// ── Sample property values for smoke connections ─────────────────────────────
const SAMPLE_VALUES = {
  Relates: { Relationship: 'References', Confidence: 'High' },
  Priority: { Impact: 'High', Urgency: 'Next Sprint', Effort: '3 days' },
  Assigned: { Capacity: '0.75', Role: 'Owner' },
  Depends: { 'Dependency Type': 'Hard', Status: 'In Progress' },
  Blocks: { Severity: 'Critical', Workaround: 'Use CLI tool as fallback' },
};

async function main() {
  console.log('🧪 Category Properties Smoke Test\n');
  console.log('════════════════════════════════════════\n');

  // ── Step 1: Get the graph to find existing types and nords ──
  const graph = await get(`/projects/${PROJECT_ID}/graph`);
  const connectionTypes = graph.connection_types;
  const nords = graph.nords;

  console.log(`📊 Found ${connectionTypes.length} connection types, ${nords.length} nords\n`);

  // ── Step 2: Update each connection type with properties_schema ──
  console.log('📝 Step 1: Adding properties_schema to all categories\n');
  
  let updatedCount = 0;
  for (const ct of connectionTypes) {
    const schema = CATEGORY_SCHEMAS[ct.name];
    if (!schema) {
      console.log(`  ⏭️  ${ct.name} — no schema defined in test, skipping`);
      continue;
    }

    try {
      const updated = await put(`/connection-types/${ct.id}`, {
        properties_schema: schema,
      });
      const schemaNames = schema.map(s => s.name).join(', ');
      console.log(`  ✅ ${ct.name} — added ${schema.length} properties: [${schemaNames}]`);
      updatedCount++;
    } catch (err) {
      console.error(`  ❌ ${ct.name} — ${err.message}`);
    }
  }

  console.log(`\n   Updated ${updatedCount}/${connectionTypes.length} connection types\n`);

  // ── Step 3: Verify the schema persisted ──
  console.log('🔍 Step 2: Verifying persisted schemas\n');
  
  const graphAfter = await get(`/projects/${PROJECT_ID}/graph`);
  let allPassed = true;
  
  for (const ct of graphAfter.connection_types) {
    const expectedSchema = CATEGORY_SCHEMAS[ct.name];
    if (!expectedSchema) continue;

    const actual = ct.properties_schema || [];
    if (actual.length === expectedSchema.length) {
      console.log(`  ✅ ${ct.name} — ${actual.length} properties persisted correctly`);
    } else {
      console.log(`  ❌ ${ct.name} — expected ${expectedSchema.length} properties, got ${actual.length}`);
      allPassed = false;
    }
  }

  // ── Step 4: Create one test connection per category WITH property values ──
  console.log('\n🔗 Step 3: Creating test connections with property values\n');

  // Get a couple of nords to use as endpoints
  const sourceNord = nords[0];
  const targetNord = nords[nords.length - 1];
  console.log(`   Using: "${sourceNord.title}" → "${targetNord.title}"\n`);

  let connCreated = 0;
  for (const ct of graphAfter.connection_types) {
    const values = SAMPLE_VALUES[ct.name];
    if (!values) continue;

    // Avoid duplicate connections — use different pairs
    const src = nords[connCreated % nords.length];
    const tgt = nords[(connCreated + 5) % nords.length];
    
    try {
      const conn = await post(`/projects/${PROJECT_ID}/connections`, {
        type_id: ct.id,
        source_nord_id: src.id,
        target_nord_id: tgt.id,
        direction: 'forward',
        distance_x: 0.5,
        distance_y: 0.5,
        properties: values,
      });

      const propStr = Object.entries(values).map(([k,v]) => `${k}=${v}`).join(', ');
      console.log(`  ✅ ${ct.name}: ${src.title} → ${tgt.title}`);
      console.log(`     Properties: ${propStr}`);
      connCreated++;
    } catch (err) {
      console.error(`  ❌ ${ct.name}: ${err.message}`);
    }
  }

  // ── Step 5: Verify connections have properties ──
  console.log('\n🔍 Step 4: Verifying connection properties persisted\n');
  
  const finalGraph = await get(`/projects/${PROJECT_ID}/graph`);
  const newConnections = finalGraph.connections.filter(c => {
    const props = c.properties || {};
    return Object.keys(props).length > 0 && !Object.keys(props).every(k => k.startsWith('_'));
  });

  console.log(`   Found ${newConnections.length} connections with custom properties:\n`);
  for (const c of newConnections) {
    const ct = finalGraph.connection_types.find(t => t.id === c.type_id);
    const src = finalGraph.nords.find(n => n.id === c.source_nord_id);
    const tgt = finalGraph.nords.find(n => n.id === c.target_nord_id);
    const propStr = Object.entries(c.properties || {})
      .filter(([k]) => !k.startsWith('_'))
      .map(([k,v]) => `${k}=${v}`)
      .join(', ');
    console.log(`   • [${ct?.name}] ${src?.title} → ${tgt?.title}: ${propStr}`);
  }

  // ── Summary ──
  console.log('\n════════════════════════════════════════');
  console.log('📋 Summary:');
  console.log(`   • ${updatedCount} category types updated with property schemas`);
  console.log(`   • ${connCreated} test connections created with property values`);
  console.log(`   • Schema persistence: ${allPassed ? '✅ ALL PASSED' : '❌ SOME FAILED'}`);
  console.log('════════════════════════════════════════\n');
}

main().catch(err => {
  console.error('❌ Smoke test failed:', err.message);
  process.exit(1);
});
