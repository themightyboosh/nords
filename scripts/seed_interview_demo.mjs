import fs from 'fs';

const API = 'http://localhost:3000/api';

console.log(`🚀 Seeding The Multi-Role Design Job Interview Demo\n`);

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
    const PROJECT_NAME = "Acme Design Talent Pipeline";
    
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
      purpose: "AI-assisted design candidate evaluation across multiple open roles",
      icon: "Briefcase",
      mcp_enabled: true,
      mcp_capture_data: true,
      mcp_mutable: true,
      mcp_system_prompt: "You are an AI recruiting assistant evaluating design candidates.\n\nRULES:\n1. Complete the candidate profile before evaluating any role fit.\n2. Evaluate ONE role at a time. Finish skill-mapping before moving to the next.\n3. When evaluating fit, traverse: Candidate → Portfolio Pieces → Skills → Role Requirements.\n4. Always check 'Requires' connections marked 'Must-Have' before recommending.\n5. Present fit scores with specific evidence from portfolio pieces.\n6. If a candidate is strong for one role but weak for another, say so explicitly."
    });
    const PROJECT_ID = project.id;
    console.log(`✅ Project created: ${PROJECT_ID}`);

    // 3. CREATE NordTypes
    console.log('\n3. Creating NordTypes...');
    const types = [
      {
        name: 'Candidate',
        description: 'A job applicant.',
        icon: 'User',
        accent_color: '#3b82f6',
        properties_schema: [
          { name: 'Full Name', type: 'short_text', required: true },
          { name: 'Years Experience', type: 'number', required: true },
          { name: 'Primary Toolset', type: 'multi_select', required: true, config: { options: ['Figma', 'Sketch', 'Framer', 'Storybook', 'code'] } },
          { name: 'Desired Salary', type: 'currency', required: true, config: { symbol: '$' } },
          { name: 'Willing to Relocate', type: 'boolean', required: true },
          { name: 'Portfolio URL', type: 'url', required: true },
          { name: 'Interview Date', type: 'date', required: true },
          { name: 'Career Summary', type: 'long_text', required: true }
        ]
      },
      {
        name: 'Open Role',
        description: 'An open position to fill.',
        icon: 'Briefcase',
        accent_color: '#f59e0b',
        properties_schema: [
          { name: 'Title', type: 'short_text', required: true },
          { name: 'Department', type: 'select', required: true, config: { options: ['Product', 'Brand', 'Engineering'] } },
          { name: 'Salary Range', type: 'short_text', required: true, card_row: 1 },
          { name: 'Key Requirement', type: 'long_text', required: true },
          { name: 'Headcount', type: 'number', required: true },
          { name: 'Open Date', type: 'date', required: true }
        ]
      },
      {
        name: 'Skill',
        description: 'A professional capability.',
        icon: 'Star',
        accent_color: '#10b981',
        properties_schema: [
          { name: 'Skill Name', type: 'short_text', required: true },
          { name: 'Category', type: 'select', required: true, config: { options: ['Visual', 'Systems', 'Research', 'Motion'] } },
          { name: 'Demand Level', type: 'percentage', required: true, is_scale_property: true, card_row: 1 },
          { name: 'Description', type: 'long_text', required: true }
        ]
      },
      {
        name: 'Portfolio Piece',
        description: 'A project in a candidate\'s portfolio.',
        icon: 'Image',
        accent_color: '#8b5cf6',
        properties_schema: [
          { name: 'Project Name', type: 'short_text', required: true },
          { name: 'Impact Score', type: 'number', required: true, card_row: 1 },
          { name: 'Complexity Rating', type: 'number', required: true },
          { name: 'Case Study URL', type: 'url', required: false },
          { name: 'Year Completed', type: 'date', required: false },
          { name: 'Summary', type: 'long_text', required: true }
        ]
      },
      {
        name: 'Hiring Decision',
        description: 'The final recommendation for the candidate.',
        icon: 'CheckCircle',
        accent_color: '#ef4444',
        properties_schema: [
          { name: 'Recommended Role', type: 'short_text', required: true },
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
        name: 'Recruiting Pipeline', direction: 'forward', line_style: 'solid', accent_color: '#ffb74d', 
        x_stage_labels: [{label: 'Screening', position: 0.0}, {label: 'Portfolio Review', position: 0.33}, {label: 'Technical Challenge', position: 0.66}, {label: 'Offer Stage', position: 1.0}],
        y_stage_labels: [{label: 'Strong No', position: 0.0}, {label: 'Lean No', position: 0.33}, {label: 'Lean Yes', position: 0.66}, {label: 'Strong Yes', position: 1.0}],
        properties_schema: [{ name: 'interviewer_notes', type: 'long_text', required: false }]
      },
      { 
        name: 'Demonstrates', direction: 'forward', line_style: 'solid', accent_color: '#7986cb', x_stage_labels: [],
        properties_schema: [{ name: 'proficiency_level', type: 'select', required: false, config: { options: ['Beginner', 'Intermediate', 'Expert'] } }]
      },
      { 
        name: 'Requires', direction: 'forward', line_style: 'dashed', accent_color: '#f06292', x_stage_labels: [],
        properties_schema: [{ name: 'priority', type: 'select', required: false, config: { options: ['Must-Have', 'Nice-to-Have'] } }]
      },
      { 
        name: 'Matches', direction: 'reverse', line_style: 'dotted', accent_color: '#4fc3f7', x_stage_labels: [],
        properties_schema: [{ name: 'fit_score', type: 'percentage', required: false }]
      },
      { name: 'Similar To', direction: 'none', line_style: 'dotted', accent_color: '#81c784', x_stage_labels: [] }
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
        name: 'The Visionary Creative Director',
        avatar_seed: 'visionary',
        accent_color: '#8b5cf6',
        background: 'A design leader focused on innovation, emotional resonance, and breaking boundaries.',
        primary_motivation: 'Find candidates with a unique visual voice who can elevate the brand.',
        voice_and_tone: 'Enthusiastic, uses words like "bold", "fresh perspective", "visual storytelling".',
        temperature: 0.9,
        mental_models: [
          'Visual Innovation Index: Evaluate portfolios on: (1) Originality of visual approach, (2) Emotional resonance of the design, (3) Boundary-pushing concepts vs safe choices. Weight innovation over documentation.',
          'Culture Add Assessment: Look for candidates who bring perspectives the current team lacks. A unique visual voice is worth more than perfect systems compliance.'
        ],
        guardrails: []
      },
      {
        name: 'The Pragmatic Design Ops Lead',
        avatar_seed: 'ops',
        accent_color: '#3b82f6',
        background: 'A metric-driven leader focused on scalability, documentation, and ROI.',
        primary_motivation: 'Ensure the design team works efficiently and systems scale properly.',
        voice_and_tone: 'Precise, metric-driven, uses words like "scalability", "token coverage", "handoff quality".',
        temperature: 0.3,
        mental_models: [
          'Systems Scalability Matrix: For Design Systems roles, evaluate: (1) Has the candidate built reusable components? (2) Have they documented design decisions? (3) Can they demonstrate cross-functional handoff to engineering? Missing any = high risk.',
          'ROI-per-Hire Model: Every hire must justify their salary against output. Calculate: (portfolio impact × skill breadth) / salary expectation. Flag outliers.'
        ],
        guardrails: [
          { mode: 'always', text: 'ALWAYS flag a candidate as high-risk for any Design Systems role if they have zero demonstrated component-library, design-token, or accessibility audit experience.' },
          { mode: 'never', text: 'NEVER recommend a candidate for a role if their desired salary exceeds the role\'s posted range by more than 20%.' }
        ]
      }
    ];

    const createdPersonas = {};
    for (const p of personas) {
      const pRes = await post(`/projects/${PROJECT_ID}/personas`, p);
      createdPersonas[p.name] = pRes.id;
      console.log(`   - Created Persona: ${p.name}`);
      
      if (p.name === 'The Visionary Creative Director') {
        await put(`/personas/${pRes.id}/weights/${createdConnTypes['Demonstrates']}`, { weight: 100 });
        await put(`/personas/${pRes.id}/weights/${createdConnTypes['Recruiting Pipeline']}`, { weight: 60 });
        await put(`/personas/${pRes.id}/weights/${createdConnTypes['Matches']}`, { weight: 40 });
        await put(`/personas/${pRes.id}/weights/${createdConnTypes['Requires']}`, { weight: 20 });
        await put(`/personas/${pRes.id}/weights/${createdConnTypes['Similar To']}`, { weight: 10 });
      } else if (p.name === 'The Pragmatic Design Ops Lead') {
        await put(`/personas/${pRes.id}/weights/${createdConnTypes['Requires']}`, { weight: 100 });
        await put(`/personas/${pRes.id}/weights/${createdConnTypes['Matches']}`, { weight: 90 });
        await put(`/personas/${pRes.id}/weights/${createdConnTypes['Demonstrates']}`, { weight: 50 });
        await put(`/personas/${pRes.id}/weights/${createdConnTypes['Recruiting Pipeline']}`, { weight: 30 });
        await put(`/personas/${pRes.id}/weights/${createdConnTypes['Similar To']}`, { weight: 10 });
      }
    }

    // 6. CREATE Nords
    console.log('\n6. Creating Nords...');
    let nordsCount = 0;
    
    const candidate = await post(`/projects/${PROJECT_ID}/nords`, {
      type_id: createdTypes['Candidate'],
      title: 'Alex Rivera',
      position_x: 0.300,
      position_y: 0.500,
      properties: {
        'Full Name': 'Alex Rivera',
        'Years Experience': 5,
        'Willing to Relocate': true,
        'Portfolio URL': 'https://alexrivera.design',
        'Interview Date': new Date().toISOString()
      }
    }); nordsCount++;

    const decision = await post(`/projects/${PROJECT_ID}/nords`, {
      type_id: createdTypes['Hiring Decision'],
      title: 'Final Hiring Decision',
      position_x: 0.700,
      position_y: 0.500,
      properties: {}
    }); nordsCount++;

    // Roles
    const rolesData = [
      { title: 'UI Motion Designer', props: { Title: 'UI Motion Designer', Department: 'Product', 'Salary Range': '$95K-$120K', 'Key Requirement': 'Expert level micro-interactions', Headcount: 1, 'Open Date': new Date().toISOString() }, y: -150 },
      { title: 'UX Researcher', props: { Title: 'UX Researcher', Department: 'Product', 'Salary Range': '$85K-$110K', 'Key Requirement': 'Qualitative usability testing', Headcount: 1, 'Open Date': new Date().toISOString() }, y: 0 },
      { title: 'Design Systems Lead', props: { Title: 'Design Systems Lead', Department: 'Engineering', 'Salary Range': '$130K-$160K', 'Key Requirement': 'Scale component library across 5 apps', Headcount: 1, 'Open Date': new Date().toISOString() }, y: 150 }
    ];
    const roles = {};
    for (const r of rolesData) {
      const n = await post(`/projects/${PROJECT_ID}/nords`, {
        type_id: createdTypes['Open Role'], title: r.title, position_x: 0.650, position_y: r.y, properties: r.props
      });
      roles[r.title] = n.id; nordsCount++;
    }

    // Skills
    const skillsData = [
      { title: 'Visual Design', props: { 'Skill Name': 'Visual Design', Category: 'Visual', 'Demand Level': 80, Description: 'Typography, color, layout.' }, y: -200 },
      { title: 'Motion/Animation', props: { 'Skill Name': 'Motion/Animation', Category: 'Motion', 'Demand Level': 60, Description: 'UI micro-interactions.' }, y: -150 },
      { title: 'Component Libraries', props: { 'Skill Name': 'Component Libraries', Category: 'Systems', 'Demand Level': 95, Description: 'Building reusable Figma components.' }, y: -50 },
      { title: 'Accessibility', props: { 'Skill Name': 'Accessibility', Category: 'Systems', 'Demand Level': 90, Description: 'WCAG compliance.' }, y: 0 },
      { title: 'User Research', props: { 'Skill Name': 'User Research', Category: 'Research', 'Demand Level': 70, Description: 'Conducting user interviews.' }, y: 50 },
      { title: 'Prototyping', props: { 'Skill Name': 'Prototyping', Category: 'Visual', 'Demand Level': 75, Description: 'Interactive clickable prototypes.' }, y: 100 },
      { title: 'Design Tokens', props: { 'Skill Name': 'Design Tokens', Category: 'Systems', 'Demand Level': 85, Description: 'Semantic color/typography variables.' }, y: 150 },
      { title: 'Documentation', props: { 'Skill Name': 'Documentation', Category: 'Systems', 'Demand Level': 80, Description: 'Writing clear usage guidelines.' }, y: 200 }
    ];
    const skills = {};
    for (const s of skillsData) {
      const n = await post(`/projects/${PROJECT_ID}/nords`, {
        type_id: createdTypes['Skill'], title: s.title, position_x: 0.500, position_y: s.y, properties: s.props
      });
      skills[s.title] = n.id; nordsCount++;
    }

    // Portfolio Pieces
    const piecesData = [
      { title: 'E-commerce Redesign', props: { 'Project Name': 'E-commerce Redesign', 'Impact Score': 9, 'Complexity Rating': 8, Summary: 'Redesigned checkout flow increasing conversion by 12%.' }, y: -200 },
      { title: 'Brand Motion System', props: { 'Project Name': 'Brand Motion System', 'Impact Score': 8, 'Complexity Rating': 7, Summary: 'Created lottie animations for the brand.' }, y: -100 },
      { title: 'Mobile Banking App', props: { 'Project Name': 'Mobile Banking App', 'Impact Score': 7, 'Complexity Rating': 9, Summary: 'Designed the mobile app from scratch.' }, y: 0 },
      { title: 'Icon System', props: { 'Project Name': 'Icon System', 'Impact Score': 5, 'Complexity Rating': 4, Summary: 'Drew 150 custom icons.' }, y: 100 },
      { title: 'Dashboard UI Kit', props: { 'Project Name': 'Dashboard UI Kit', 'Impact Score': 6, 'Complexity Rating': 6, Summary: 'A basic UI kit for internal tools.' }, y: 200 },
      { title: 'Onboarding Flow Animation', props: { 'Project Name': 'Onboarding Flow', 'Impact Score': 8, 'Complexity Rating': 7, Summary: 'Animated the onboarding sequence.' }, y: 250 },
      { title: 'Design System Audit', props: { 'Project Name': 'Design System Audit', 'Impact Score': 4, 'Complexity Rating': 5, Summary: 'Audited existing components for inconsistencies.' }, y: 300 }
    ];
    const pieces = {};
    for (const p of piecesData) {
      const n = await post(`/projects/${PROJECT_ID}/nords`, {
        type_id: createdTypes['Portfolio Piece'], title: p.title, position_x: 0.400, position_y: p.y, properties: p.props
      });
      pieces[p.title] = n.id; nordsCount++;
    }

    // 7. CREATE Connections
    console.log('\n7. Creating Connections...');
    let connectionsCount = 0;

    // Pipeline: Candidate -> Role
    const pipelines = [
      { source: candidate.id, target: roles['UI Motion Designer'], type: 'Recruiting Pipeline', dx: 0.9, dy: 0.8, props: { interviewer_notes: 'Amazing portfolio of animations.' } },
      { source: candidate.id, target: roles['UX Researcher'], type: 'Recruiting Pipeline', dx: 0.33, dy: 0.4, props: { interviewer_notes: 'Missing qualitative experience.' } },
      { source: candidate.id, target: roles['Design Systems Lead'], type: 'Recruiting Pipeline', dx: 0.1, dy: 0.2, props: { interviewer_notes: 'Needs assessment of systems knowledge.' } }
    ];
    for (const c of pipelines) {
      await post(`/projects/${PROJECT_ID}/connections`, { source_nord_id: c.source, target_nord_id: c.target, type_id: createdConnTypes[c.type], distance_x: c.dx, distance_y: c.dy, properties: c.props });
      connectionsCount++;
    }

    // Demonstrates: Piece -> Skill
    const demonstrates = [
      { source: pieces['Brand Motion System'], target: skills['Motion/Animation'], props: { proficiency_level: 'Expert' } },
      { source: pieces['Onboarding Flow Animation'], target: skills['Motion/Animation'], props: { proficiency_level: 'Expert' } },
      { source: pieces['Dashboard UI Kit'], target: skills['Component Libraries'], props: { proficiency_level: 'Beginner' } },
      { source: pieces['E-commerce Redesign'], target: skills['Visual Design'], props: { proficiency_level: 'Intermediate' } },
      { source: pieces['Mobile Banking App'], target: skills['Prototyping'], props: { proficiency_level: 'Expert' } },
      { source: pieces['Design System Audit'], target: skills['Documentation'], props: { proficiency_level: 'Beginner' } }
    ];
    for (const c of demonstrates) {
      await post(`/projects/${PROJECT_ID}/connections`, { source_nord_id: c.source, target_nord_id: c.target, type_id: createdConnTypes['Demonstrates'], properties: c.props });
      connectionsCount++;
    }

    // Requires: Role -> Skill
    const requires = [
      { source: roles['Design Systems Lead'], target: skills['Component Libraries'], props: { priority: 'Must-Have' } },
      { source: roles['Design Systems Lead'], target: skills['Accessibility'], props: { priority: 'Must-Have' } },
      { source: roles['Design Systems Lead'], target: skills['Design Tokens'], props: { priority: 'Must-Have' } },
      { source: roles['Design Systems Lead'], target: skills['Documentation'], props: { priority: 'Nice-to-Have' } },
      { source: roles['UI Motion Designer'], target: skills['Motion/Animation'], props: { priority: 'Must-Have' } },
      { source: roles['UI Motion Designer'], target: skills['Visual Design'], props: { priority: 'Must-Have' } },
      { source: roles['UX Researcher'], target: skills['User Research'], props: { priority: 'Must-Have' } }
    ];
    for (const c of requires) {
      await post(`/projects/${PROJECT_ID}/connections`, { source_nord_id: c.source, target_nord_id: c.target, type_id: createdConnTypes['Requires'], properties: c.props });
      connectionsCount++;
    }

    // Matches: Role <- Candidate
    const matches = [
      { source: candidate.id, target: roles['UI Motion Designer'], type: 'Matches', props: { fit_score: 95 } },
      { source: candidate.id, target: roles['UX Researcher'], type: 'Matches', props: { fit_score: 30 } },
      { source: candidate.id, target: roles['Design Systems Lead'], type: 'Matches', props: { fit_score: 40 } }
    ];
    for (const c of matches) {
      await post(`/projects/${PROJECT_ID}/connections`, { source_nord_id: c.source, target_nord_id: c.target, type_id: createdConnTypes[c.type], properties: c.props });
      connectionsCount++;
    }

    // Similar To
    await post(`/projects/${PROJECT_ID}/connections`, { source_nord_id: pieces['E-commerce Redesign'], target_nord_id: pieces['Mobile Banking App'], type_id: createdConnTypes['Similar To'] });
    connectionsCount++;

    // 8. SET default_start_nord_id, default_end_nord_id, default_persona_id on project
    console.log('\n8. Finalizing Project Settings...');
    await put(`/projects/${PROJECT_ID}`, {
      default_start_nord_id: candidate.id,
      default_end_nord_id: decision.id,
      default_persona_id: createdPersonas['The Visionary Creative Director']
    });

    console.log(`\n🎉 Success! Created ${nordsCount} nords, ${connectionsCount} connections, 2 personas.`);
    
  } catch (err) {
    console.error('\n❌ Seeding failed:');
    console.error(err);
  }
}

seed();
