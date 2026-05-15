import fs from 'fs';

const API = 'http://localhost:3000/api';

console.log(`🚀 Seeding The Intelligent Pet Matchmaker Demo\n`);

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
    const PROJECT_NAME = "Paws & Claws Adoption Center";
    
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
      purpose: "AI-assisted pet adoption matching that prevents behavioral mismatches",
      icon: "Heart",
      mcp_enabled: true,
      mcp_capture_data: true,
      mcp_mutable: true,
      mcp_system_prompt: "You are an AI adoption counselor at Paws & Claws. Your job is to interview the adopter, complete their profile, then evaluate available pets for compatibility.\n\nRULES:\n1. Ask no more than 2 profile questions per turn. Use reflective listening.\n2. Do NOT begin match evaluation until the Adopter Profile is 100% complete.\n3. When evaluating matches, traverse to each pet and check its behavioral traits against the adopter's environment.\n4. Always check 'Incompatible With' connections before advancing any pet in the pipeline.\n5. When presenting a match, cite the specific traits and environment factors that support it."
    });
    const PROJECT_ID = project.id;
    console.log(`✅ Project created: ${PROJECT_ID}`);

    // 3. CREATE NordTypes
    console.log('\n3. Creating NordTypes...');
    const types = [
      {
        name: 'Adopter Profile',
        description: 'Information about the potential adopter and their living situation.',
        icon: 'User',
        accent_color: '#3b82f6',
        properties_schema: [
          { name: 'Housing Type', type: 'select', required: true, config: { options: ['Apartment', 'House', 'Farm'] } },
          { name: 'Hours Alone', type: 'number', required: true },
          { name: 'Kids Under 12', type: 'boolean', required: true },
          { name: 'Yard Size', type: 'select', required: true, config: { options: ['None', 'Small', 'Large'] } },
          { name: 'Monthly Budget', type: 'currency', required: true, config: { symbol: '$' } },
          { name: 'Activity Level', type: 'select', required: true, config: { options: ['Low', 'Medium', 'High'] } },
          { name: 'Previous Pet Experience', type: 'long_text', required: true },
          { name: 'Application Date', type: 'date', required: true }
        ]
      },
      {
        name: 'Available Pet',
        description: 'A pet looking for a home.',
        icon: 'Heart',
        accent_color: '#f59e0b',
        properties_schema: [
          { name: 'Breed', type: 'short_text', required: true },
          { name: 'Age', type: 'number', required: true },
          { name: 'Weight', type: 'number', required: true, is_scale_property: true, card_row: 1 },
          { name: 'Energy Level', type: 'select', required: true, config: { options: ['Low', 'Medium', 'High'] } },
          { name: 'Good With Kids', type: 'boolean', required: true },
          { name: 'Adoption Fee', type: 'currency', required: true, config: { symbol: '$' } },
          { name: 'Intake Date', type: 'date', required: true },
          { name: 'Special Needs', type: 'long_text', required: false }
        ]
      },
      {
        name: 'Behavioral Trait',
        description: 'A specific behavioral characteristic of a pet.',
        icon: 'AlertCircle',
        accent_color: '#ef4444',
        properties_schema: [
          { name: 'Trait Name', type: 'short_text', required: true },
          { name: 'Severity', type: 'percentage', required: true, card_row: 1 },
          { name: 'Trainability', type: 'select', required: true, config: { options: ['Easy', 'Moderate', 'Difficult'] } },
          { name: 'Description', type: 'long_text', required: true }
        ]
      },
      {
        name: 'Home Environment',
        description: 'The physical environment of an adopter.',
        icon: 'Home',
        accent_color: '#10b981',
        properties_schema: [
          { name: 'Environment Type', type: 'short_text', required: true },
          { name: 'Space Rating', type: 'number', required: true, card_row: 1 },
          { name: 'Noise Level', type: 'select', required: true, config: { options: ['Low', 'Medium', 'High'] } },
          { name: 'Tags', type: 'multi_select', required: false, config: { options: ['Fenced', 'Urban', 'Rural', 'Stairs'] } }
        ]
      },
      {
        name: 'Placement Decision',
        description: 'The final decision on the adoption.',
        icon: 'CheckCircle',
        accent_color: '#8b5cf6',
        properties_schema: [
          { name: 'Decision', type: 'select', required: true, config: { options: ['Approved', 'Denied'] } },
          { name: 'Reasoning', type: 'long_text', required: true }
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
        name: 'Adoption Pipeline', direction: 'forward', line_style: 'solid', accent_color: '#ffb74d', 
        x_stage_labels: [{label: 'Available', position: 0.0}, {label: 'Evaluating', position: 0.33}, {label: 'Meet & Greet', position: 0.66}, {label: 'Pending', position: 1.0}],
        y_stage_labels: [{label: 'Low Fit', position: 0.0}, {label: 'Medium', position: 0.5}, {label: 'High Fit', position: 1.0}],
        properties_schema: [{ name: 'match_confidence', type: 'percentage', required: false }]
      },
      { 
        name: 'Exhibits', direction: 'forward', line_style: 'solid', accent_color: '#aed581', x_stage_labels: [],
        properties_schema: [{ name: 'intensity', type: 'select', required: false, config: { options: ['Mild', 'Moderate', 'Severe'] } }]
      },
      { name: 'Requires', direction: 'forward', line_style: 'dashed', accent_color: '#f06292', x_stage_labels: [] },
      { 
        name: 'Incompatible With', direction: 'both', line_style: 'dotted', accent_color: '#e57373', x_stage_labels: [],
        properties_schema: [{ name: 'reason', type: 'short_text', required: false }]
      },
      { name: 'Similar To', direction: 'none', line_style: 'dotted', accent_color: '#4dd0e1', x_stage_labels: [] }
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
        name: 'The Optimistic Matchmaker',
        avatar_seed: 'matchmaker',
        accent_color: '#f59e0b',
        background: 'An encouraging counselor who believes every pet has a perfect home.',
        primary_motivation: 'Find a match and suggest training or adjustments to bridge gaps.',
        voice_and_tone: 'Warm, encouraging, uses phrases like "great potential match" and "with some adjustments".',
        temperature: 0.8,
        mental_models: [
          'Creative Problem-Solving: When a trait mismatch is moderate, evaluate whether training, environmental modifications, or lifestyle adjustments could bridge the gap. Suggest specific interventions before ruling out a match.',
          'Holistic Compatibility: Evaluate the full adopter-pet relationship, not just individual trait scores. A high-energy dog with an active owner who works from home may thrive despite a small yard.'
        ],
        guardrails: []
      },
      {
        name: 'The Strict Shelter Behaviorist',
        avatar_seed: 'behaviorist',
        accent_color: '#ef4444',
        background: 'A rigorous behaviorist whose primary goal is preventing returned pets.',
        primary_motivation: 'Ensure behavioral safety and long-term placement viability.',
        voice_and_tone: 'Clinical, precise, uses phrases like "placement risk" and "behavioral contraindication".',
        temperature: 0.4,
        mental_models: [
          'Risk Assessment Matrix: For every potential match, evaluate: (1) Breed energy vs available exercise time, (2) Size vs living space, (3) Behavioral severity vs handler experience. Any single critical mismatch = no advance.',
          'Return Prevention: The goal is zero returns. A returned animal suffers behavioral regression. Err on the side of caution — a missed match is better than a failed placement.'
        ],
        guardrails: [
          { mode: 'always', text: 'NEVER advance a high-energy working breed (Husky, Border Collie, Malinois) to "Meet & Greet" if the Adopter Profile indicates an apartment AND hours alone > 6.' },
          { mode: 'always', text: 'ALWAYS flag a match as high-risk if the pet has a "Severe" intensity behavioral trait and the adopter has no previous pet experience.' }
        ]
      }
    ];

    const createdPersonas = {};
    for (const p of personas) {
      const pRes = await post(`/projects/${PROJECT_ID}/personas`, p);
      createdPersonas[p.name] = pRes.id;
      console.log(`   - Created Persona: ${p.name}`);
      
      // Inject category weights to prove the 'Persona Pivot' wow moment
      if (p.name === 'The Optimistic Matchmaker') {
        await put(`/personas/${pRes.id}/weights/${createdConnTypes['Exhibits']}`, { weight: 90 });
        await put(`/personas/${pRes.id}/weights/${createdConnTypes['Adoption Pipeline']}`, { weight: 80 });
        await put(`/personas/${pRes.id}/weights/${createdConnTypes['Requires']}`, { weight: 40 });
        await put(`/personas/${pRes.id}/weights/${createdConnTypes['Incompatible With']}`, { weight: 15 });
        await put(`/personas/${pRes.id}/weights/${createdConnTypes['Similar To']}`, { weight: 30 });
      } else if (p.name === 'The Strict Shelter Behaviorist') {
        await put(`/personas/${pRes.id}/weights/${createdConnTypes['Incompatible With']}`, { weight: 100 });
        await put(`/personas/${pRes.id}/weights/${createdConnTypes['Requires']}`, { weight: 100 });
        await put(`/personas/${pRes.id}/weights/${createdConnTypes['Exhibits']}`, { weight: 50 });
        await put(`/personas/${pRes.id}/weights/${createdConnTypes['Adoption Pipeline']}`, { weight: 20 });
        await put(`/personas/${pRes.id}/weights/${createdConnTypes['Similar To']}`, { weight: 10 });
      }
    }

    // 6. CREATE Nords
    console.log('\n6. Creating Nords...');
    let nordsCount = 0;
    
    // Adopter Profile
    const adopter = await post(`/projects/${PROJECT_ID}/nords`, {
      type_id: createdTypes['Adopter Profile'],
      title: 'Jamie Chen',
      position_x: 0.350,
      position_y: 0.500,
      properties: {
        'Housing Type': 'Apartment',
        'Kids Under 12': false,
        'Yard Size': 'None',
        'Previous Pet Experience': 'Grew up with family dogs, but this would be my first pet as an adult.',
        'Application Date': new Date().toISOString()
      }
    }); nordsCount++;

    const placementDecision = await post(`/projects/${PROJECT_ID}/nords`, {
      type_id: createdTypes['Placement Decision'],
      title: 'Final Placement Decision',
      position_x: 0.700,
      position_y: 0.500,
      properties: {}
    }); nordsCount++;

    // Available Pets
    const petsData = [
      { title: 'Husky Puppy (Zeus)', props: { Breed: 'Siberian Husky', Age: 0.5, Weight: 45, 'Energy Level': 'High', 'Good With Kids': true, 'Adoption Fee': 300, 'Intake Date': new Date().toISOString() }, y: -200 },
      { title: 'Senior Greyhound (Flash)', props: { Breed: 'Greyhound', Age: 8, Weight: 65, 'Energy Level': 'Low', 'Good With Kids': true, 'Adoption Fee': 100, 'Intake Date': new Date().toISOString() }, y: -100 },
      { title: 'Cattle Dog Mix (Bandit)', props: { Breed: 'Cattle Dog Mix', Age: 3, Weight: 40, 'Energy Level': 'High', 'Good With Kids': false, 'Adoption Fee': 150, 'Intake Date': new Date().toISOString() }, y: 0 },
      { title: 'Tabby Cat (Milo)', props: { Breed: 'Domestic Shorthair', Age: 2, Weight: 10, 'Energy Level': 'Medium', 'Good With Kids': true, 'Adoption Fee': 50, 'Intake Date': new Date().toISOString() }, y: 100 },
      { title: 'Tabby Cat (Otis)', props: { Breed: 'Domestic Shorthair', Age: 2, Weight: 10, 'Energy Level': 'Medium', 'Good With Kids': true, 'Adoption Fee': 50, 'Intake Date': new Date().toISOString() }, y: 200 },
      { title: 'Senior Chihuahua (Peanut)', props: { Breed: 'Chihuahua', Age: 10, Weight: 5, 'Energy Level': 'Low', 'Good With Kids': false, 'Adoption Fee': 50, 'Intake Date': new Date().toISOString() }, y: 300 }
    ];
    
    const pets = {};
    for (const p of petsData) {
      const n = await post(`/projects/${PROJECT_ID}/nords`, {
        type_id: createdTypes['Available Pet'],
        title: p.title,
        position_x: 0.500,
        position_y: p.y,
        properties: p.props
      });
      pets[p.title] = n.id;
      nordsCount++;
    }

    // Behavioral Traits
    const traitsData = [
      { title: 'High Energy Drive', props: { 'Trait Name': 'High Energy Drive', Severity: 90, Trainability: 'Moderate', Description: 'Requires 2+ hours of vigorous exercise daily to prevent destructive behavior.' } },
      { title: 'Separation Anxiety', props: { 'Trait Name': 'Separation Anxiety', Severity: 80, Trainability: 'Difficult', Description: 'Becomes highly distressed when left alone. May vocalize excessively or attempt to escape.' } },
      { title: 'Leash Reactivity', props: { 'Trait Name': 'Leash Reactivity', Severity: 60, Trainability: 'Moderate', Description: 'Lunges or barks at other dogs while on leash. Requires counter-conditioning.' } },
      { title: 'Good With Cats', props: { 'Trait Name': 'Good With Cats', Severity: 100, Trainability: 'Easy', Description: 'Has lived peacefully with cats and shows low prey drive.' } },
      { title: 'Gentle Disposition', props: { 'Trait Name': 'Gentle Disposition', Severity: 100, Trainability: 'Easy', Description: 'Extremely tolerant and gentle, especially around children or fragile individuals.' } }
    ];
    
    const traits = {};
    let traitY = -200;
    for (const t of traitsData) {
      const n = await post(`/projects/${PROJECT_ID}/nords`, {
        type_id: createdTypes['Behavioral Trait'],
        title: t.title,
        position_x: 0.575,
        position_y: traitY,
        properties: t.props
      });
      traits[t.title] = n.id;
      traitY += 100;
      nordsCount++;
    }

    // Home Environments
    const envsData = [
      { title: 'City Apartment', props: { 'Environment Type': 'City Apartment', 'Space Rating': 3, 'Noise Level': 'High', Tags: ['Urban', 'Stairs'] } },
      { title: 'Suburban House with Yard', props: { 'Environment Type': 'Suburban House with Yard', 'Space Rating': 8, 'Noise Level': 'Low', Tags: ['Fenced'] } },
      { title: 'Rural Property', props: { 'Environment Type': 'Rural Property', 'Space Rating': 10, 'Noise Level': 'Low', Tags: ['Rural'] } }
    ];
    
    const envs = {};
    let envY = -100;
    for (const e of envsData) {
      const n = await post(`/projects/${PROJECT_ID}/nords`, {
        type_id: createdTypes['Home Environment'],
        title: e.title,
        position_x: 0.650,
        position_y: envY,
        properties: e.props
      });
      envs[e.title] = n.id;
      envY += 100;
      nordsCount++;
    }

    // 7. CREATE Connections
    console.log('\n7. Creating Connections...');
    let connectionsCount = 0;

    // Adoption Pipeline (Pet to Adopter? Wait, pipeline is Pet -> Adopter? Usually Adopter -> Pet or Pet -> Adopter. Let's do Pet -> Adopter pipeline or Adopter -> Pet)
    // The prompt says: "Connect each of the 6 pets to Jamie at different distance_x stages"
    // Let's do Pet -> Jamie
    const pipelines = [
      { source: pets['Husky Puppy (Zeus)'], target: adopter.id, type: 'Adoption Pipeline', dx: 0.33, dy: 0.5, props: { match_confidence: 60 } },
      { source: pets['Senior Greyhound (Flash)'], target: adopter.id, type: 'Adoption Pipeline', dx: 0.66, dy: 0.8, props: { match_confidence: 85 } },
      { source: pets['Cattle Dog Mix (Bandit)'], target: adopter.id, type: 'Adoption Pipeline', dx: 0.1, dy: 0.2, props: { match_confidence: 30 } },
      { source: pets['Tabby Cat (Milo)'], target: adopter.id, type: 'Adoption Pipeline', dx: 0.1, dy: 0.5, props: { match_confidence: 70 } },
      { source: pets['Tabby Cat (Otis)'], target: adopter.id, type: 'Adoption Pipeline', dx: 0.1, dy: 0.5, props: { match_confidence: 70 } },
      { source: pets['Senior Chihuahua (Peanut)'], target: adopter.id, type: 'Adoption Pipeline', dx: 0.1, dy: 0.2, props: { match_confidence: 40 } }
    ];

    for (const c of pipelines) {
      await post(`/projects/${PROJECT_ID}/connections`, {
        source_nord_id: c.source, target_nord_id: c.target, type_id: createdConnTypes[c.type],
        distance_x: c.dx, distance_y: c.dy, properties: c.props
      });
      connectionsCount++;
    }

    // Exhibits: Pet -> Trait
    const exhibits = [
      { source: pets['Husky Puppy (Zeus)'], target: traits['High Energy Drive'], props: { intensity: 'Severe' } },
      { source: pets['Cattle Dog Mix (Bandit)'], target: traits['Leash Reactivity'], props: { intensity: 'Severe' } },
      { source: pets['Cattle Dog Mix (Bandit)'], target: traits['Separation Anxiety'], props: { intensity: 'Moderate' } },
      { source: pets['Senior Greyhound (Flash)'], target: traits['Gentle Disposition'], props: { intensity: 'Moderate' } },
      { source: pets['Tabby Cat (Milo)'], target: traits['Good With Cats'], props: { intensity: 'Moderate' } },
      { source: pets['Tabby Cat (Otis)'], target: traits['Good With Cats'], props: { intensity: 'Moderate' } }
    ];
    
    for (const c of exhibits) {
      await post(`/projects/${PROJECT_ID}/connections`, {
        source_nord_id: c.source, target_nord_id: c.target, type_id: createdConnTypes['Exhibits'],
        properties: c.props
      });
      connectionsCount++;
    }

    // Requires: Trait -> Environment
    const requires = [
      { source: traits['High Energy Drive'], target: envs['Suburban House with Yard'] },
      { source: traits['High Energy Drive'], target: envs['Rural Property'] }
    ];

    for (const c of requires) {
      await post(`/projects/${PROJECT_ID}/connections`, {
        source_nord_id: c.source, target_nord_id: c.target, type_id: createdConnTypes['Requires']
      });
      connectionsCount++;
    }

    // Incompatible With: Trait <-> Environment
    const incompat = [
      { source: traits['High Energy Drive'], target: envs['City Apartment'], props: { reason: 'Insufficient exercise space' } }
    ];

    for (const c of incompat) {
      await post(`/projects/${PROJECT_ID}/connections`, {
        source_nord_id: c.source, target_nord_id: c.target, type_id: createdConnTypes['Incompatible With'],
        properties: c.props
      });
      connectionsCount++;
    }
    
    // Incompatible With: Trait <-> Adopter (for Separation Anxiety if Hours Alone > 6, wait, Hours Alone is not set yet for Jamie, so no connection yet? Or pre-seed one for testing? Let's connect it to the apartment)
    await post(`/projects/${PROJECT_ID}/connections`, {
      source_nord_id: traits['Separation Anxiety'], target_nord_id: envs['City Apartment'], type_id: createdConnTypes['Incompatible With'],
      properties: { reason: 'Vocalization issues' }
    });
    connectionsCount++;

    // Similar To
    await post(`/projects/${PROJECT_ID}/connections`, {
      source_nord_id: pets['Tabby Cat (Milo)'], target_nord_id: pets['Tabby Cat (Otis)'], type_id: createdConnTypes['Similar To']
    });
    connectionsCount++;

    // 8. SET default_start_nord_id, default_end_nord_id, default_persona_id on project
    console.log('\n8. Finalizing Project Settings...');
    await put(`/projects/${PROJECT_ID}`, {
      default_start_nord_id: adopter.id,
      default_end_nord_id: placementDecision.id,
      default_persona_id: createdPersonas['The Optimistic Matchmaker']
    });

    console.log(`\n🎉 Success! Created ${nordsCount} nords, ${connectionsCount} connections, 2 personas.`);
    
  } catch (err) {
    console.error('\n❌ Seeding failed:');
    console.error(err);
  }
}

seed();
