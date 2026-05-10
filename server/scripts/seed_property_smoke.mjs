/**
 * seed_property_smoke.mjs
 * Smoke test for the full property pipeline:
 *   type-level schema → instance-level values → drawer rendering
 *
 * Creates types with properties_schema covering all 7 property types,
 * then seeds nords with populated property values.
 *
 * Run: node server/scripts/seed_property_smoke.mjs
 */

const BASE = 'http://localhost:3000/api';

// ── HTTP helpers ─────────────────────────────────────────────────────────────

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

// ── Assertions ───────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

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

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🧪 Property Smoke Test\n');

  // 1. Auto-discover project
  console.log('── Discovering project ──');
  const projects = await get('/projects');
  if (!projects.length) throw new Error('No projects found. Seed a project first.');
  const projectId = projects[0].id;
  console.log(`  Using project: ${projects[0].name} (${projectId})\n`);

  // 2. Create "Feature" nord type with 5 property types
  console.log('── Creating "Feature" nord type ──');
  const featureType = await post(`/projects/${projectId}/nord-types`, {
    name: 'Feature',
    icon: 'Sparkles',
    accent_color: '#6366f1',
    properties_schema: [
      { name: 'Priority', type: 'select', options: ['Critical', 'High', 'Medium', 'Low'] },
      { name: 'Story Points', type: 'number' },
      { name: 'Due Date', type: 'date' },
      { name: 'Docs URL', type: 'url' },
      { name: 'Tags', type: 'tags' },
    ],
  });
  console.log(`  Created: ${featureType.name} (${featureType.id})`);
  assert('Feature has 5 properties', featureType.properties_schema.length, 5);
  assert('Priority is select', featureType.properties_schema[0].type, 'select');
  assert('Priority has 4 options', featureType.properties_schema[0].options.length, 4);

  // 3. Create "Meeting" nord type with 4 property types
  console.log('\n── Creating "Meeting" nord type ──');
  const meetingType = await post(`/projects/${projectId}/nord-types`, {
    name: 'Meeting',
    icon: 'Calendar',
    accent_color: '#f59e0b',
    properties_schema: [
      { name: 'Notes', type: 'markdown' },
      { name: 'Attendees', type: 'tags' },
      { name: 'Date', type: 'date' },
      { name: 'Location', type: 'string' },
    ],
  });
  console.log(`  Created: ${meetingType.name} (${meetingType.id})`);
  assert('Meeting has 4 properties', meetingType.properties_schema.length, 4);
  assert('Notes is markdown', meetingType.properties_schema[0].type, 'markdown');

  // 4. Create Feature nords with populated properties
  console.log('\n── Creating Feature nords ──');

  const featureNords = [
    {
      title: 'Dark Mode Support',
      properties: {
        Priority: 'High',
        'Story Points': 8,
        'Due Date': '2025-07-15',
        'Docs URL': 'https://docs.example.com/dark-mode',
        Tags: ['ui', 'theme', 'accessibility'],
      },
    },
    {
      title: 'Real-time Collaboration',
      properties: {
        Priority: 'Critical',
        'Story Points': 13,
        'Due Date': '2025-08-01',
        'Docs URL': 'https://docs.example.com/realtime',
        Tags: ['websockets', 'core', 'multiplayer'],
      },
    },
    {
      title: 'Export to PDF',
      properties: {
        Priority: 'Medium',
        'Story Points': 5,
        'Due Date': '2025-09-30',
        'Docs URL': 'https://docs.example.com/pdf-export',
        Tags: ['export', 'reporting'],
      },
    },
  ];

  const createdFeatures = [];
  for (const def of featureNords) {
    const nord = await post(`/projects/${projectId}/nords`, {
      type_id: featureType.id,
      title: def.title,
      properties: def.properties,
      position_x: 0.2 + Math.random() * 0.6,
      position_y: 0.2 + Math.random() * 0.6,
    });
    createdFeatures.push(nord);
    console.log(`  ✅ Feature: ${nord.title}`);
  }

  // 5. Create Meeting nords
  console.log('\n── Creating Meeting nords ──');

  const meetingNords = [
    {
      title: 'Sprint Planning',
      properties: {
        Notes: '## Sprint 14\n\n- Review backlog\n- Estimate stories\n- Assign owners\n\n> Focus on **dark mode** this sprint.',
        Attendees: ['Alice', 'Ben', 'Carla'],
        Date: '2025-06-16',
        Location: 'Room 4B / Zoom',
      },
    },
    {
      title: 'Design Review',
      properties: {
        Notes: '### Agenda\n\n1. Component library update\n2. Color system review\n3. `tokens.css` audit',
        Attendees: ['Ben', 'David', 'Emma'],
        Date: '2025-06-18',
        Location: 'Figma + Slack Huddle',
      },
    },
  ];

  const createdMeetings = [];
  for (const def of meetingNords) {
    const nord = await post(`/projects/${projectId}/nords`, {
      type_id: meetingType.id,
      title: def.title,
      properties: def.properties,
      position_x: 0.2 + Math.random() * 0.6,
      position_y: 0.2 + Math.random() * 0.6,
    });
    createdMeetings.push(nord);
    console.log(`  ✅ Meeting: ${nord.title}`);
  }

  // 6. Create "Dependency" connection type with properties
  console.log('\n── Creating "Dependency" connection type ──');
  const depType = await post(`/projects/${projectId}/connection-types`, {
    name: 'Dependency',
    accent_color: '#ef4444',
    stroke_style: 'dashed',
    properties_schema: [
      { name: 'Confidence', type: 'number' },
      { name: 'Notes', type: 'markdown' },
    ],
  });
  console.log(`  Created: ${depType.name} (${depType.id})`);
  assert('Dependency has 2 properties', depType.properties_schema.length, 2);

  // 7. Create connections between features
  console.log('\n── Creating connections ──');

  const conn1 = await post(`/projects/${projectId}/connections`, {
    type_id: depType.id,
    source_nord_id: createdFeatures[0].id,
    target_nord_id: createdFeatures[1].id,
    direction: 'forward',
    distance_x: 0.5,
    distance_y: 0.5,
    properties: {
      Confidence: 85,
      Notes: 'Dark mode needs the **component library** which realtime depends on.',
    },
  });
  console.log(`  🔗 ${createdFeatures[0].title} → ${createdFeatures[1].title}`);

  const conn2 = await post(`/projects/${projectId}/connections`, {
    type_id: depType.id,
    source_nord_id: createdFeatures[1].id,
    target_nord_id: createdFeatures[2].id,
    direction: 'both',
    distance_x: 0.5,
    distance_y: 0.5,
    properties: {
      Confidence: 60,
      Notes: 'PDF export may need realtime state snapshots.',
    },
  });
  console.log(`  🔗 ${createdFeatures[1].title} ↔ ${createdFeatures[2].title}`);

  // Cross-type: meeting → feature
  const conn3 = await post(`/projects/${projectId}/connections`, {
    type_id: depType.id,
    source_nord_id: createdMeetings[0].id,
    target_nord_id: createdFeatures[0].id,
    direction: 'forward',
    distance_x: 0.5,
    distance_y: 0.5,
    properties: {
      Confidence: 95,
      Notes: 'Sprint planning covers dark mode.',
    },
  });
  console.log(`  🔗 ${createdMeetings[0].title} → ${createdFeatures[0].title}`);

  // 8. Verify round-trip via graph endpoint
  console.log('\n── Verifying round-trip via /graph ──');
  const graph = await get(`/projects/${projectId}/graph`);

  const darkMode = graph.nords.find(n => n.title === 'Dark Mode Support');
  if (darkMode) {
    assert('Dark Mode Priority', darkMode.properties?.Priority, 'High');
    assert('Dark Mode Story Points', darkMode.properties?.['Story Points'], 8);
    assert('Dark Mode Due Date', darkMode.properties?.['Due Date'], '2025-07-15');
    assert('Dark Mode Docs URL', darkMode.properties?.['Docs URL'], 'https://docs.example.com/dark-mode');
    assert('Dark Mode Tags', darkMode.properties?.Tags, ['ui', 'theme', 'accessibility']);
  } else {
    console.log('  ❌ Could not find "Dark Mode Support" in graph');
    failed++;
  }

  const sprint = graph.nords.find(n => n.title === 'Sprint Planning');
  if (sprint) {
    assert('Sprint Notes is markdown', typeof sprint.properties?.Notes, 'string');
    assert('Sprint Notes contains heading', sprint.properties?.Notes?.includes('## Sprint 14'), true);
    assert('Sprint Attendees', sprint.properties?.Attendees, ['Alice', 'Ben', 'Carla']);
    assert('Sprint Date', sprint.properties?.Date, '2025-06-16');
    assert('Sprint Location', sprint.properties?.Location, 'Room 4B / Zoom');
  } else {
    console.log('  ❌ Could not find "Sprint Planning" in graph');
    failed++;
  }

  // Verify connection properties
  const depConn = graph.connections.find(c =>
    c.source_nord_id === createdFeatures[0].id &&
    c.target_nord_id === createdFeatures[1].id
  );
  if (depConn) {
    assert('Connection Confidence', depConn.properties?.Confidence, 85);
    assert('Connection Notes is string', typeof depConn.properties?.Notes, 'string');
  } else {
    console.log('  ❌ Could not find dependency connection in graph');
    failed++;
  }

  // Summary
  console.log(`\n${'═'.repeat(50)}`);
  console.log(`✨ Property Smoke Test Complete`);
  console.log(`   ${passed} passed, ${failed} failed`);
  console.log(`   ${createdFeatures.length + createdMeetings.length} nords, 3 connections`);
  console.log(`${'═'.repeat(50)}`);

  if (failed > 0) process.exit(1);
}

main().catch(err => { console.error('❌ Smoke test failed:', err.message); process.exit(1); });
