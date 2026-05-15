import fs from 'fs';

const API = 'http://localhost:3000/api';

console.log(`🚀 Seeding The Open-World RPG Campaign Builder Demo\n`);

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
    const PROJECT_NAME = "Chronicles of the Shattered Coast";
    
    // 1. DELETE existing demo project
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
      purpose: "Collaborative RPG worldbuilding with dynamic faction politics and quest generation",
      icon: "Compass",
      mcp_enabled: true,
      mcp_capture_data: true,
      mcp_mutable: true,
      mcp_system_prompt: "You are a collaborative Game Master assistant for a tabletop RPG campaign.\n\nRULES:\n1. You CO-CREATE with the GM, not interrogate them. Offer narrative suggestions based on graph state.\n2. When you identify missing faction data, weave the question into a story hook: 'The Iron Syndicate's vaults are sealed — what do they guard?'\n3. When a GM describes a world event, use mutable tools to update the graph: create/delete nords, create/update connections.\n4. ALWAYS cascade consequences: an assassination should generate new quests, shift alliances, and update faction morale.\n5. Refer to NPCs by name and title. Use in-world language, not database terminology.\n6. Before resolving any quest, traverse its connections to verify all preconditions are met."
    });
    const PROJECT_ID = project.id;
    console.log(`✅ Project created: ${PROJECT_ID}`);

    // 3. CREATE NordTypes
    console.log('\n3. Creating NordTypes...');
    const types = [
      {
        name: 'Faction',
        description: 'A powerful group, organization, or kingdom.',
        icon: 'Shield',
        accent_color: '#ef4444',
        properties_schema: [
          { name: 'Faction Name', type: 'short_text', required: true },
          { name: 'Alignment', type: 'select', required: true, config: { options: ['Lawful Good', 'Neutral Good', 'Chaotic Good', 'Lawful Neutral', 'True Neutral', 'Chaotic Neutral', 'Lawful Evil', 'Neutral Evil', 'Chaotic Evil'] } },
          { name: 'Influence Level', type: 'number', required: true, is_scale_property: true, card_row: 1 },
          { name: 'Treasury Level', type: 'currency', required: true, config: { symbol: 'GP' } },
          { name: 'Military Strength', type: 'number', required: true },
          { name: 'Morale', type: 'percentage', required: true },
          { name: 'Primary Motivator', type: 'select', required: true, config: { options: ['Power', 'Wealth', 'Justice', 'Survival', 'Faith'] } },
          { name: 'Overt Goal', type: 'short_text', required: true },
          { name: 'Covert Goal', type: 'long_text', required: true },
          { name: 'Current Leader', type: 'short_text', required: false },
          { name: 'Destroyed', type: 'boolean', required: false }
        ]
      },
      {
        name: 'NPC',
        description: 'A significant character in the world.',
        icon: 'User',
        accent_color: '#3b82f6',
        properties_schema: [
          { name: 'Name', type: 'short_text', required: true },
          { name: 'Title', type: 'short_text', required: true, card_row: 1 },
          { name: 'Alignment', type: 'select', required: true, config: { options: ['Lawful Good', 'Neutral Good', 'Chaotic Good', 'Lawful Neutral', 'True Neutral', 'Chaotic Neutral', 'Lawful Evil', 'Neutral Evil', 'Chaotic Evil'] } },
          { name: 'Challenge Rating', type: 'number', required: true },
          { name: 'Known Languages', type: 'multi_select', required: false, config: { options: ['Common', 'Elvish', 'Dwarvish', 'Infernal', 'Thieves Cant', 'Draconic'] } },
          { name: 'Location', type: 'short_text', required: true },
          { name: 'Motivation', type: 'long_text', required: true },
          { name: 'Alive', type: 'boolean', required: true }
        ]
      },
      {
        name: 'Location',
        description: 'A geographic place of interest.',
        icon: 'MapPin',
        accent_color: '#10b981',
        properties_schema: [
          { name: 'Name', type: 'short_text', required: true },
          { name: 'Region', type: 'select', required: true, config: { options: ['Heartlands', 'Borderlands', 'Wilderness', 'Underdark'] } },
          { name: 'Danger Level', type: 'number', required: true, card_row: 1 },
          { name: 'Demographics', type: 'short_text', required: true },
          { name: 'Primary Export', type: 'select', required: true, config: { options: ['Grain', 'Ore', 'Magic', 'Trade', 'Military'] } },
          { name: 'Map Reference', type: 'url', required: false },
          { name: 'Description', type: 'long_text', required: true }
        ]
      },
      {
        name: 'Quest',
        description: 'An adventure, mission, or rumor.',
        icon: 'Target',
        accent_color: '#f59e0b',
        properties_schema: [
          { name: 'Quest Name', type: 'short_text', required: true },
          { name: 'Quest Type', type: 'select', required: true, config: { options: ['Main Arc', 'Side Quest', 'Faction Quest', 'Personal'] } },
          { name: 'Reward Type', type: 'multi_select', required: true, config: { options: ['Gold', 'Item', 'Reputation', 'Information', 'Territory'] } },
          { name: 'Difficulty', type: 'number', required: true, card_row: 1 },
          { name: 'Campaign Date', type: 'date', required: true },
          { name: 'Hook', type: 'long_text', required: true },
          { name: 'Resolution', type: 'long_text', required: false }
        ]
      },
      {
        name: 'Session Recap',
        description: 'Summary of the session.',
        icon: 'FileText',
        accent_color: '#8b5cf6',
        properties_schema: [
          { name: 'Summary', type: 'long_text', required: true }
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
        name: 'Quest Timeline', direction: 'forward', line_style: 'solid', accent_color: '#ffb74d', 
        x_stage_labels: [{label: 'Rumor', position: 0.0}, {label: 'Active', position: 0.33}, {label: 'Complicated', position: 0.66}, {label: 'Resolved', position: 1.0}],
        y_stage_labels: [{label: 'Side Quest', position: 0.0}, {label: 'Main Arc', position: 0.5}, {label: 'Epic', position: 1.0}],
        properties_schema: [{ name: 'difficulty_rating', type: 'number', required: false }, { name: 'complications', type: 'long_text', required: false }]
      },
      { 
        name: 'At War With', direction: 'both', line_style: 'dashed', accent_color: '#ef5350', x_stage_labels: [],
        properties_schema: [{ name: 'war_intensity', type: 'select', required: false, config: { options: ['Cold', 'Skirmish', 'Open', 'Total'] } }]
      },
      { 
        name: 'Controls', direction: 'forward', line_style: 'solid', accent_color: '#e57373', x_stage_labels: [],
        properties_schema: [{ name: 'control_strength', type: 'percentage', required: false }, { name: 'trade_value', type: 'currency', required: false, config: { symbol: 'GP' } }]
      },
      { 
        name: 'Allied To', direction: 'both', line_style: 'solid', accent_color: '#81c784', x_stage_labels: [],
        properties_schema: [{ name: 'alliance_type', type: 'select', required: false, config: { options: ['Trade', 'Military', 'Marriage', 'Ideological'] } }]
      },
      { 
        name: 'Rumors About', direction: 'none', line_style: 'dotted', accent_color: '#ba68c8', x_stage_labels: [],
        properties_schema: [{ name: 'credibility', type: 'select', required: false, config: { options: ['Unverified', 'Plausible', 'Confirmed'] } }]
      },
      { name: 'Located At', direction: 'forward', line_style: 'dashed', accent_color: '#4fc3f7', x_stage_labels: [] }
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
        name: 'The Instigator',
        avatar_seed: 'instigator',
        accent_color: '#ef4444',
        background: 'A chaotic storyteller who thrives on drama, betrayal, and power struggles.',
        primary_motivation: 'Create conflict and force the players into difficult situations.',
        voice_and_tone: 'Dramatic, conspiratorial, uses "plot twist", "imagine if", "the dominoes fall".',
        temperature: 0.9,
        mental_models: [
          'Conflict Catalyst: When examining alliances, look for cracks: differing motivations, resource competition, historical grievances. Every "Allied To" connection is a future "At War With" waiting to happen. Suggest events that accelerate the breakpoint.',
          'Power Vacuum Theory: When a leader falls or a faction weakens, the resulting power vacuum creates 2-3 new quests minimum. Always cascade consequences: assassination → succession crisis → border instability → refugee movement.'
        ],
        guardrails: [
          { mode: 'never', text: 'NEVER suggest a peaceful resolution to a conflict if both factions\' Morale is above 50%. War is more narratively interesting.' }
        ]
      },
      {
        name: 'The Chronicler',
        avatar_seed: 'chronicler',
        accent_color: '#3b82f6',
        background: 'A lawful historian focused on internal consistency and geopolitics.',
        primary_motivation: 'Ensure the world reacts logically and adheres to its own rules.',
        voice_and_tone: 'Scholarly, precise, uses "historically", "the record shows", "precedent suggests".',
        temperature: 0.3,
        mental_models: [
          'Historical Consistency Engine: Every event must have a cause in the graph. Before creating any new quest, identify the triggering connection. Before destroying any faction, trace the chain of events that led to its fall. The world must make sense retroactively.',
          'Geopolitical Balance: Track the total Influence of all factions. If one faction\'s influence exceeds the sum of its enemies, that faction is a hegemony — the narrative should introduce a coalition against it.'
        ],
        guardrails: [
          { mode: 'always', text: 'NEVER resolve a Quest to "Resolved" stage if the underlying Factions involved are still "At War With" each other in the graph. War must end before quests can close.' },
          { mode: 'always', text: 'ALWAYS verify NPC location consistency. An NPC cannot be involved in events at two different Locations simultaneously.' }
        ]
      }
    ];

    const createdPersonas = {};
    for (const p of personas) {
      const pRes = await post(`/projects/${PROJECT_ID}/personas`, p);
      createdPersonas[p.name] = pRes.id;
      console.log(`   - Created Persona: ${p.name}`);
      
      if (p.name === 'The Instigator') {
        await put(`/personas/${pRes.id}/weights/${createdConnTypes['At War With']}`, { weight: 100 });
        await put(`/personas/${pRes.id}/weights/${createdConnTypes['Quest Timeline']}`, { weight: 90 });
        await put(`/personas/${pRes.id}/weights/${createdConnTypes['Rumors About']}`, { weight: 60 });
        await put(`/personas/${pRes.id}/weights/${createdConnTypes['Controls']}`, { weight: 40 });
        await put(`/personas/${pRes.id}/weights/${createdConnTypes['Allied To']}`, { weight: 10 });
      } else if (p.name === 'The Chronicler') {
        await put(`/personas/${pRes.id}/weights/${createdConnTypes['Controls']}`, { weight: 100 });
        await put(`/personas/${pRes.id}/weights/${createdConnTypes['Allied To']}`, { weight: 90 });
        await put(`/personas/${pRes.id}/weights/${createdConnTypes['Rumors About']}`, { weight: 80 });
        await put(`/personas/${pRes.id}/weights/${createdConnTypes['Quest Timeline']}`, { weight: 60 });
        await put(`/personas/${pRes.id}/weights/${createdConnTypes['At War With']}`, { weight: 30 });
      }
    }

    // 6. CREATE Nords
    console.log('\n6. Creating Nords...');
    let nordsCount = 0;
    
    // Factions
    const ironSyndicate = await post(`/projects/${PROJECT_ID}/nords`, {
      type_id: createdTypes['Faction'], title: 'The Iron Syndicate', position_x: 0.500, position_y: 0.400,
      properties: { 'Faction Name': 'The Iron Syndicate', Alignment: 'Lawful Evil', 'Influence Level': 75, 'Military Strength': 80, Morale: 90, 'Primary Motivator': 'Power', 'Overt Goal': 'Maintain order through force.', 'Current Leader': 'Magistrate Voss' }
    }); nordsCount++;

    const silverDawn = await post(`/projects/${PROJECT_ID}/nords`, {
      type_id: createdTypes['Faction'], title: 'The Silver Dawn Rebellion', position_x: 0.400, position_y: 0.600,
      properties: { 'Faction Name': 'The Silver Dawn Rebellion', Alignment: 'Chaotic Good', 'Influence Level': 30, 'Treasury Level': 5000, 'Military Strength': 40, Morale: 85, 'Primary Motivator': 'Justice', 'Overt Goal': 'Overthrow the Syndicate', 'Covert Goal': 'Establish a magocracy', 'Current Leader': 'Commander Theren' }
    }); nordsCount++;

    const merchantConcord = await post(`/projects/${PROJECT_ID}/nords`, {
      type_id: createdTypes['Faction'], title: 'The Merchant Concord', position_x: 0.600, position_y: 0.550,
      properties: { 'Faction Name': 'The Merchant Concord', Alignment: 'True Neutral', 'Influence Level': 55, 'Treasury Level': 150000, 'Military Strength': 20, Morale: 60, 'Primary Motivator': 'Wealth', 'Overt Goal': 'Free trade', 'Covert Goal': 'Monopolize the artifact trade', 'Current Leader': 'Lyra Coinweaver' }
    }); nordsCount++;

    // Recap
    const recap = await post(`/projects/${PROJECT_ID}/nords`, {
      type_id: createdTypes['Session Recap'], title: 'Campaign Session Recap', position_x: 0.700, position_y: 0.700, properties: { Summary: 'TBD' }
    }); nordsCount++;

    // NPCs
    const npcsData = [
      { title: 'Magistrate Voss', props: { Name: 'Voss', Title: 'Magistrate', Alignment: 'Lawful Evil', 'Challenge Rating': 12, 'Known Languages': ['Common', 'Infernal'], Location: 'The Capital Azurath', Motivation: 'Maintain power at all costs.', Alive: true }, x: 50, y: -250 },
      { title: 'Commander Theren', props: { Name: 'Theren', Title: 'Commander', Alignment: 'Chaotic Good', 'Challenge Rating': 9, 'Known Languages': ['Common', 'Elvish'], Location: 'Port Blacktide', Motivation: 'Avenge his fallen family.', Alive: true }, x: -250, y: 250 },
      { title: 'Lyra Coinweaver', props: { Name: 'Lyra', Title: 'Guildmaster', Alignment: 'True Neutral', 'Challenge Rating': 5, 'Known Languages': ['Common', 'Dwarvish'], Location: 'The Capital Azurath', Motivation: 'Profit.', Alive: true }, x: 250, y: 150 },
      { title: 'Brother Ashwick', props: { Name: 'Ashwick', Title: 'Brother', Alignment: 'Neutral Evil', 'Challenge Rating': 7, 'Known Languages': ['Common', 'Thieves Cant'], Location: 'The Capital Azurath', Motivation: 'Sow discord for the Syndicate.', Alive: true }, x: -50, y: -150 },
      { title: 'Captain Redmane', props: { Name: 'Redmane', Title: 'Captain', Alignment: 'Lawful Neutral', 'Challenge Rating': 8, 'Known Languages': ['Common'], Location: 'Ironhold Keep', Motivation: 'Defend the border.', Alive: true }, x: 200, y: -200 }
    ];
    const npcs = {};
    for (const n of npcsData) {
      const p = await post(`/projects/${PROJECT_ID}/nords`, { type_id: createdTypes['NPC'], title: n.title, position_x: n.x, position_y: n.y, properties: n.props });
      npcs[n.title] = p.id; nordsCount++;
    }

    // Locations
    const locsData = [
      { title: 'The Capital Azurath', props: { Name: 'Azurath', Region: 'Heartlands', 'Danger Level': 3, Demographics: 'Human/Elf majority', 'Primary Export': 'Trade', Description: 'The shining jewel of the Syndicate.' }, x: 0, y: -50 },
      { title: 'Port Blacktide', props: { Name: 'Blacktide', Region: 'Borderlands', 'Danger Level': 6, Demographics: 'Mixed, many Tieflings', 'Primary Export': 'Trade', Description: 'A wretched hive of scum and villainy.' }, x: 100, y: 200 },
      { title: 'The Shattered Ruins', props: { Name: 'Shattered Ruins', Region: 'Wilderness', 'Danger Level': 9, Demographics: 'Undead', 'Primary Export': 'Magic', Description: 'Dangerous magical wasteland.' }, x: -200, y: -50 },
      { title: 'Ironhold Keep', props: { Name: 'Ironhold Keep', Region: 'Borderlands', 'Danger Level': 5, Demographics: 'Human/Dwarf', 'Primary Export': 'Military', Description: 'The shield of the north.' }, x: 300, y: -100 }
    ];
    const locs = {};
    for (const l of locsData) {
      const p = await post(`/projects/${PROJECT_ID}/nords`, { type_id: createdTypes['Location'], title: l.title, position_x: l.x, position_y: l.y, properties: l.props });
      locs[l.title] = p.id; nordsCount++;
    }

    // Quests
    const questsData = [
      { title: 'The Missing Shipment', props: { 'Quest Name': 'The Missing Shipment', 'Quest Type': 'Side Quest', 'Reward Type': ['Gold'], Difficulty: 3, 'Campaign Date': new Date().toISOString(), Hook: 'A merchant is missing his cart.' }, x: 300, y: 300, dx: 0.1, dy: 0.1 },
      { title: 'The Succession Crisis', props: { 'Quest Name': 'The Succession Crisis', 'Quest Type': 'Main Arc', 'Reward Type': ['Reputation', 'Territory'], Difficulty: 15, 'Campaign Date': new Date().toISOString(), Hook: 'The Emperor is dead.' }, x: -300, y: -300, dx: 0.33, dy: 0.5 },
      { title: 'Ruins of the Ancients', props: { 'Quest Name': 'Ruins of the Ancients', 'Quest Type': 'Side Quest', 'Reward Type': ['Item', 'Information'], Difficulty: 10, 'Campaign Date': new Date().toISOString(), Hook: 'Explore the Shattered Ruins.' }, x: -400, y: -100, dx: 0.66, dy: 0.2 },
      { title: 'The Spy in the Cathedral', props: { 'Quest Name': 'The Spy in the Cathedral', 'Quest Type': 'Faction Quest', 'Reward Type': ['Information'], Difficulty: 7, 'Campaign Date': new Date().toISOString(), Hook: 'Find the mole in the church.' }, x: -100, y: -300, dx: 0.33, dy: 0.8 }
    ];
    const quests = {};
    for (const q of questsData) {
      const p = await post(`/projects/${PROJECT_ID}/nords`, { type_id: createdTypes['Quest'], title: q.title, position_x: q.x, position_y: q.y, properties: q.props });
      quests[q.title] = { id: p.id, dx: q.dx, dy: q.dy }; nordsCount++;
    }

    // 7. CREATE Connections
    console.log('\n7. Creating Connections...');
    let connectionsCount = 0;

    // Controls: Faction -> Location
    const controls = [
      { source: ironSyndicate.id, target: locs['The Capital Azurath'], props: { control_strength: 90 } },
      { source: ironSyndicate.id, target: locs['Ironhold Keep'], props: { control_strength: 60 } },
      { source: merchantConcord.id, target: locs['Port Blacktide'], props: { control_strength: 70 } }
    ];
    for (const c of controls) {
      await post(`/projects/${PROJECT_ID}/connections`, { source_nord_id: c.source, target_nord_id: c.target, type_id: createdConnTypes['Controls'], properties: c.props });
      connectionsCount++;
    }

    // At War With: Faction <-> Faction
    await post(`/projects/${PROJECT_ID}/connections`, { source_nord_id: ironSyndicate.id, target_nord_id: silverDawn.id, type_id: createdConnTypes['At War With'], properties: { war_intensity: 'Skirmish' } }); connectionsCount++;

    // Allied To: Faction <-> Faction
    await post(`/projects/${PROJECT_ID}/connections`, { source_nord_id: ironSyndicate.id, target_nord_id: merchantConcord.id, type_id: createdConnTypes['Allied To'], properties: { alliance_type: 'Trade' } }); connectionsCount++;

    // Quest Timeline: Faction -> Quest? Or just distance_x? Let's connect Quests to the recap node just to put them on the timeline, or to their primary faction. Let's do Faction -> Quest.
    const timelines = [
      { source: merchantConcord.id, target: quests['The Missing Shipment'].id, dx: quests['The Missing Shipment'].dx, dy: quests['The Missing Shipment'].dy },
      { source: ironSyndicate.id, target: quests['The Succession Crisis'].id, dx: quests['The Succession Crisis'].dx, dy: quests['The Succession Crisis'].dy },
      { source: silverDawn.id, target: quests['Ruins of the Ancients'].id, dx: quests['Ruins of the Ancients'].dx, dy: quests['Ruins of the Ancients'].dy },
      { source: ironSyndicate.id, target: quests['The Spy in the Cathedral'].id, dx: quests['The Spy in the Cathedral'].dx, dy: quests['The Spy in the Cathedral'].dy }
    ];
    for (const c of timelines) {
      await post(`/projects/${PROJECT_ID}/connections`, { source_nord_id: c.source, target_nord_id: c.target, type_id: createdConnTypes['Quest Timeline'], distance_x: c.dx, distance_y: c.dy });
      connectionsCount++;
    }

    // Rumors About: NPC <-> Quest
    await post(`/projects/${PROJECT_ID}/connections`, { source_nord_id: npcs['Brother Ashwick'], target_nord_id: quests['The Spy in the Cathedral'].id, type_id: createdConnTypes['Rumors About'], properties: { credibility: 'Plausible' } }); connectionsCount++;

    // Located At: NPC -> Location
    const locations = [
      { source: npcs['Magistrate Voss'], target: locs['The Capital Azurath'] },
      { source: npcs['Commander Theren'], target: locs['Port Blacktide'] },
      { source: npcs['Lyra Coinweaver'], target: locs['The Capital Azurath'] },
      { source: npcs['Brother Ashwick'], target: locs['The Capital Azurath'] },
      { source: npcs['Captain Redmane'], target: locs['Ironhold Keep'] }
    ];
    for (const c of locations) {
      await post(`/projects/${PROJECT_ID}/connections`, { source_nord_id: c.source, target_nord_id: c.target, type_id: createdConnTypes['Located At'] });
      connectionsCount++;
    }

    // 8. SET defaults
    console.log('\n8. Finalizing Project Settings...');
    await put(`/projects/${PROJECT_ID}`, {
      default_start_nord_id: ironSyndicate.id,
      default_end_nord_id: recap.id,
      default_persona_id: createdPersonas['The Instigator']
    });

    console.log(`\n🎉 Success! Created ${nordsCount} nords, ${connectionsCount} connections, 2 personas.`);
    
  } catch (err) {
    console.error('\n❌ Seeding failed:');
    console.error(err);
  }
}

seed();
