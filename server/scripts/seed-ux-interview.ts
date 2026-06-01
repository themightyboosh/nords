#!/usr/bin/env node
/**
 * seed-ux-interview.ts — Creates the UX Interview test project.
 *
 * This script calls the Nords REST API to:
 * 1. Create a new project (guided mode)
 * 2. Create nord types: Participant, Quote, Theme, Pain Point, Feature Request
 * 3. Create connection types with properties_schema:
 *    Said, Relates To, Experiences, Requests
 * 4. Create nords: Alex Rivera, Quote 1-3, Theme 1-2, Pain Point 1, Feature Request 1
 * 5. Create connections between nords (with spectrum positions + properties)
 * 6. Create personas: UX Researcher, Product Manager
 * 7. Create goals: Complete Interview, Identify Themes, Synthesize Insights
 * 8. Bind goal properties
 * 9. Create test scenarios: cooperative, tangential, reluctant, rushed
 *
 * Features exercised:
 *   ✓ Connection type properties_schema (all 4 connection types)
 *   ✓ Per-connection properties (set on seed connections)
 *   ✓ hidden property type (filtered from UI but preserved in backend)
 *   ✓ defaultValue (shown as placeholder text in empty fields)
 *   ✓ Spectrum values (distance_x mapped to x_stage_labels)
 *   ✓ Verbs on all connection types
 *   ✓ Direction presets (forward, both)
 *   ✓ Boolean goals + goal edges for DAG pathing
 *   ✓ Project variables + goal bindings
 *   ✓ Persona temperature differentiation
 *
 * Usage: npx tsx scripts/seed-ux-interview.ts
 */

const BASE_URL = process.env.API_URL || 'http://localhost:3000/api';
const API_KEY = process.env.API_KEY || 'demo-api-key';

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${API_KEY}`,
};

async function api<T>(method: string, path: string, body?: unknown): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${method} ${path} failed (${res.status}): ${text}`);
  }
  return res.json() as Promise<T>;
}

async function main() {
  console.log('🧪 Creating UX Interview test project...\n');

  // ── 1. Create Project ──
  const project = await api<{ id: string }>('POST', '/projects', {
    name: 'UX Interview — Project Management Tools',
    purpose: 'Conduct semi-structured UX research interviews about project management tool usage to identify pain points, themes, and feature opportunities.',
    description: 'A real UX research interview to gather insights about project management tool usage. Tests the full MCP protocol in guided mode with connection properties, spectrum positioning, and goal-driven pathing.',
    project_mode: 'guided',
    mcp_enabled: true,
    mcp_capture_data: true,
    mcp_mutable: true,
    mcp_welcome_message: 'Hi! Thanks for joining us today. I\'m here to learn about your experience with project management tools. There are no right or wrong answers — I\'m just interested in your honest perspective.',
    mcp_system_prompt: 'You are a UX researcher conducting a semi-structured interview about project management tool usage. Use active listening techniques: reflect back what the user says, ask follow-up probes, and validate their experiences. Your goal is to understand their workflows, pain points, and unmet needs — not to sell or recommend anything.',
  });
  const pid = project.id;
  console.log(`  ✅ Project created: ${pid}`);

  // ── 2. Create Nord Types ──
  const nordTypeData = [
    {
      name: 'Participant',
      icon: 'User',
      accent_color: '#6366f1',
      properties_schema: [
        { name: 'name', type: 'short_text', required: true, config: { description: 'Full name of the participant' } },
        { name: 'role', type: 'short_text', required: true, defaultValue: 'Product Designer', config: { description: 'Job title or role', hint: 'What is your current role?' } },
        { name: 'company', type: 'short_text', required: true, config: { description: 'Company or organization', hint: 'Where do you work?' } },
        { name: 'experience_level', type: 'select', required: true, options: ['< 1 year', '1-3 years', '3-5 years', '5+ years'], config: { description: 'Years of experience with PM tools', hint: 'How long have you been using project management tools?' } },
        { name: 'recruitment_source', type: 'short_text', required: false, defaultValue: 'Internal panel', config: { description: 'How they were recruited for the study' } },
        { name: 'team_size', type: 'number', required: false, defaultValue: 8, config: { description: 'Size of their immediate team', hint: 'How many people are on your team?' } },
        { name: 'current_tools', type: 'short_text', required: true, config: { description: 'PM tools currently in use', hint: 'What project management tools do you use day-to-day?' } },
        { name: 'consent_form_id', type: 'hidden', required: false, defaultValue: 'IRB-2025-PM-001', config: { description: 'Internal consent tracking ID' } },
      ],
    },
    {
      name: 'Quote',
      icon: 'MessageSquare',
      accent_color: '#f59e0b',
      properties_schema: [
        { name: 'verbatim', type: 'long_text', required: true, config: { description: 'Exact quote from the participant', hint: 'Capture the user\'s exact words when they say something notable' } },
        { name: 'sentiment', type: 'select', required: true, options: ['positive', 'negative', 'neutral', 'mixed'], defaultValue: 'neutral' },
        { name: 'weight', type: 'number', required: false, defaultValue: 3, config: { description: 'Significance weight 1-5 (5 = extremely important insight)' } },
        { name: 'context', type: 'short_text', required: false, config: { description: 'What the participant was discussing when they said this' } },
        { name: 'audio_timestamp', type: 'hidden', required: false, config: { description: 'Timestamp in the recording for this quote' } },
      ],
    },
    {
      name: 'Theme',
      icon: 'Layers',
      accent_color: '#10b981',
      properties_schema: [
        { name: 'name', type: 'short_text', required: true, config: { description: 'Name of the emerging theme', hint: 'What pattern are you noticing?' } },
        { name: 'description', type: 'long_text', required: true, config: { description: 'Detailed description of the theme' } },
        { name: 'evidence_strength', type: 'select', required: true, options: ['1 - Weak signal', '2 - Emerging', '3 - Moderate', '4 - Strong', '5 - Confirmed'], defaultValue: '2 - Emerging', config: { description: 'How strong is the evidence for this theme?' } },
        { name: 'frequency', type: 'short_text', required: false, defaultValue: 'Mentioned once', config: { description: 'How often this theme was mentioned' } },
        { name: 'analysis_batch_id', type: 'hidden', required: false, defaultValue: 'batch-001', config: { description: 'Internal analysis batch tracking' } },
      ],
    },
    {
      name: 'Pain Point',
      icon: 'AlertTriangle',
      accent_color: '#ef4444',
      properties_schema: [
        { name: 'description', type: 'long_text', required: true, config: { description: 'What frustrates the user', hint: 'What\'s the most frustrating part of your current workflow?' } },
        { name: 'severity', type: 'select', required: true, options: ['1 - Minor annoyance', '2 - Frustrating', '3 - Significant blocker', '4 - Major pain', '5 - Dealbreaker'], defaultValue: '2 - Frustrating', config: { description: 'How painful is this?' } },
        { name: 'frequency', type: 'select', required: false, options: ['Daily', 'Weekly', 'Monthly', 'Occasionally'], defaultValue: 'Weekly', config: { description: 'How often they encounter this' } },
        { name: 'current_workaround', type: 'short_text', required: false, config: { description: 'How they currently cope', hint: 'How do you work around that right now?' } },
      ],
    },
    {
      name: 'Feature Request',
      icon: 'Lightbulb',
      accent_color: '#8b5cf6',
      properties_schema: [
        { name: 'description', type: 'long_text', required: true, config: { description: 'What the user wishes existed', hint: 'If you could wave a magic wand, what would you change?' } },
        { name: 'priority', type: 'select', required: true, options: ['Must-have', 'Nice-to-have', 'Future consideration'], defaultValue: 'Nice-to-have', config: { description: 'How important is this to the user?' } },
        { name: 'mentioned_by_count', type: 'number', required: false, defaultValue: 1, config: { description: 'Number of participants who mentioned this' } },
        { name: 'jira_ticket_id', type: 'hidden', required: false, config: { description: 'Linked Jira ticket for product backlog tracking' } },
      ],
    },
  ];

  const typeIds: Record<string, string> = {};
  for (const t of nordTypeData) {
    const result = await api<{ id: string }>('POST', `/projects/${pid}/nord-types`, t);
    typeIds[t.name] = result.id;
    console.log(`  ✅ Nord type: ${t.name} (${t.properties_schema.length} props, ${t.properties_schema.filter(p => p.type === 'hidden').length} hidden)`);
  }

  // ── 3. Create Connection Types (with properties_schema + verbs + spectrum) ──
  const connTypeData = [
    {
      name: 'Said',
      accent_color: '#f59e0b',
      stroke_style: 'solid',
      verb: 'said',
      default_direction: 'forward',
      measurement_mode: 'spectrum',
      x_stage_labels: [
        { label: 'Interview Start', position: 0.0 },
        { label: 'Warm-up', position: 0.2 },
        { label: 'Core Discussion', position: 0.5 },
        { label: 'Deep Dive', position: 0.75 },
        { label: 'Wrap-up', position: 1.0 },
      ],
      properties_schema: [
        { name: 'interview_phase', type: 'select', required: true, options: ['Introduction', 'Warm-up', 'Core questions', 'Deep dive', 'Wrap-up'], defaultValue: 'Core questions', config: { description: 'Which phase of the interview this quote occurred in' } },
        { name: 'confidence', type: 'select', required: false, options: ['Verbatim', 'Paraphrased', 'Approximate'], defaultValue: 'Verbatim', config: { description: 'How accurately this was captured' } },
        { name: 'prompted_or_spontaneous', type: 'select', required: false, options: ['Prompted', 'Spontaneous'], defaultValue: 'Prompted', config: { description: 'Was this in response to a question or volunteered?' } },
        { name: 'recorder_timestamp', type: 'hidden', required: false, defaultValue: '00:00:00', config: { description: 'Timestamp in the recording for cross-reference' } },
      ],
    },
    {
      name: 'Relates To',
      accent_color: '#10b981',
      stroke_style: 'dashed',
      verb: 'supports',
      default_direction: 'forward',
      measurement_mode: 'spectrum',
      x_stage_labels: [
        { label: 'Weak Signal', position: 0.0 },
        { label: 'Tangential', position: 0.25 },
        { label: 'Emerging', position: 0.5 },
        { label: 'Strong', position: 0.75 },
        { label: 'Confirmed', position: 1.0 },
      ],
      properties_schema: [
        { name: 'evidence_notes', type: 'long_text', required: false, defaultValue: 'Noted during initial review', config: { description: 'Why the researcher linked this quote to this theme' } },
        { name: 'link_strength', type: 'select', required: true, options: ['Weak', 'Moderate', 'Strong', 'Definitive'], defaultValue: 'Moderate', config: { description: 'How strongly this quote supports the theme' } },
        { name: 'coding_pass', type: 'select', required: false, options: ['First pass', 'Second pass', 'Validated'], defaultValue: 'First pass', config: { description: 'Which round of qualitative coding identified this link' } },
        { name: 'deductive_or_inductive', type: 'select', required: false, options: ['Deductive', 'Inductive'], config: { description: 'Was this link driven by a pre-existing codebook or emergent from data?' } },
        { name: 'atlas_code_id', type: 'hidden', required: false, config: { description: 'Cross-reference to ATLAS.ti qualitative coding software' } },
      ],
    },
    {
      name: 'Experiences',
      accent_color: '#ef4444',
      stroke_style: 'solid',
      verb: 'experiences',
      default_direction: 'forward',
      measurement_mode: 'spectrum',
      x_stage_labels: [
        { label: 'Mentioned', position: 0.0 },
        { label: 'Described', position: 0.33 },
        { label: 'Detailed', position: 0.66 },
        { label: 'Validated', position: 1.0 },
      ],
      properties_schema: [
        { name: 'emotional_intensity', type: 'select', required: true, options: ['Calm', 'Mildly frustrated', 'Frustrated', 'Very frustrated', 'Angry'], defaultValue: 'Mildly frustrated', config: { description: 'How emotionally charged the participant was describing this' } },
        { name: 'first_mentioned', type: 'short_text', required: false, defaultValue: 'During core discussion', config: { description: 'When in the interview the pain point was first raised' } },
        { name: 'impact_area', type: 'select', required: false, options: ['Productivity', 'Collaboration', 'Communication', 'Planning', 'Reporting', 'Other'], config: { description: 'Which area of their work this pain point affects' } },
        { name: 'workaround_described', type: 'select', required: false, options: ['Yes', 'No', 'Partial'], defaultValue: 'No', config: { description: 'Did the participant describe how they currently cope?' } },
        { name: 'session_note_ref', type: 'hidden', required: false, config: { description: 'Internal reference to session field notes' } },
      ],
    },
    {
      name: 'Requests',
      accent_color: '#8b5cf6',
      stroke_style: 'solid',
      verb: 'requested',
      default_direction: 'forward',
      measurement_mode: 'spectrum',
      x_stage_labels: [
        { label: 'Mentioned', position: 0.0 },
        { label: 'Explained', position: 0.33 },
        { label: 'Justified', position: 0.66 },
        { label: 'Prioritized', position: 1.0 },
      ],
      properties_schema: [
        { name: 'feasibility_notes', type: 'long_text', required: false, config: { description: 'Product manager\'s feasibility assessment of this request' } },
        { name: 'user_language', type: 'short_text', required: false, defaultValue: 'Informal description', config: { description: 'How the user described what they want (their exact framing)' } },
        { name: 'existing_solution_aware', type: 'select', required: false, options: ['Yes — tried it', 'Yes — aware but not tried', 'No — unaware', 'Not applicable'], defaultValue: 'No — unaware', config: { description: 'Is the user aware of existing solutions to this need?' } },
        { name: 'product_area', type: 'select', required: false, options: ['Dashboard', 'Notifications', 'Reporting', 'Integrations', 'Collaboration', 'Mobile', 'Other'], config: { description: 'Which product area this request falls into' } },
        { name: 'backlog_ref', type: 'hidden', required: false, config: { description: 'Internal product backlog reference ID' } },
      ],
    },
  ];

  const connTypeIds: Record<string, string> = {};
  for (const ct of connTypeData) {
    const result = await api<{ id: string }>('POST', `/projects/${pid}/connection-types`, ct);
    connTypeIds[ct.name] = result.id;
    console.log(`  ✅ Connection type: ${ct.name} (verb: "${ct.verb}", ${ct.properties_schema.length} props, ${ct.properties_schema.filter(p => p.type === 'hidden').length} hidden)`);
  }

  // ── 4. Create Nords ──
  const nordData = [
    {
      type: 'Participant', title: 'Alex Rivera',
      properties: { name: 'Alex Rivera', role: 'Product Designer', company: 'Streamline', current_tools: 'Jira, Notion' },
      position_x: 0.5, position_y: 0.3,
    },
    { type: 'Quote', title: 'Quote 1 — Cross-functional visibility', properties: { sentiment: 'negative', weight: 4, context: 'Discussing daily workflow' }, position_x: 0.15, position_y: 0.5 },
    { type: 'Quote', title: 'Quote 2 — Status meetings', properties: { sentiment: 'negative', weight: 3, context: 'Discussing team collaboration' }, position_x: 0.35, position_y: 0.5 },
    { type: 'Quote', title: 'Quote 3 — Notion flexibility', properties: { sentiment: 'positive', weight: 4, context: 'Comparing tools' }, position_x: 0.55, position_y: 0.5 },
    { type: 'Theme', title: 'Visibility Gap', properties: { name: 'Visibility Gap', description: 'Teams lack cross-functional visibility into what other teams are working on' }, position_x: 0.25, position_y: 0.75 },
    { type: 'Theme', title: 'Tool Fragmentation', properties: { name: 'Tool Fragmentation', description: 'Teams use multiple tools that don\'t integrate well' }, position_x: 0.65, position_y: 0.75 },
    { type: 'Pain Point', title: 'No engineering visibility until standup', properties: { description: 'Designers never know what engineering is working on until standup meetings', severity: '3 - Significant blocker', frequency: 'Daily' }, position_x: 0.8, position_y: 0.5 },
    { type: 'Feature Request', title: 'Real-time cross-team dashboard', properties: { description: 'A live dashboard showing what every team is working on right now', priority: 'Must-have' }, position_x: 0.85, position_y: 0.3 },
  ];

  const nordIds: Record<string, string> = {};
  for (const n of nordData) {
    const result = await api<{ id: string }>('POST', `/projects/${pid}/nords`, {
      type_id: typeIds[n.type],
      title: n.title,
      properties: n.properties,
      position_x: n.position_x,
      position_y: n.position_y,
    });
    nordIds[n.title] = result.id;
    console.log(`  ✅ Nord: ${n.title}`);
  }

  // ── 5. Create Connections (with spectrum positions + per-connection properties) ──
  const connData = [
    // Said connections — Alex → Quotes (spectrum: interview timeline)
    {
      type: 'Said', source: 'Alex Rivera', target: 'Quote 1 — Cross-functional visibility',
      distance_x: 0.2,  // Warm-up phase
      properties: { interview_phase: 'Warm-up', confidence: 'Verbatim', prompted_or_spontaneous: 'Spontaneous' },
    },
    {
      type: 'Said', source: 'Alex Rivera', target: 'Quote 2 — Status meetings',
      distance_x: 0.5,  // Core Discussion
      properties: { interview_phase: 'Core questions', confidence: 'Verbatim', prompted_or_spontaneous: 'Prompted' },
    },
    {
      type: 'Said', source: 'Alex Rivera', target: 'Quote 3 — Notion flexibility',
      distance_x: 0.75, // Deep Dive
      properties: { interview_phase: 'Deep dive', confidence: 'Paraphrased', prompted_or_spontaneous: 'Prompted' },
    },

    // Relates To connections — Quotes → Themes (spectrum: evidence strength)
    {
      type: 'Relates To', source: 'Quote 1 — Cross-functional visibility', target: 'Visibility Gap',
      distance_x: 0.75, // Strong evidence
      properties: { link_strength: 'Strong', evidence_notes: 'Direct statement about inability to see engineering work. Core evidence for this theme.', coding_pass: 'First pass', deductive_or_inductive: 'Inductive' },
    },
    {
      type: 'Relates To', source: 'Quote 2 — Status meetings', target: 'Visibility Gap',
      distance_x: 0.5,  // Emerging
      properties: { link_strength: 'Moderate', evidence_notes: 'Mentions standup as the only visibility mechanism, which supports the gap.', coding_pass: 'First pass', deductive_or_inductive: 'Inductive' },
    },
    {
      type: 'Relates To', source: 'Quote 3 — Notion flexibility', target: 'Tool Fragmentation',
      distance_x: 0.25, // Tangential
      properties: { link_strength: 'Weak', evidence_notes: 'Preference for Notion over Jira hints at tool switching behavior.', coding_pass: 'First pass' },
    },

    // Experiences connections — Alex → Pain Points (spectrum: validation depth)
    {
      type: 'Experiences', source: 'Alex Rivera', target: 'No engineering visibility until standup',
      distance_x: 0.66, // Detailed
      properties: { emotional_intensity: 'Frustrated', first_mentioned: 'During warm-up, unprompted', impact_area: 'Collaboration', workaround_described: 'Partial' },
    },

    // Requests connections — Alex → Feature Requests (spectrum: articulation depth)
    {
      type: 'Requests', source: 'Alex Rivera', target: 'Real-time cross-team dashboard',
      distance_x: 0.66, // Justified
      properties: { user_language: 'I just want to see what everyone is doing without having to ask', existing_solution_aware: 'No — unaware', product_area: 'Dashboard' },
    },
  ];

  for (const c of connData) {
    await api('POST', `/projects/${pid}/connections`, {
      type_id: connTypeIds[c.type],
      source_nord_id: nordIds[c.source],
      target_nord_id: nordIds[c.target],
      direction: 'forward',
      distance_x: c.distance_x,
      distance_y: 0.5,
      properties: c.properties,
    });
    console.log(`  ✅ Connection: ${c.source} —[${c.type}]→ ${c.target} (x=${c.distance_x})`);
  }

  // ── 6. Create Personas ──
  const uxResearcher = await api<{ id: string }>('POST', `/projects/${pid}/personas`, {
    name: 'UX Researcher',
    primary_motivation: 'Understand the user\'s lived experience with project management tools. Extract honest, emotionally-grounded insights.',
    voice_and_tone: 'Warm, empathetic, curious. Use active listening. Reflect back what the user says before probing deeper. Validate emotions. Never judge.',
    temperature: 0.7,
  });
  console.log(`  ✅ Persona: UX Researcher (temp: 0.7)`);

  const productManager = await api<{ id: string }>('POST', `/projects/${pid}/personas`, {
    name: 'Product Manager',
    primary_motivation: 'Identify actionable product insights. Prioritize by user impact and feasibility.',
    voice_and_tone: 'Friendly but efficient. Ask clarifying questions about impact and frequency. Probe for specifics. Summarize patterns.',
    temperature: 0.5,
  });
  console.log(`  ✅ Persona: Product Manager (temp: 0.5)`);

  const dataAnalyst = await api<{ id: string }>('POST', `/projects/${pid}/personas`, {
    name: 'Research Analyst',
    primary_motivation: 'Ensure methodological rigor. Validate evidence, check for bias, and quantify signal strength.',
    voice_and_tone: 'Precise, neutral, systematic. Ask about sample size, frequency, and confidence. Flag assumptions. Cross-reference with other data points.',
    temperature: 0.3,
  });
  console.log(`  ✅ Persona: Research Analyst (temp: 0.3)`);

  // Set UX Researcher as default persona
  await api('PUT', `/projects/${pid}`, { default_persona_id: uxResearcher.id, default_start_nord_id: nordIds['Alex Rivera'] });
  console.log(`  ✅ Default persona + start nord set`);

  // ── 7. Create Goals (3-goal DAG with boolean pathing) ──

  // Goal 1: Complete Interview (root goal — must be done before anything else)
  const goal1 = await api<{ id: string }>('POST', `/projects/${pid}/goals`, {
    name: 'Complete Interview',
    description: 'Gather all core participant information, at least 3 notable quotes, and 1 identified pain point.',
    icon: 'ClipboardCheck',
    accent_color: '#6366f1',
    sort_order: 1,
    end_type: null,
    achieved_prompt: 'Excellent work! You\'ve captured all the essential information from this interview — participant profile, key quotes, and at least one pain point. The data is rich enough to proceed to analysis.',
  });
  console.log(`  ✅ Goal: Complete Interview`);

  // Goal 2: Identify Themes (depends on Complete Interview)
  const goal2 = await api<{ id: string }>('POST', `/projects/${pid}/goals`, {
    name: 'Identify Themes',
    description: 'Identify at least 2 emerging themes from the interview with evidence strength assessment and supporting quotes.',
    icon: 'Layers',
    accent_color: '#10b981',
    sort_order: 2,
    end_type: null,
    achieved_prompt: 'Two themes identified with evidence ratings. The qualitative coding is coming together. These themes will feed into the cross-interview synthesis.',
  });
  console.log(`  ✅ Goal: Identify Themes`);

  // Goal 3: Synthesize Insights (depends on both Complete Interview + Identify Themes)
  const goal3 = await api<{ id: string }>('POST', `/projects/${pid}/goals`, {
    name: 'Synthesize Insights',
    description: 'Connect pain points to feature requests and assess overall research quality. This is the final goal.',
    icon: 'Sparkles',
    accent_color: '#f59e0b',
    sort_order: 3,
    end_type: 'continue',
    prerequisite_gate: 'all',
    achieved_prompt: 'Synthesis complete! You\'ve connected user pain points to actionable feature requests with evidence-backed priority. This interview has generated high-quality insights ready for the product team.',
  });
  console.log(`  ✅ Goal: Synthesize Insights`);

  // Goal edges: DAG structure
  // Complete Interview → Identify Themes
  await api('POST', `/projects/${pid}/goal-edges`, {
    source_goal_id: goal1.id,
    target_goal_id: goal2.id,
  });
  console.log(`  ✅ Goal edge: Complete Interview → Identify Themes`);

  // Complete Interview → Synthesize Insights
  await api('POST', `/projects/${pid}/goal-edges`, {
    source_goal_id: goal1.id,
    target_goal_id: goal3.id,
  });
  console.log(`  ✅ Goal edge: Complete Interview → Synthesize Insights`);

  // Identify Themes → Synthesize Insights (both paths converge)
  await api('POST', `/projects/${pid}/goal-edges`, {
    source_goal_id: goal2.id,
    target_goal_id: goal3.id,
  });
  console.log(`  ✅ Goal edge: Identify Themes → Synthesize Insights`);

  // ── 8. Create Variables (project-level data points — must exist before goal bindings) ──
  const variableData = [
    { name: 'Interview Duration', type: 'number', description: 'Planned interview length in minutes', required: false, hint: 'How long was the interview?' },
    { name: 'Overall Satisfaction', type: 'select', options: ['1 - Very dissatisfied', '2 - Dissatisfied', '3 - Neutral', '4 - Satisfied', '5 - Very satisfied'], description: 'Participant\'s overall satisfaction with current PM tools', required: true, hint: 'On a scale of 1-5, how satisfied are you with your current tools?' },
    { name: 'Would Recommend Tool', type: 'boolean', description: 'Would the participant recommend their primary PM tool to a colleague?', required: false, hint: 'Would you recommend your current PM tool to a colleague?' },
    { name: 'NPS Score', type: 'number', description: 'Net Promoter Score (0-10)', required: false, hint: 'On a scale of 0-10, how likely are you to recommend this tool?' },
    { name: 'Primary Use Case', type: 'select', options: ['Task tracking', 'Sprint planning', 'Roadmapping', 'Documentation', 'Communication', 'Reporting'], description: 'What they primarily use PM tools for', required: true, hint: 'What do you primarily use project management tools for?' },
    { name: 'Switching Intent', type: 'boolean', description: 'Is the participant actively considering switching PM tools?', required: false, hint: 'Are you considering switching to a different tool?' },
    { name: 'Research Quality Score', type: 'select', options: ['Low — insufficient data', 'Medium — some gaps', 'High — comprehensive'], description: 'Researcher\'s assessment of interview data quality', required: true },
    { name: 'Follow-up Needed', type: 'boolean', description: 'Does this participant need a follow-up session?', required: false },
  ];

  const varIds: Record<string, string> = {};
  for (const v of variableData) {
    const result = await api<{ id: string }>('POST', `/projects/${pid}/variables`, v);
    varIds[v.name] = result.id;
  }
  console.log(`  ✅ Variables: ${variableData.length} created (${variableData.filter(v => v.required).length} required)`);

  // ── 9. Bind Variables to Goals ──

  // Goal 1: Complete Interview — needs satisfaction + primary use case
  const goal1VarBindings = [
    { variable_id: varIds['Overall Satisfaction'], required: true },
    { variable_id: varIds['Primary Use Case'], required: true },
    { variable_id: varIds['Interview Duration'], required: false },
  ];
  for (const b of goal1VarBindings) {
    await api('POST', `/goals/${goal1.id}/variable-bindings`, b);
  }
  console.log(`  ✅ Goal 1 variable bindings: ${goal1VarBindings.length}`);

  // Goal 2: Identify Themes — needs recommendation + NPS
  const goal2VarBindings = [
    { variable_id: varIds['Would Recommend Tool'], required: false },
    { variable_id: varIds['NPS Score'], required: false },
  ];
  for (const b of goal2VarBindings) {
    await api('POST', `/goals/${goal2.id}/variable-bindings`, b);
  }
  console.log(`  ✅ Goal 2 variable bindings: ${goal2VarBindings.length}`);

  // Goal 3: Synthesize Insights — needs quality score + switching intent + follow-up
  const goal3VarBindings = [
    { variable_id: varIds['Research Quality Score'], required: true },
    { variable_id: varIds['Switching Intent'], required: false },
    { variable_id: varIds['Follow-up Needed'], required: false },
  ];
  for (const b of goal3VarBindings) {
    await api('POST', `/goals/${goal3.id}/variable-bindings`, b);
  }
  console.log(`  ✅ Goal 3 variable bindings: ${goal3VarBindings.length}`);

  // ── 10. Link Relevant Nords to Goals ──

  // Goal 1: Complete Interview — relevant nords are participant + quotes + pain point
  const goal1Nords = [
    nordIds['Alex Rivera'],
    nordIds['Quote 1 — Cross-functional visibility'],
    nordIds['Quote 2 — Status meetings'],
    nordIds['Quote 3 — Notion flexibility'],
    nordIds['No engineering visibility until standup'],
  ];
  for (const nordId of goal1Nords) {
    await api('POST', `/goals/${goal1.id}/relevant-nords`, { nord_id: nordId });
  }
  console.log(`  ✅ Goal 1 relevant nords: ${goal1Nords.length}`);

  // Goal 2: Identify Themes — relevant nords are themes + supporting quotes
  const goal2Nords = [
    nordIds['Visibility Gap'],
    nordIds['Tool Fragmentation'],
    nordIds['Quote 1 — Cross-functional visibility'],
    nordIds['Quote 2 — Status meetings'],
    nordIds['Quote 3 — Notion flexibility'],
  ];
  for (const nordId of goal2Nords) {
    await api('POST', `/goals/${goal2.id}/relevant-nords`, { nord_id: nordId });
  }
  console.log(`  ✅ Goal 2 relevant nords: ${goal2Nords.length}`);

  // Goal 3: Synthesize Insights — relevant nords are pain point + feature request
  const goal3Nords = [
    nordIds['No engineering visibility until standup'],
    nordIds['Real-time cross-team dashboard'],
    nordIds['Visibility Gap'],
    nordIds['Tool Fragmentation'],
  ];
  for (const nordId of goal3Nords) {
    await api('POST', `/goals/${goal3.id}/relevant-nords`, { nord_id: nordId });
  }
  console.log(`  ✅ Goal 3 relevant nords: ${goal3Nords.length}`);

  // ── 11. Link Relevant Nord Types to Goals ──
  // Goal 1 cares about Participants and Quotes
  await api('POST', `/goals/${goal1.id}/relevant-types`, { nord_type_id: typeIds['Participant'] });
  await api('POST', `/goals/${goal1.id}/relevant-types`, { nord_type_id: typeIds['Quote'] });
  await api('POST', `/goals/${goal1.id}/relevant-types`, { nord_type_id: typeIds['Pain Point'] });
  console.log(`  ✅ Goal 1 relevant types: 3`);

  // Goal 2 cares about Themes
  await api('POST', `/goals/${goal2.id}/relevant-types`, { nord_type_id: typeIds['Theme'] });
  console.log(`  ✅ Goal 2 relevant types: 1`);

  // Goal 3 cares about Pain Points and Feature Requests
  await api('POST', `/goals/${goal3.id}/relevant-types`, { nord_type_id: typeIds['Pain Point'] });
  await api('POST', `/goals/${goal3.id}/relevant-types`, { nord_type_id: typeIds['Feature Request'] });
  console.log(`  ✅ Goal 3 relevant types: 2`);

  // ── 12. Create Test Scenarios ──
  const userObjective = "I'm Alex, a product designer at a mid-size SaaS company called Streamline. I'm here to talk about my experience with project management tools. I use Jira and Notion mainly. My team of 8 designers struggles with cross-functional visibility — we never know what engineering is working on until standup.";

  const scenarios = [
    {
      name: 'Cooperative Interview',
      description: 'A friendly, cooperative participant who answers clearly and volunteers information. Tests the happy path.',
      user_objective: userObjective,
      user_profile: 'cooperative',
      max_rounds: 15,
      stop_on_completion_pct: 80,
      min_completion_pct: 50,
    },
    {
      name: 'Tangential Storyteller',
      description: 'A participant who rambles and goes off on tangents. Tests the AI\'s ability to redirect and extract structured data from unstructured narratives.',
      user_objective: userObjective,
      user_profile: 'tangential',
      max_rounds: 20,
      stop_on_completion_pct: 70,
      min_completion_pct: 40,
    },
    {
      name: 'Reluctant Participant',
      description: 'A participant who gives short, vague answers. Tests the AI\'s probing behavior and ability to elicit deeper responses.',
      user_objective: userObjective,
      user_profile: 'reluctant',
      max_rounds: 20,
      stop_on_completion_pct: 50,
      min_completion_pct: 25,
    },
    {
      name: 'Rushed Executive',
      description: 'A VP who has 10 minutes. Tests efficiency under time pressure and prioritization of high-value questions.',
      user_objective: "I'm Alex, VP of Product at Streamline. I have about 10 minutes. We use Jira, Notion, and some custom internal tools. What do you need to know?",
      user_profile: 'rushed',
      max_rounds: 8,
      stop_on_completion_pct: 60,
      min_completion_pct: 30,
    },
  ];

  for (const s of scenarios) {
    await api('POST', `/projects/${pid}/test-scenarios`, {
      ...s,
      user_context: { company: 'Streamline', team_size: 8, primary_tool: 'Jira' },
      agent_model: 'gemini-2.5-flash',
      user_model: 'gemini-2.5-flash',
      stop_on_goal_id: goal1.id,
      stop_on_session_end: true,
    });
    console.log(`  ✅ Test scenario: ${s.name}`);
  }

  // ── Summary ──
  console.log(`\n🎉 UX Interview project ready!`);
  console.log(`   Project ID: ${pid}`);
  console.log(`   Nord types: ${nordTypeData.length} (${nordTypeData.reduce((a, t) => a + t.properties_schema.length, 0)} total props)`);
  console.log(`   Connection types: ${connTypeData.length} (${connTypeData.reduce((a, t) => a + t.properties_schema.length, 0)} total props)`);
  console.log(`   Hidden properties: ${nordTypeData.reduce((a, t) => a + t.properties_schema.filter(p => p.type === 'hidden').length, 0)} nord + ${connTypeData.reduce((a, t) => a + t.properties_schema.filter(p => p.type === 'hidden').length, 0)} connection`);
  console.log(`   Default values: ${nordTypeData.reduce((a, t) => a + t.properties_schema.filter(p => p.defaultValue !== undefined).length, 0)} nord + ${connTypeData.reduce((a, t) => a + t.properties_schema.filter(p => p.defaultValue !== undefined).length, 0)} connection`);
  console.log(`   Goals: 3 (DAG: Complete → [Identify, Synthesize], Identify → Synthesize)`);
  console.log(`   Variables: ${variableData.length} (${variableData.filter(v => v.required).length} required, bound to goals)`);
  console.log(`   Relevant nords: ${goal1Nords.length + goal2Nords.length + goal3Nords.length} total across 3 goals`);
  console.log(`   Personas: 3 (temps: 0.7, 0.5, 0.3)`);
  console.log(`   Test scenarios: ${scenarios.length}`);
  console.log(`\n   Open in browser: http://localhost:5173/projects/${pid}`);
}

main().catch(err => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});
