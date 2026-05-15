import fs from 'fs';

const API = 'http://localhost:3000/api';

console.log(`🚀 Seeding The Ethnographic Pet Care Interview Demo\n`);

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
    const PROJECT_NAME = "Pet Care Ethnographic Study";
    
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
      purpose: "AI-conducted user research interview for pet care product innovation",
      icon: "Search",
      mcp_enabled: true,
      mcp_capture_data: true,
      mcp_mutable: true,
      mcp_system_prompt: "You are conducting an ethnographic interview about pet care routines.\n\nRULES:\n1. You are having a CONVERSATION, not administering a survey. One question at a time.\n2. Use reflective listening: repeat back what the user said before asking the next question.\n3. When the user mentions a frustration or difficulty, CREATE a new Pain Point nord using mutable tools. Capture their exact words.\n4. Connect new Pain Points to the triggering Routine via 'Triggers' connections.\n5. Do NOT suggest solutions during the interview. Discovery first, ideation after.\n6. Complete the Participant Profile required fields naturally through conversation — don't ask 'What is your monthly budget?' Ask 'Roughly what do you spend on Biscuit each month?'"
    });
    const PROJECT_ID = project.id;
    console.log(`✅ Project created: ${PROJECT_ID}`);

    // 3. CREATE NordTypes
    console.log('\n3. Creating NordTypes...');
    const types = [
      {
        name: 'Participant Profile',
        description: 'Information about the research participant.',
        icon: 'User',
        accent_color: '#3b82f6',
        properties_schema: [
          { name: 'Name', type: 'short_text', required: true },
          { name: 'Primary Pet Type', type: 'select', required: true, config: { options: ['Dog', 'Cat', 'Bird', 'Reptile', 'Small Mammal'] } },
          { name: 'Living Situation', type: 'select', required: true, config: { options: ['Apartment', 'House', 'Farm'] } },
          { name: 'Monthly Budget', type: 'currency', required: true, config: { symbol: '$' } },
          { name: 'Work Schedule', type: 'select', required: true, config: { options: ['Remote', 'Hybrid', 'Office', 'Shift'] } },
          { name: 'Primary Care Goal', type: 'short_text', required: true },
          { name: 'Biggest Frustration', type: 'long_text', required: true },
          { name: 'Tech-Savviness', type: 'select', required: true, config: { options: ['Low', 'Medium', 'High'] } },
          { name: 'Interview Consent', type: 'boolean', required: false },
          { name: 'Research Tags', type: 'multi_select', required: false, config: { options: ['First-time Owner', 'Multi-pet', 'Senior Pet', 'Rescue'] } }
        ]
      },
      {
        name: 'Care Routine',
        description: 'A recurring task the participant performs for their pet.',
        icon: 'Clock',
        accent_color: '#f59e0b',
        properties_schema: [
          { name: 'Routine Name', type: 'short_text', required: true },
          { name: 'Frequency', type: 'select', required: true, config: { options: ['Daily', 'Weekly', 'Monthly', 'As-Needed'] } },
          { name: 'Duration Minutes', type: 'number', required: true, card_row: 1 },
          { name: 'Difficulty', type: 'select', required: true, config: { options: ['Easy', 'Moderate', 'Frustrating'] } },
          { name: 'Description', type: 'long_text', required: true }
        ]
      },
      {
        name: 'Pain Point',
        description: 'A problem or frustration identified during the interview.',
        icon: 'AlertTriangle',
        accent_color: '#ef4444',
        properties_schema: [
          { name: 'Pain Name', type: 'short_text', required: true },
          { name: 'Severity Score', type: 'number', required: true, is_scale_property: true, card_row: 1 },
          { name: 'Category', type: 'multi_select', required: true, config: { options: ['Physical', 'Emotional', 'Financial', 'Time'] } },
          { name: 'Evidence URL', type: 'url', required: false },
          { name: 'Verbatim Quote', type: 'long_text', required: true }
        ]
      },
      {
        name: 'Product Concept',
        description: 'A potential solution to a pain point.',
        icon: 'Lightbulb',
        accent_color: '#10b981',
        properties_schema: [
          { name: 'Concept Name', type: 'short_text', required: true },
          { name: 'Estimated Cost', type: 'currency', required: true, config: { symbol: '$' } },
          { name: 'Target Pain Point', type: 'short_text', required: true },
          { name: 'MVP Description', type: 'long_text', required: true },
          { name: 'Market Viability', type: 'select', required: true, config: { options: ['Proven', 'Emerging', 'Speculative'] } },
          { name: 'Feasibility', type: 'percentage', required: true, card_row: 1 }
        ]
      },
      {
        name: 'Interview Status',
        description: 'Status of the ethnographic interview.',
        icon: 'CheckSquare',
        accent_color: '#6366f1',
        properties_schema: [
          { name: 'Status', type: 'short_text', required: true }
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
        name: 'Discovery Pipeline', direction: 'forward', line_style: 'solid', accent_color: '#ffb74d', 
        x_stage_labels: [{label: 'Raw Observation', position: 0.0}, {label: 'Needs Analysis', position: 0.33}, {label: 'Ideation', position: 0.66}, {label: 'Feature Proposal', position: 1.0}],
        y_stage_labels: [{label: 'Low Confidence', position: 0.0}, {label: 'Medium', position: 0.5}, {label: 'High', position: 0.8}, {label: 'Validated', position: 1.0}],
        properties_schema: [{ name: 'insight_confidence', type: 'percentage', required: false }]
      },
      { 
        name: 'Triggers', direction: 'forward', line_style: 'solid', accent_color: '#ba68c8', x_stage_labels: [],
        properties_schema: [{ name: 'frequency_correlation', type: 'select', required: false, config: { options: ['Always', 'Often', 'Sometimes'] } }]
      },
      { name: 'Complicates', direction: 'forward', line_style: 'dashed', accent_color: '#e57373', x_stage_labels: [] },
      { 
        name: 'Mitigates', direction: 'forward', line_style: 'solid', accent_color: '#81c784', x_stage_labels: [],
        properties_schema: [{ name: 'effectiveness', type: 'percentage', required: false }]
      },
      { 
        name: 'Observed During', direction: 'none', line_style: 'dotted', accent_color: '#4dd0e1', x_stage_labels: [],
        properties_schema: [{ name: 'interview_timestamp', type: 'short_text', required: false }]
      },
      { name: 'Related To', direction: 'both', line_style: 'dotted', accent_color: '#7986cb', x_stage_labels: [] }
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
        name: 'The Empathic UX Researcher',
        avatar_seed: 'researcher',
        accent_color: '#3b82f6',
        background: 'An experienced user researcher focused on active listening and discovering unmet needs.',
        primary_motivation: 'Understand the user\'s true pain points without leading the witness.',
        voice_and_tone: 'Warm, curious, uses "tell me more", "that\'s really interesting", "I hear you".',
        temperature: 0.8,
        mental_models: [
          'Active Listening Framework: Never ask more than one question at a time. After the participant responds, reflect back what you heard before probing deeper. Use phrases like "It sounds like..." and "Help me understand..." Emotional validation before data collection.',
          'Pain Point Discovery: Pain points should emerge from conversation, not from checklists. When a participant mentions frustration, create a new Pain Point nord immediately. Connect it to the triggering routine. Capture their exact words in the Verbatim Quote field.'
        ],
        guardrails: [
          { mode: 'never', text: 'NEVER suggest a product solution during the discovery phase. Your job is to listen, not to sell.' }
        ]
      },
      {
        name: 'The Ruthless Product Manager',
        avatar_seed: 'pm',
        accent_color: '#ef4444',
        background: 'A business-focused product leader who kills weak ideas fast.',
        primary_motivation: 'Find viable, scalable product concepts with clear unit economics.',
        voice_and_tone: 'Blunt, metric-driven, uses "unit economics", "kill the feature", "show me the data".',
        temperature: 0.4,
        mental_models: [
          'MVP Ruthlessness: Every product concept must answer: (1) Does it address a Severity ≥ 7 pain point? (2) Can it be built for < $50/month to the user? (3) Does it have a "Proven" or "Emerging" market? If any answer is no, it doesn\'t advance.',
          'Monetization Path: Free solutions don\'t build businesses. For every concept, define: pricing model, acquisition channel, retention hook. No monetization path = no feature proposal.'
        ],
        guardrails: [
          { mode: 'always', text: 'ALWAYS check the participant\'s Monthly Budget before advancing any Product Concept to "Feature Proposal". If estimated cost > monthly budget, the concept stays at "Ideation".' },
          { mode: 'always', text: 'ALWAYS calculate addressable market: severity × frequency correlation × market size. Below threshold = kill the concept.' }
        ]
      }
    ];

    const createdPersonas = {};
    for (const p of personas) {
      const pRes = await post(`/projects/${PROJECT_ID}/personas`, p);
      createdPersonas[p.name] = pRes.id;
      console.log(`   - Created Persona: ${p.name}`);
      
      if (p.name === 'The Empathic UX Researcher') {
        await put(`/personas/${pRes.id}/weights/${createdConnTypes['Triggers']}`, { weight: 100 });
        await put(`/personas/${pRes.id}/weights/${createdConnTypes['Complicates']}`, { weight: 90 });
        await put(`/personas/${pRes.id}/weights/${createdConnTypes['Discovery Pipeline']}`, { weight: 40 });
        await put(`/personas/${pRes.id}/weights/${createdConnTypes['Mitigates']}`, { weight: 20 });
        await put(`/personas/${pRes.id}/weights/${createdConnTypes['Observed During']}`, { weight: 60 });
        await put(`/personas/${pRes.id}/weights/${createdConnTypes['Related To']}`, { weight: 50 });
      } else if (p.name === 'The Ruthless Product Manager') {
        await put(`/personas/${pRes.id}/weights/${createdConnTypes['Mitigates']}`, { weight: 100 });
        await put(`/personas/${pRes.id}/weights/${createdConnTypes['Discovery Pipeline']}`, { weight: 90 });
        await put(`/personas/${pRes.id}/weights/${createdConnTypes['Triggers']}`, { weight: 30 });
        await put(`/personas/${pRes.id}/weights/${createdConnTypes['Complicates']}`, { weight: 20 });
        await put(`/personas/${pRes.id}/weights/${createdConnTypes['Observed During']}`, { weight: 10 });
        await put(`/personas/${pRes.id}/weights/${createdConnTypes['Related To']}`, { weight: 40 });
      }
    }

    // 6. CREATE Nords
    console.log('\n6. Creating Nords (SPARSE)...');
    let nordsCount = 0;
    
    // Sarah (Center)
    const sarah = await post(`/projects/${PROJECT_ID}/nords`, {
      type_id: createdTypes['Participant Profile'],
      title: 'Sarah & Biscuit',
      position_x: 0.500,
      position_y: 0.500,
      properties: {
        'Name': 'Sarah',
        'Primary Pet Type': 'Dog',
        'Living Situation': 'Apartment',
        'Primary Care Goal': 'Keeping Biscuit healthy and happy',
        'Tech-Savviness': 'High'
      }
    }); nordsCount++;

    const statusNode = await post(`/projects/${PROJECT_ID}/nords`, {
      type_id: createdTypes['Interview Status'],
      title: 'Interview Complete',
      position_x: 0.700,
      position_y: 0.700,
      properties: { Status: 'Pending' }
    }); nordsCount++;

    // Routines (Ring around Sarah)
    const routinesData = [
      { title: 'Morning Walk', props: { 'Routine Name': 'Morning Walk', Frequency: 'Daily', 'Duration Minutes': 30, Difficulty: 'Frustrating', Description: 'Walk around the neighborhood before work.' }, x: -200, y: -200 },
      { title: 'Flea Medication', props: { 'Routine Name': 'Flea Medication', Frequency: 'Monthly', 'Duration Minutes': 15, Difficulty: 'Frustrating', Description: 'Topical application on the back of the neck.' }, x: 200, y: -200 },
      { title: 'Meal Prep', props: { 'Routine Name': 'Meal Prep', Frequency: 'Daily', 'Duration Minutes': 10, Difficulty: 'Easy', Description: 'Mixing kibble with wet food.' }, x: -200, y: 200 },
      { title: 'Vet Visits', props: { 'Routine Name': 'Vet Visits', Frequency: 'Monthly', 'Duration Minutes': 120, Difficulty: 'Moderate', Description: 'Routine checkups and vaccinations.' }, x: 200, y: 200 }
    ];
    const routines = {};
    for (const r of routinesData) {
      const n = await post(`/projects/${PROJECT_ID}/nords`, { type_id: createdTypes['Care Routine'], title: r.title, position_x: r.x, position_y: r.y, properties: r.props });
      routines[r.title] = n.id; nordsCount++;
    }

    // Pain Point (Just 1)
    const reactivity = await post(`/projects/${PROJECT_ID}/nords`, {
      type_id: createdTypes['Pain Point'],
      title: 'Leash Reactivity',
      position_x: 0.300,
      position_y: 0.400,
      properties: {
        'Pain Name': 'Leash Reactivity',
        'Severity Score': 8,
        'Category': ['Physical', 'Emotional'],
        'Verbatim Quote': 'He just loses his mind when he sees another dog on leash.'
      }
    }); nordsCount++;

    // Product Concept (Just 1)
    const harness = await post(`/projects/${PROJECT_ID}/nords`, {
      type_id: createdTypes['Product Concept'],
      title: 'Calming Harness',
      position_x: 0.250,
      position_y: 0.500,
      properties: {
        'Concept Name': 'Calming Harness with Pressure Points',
        'Estimated Cost': 45,
        'Target Pain Point': 'Leash Reactivity',
        'MVP Description': 'A harness that applies gentle pressure to calming points when the dog pulls.',
        'Market Viability': 'Emerging',
        'Feasibility': 75
      }
    }); nordsCount++;

    // 7. CREATE Connections (Only 12 pre-seeded)
    console.log('\n7. Creating Connections...');
    let connectionsCount = 0;

    await post(`/projects/${PROJECT_ID}/connections`, { source_nord_id: routines['Morning Walk'], target_nord_id: reactivity.id, type_id: createdConnTypes['Triggers'], properties: { frequency_correlation: 'Always' } }); connectionsCount++;
    await post(`/projects/${PROJECT_ID}/connections`, { source_nord_id: reactivity.id, target_nord_id: routines['Morning Walk'], type_id: createdConnTypes['Complicates'] }); connectionsCount++;
    await post(`/projects/${PROJECT_ID}/connections`, { source_nord_id: reactivity.id, target_nord_id: harness.id, type_id: createdConnTypes['Discovery Pipeline'], distance_x: 0.1, distance_y: 0.5, properties: { insight_confidence: 60 } }); connectionsCount++;
    await post(`/projects/${PROJECT_ID}/connections`, { source_nord_id: routines['Morning Walk'], target_nord_id: sarah.id, type_id: createdConnTypes['Observed During'], properties: { interview_timestamp: '00:02:15' } }); connectionsCount++;
    await post(`/projects/${PROJECT_ID}/connections`, { source_nord_id: routines['Flea Medication'], target_nord_id: sarah.id, type_id: createdConnTypes['Observed During'], properties: { interview_timestamp: '00:05:30' } }); connectionsCount++;
    await post(`/projects/${PROJECT_ID}/connections`, { source_nord_id: routines['Meal Prep'], target_nord_id: sarah.id, type_id: createdConnTypes['Observed During'], properties: { interview_timestamp: '00:08:10' } }); connectionsCount++;
    await post(`/projects/${PROJECT_ID}/connections`, { source_nord_id: routines['Vet Visits'], target_nord_id: sarah.id, type_id: createdConnTypes['Observed During'], properties: { interview_timestamp: '00:10:00' } }); connectionsCount++;

    // 8. SET defaults
    console.log('\n8. Finalizing Project Settings...');
    await put(`/projects/${PROJECT_ID}`, {
      default_start_nord_id: sarah.id,
      default_end_nord_id: statusNode.id,
      default_persona_id: createdPersonas['The Empathic UX Researcher']
    });

    console.log(`\n🎉 Success! Created ${nordsCount} nords, ${connectionsCount} connections, 2 personas.`);
    
  } catch (err) {
    console.error('\n❌ Seeding failed:');
    console.error(err);
  }
}

seed();
