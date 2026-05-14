import fs from 'fs';

const API = 'http://localhost:3000/api';
// You can pass the project ID as an argument: node seed_proposal_demo.mjs <project_id>
// Fallback to the default development project ID:
const PROJECT_ID = process.argv[2] || '5413fc94-3245-4153-9641-b9d025367e1d';

console.log(`🚀 Seeding Proposal Director Demo for Project: ${PROJECT_ID}\n`);

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

// ── Run Seed ──
async function seed() {
  try {
    console.log('1. Configuring Project MCP Prompt...');
    
    const systemPrompt = `You are the "Proposal Director," an MCP-enabled AI agent operating within the Nords spatial graph engine. Your objective is to guide users through our digital agency's Request for Proposal (RFP) lifecycle.

REWORK RULES:
- When a Review Gate status = "Failed":
  1. Do NOT advance distance_x on the Proposal Stage connection
  2. Increment the Opportunity's "Review Attempts" counter
  3. Create an action item list from the Review Gate's Findings
  4. Guide the user through corrections
  5. When corrections are complete, create a NEW Review Gate Nord
  6. The previous failed Review Gate remains in the graph as history

PERSONA ORCHESTRATION:
When the Opportunity enters a new stage, suggest the optimal persona:
- Triage & Strategy -> Proposal Director
- Design -> Resource Strategist
- Pink & Red Reviews -> QA Reviewer
- Gold/Submit -> Proposal Writer

When advancing to a new stage, tell the user:
"This stage is best served by the [Persona Name] perspective. Switch to the [Persona Name] lens in the dock to see the graph weighted for their priorities."`;

    await put(`/projects/${PROJECT_ID}`, {
      mcp_enabled: true,
      mcp_mutable: true,
      mcp_system_prompt: systemPrompt
    });
    console.log('✅ Project MCP Configured.');

    console.log('\n2. Creating NordTypes...');
    const types = [
      {
        name: 'Opportunity',
        description: 'The RFP itself — the root node of every proposal graph.',
        icon: 'FileText',
        accent_color: '#f59e0b',
        properties_schema: [
          { name: 'Client Name', type: 'short_text', required: true },
          { name: 'Industry', type: 'select', required: true, config: { options: ['Healthcare', 'FinTech', 'SaaS', 'Retail'] } },
          { name: 'Budget Range', type: 'select', required: true, config: { options: ['<$50K', '$50K–$150K', '$150K–$500K', '>$500K'] } },
          { name: 'Stated Budget', type: 'currency', required: false, config: { symbol: '$' } },
          { name: 'Go/No-Go Decision', type: 'select', required: true, config: { options: ['Pending', 'Go', 'No-Go'] } },
          { name: 'Win Probability', type: 'percentage', required: false, card_row: 1 },
          { name: 'Review Attempts', type: 'number', required: false, config: { default: 0 } },
          { name: 'Scope Summary', type: 'long_text', required: true }
        ]
      },
      {
        name: 'Team Member',
        description: 'A person on the agency roster.',
        icon: 'User',
        accent_color: '#3b82f6',
        properties_schema: [
          { name: 'Role', type: 'select', required: true, config: { options: ['Engineering Lead', 'Senior Developer', 'Mid Developer', 'UX Designer', 'Solutions Architect'] } },
          { name: 'Seniority', type: 'select', required: true, config: { options: ['Principal', 'Senior', 'Mid', 'Junior'] } },
          { name: 'Skills', type: 'multi_select', required: true, config: { options: ['React', 'Node.js', 'Python', 'AWS', 'GCP', 'Figma'] } },
          { name: 'Hourly Rate', type: 'currency', required: true, config: { symbol: '$' } },
          { name: 'Current Utilization', type: 'percentage', required: true, card_row: 1 },
          { name: 'Weekly Capacity', type: 'number', required: true, config: { default: 40 } }
        ]
      },
      {
        name: 'External Resource',
        description: 'A contractor needed to fill a skill gap.',
        icon: 'UserPlus',
        accent_color: '#8b5cf6',
        properties_schema: [
          { name: 'Role Needed', type: 'short_text', required: true },
          { name: 'Skills Needed', type: 'multi_select', required: true, config: { options: ['React', 'Node.js', 'Python', 'AWS', 'GCP', 'Figma'] } },
          { name: 'Estimated Rate', type: 'currency', required: true, config: { symbol: '$' }, card_row: 1 },
          { name: 'Weekly Capacity', type: 'number', required: true }
        ]
      },
      {
        name: 'Solution Phase',
        description: 'A major workstream in the proposal.',
        icon: 'Layers',
        accent_color: '#10b981',
        properties_schema: [
          { name: 'Phase Type', type: 'select', required: true, config: { options: ['Discovery', 'Architecture', 'Design', 'Development', 'Testing'] } },
          { name: 'Estimated Hours', type: 'number', required: true, card_row: 1 },
          { name: 'Duration Weeks', type: 'number', required: true }
        ]
      },
      {
        name: 'Resource Allocation',
        description: 'Bridges a person and a phase.',
        icon: 'PieChart',
        accent_color: '#0ea5e9',
        properties_schema: [
          { name: 'Allocated Hours', type: 'number', required: true, card_row: 1 },
          { name: 'Effective Rate', type: 'currency', required: true, config: { symbol: '$' }, card_row: 2 },
          { name: 'Line Cost', type: 'computed', required: false, card_row: 3, config: { formula: 'Allocated Hours * Effective Rate', output_type: 'currency', output_config: { symbol: '$' } } }
        ]
      },
      {
        name: 'Review Gate',
        description: 'Formal review checkpoint.',
        icon: 'ShieldCheck',
        accent_color: '#ef4444',
        properties_schema: [
          { name: 'Review Type', type: 'select', required: true, config: { options: ['Pink', 'Red', 'Gold'] } },
          { name: 'Status', type: 'select', required: true, config: { options: ['Scheduled', 'In Review', 'Passed', 'Failed', 'Conditional'] }, card_row: 1 },
          { name: 'Margin Validated', type: 'boolean', required: true },
          { name: 'Findings', type: 'long_text', required: false }
        ]
      },
      {
        name: 'Proposal Document',
        description: 'The final deliverable artifact.',
        icon: 'FileCheck',
        accent_color: '#6366f1',
        properties_schema: [
          { name: 'Format', type: 'select', required: true, config: { options: ['PDF', 'Google Slides', 'Web'] } },
          { name: 'Total Price', type: 'currency', required: true, config: { symbol: '$' }, card_row: 1 },
          { name: 'Target Margin', type: 'percentage', required: true, card_row: 2 },
          { name: 'Actual Margin', type: 'computed', required: false, card_row: 3, config: { formula: '(Total Price - Total Cost) / Total Price * 100', output_type: 'percentage' } },
          { name: 'Executive Summary', type: 'long_text', required: false }
        ]
      }
    ];

    const createdTypes = {};
    for (const t of types) {
      const typeRes = await post(`/projects/${PROJECT_ID}/nord-types`, t);
      createdTypes[t.name] = typeRes.id;
      console.log(`   - Created Type: ${t.name}`);
    }

    console.log('\n3. Creating ConnectionTypes...');
    const connTypes = [
      { name: 'Proposal Stage', direction: 'forward', line_style: 'solid', color: '#6366f1', x_stage_labels: [{label: 'Triage', position: 0.0}, {label: 'Strategy', position: 0.17}, {label: 'Design', position: 0.33}, {label: 'Pink Review', position: 0.5}, {label: 'Red Review', position: 0.67}, {label: 'Gold/Submit', position: 0.83}, {label: 'Kickoff', position: 1.0}] },
      { name: 'Assigned To', direction: 'forward', line_style: 'solid', color: '#3b82f6', x_stage_labels: [] },
      { name: 'Scopes Into', direction: 'forward', line_style: 'solid', color: '#8b5cf6', x_stage_labels: [] },
      { name: 'Allocates', direction: 'forward', line_style: 'dashed', color: '#10b981', x_stage_labels: [] },
      { name: 'Blocks', direction: 'forward', line_style: 'dashed', color: '#ef4444', x_stage_labels: [] },
      { name: 'Reviews', direction: 'forward', line_style: 'dotted', color: '#f59e0b', x_stage_labels: [] },
      { name: 'Skill Match', direction: 'forward', line_style: 'dotted', color: '#06b6d4', x_stage_labels: [{label: 'Weak', position: 0.0}, {label: 'Partial', position: 0.33}, {label: 'Exact', position: 0.67}, {label: 'Overqualified', position: 1.0}] }
    ];

    const createdConnTypes = {};
    for (const ct of connTypes) {
      const ctRes = await post(`/projects/${PROJECT_ID}/connection-types`, ct);
      createdConnTypes[ct.name] = ctRes.id;
      console.log(`   - Created ConnectionType: ${ct.name}`);
    }

    console.log('\n4. Creating Personas...');
    const personas = [
      {
        name: 'Proposal Director',
        avatar_seed: 'director',
        accent_color: '#f59e0b',
        background: '15 years managing $1M+ digital agency proposals.',
        primary_motivation: 'Win the engagement with an accurate, compelling proposal.',
        voice_and_tone: 'Structured, decisive, asks probing questions.',
        temperature: 0.7,
        guardrails: [{ mode: 'always', text: 'Verify margin meets target before advancing to Review.' }, { mode: 'never', text: 'Accept TBD as a final answer.' }]
      },
      {
        name: 'Resource Strategist',
        avatar_seed: 'strategist',
        accent_color: '#10b981',
        background: 'Former management consultant turned agency resource manager.',
        primary_motivation: 'Staff proposals with the right people at the right rates.',
        voice_and_tone: 'Analytical, data-driven. Speaks in percentages.',
        temperature: 0.4,
        guardrails: [{ mode: 'never', text: 'Overbook a resource past 90% utilization.' }]
      },
      {
        name: 'QA Reviewer',
        avatar_seed: 'qa',
        accent_color: '#ef4444',
        background: 'Independent reviewer who evaluates proposals from the client perspective.',
        primary_motivation: 'Find every weakness before the client does.',
        voice_and_tone: 'Skeptical, detail-oriented.',
        temperature: 0.5,
        guardrails: [{ mode: 'always', text: 'Scrutinize pricing and capacity claims.' }]
      },
      {
        name: 'Proposal Writer',
        avatar_seed: 'writer',
        accent_color: '#8b5cf6',
        background: 'Award-winning proposal writer. 200+ winning responses.',
        primary_motivation: 'Create a proposal so compelling the client cannot choose anyone else.',
        voice_and_tone: 'Persuasive, polished, client-facing.',
        temperature: 0.9, // Adjusted from 1.2 per plan feedback
        guardrails: [{ mode: 'always', text: 'Lead with client benefit before describing our approach.' }]
      }
    ];

    const createdPersonas = {};
    for (const p of personas) {
      const pRes = await post(`/projects/${PROJECT_ID}/personas`, p);
      createdPersonas[p.name] = pRes.id;
      console.log(`   - Created Persona: ${p.name}`);
      
      // Inject category weights to prove the 'Persona Pivot' wow moment
      if (p.name === 'Proposal Director') {
        await put(`/personas/${pRes.id}/weights/${createdConnTypes['Proposal Stage']}`, { weight: 100 });
        await put(`/personas/${pRes.id}/weights/${createdConnTypes['Blocks']}`, { weight: 90 });
      } else if (p.name === 'Resource Strategist') {
        await put(`/personas/${pRes.id}/weights/${createdConnTypes['Assigned To']}`, { weight: 100 });
        await put(`/personas/${pRes.id}/weights/${createdConnTypes['Skill Match']}`, { weight: 90 });
        await put(`/personas/${pRes.id}/weights/${createdConnTypes['Proposal Stage']}`, { weight: 20 });
      }
    }

    console.log('\n5. Creating Nords (Seed Data)...');
    
    // Team Members — top row, spread horizontally
    const teamMembers = [
      { name: 'Alex Chen', x: 0.30, y: 0.15, props: { 'Role': 'Solutions Architect', 'Seniority': 'Principal', 'Skills': ['React', 'Node.js', 'AWS'], 'Hourly Rate': 250, 'Current Utilization': 110 } },
      { name: 'Sarah Kim', x: 0.45, y: 0.15, props: { 'Role': 'Engineering Lead', 'Seniority': 'Senior', 'Skills': ['React', 'Node.js', 'AWS'], 'Hourly Rate': 200, 'Current Utilization': 60 } },
      { name: 'Priya Patel', x: 0.60, y: 0.15, props: { 'Role': 'Mid Developer', 'Seniority': 'Mid', 'Skills': ['React', 'Node.js'], 'Hourly Rate': 150, 'Current Utilization': 40 } },
      { name: 'Maya Torres', x: 0.75, y: 0.15, props: { 'Role': 'UX Designer', 'Seniority': 'Senior', 'Skills': ['Figma'], 'Hourly Rate': 180, 'Current Utilization': 55 } }
    ];

    const createdNodes = {};
    for (const tm of teamMembers) {
      const nRes = await post(`/projects/${PROJECT_ID}/nords`, { title: tm.name, type_id: createdTypes['Team Member'], properties: tm.props, position_x: tm.x, position_y: tm.y });
      createdNodes[tm.name] = nRes.id;
    }
    console.log('   - Created Team Members');

    // The Blocked Opportunity ("In Media Res")
    const oppRes = await post(`/projects/${PROJECT_ID}/nords`, {
      title: 'Project Apex',
      type_id: createdTypes['Opportunity'],
      position_x: 0.35, position_y: 0.40,
      properties: { 'Client Name': 'Acme Corp', 'Industry': 'SaaS', 'Budget Range': '$150K–$500K', 'Go/No-Go Decision': 'Go', 'Win Probability': 85, 'Scope Summary': 'Enterprise React migration with zero-downtime AWS cutover.' }
    });
    createdNodes['Project Apex'] = oppRes.id;
    console.log('   - Created Opportunity: Project Apex');

    const phaseRes = await post(`/projects/${PROJECT_ID}/nords`, {
      title: 'Architecture & Migration',
      type_id: createdTypes['Solution Phase'],
      position_x: 0.55, position_y: 0.40,
      properties: { 'Phase Type': 'Architecture', 'Estimated Hours': 80, 'Duration Weeks': 4 }
    });
    createdNodes['Architecture Phase'] = phaseRes.id;

    const allocationRes = await post(`/projects/${PROJECT_ID}/nords`, {
      title: 'Lead Architect Block',
      type_id: createdTypes['Resource Allocation'],
      position_x: 0.55, position_y: 0.60,
      properties: { 'Allocated Hours': 40, 'Effective Rate': 250 }
    });
    createdNodes['Lead Architect Block'] = allocationRes.id;

    // A Review Gate
    const reviewRes = await post(`/projects/${PROJECT_ID}/nords`, {
      title: 'Design Lock Gate',
      type_id: createdTypes['Review Gate'],
      position_x: 0.75, position_y: 0.40,
      properties: { 'Review Type': 'Pink', 'Status': 'Failed', 'Margin Validated': false, 'Findings': 'Critical staffing bottleneck: Alex Chen is at 110% utilization. Cannot proceed.' }
    });
    createdNodes['Failed Design Lock'] = reviewRes.id;


    console.log('\n6. Connecting the Graph (The Crisis State)...');
    
    // Opportunity is at Design stage (0.33)
    await post(`/projects/${PROJECT_ID}/connections`, { source_nord_id: createdNodes['Project Apex'], target_nord_id: createdNodes['Architecture Phase'], type_id: createdConnTypes['Scopes Into'] });
    await post(`/projects/${PROJECT_ID}/connections`, { source_nord_id: createdNodes['Project Apex'], target_nord_id: createdNodes['Failed Design Lock'], type_id: createdConnTypes['Proposal Stage'], distance_x: 0.33 });
    
    await post(`/projects/${PROJECT_ID}/connections`, { source_nord_id: createdNodes['Architecture Phase'], target_nord_id: createdNodes['Lead Architect Block'], type_id: createdConnTypes['Allocates'] });
    await post(`/projects/${PROJECT_ID}/connections`, { source_nord_id: createdNodes['Lead Architect Block'], target_nord_id: createdNodes['Alex Chen'], type_id: createdConnTypes['Assigned To'] });

    // The Blocker visual
    await post(`/projects/${PROJECT_ID}/connections`, { source_nord_id: createdNodes['Alex Chen'], target_nord_id: createdNodes['Failed Design Lock'], type_id: createdConnTypes['Blocks'] });

    // Spectrum Connections (Skill Matches) - Visual Wow Moment
    await post(`/projects/${PROJECT_ID}/connections`, { source_nord_id: createdNodes['Project Apex'], target_nord_id: createdNodes['Alex Chen'], type_id: createdConnTypes['Skill Match'], distance_x: 0.66 }); // Partial/Strong
    await post(`/projects/${PROJECT_ID}/connections`, { source_nord_id: createdNodes['Project Apex'], target_nord_id: createdNodes['Sarah Kim'], type_id: createdConnTypes['Skill Match'], distance_x: 1.0 }); // Exact
    await post(`/projects/${PROJECT_ID}/connections`, { source_nord_id: createdNodes['Project Apex'], target_nord_id: createdNodes['Priya Patel'], type_id: createdConnTypes['Skill Match'], distance_x: 0.33 }); // Weak

    console.log('✅ Connections Built.');

    // ── 7. RFP Details NordType (Completeness Demo) ──
    console.log('\n7. Creating RFP Details NordType (completeness demo)...');
    const rfpType = await post(`/projects/${PROJECT_ID}/nord-types`, {
      name: 'RFP Details',
      description: 'Captures the full RFP intake — required fields drive the completeness bar.',
      icon: 'ClipboardList',
      accent_color: '#f97316',
      properties_schema: [
        { name: 'Issuing Organization', type: 'short_text', required: true, card_row: 1 },
        { name: 'RFP Title', type: 'short_text', required: true, card_row: 2 },
        { name: 'Issue Date', type: 'date', required: true },
        { name: 'Submission Deadline', type: 'date', required: true, card_row: 3 },
        { name: 'Scope of Work', type: 'long_text', required: true },
        { name: 'Budget Ceiling', type: 'currency', required: true, config: { symbol: '$' } },
        { name: 'Evaluation Criteria', type: 'long_text', required: true },
        { name: 'Mandatory Requirements', type: 'long_text', required: true },
        { name: 'Key Questions', type: 'long_text', required: true },
        { name: 'Submission Format', type: 'select', required: true, config: { options: ['PDF', 'Portal Upload', 'Email', 'Physical'] } },
        { name: 'Point of Contact', type: 'short_text', required: true },
        { name: 'Contact Email', type: 'short_text', required: true },
        { name: 'Our Initial Insights', type: 'long_text', required: false },
        { name: 'Competitive Intel', type: 'long_text', required: false }
      ]
    });
    createdTypes['RFP Details'] = rfpType.id;
    console.log('   - Created Type: RFP Details (12 required fields)');

    // Create RFP Nord — PARTIALLY complete (8/12 filled → shows progress bar)
    const rfpNord = await post(`/projects/${PROJECT_ID}/nords`, {
      title: 'Acme Corp RFP #2026-0417',
      type_id: rfpType.id,
      position_x: 0.15, position_y: 0.40,
      properties: {
        'Issuing Organization': 'Acme Corp',
        'RFP Title': 'Enterprise Platform Modernization',
        'Issue Date': '2026-05-01',
        'Submission Deadline': '2026-06-15',
        'Scope of Work': 'Full-stack React migration of legacy .NET monolith to microservices on AWS ECS. Includes CI/CD pipeline, zero-downtime cutover, and 90-day hypercare.',
        'Budget Ceiling': 450000,
        'Point of Contact': 'Jennifer Walsh, VP Engineering',
        'Contact Email': 'j.walsh@acmecorp.com',
        // Intentionally MISSING: Evaluation Criteria, Mandatory Requirements, Key Questions, Submission Format
        // This creates the 8/12 progress bar on the card
      }
    });
    createdNodes['Acme RFP'] = rfpNord.id;
    console.log(`   - Created RFP Nord (mcp_complete: ${rfpNord.mcp_complete}) — should be FALSE`);

    // Connect RFP to the Opportunity
    await post(`/projects/${PROJECT_ID}/connections`, {
      source_nord_id: createdNodes['Acme RFP'],
      target_nord_id: createdNodes['Project Apex'],
      type_id: createdConnTypes['Scopes Into']
    });
    console.log('   - Connected RFP → Opportunity');

    // ── 8. MCP Session with Traversal History ──
    console.log('\n8. Creating MCP Session with traversal history...');

    const session = await post(`/projects/${PROJECT_ID}/mcp-sessions`, {
      persona_id: createdPersonas['Proposal Director']
    });
    console.log(`   - Created Session: ${session.id}`);

    // Log Nord visits (the agent's journey)
    await post(`/mcp-sessions/${session.id}/visits`, {
      nord_id: rfpNord.id,
      visit_type: 'create',
      properties_after: rfpNord.properties,
      context: { reason: 'User submitted RFP intake form', persona: 'Proposal Director' }
    });

    await post(`/mcp-sessions/${session.id}/visits`, {
      nord_id: rfpNord.id,
      visit_type: 'update',
      properties_before: {},
      properties_after: rfpNord.properties,
      context: {
        reason: 'Populated 8 of 12 required fields from RFP document',
        fields_set: ['Issuing Organization', 'RFP Title', 'Issue Date', 'Submission Deadline', 'Scope of Work', 'Budget Ceiling', 'Point of Contact', 'Contact Email'],
        completion_delta: { before: 0, after: 66.7 }
      }
    });

    await post(`/mcp-sessions/${session.id}/visits`, {
      nord_id: createdNodes['Project Apex'],
      visit_type: 'inspect',
      context: { reason: 'Checking Opportunity Go/No-Go status', persona: 'Proposal Director', mental_model: 'The Pursuit Filter' }
    });

    console.log('   - Logged 3 Nord visits');
    console.log('\n🎉 Proposal Director Demo Seeded Successfully!');
    console.log('   RFP card will show 8/12 progress bar (completeness feature)');
    console.log('   Session has traversal history for audit replay');

  } catch (err) {
    console.error('❌ Seeding failed:', err);
  }
}

seed();
