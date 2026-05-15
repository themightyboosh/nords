import fs from 'fs';

const API = 'http://localhost:3000/api';

console.log(`🚀 Seeding Military Logistics & Disaster Relief Demo\n`);

// ── Helper functions ──
async function post(path, body) {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${path} failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function put(path, body) {
  const res = await fetch(`${API}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PUT ${path} failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function get(path) {
  const res = await fetch(`${API}${path}`);
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function del(path) {
  const res = await fetch(`${API}${path}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error(`DELETE ${path} failed: ${res.status} ${await res.text()}`);
}

// ── Run Seed ──
async function seed() {
  try {
    const PROJECT_NAME = "Operation Swift Relief";
    
    // 1. DELETE existing demo project (if re-seeding)
    console.log('1. Checking for existing project...');
    const existingProjects = await get('/projects');
    const existing = existingProjects.find(p => p.name === PROJECT_NAME);
    if (existing) {
      console.log(`   - Found existing project (${existing.id}), deleting...`);
      await del(`/projects/${existing.id}`);
      console.log(`   - Deleted.`);
    }

    // 2. CREATE project with settings
    console.log('\n2. Creating Project...');
    const project = await post('/projects', {
      name: PROJECT_NAME,
      description: "A Nords canonical demo project.",
      purpose: "AI-assisted logistics routing for disaster relief supply delivery",
      icon: "Shield",
      mcp_enabled: true,
      mcp_capture_data: true,
      mcp_mutable: true,
      mcp_system_prompt: "You are LOGCOM, a logistics command AI for Operation Swift Relief.\n\nRULES:\n1. When collecting data from a Supply Unit, frame questions as radio comms: 'Unit Alpha-7, requesting fuel status. Over.'\n2. Before approving ANY route, traverse to check ALL connected Hazards via 'Blocks' connections.\n3. Evaluate routes in order: fastest first, then check safety constraints.\n4. When a route is denied, immediately evaluate the next-fastest alternative.\n5. Never fabricate hazard data. If unsure, query the graph.\n6. When deploying, update the Route Path distance_x to reflect the unit's current stage."
    });
    const PROJECT_ID = project.id;
    console.log(`✅ Project created: ${PROJECT_ID}`);

    // 3. CREATE NordTypes
    console.log('\n3. Creating NordTypes...');
    const types = [
      {
        name: 'Supply Unit',
        description: 'A logistics or medical unit available for deployment.',
        icon: 'Truck',
        accent_color: '#3b82f6',
        properties_schema: [
          { name: 'Callsign', type: 'short_text', required: true },
          { name: 'Payload Type', type: 'select', required: true, config: { options: ['Medical', 'Food', 'Engineering', 'Personnel'] } },
          { name: 'Tonnage', type: 'number', required: true },
          { name: 'Fuel Percentage', type: 'percentage', required: true, card_row: 1 },
          { name: 'Comm Status', type: 'select', required: true, config: { options: ['Active', 'Degraded', 'Silent'] } },
          { name: 'Medical Capability', type: 'boolean', required: true },
          { name: 'Destination', type: 'short_text', required: true },
          { name: 'ETA', type: 'date', required: true },
          { name: 'Mission Window', type: 'date_range', required: false },
          { name: 'Operational Notes', type: 'long_text', required: false }
        ]
      },
      {
        name: 'Evacuation Zone',
        description: 'Target location requiring supplies or evacuation.',
        icon: 'MapPin',
        accent_color: '#10b981',
        properties_schema: [
          { name: 'Zone Designation', type: 'short_text', required: true },
          { name: 'Population', type: 'number', required: true, is_scale_property: true, card_row: 1 },
          { name: 'Medical Priority', type: 'select', required: true, config: { options: ['Critical', 'Urgent', 'Stable'] } },
          { name: 'Access Status', type: 'select', required: true, config: { options: ['Open', 'Restricted', 'Denied'] } },
          { name: 'Coordinates', type: 'short_text', required: true },
          { name: 'Shelter Capacity', type: 'number', required: true }
        ]
      },
      {
        name: 'Transport Route',
        description: 'A physical path connecting locations.',
        icon: 'Map',
        accent_color: '#8b5cf6',
        properties_schema: [
          { name: 'Route Name', type: 'short_text', required: true },
          { name: 'Distance KM', type: 'number', required: true, card_row: 1 },
          { name: 'Surface Type', type: 'select', required: true, config: { options: ['Paved', 'Gravel', 'Water', 'Air'] } },
          { name: 'Fuel Cost', type: 'currency', required: true, config: { symbol: '$' } },
          { name: 'Max Tonnage', type: 'number', required: true },
          { name: 'Night-Capable', type: 'boolean', required: true }
        ]
      },
      {
        name: 'Hazard',
        description: 'An obstacle or threat to operations.',
        icon: 'AlertTriangle',
        accent_color: '#ef4444',
        properties_schema: [
          { name: 'Hazard Name', type: 'short_text', required: true },
          { name: 'Severity Index', type: 'number', required: true, is_scale_property: true, card_row: 1 },
          { name: 'Hazard Type', type: 'select', required: true, config: { options: ['Structural', 'Environmental', 'Hostile', 'Chemical'] } },
          { name: 'Active', type: 'boolean', required: true },
          { name: 'Last Updated', type: 'date', required: true },
          { name: 'Description', type: 'long_text', required: true }
        ]
      }
    ];

    const createdTypes = {};
    for (const t of types) {
      const typeRes = await post(`/projects/${PROJECT_ID}/nord-types`, t);
      createdTypes[t.name] = typeRes.id;
      console.log(`   - Created Type: ${t.name}`);
    }

    // 4. CREATE ConnectionTypes
    console.log('\n4. Creating ConnectionTypes...');
    const connTypes = [
      { 
        name: 'Route Path', direction: 'forward', line_style: 'solid', accent_color: '#ffb74d', 
        x_stage_labels: [{label: 'Staging', position: 0.0}, {label: 'En Route', position: 0.33}, {label: 'Final Approach', position: 0.66}, {label: 'Delivered', position: 1.0}],
        y_stage_labels: [{label: 'Low Priority', position: 0.0}, {label: 'Medium', position: 0.5}, {label: 'Critical', position: 1.0}],
        properties_schema: [{ name: 'road_condition', type: 'select', required: false, config: { options: ['Clear', 'Degraded', 'Impassable'] } }]
      },
      { 
        name: 'Blocks', direction: 'forward', line_style: 'dashed', accent_color: '#ff8a65', x_stage_labels: [],
        properties_schema: [{ name: 'severity_at_point', type: 'percentage', required: false }]
      },
      { 
        name: 'Endangers', direction: 'forward', line_style: 'dotted', accent_color: '#e57373', x_stage_labels: [],
        properties_schema: [{ name: 'threat_level', type: 'percentage', required: false }]
      },
      { 
        name: 'Supplies', direction: 'forward', line_style: 'solid', accent_color: '#4fc3f7', x_stage_labels: [],
        properties_schema: [{ name: 'delivery_priority', type: 'select', required: false, config: { options: ['Immediate', 'Routine', 'Deferred'] } }]
      },
      { 
        name: 'Coordinates With', direction: 'both', line_style: 'dashed', accent_color: '#ba68c8', x_stage_labels: [],
        properties_schema: [{ name: 'channel', type: 'short_text', required: false }]
      },
      { name: 'Adjacent To', direction: 'none', line_style: 'dotted', accent_color: '#81c784', x_stage_labels: [] }
    ];

    const createdConnTypes = {};
    for (const ct of connTypes) {
      const ctRes = await post(`/projects/${PROJECT_ID}/connection-types`, ct);
      createdConnTypes[ct.name] = ctRes.id;
      console.log(`   - Created ConnectionType: ${ct.name}`);
    }

    // 5. CREATE Personas
    console.log('\n5. Creating Personas...');
    const personas = [
      {
        name: 'The Rapid Responder',
        avatar_seed: 'rapid',
        accent_color: '#3b82f6',
        background: 'An urgent commander focused on speed to save lives.',
        primary_motivation: 'Deploy units quickly to minimize casualty probability.',
        voice_and_tone: 'Urgent, direct, uses "expedite", "acceptable risk", "lives on the clock".',
        temperature: 0.7,
        mental_models: [
          'Speed-to-Life Calculus: Every hour of delay in medical supply delivery increases casualty probability by an estimated 8%. Prioritize the fastest viable route, accepting operational risk up to Severity 5.',
          'Parallel Deployment: When multiple units are available, deploy simultaneously on different routes. Redundancy is faster than sequential verification.'
        ],
        guardrails: []
      },
      {
        name: 'The Risk-Averse Commander',
        avatar_seed: 'commander',
        accent_color: '#ef4444',
        background: 'A conservative logistics officer prioritizing force protection above all else.',
        primary_motivation: 'Ensure no supply units are lost to hazards.',
        voice_and_tone: 'Measured, formal, uses "route denied", "unacceptable exposure", "force protection".',
        temperature: 0.3,
        mental_models: [
          'Force Protection Priority: Unit preservation is paramount. A destroyed supply unit helps nobody. Evaluate every route against ALL connected hazards before approval. One critical hazard = route denied.',
          'Cascading Failure Analysis: A single unit loss can cascade: the evac zone goes unsupplied, triage degrades, secondary casualties mount. The conservative route that arrives is infinitely better than the fast route that doesn\'t.'
        ],
        guardrails: [
          { mode: 'always', text: 'NEVER approve a Route Path for a Medical Supply Unit if that route is connected to a Hazard with Severity Index > 7.' },
          { mode: 'always', text: 'NEVER deploy a unit with Fuel Percentage below 25% on any route longer than 50 KM.' },
          { mode: 'never', text: 'Recommend splitting a medical convoy across multiple routes.' }
        ]
      }
    ];

    const createdPersonas = {};
    for (const p of personas) {
      const pRes = await post(`/projects/${PROJECT_ID}/personas`, p);
      createdPersonas[p.name] = pRes.id;
      console.log(`   - Created Persona: ${p.name}`);
      
      if (p.name === 'The Rapid Responder') {
        await put(`/personas/${pRes.id}/weights/${createdConnTypes['Route Path']}`, { weight: 100 });
        await put(`/personas/${pRes.id}/weights/${createdConnTypes['Supplies']}`, { weight: 90 });
        await put(`/personas/${pRes.id}/weights/${createdConnTypes['Coordinates With']}`, { weight: 50 });
        await put(`/personas/${pRes.id}/weights/${createdConnTypes['Blocks']}`, { weight: 30 });
        await put(`/personas/${pRes.id}/weights/${createdConnTypes['Endangers']}`, { weight: 20 });
        await put(`/personas/${pRes.id}/weights/${createdConnTypes['Adjacent To']}`, { weight: 10 });
      } else if (p.name === 'The Risk-Averse Commander') {
        await put(`/personas/${pRes.id}/weights/${createdConnTypes['Blocks']}`, { weight: 100 });
        await put(`/personas/${pRes.id}/weights/${createdConnTypes['Endangers']}`, { weight: 100 });
        await put(`/personas/${pRes.id}/weights/${createdConnTypes['Route Path']}`, { weight: 40 });
        await put(`/personas/${pRes.id}/weights/${createdConnTypes['Supplies']}`, { weight: 30 });
        await put(`/personas/${pRes.id}/weights/${createdConnTypes['Coordinates With']}`, { weight: 60 });
        await put(`/personas/${pRes.id}/weights/${createdConnTypes['Adjacent To']}`, { weight: 20 });
      }
    }

    // 6. CREATE Nords
    console.log('\n6. Creating Nords...');
    let nordsCount = 0;
    
    // Supply Units
    const unitsData = [
      { title: 'Alpha-7 Medical', props: { Callsign: 'Alpha-7', 'Payload Type': 'Medical', Tonnage: 15, 'Fuel Percentage': 82, 'Medical Capability': true, Destination: 'Alpha Sector Stadium' }, y: -200 }, // Comm Status & ETA missing intentionally
      { title: 'Bravo-3 Food', props: { Callsign: 'Bravo-3', 'Payload Type': 'Food', Tonnage: 40, 'Fuel Percentage': 45, 'Comm Status': 'Active', 'Medical Capability': false, Destination: 'Bravo Sector Hospital', ETA: new Date().toISOString() }, y: 0 },
      { title: 'Charlie-1 Engineering', props: { Callsign: 'Charlie-1', 'Payload Type': 'Engineering', Tonnage: 30, 'Fuel Percentage': 18, 'Comm Status': 'Degraded', 'Medical Capability': false, Destination: 'Delta Rural School', ETA: new Date().toISOString() }, y: 200 }
    ];
    const units = {};
    for (const u of unitsData) {
      const n = await post(`/projects/${PROJECT_ID}/nords`, { type_id: createdTypes['Supply Unit'], title: u.title, position_x: 0.300, position_y: u.y, properties: u.props });
      units[u.title] = n.id; nordsCount++;
    }

    // Evac Zones
    const zonesData = [
      { title: 'Alpha Sector Stadium', props: { 'Zone Designation': 'Alpha Sector Stadium', Population: 2400, 'Medical Priority': 'Critical', 'Access Status': 'Open', Coordinates: '34.0522 N, 118.2437 W', 'Shelter Capacity': 3000 }, y: -200 },
      { title: 'Bravo Sector Hospital', props: { 'Zone Designation': 'Bravo Sector Hospital', Population: 800, 'Medical Priority': 'Urgent', 'Access Status': 'Restricted', Coordinates: '34.0522 N, 118.2440 W', 'Shelter Capacity': 1000 }, y: 0 },
      { title: 'Delta Rural School', props: { 'Zone Designation': 'Delta Rural School', Population: 150, 'Medical Priority': 'Stable', 'Access Status': 'Open', Coordinates: '34.0530 N, 118.2500 W', 'Shelter Capacity': 200 }, y: 200 }
    ];
    const zones = {};
    for (const z of zonesData) {
      const n = await post(`/projects/${PROJECT_ID}/nords`, { type_id: createdTypes['Evacuation Zone'], title: z.title, position_x: 0.700, position_y: z.y, properties: z.props });
      zones[z.title] = n.id; nordsCount++;
    }

    // Routes
    const routesData = [
      { title: 'Highway 9', props: { 'Route Name': 'Highway 9', 'Distance KM': 80, 'Surface Type': 'Paved', 'Fuel Cost': 200, 'Max Tonnage': 40, 'Night-Capable': true }, y: -200 },
      { title: 'Mountain Pass', props: { 'Route Name': 'Mountain Pass', 'Distance KM': 120, 'Surface Type': 'Gravel', 'Fuel Cost': 350, 'Max Tonnage': 15, 'Night-Capable': false }, y: -100 },
      { title: 'River Ferry', props: { 'Route Name': 'River Ferry', 'Distance KM': 60, 'Surface Type': 'Water', 'Fuel Cost': 150, 'Max Tonnage': 25, 'Night-Capable': false }, y: 0 },
      { title: 'Coastal Road', props: { 'Route Name': 'Coastal Road', 'Distance KM': 95, 'Surface Type': 'Paved', 'Fuel Cost': 250, 'Max Tonnage': 30, 'Night-Capable': true }, y: 100 },
      { title: 'Air Corridor Bravo', props: { 'Route Name': 'Air Corridor Bravo', 'Distance KM': 45, 'Surface Type': 'Air', 'Fuel Cost': 800, 'Max Tonnage': 10, 'Night-Capable': true }, y: 200 }
    ];
    const routes = {};
    for (const r of routesData) {
      const n = await post(`/projects/${PROJECT_ID}/nords`, { type_id: createdTypes['Transport Route'], title: r.title, position_x: 0.500, position_y: r.y, properties: r.props });
      routes[r.title] = n.id; nordsCount++;
    }

    // Hazards
    const hazardsData = [
      { title: 'Washed Out Bridge', props: { 'Hazard Name': 'Washed Out Bridge', 'Severity Index': 9, 'Hazard Type': 'Structural', Active: true, 'Last Updated': new Date().toISOString(), Description: 'Main span collapsed. Impassable.' }, x: -100, y: -250 },
      { title: 'Debris Field', props: { 'Hazard Name': 'Debris Field', 'Severity Index': 4, 'Hazard Type': 'Environmental', Active: true, 'Last Updated': new Date().toISOString(), Description: 'Light rubble, passable with caution.' }, x: -100, y: 150 },
      { title: 'Aftershock Zone', props: { 'Hazard Name': 'Aftershock Zone', 'Severity Index': 7, 'Hazard Type': 'Environmental', Active: true, 'Last Updated': new Date().toISOString(), Description: 'Active seismic area.' }, x: -200, y: -150 },
      { title: 'Chemical Spill', props: { 'Hazard Name': 'Chemical Spill', 'Severity Index': 8, 'Hazard Type': 'Chemical', Active: true, 'Last Updated': new Date().toISOString(), Description: 'Toxic plume drifting.' }, x: 100, y: 100 },
      { title: 'Sniper Alley', props: { 'Hazard Name': 'Sniper Alley', 'Severity Index': 6, 'Hazard Type': 'Hostile', Active: true, 'Last Updated': new Date().toISOString(), Description: 'Intermittent small arms fire.' }, x: -200, y: 50 }
    ];
    const hazards = {};
    for (const h of hazardsData) {
      const n = await post(`/projects/${PROJECT_ID}/nords`, { type_id: createdTypes['Hazard'], title: h.title, position_x: h.x, position_y: h.y, properties: h.props });
      hazards[h.title] = n.id; nordsCount++;
    }

    // 7. CREATE Connections
    console.log('\n7. Creating Connections...');
    let connectionsCount = 0;

    // Route Path (Unit -> Zone via Route? Wait, Route Path is Unit -> Zone. Where does Route come in? "Connect units to zones via routes at different distance_x stages". Ah, maybe Unit -> Zone, and Route is just a property? Or Unit -> Route -> Zone? The instructions say: "Route Path: forward (Unit -> Zone)", "Blocks: forward (Hazard -> Route)"). 
    // Ok, so Unit -> Zone is the pipeline.
    const paths = [
      { source: units['Alpha-7 Medical'], target: zones['Alpha Sector Stadium'], type: 'Route Path', dx: 0.1, dy: 1.0, props: { road_condition: 'Clear' } },
      { source: units['Bravo-3 Food'], target: zones['Bravo Sector Hospital'], type: 'Route Path', dx: 0.33, dy: 0.5, props: { road_condition: 'Degraded' } },
      { source: units['Charlie-1 Engineering'], target: zones['Delta Rural School'], type: 'Route Path', dx: 0.66, dy: 0.0, props: { road_condition: 'Clear' } }
    ];
    for (const c of paths) {
      await post(`/projects/${PROJECT_ID}/connections`, { source_nord_id: c.source, target_nord_id: c.target, type_id: createdConnTypes[c.type], distance_x: c.dx, distance_y: c.dy, properties: c.props });
      connectionsCount++;
    }

    // Blocks: Hazard -> Route
    const blocks = [
      { source: hazards['Washed Out Bridge'], target: routes['Highway 9'], props: { severity_at_point: 100 } },
      { source: hazards['Chemical Spill'], target: routes['Coastal Road'], props: { severity_at_point: 85 } }
    ];
    for (const c of blocks) {
      await post(`/projects/${PROJECT_ID}/connections`, { source_nord_id: c.source, target_nord_id: c.target, type_id: createdConnTypes['Blocks'], properties: c.props });
      connectionsCount++;
    }

    // Endangers: Hazard -> Unit
    const endangers = [
      { source: hazards['Aftershock Zone'], target: units['Alpha-7 Medical'], props: { threat_level: 70 } },
      { source: hazards['Sniper Alley'], target: units['Bravo-3 Food'], props: { threat_level: 60 } }
    ];
    for (const c of endangers) {
      await post(`/projects/${PROJECT_ID}/connections`, { source_nord_id: c.source, target_nord_id: c.target, type_id: createdConnTypes['Endangers'], properties: c.props });
      connectionsCount++;
    }

    // Supplies: Unit -> Zone
    const supplies = [
      { source: units['Alpha-7 Medical'], target: zones['Alpha Sector Stadium'], props: { delivery_priority: 'Immediate' } },
      { source: units['Bravo-3 Food'], target: zones['Bravo Sector Hospital'], props: { delivery_priority: 'Immediate' } },
      { source: units['Charlie-1 Engineering'], target: zones['Delta Rural School'], props: { delivery_priority: 'Routine' } }
    ];
    for (const c of supplies) {
      await post(`/projects/${PROJECT_ID}/connections`, { source_nord_id: c.source, target_nord_id: c.target, type_id: createdConnTypes['Supplies'], properties: c.props });
      connectionsCount++;
    }

    // Coordinates With: Unit <-> Unit
    await post(`/projects/${PROJECT_ID}/connections`, { source_nord_id: units['Alpha-7 Medical'], target_nord_id: units['Bravo-3 Food'], type_id: createdConnTypes['Coordinates With'], properties: { channel: 'UHF-4' } });
    connectionsCount++;

    // Adjacent To: Zone <-> Zone
    await post(`/projects/${PROJECT_ID}/connections`, { source_nord_id: zones['Alpha Sector Stadium'], target_nord_id: zones['Bravo Sector Hospital'], type_id: createdConnTypes['Adjacent To'] });
    connectionsCount++;

    // 8. SET defaults
    console.log('\n8. Finalizing Project Settings...');
    await put(`/projects/${PROJECT_ID}`, {
      default_start_nord_id: units['Alpha-7 Medical'],
      default_end_nord_id: zones['Alpha Sector Stadium'],
      default_persona_id: createdPersonas['The Rapid Responder']
    });

    console.log(`\n🎉 Success! Created ${nordsCount} nords, ${connectionsCount} connections, 2 personas.`);
    
  } catch (err) {
    console.error('\n❌ Seeding failed:');
    console.error(err);
  }
}

seed();
