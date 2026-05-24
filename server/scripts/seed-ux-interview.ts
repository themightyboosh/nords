#!/usr/bin/env node
/**
 * seed-ux-interview.ts — Creates the UX Interview test project.
 *
 * This script calls the Nords REST API to:
 * 1. Create a new project (guided mode)
 * 2. Create nord types: Participant, Quote, Theme, Pain Point, Feature Request
 * 3. Create connection types: Said, Relates To, Experiences, Requests
 * 4. Create nords: Alex Rivera, Quote 1-3, Theme 1-2, Pain Point 1
 * 5. Create connections between nords
 * 6. Create personas: UX Researcher, Product Manager
 * 7. Create goals: Complete Interview, Identify Themes
 * 8. Bind goal properties
 * 9. Create test scenarios: cooperative, tangential, reluctant, rushed
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
    description: 'A real UX research interview to gather insights about project management tool usage. Tests the full MCP protocol in guided mode.',
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
        { name: 'role', type: 'short_text', required: true, config: { description: 'Job title or role', hint: 'What is your current role?' } },
        { name: 'company', type: 'short_text', required: true, config: { description: 'Company or organization', hint: 'Where do you work?' } },
        { name: 'experience_level', type: 'select', required: true, options: ['< 1 year', '1-3 years', '3-5 years', '5+ years'], config: { description: 'Years of experience with PM tools', hint: 'How long have you been using project management tools?' } },
        { name: 'recruitment_source', type: 'short_text', required: false, config: { description: 'How they were recruited for the study' } },
        { name: 'team_size', type: 'number', required: false, config: { description: 'Size of their immediate team', hint: 'How many people are on your team?' } },
        { name: 'current_tools', type: 'short_text', required: true, config: { description: 'PM tools currently in use', hint: 'What project management tools do you use day-to-day?' } },
      ],
    },
    {
      name: 'Quote',
      icon: 'MessageSquare',
      accent_color: '#f59e0b',
      properties_schema: [
        { name: 'verbatim', type: 'long_text', required: true, config: { description: 'Exact quote from the participant', hint: 'Capture the user\'s exact words when they say something notable' } },
        { name: 'sentiment', type: 'select', required: true, options: ['positive', 'negative', 'neutral', 'mixed'] },
        { name: 'weight', type: 'number', required: false, config: { description: 'Significance weight 1-5 (5 = extremely important insight)' } },
        { name: 'context', type: 'short_text', required: false, config: { description: 'What the participant was discussing when they said this' } },
      ],
    },
    {
      name: 'Theme',
      icon: 'Layers',
      accent_color: '#10b981',
      properties_schema: [
        { name: 'name', type: 'short_text', required: true, config: { description: 'Name of the emerging theme', hint: 'What pattern are you noticing?' } },
        { name: 'description', type: 'long_text', required: true, config: { description: 'Detailed description of the theme' } },
        { name: 'evidence_strength', type: 'select', required: true, options: ['1 - Weak signal', '2 - Emerging', '3 - Moderate', '4 - Strong', '5 - Confirmed'], config: { description: 'How strong is the evidence for this theme?' } },
        { name: 'frequency', type: 'short_text', required: false, config: { description: 'How often this theme was mentioned' } },
      ],
    },
    {
      name: 'Pain Point',
      icon: 'AlertTriangle',
      accent_color: '#ef4444',
      properties_schema: [
        { name: 'description', type: 'long_text', required: true, config: { description: 'What frustrates the user', hint: 'What\'s the most frustrating part of your current workflow?' } },
        { name: 'severity', type: 'select', required: true, options: ['1 - Minor annoyance', '2 - Frustrating', '3 - Significant blocker', '4 - Major pain', '5 - Dealbreaker'], config: { description: 'How painful is this?' } },
        { name: 'frequency', type: 'select', required: false, options: ['Daily', 'Weekly', 'Monthly', 'Occasionally'], config: { description: 'How often they encounter this' } },
        { name: 'current_workaround', type: 'short_text', required: false, config: { description: 'How they currently cope', hint: 'How do you work around that right now?' } },
      ],
    },
    {
      name: 'Feature Request',
      icon: 'Lightbulb',
      accent_color: '#8b5cf6',
      properties_schema: [
        { name: 'description', type: 'long_text', required: true, config: { description: 'What the user wishes existed', hint: 'If you could wave a magic wand, what would you change?' } },
        { name: 'priority', type: 'select', required: true, options: ['Must-have', 'Nice-to-have', 'Future consideration'], config: { description: 'How important is this to the user?' } },
        { name: 'mentioned_by_count', type: 'number', required: false, config: { description: 'Number of participants who mentioned this' } },
      ],
    },
  ];

  const typeIds: Record<string, string> = {};
  for (const t of nordTypeData) {
    const result = await api<{ id: string }>('POST', `/projects/${pid}/nord-types`, t);
    typeIds[t.name] = result.id;
    console.log(`  ✅ Nord type: ${t.name}`);
  }

  // ── 3. Create Connection Types ──
  const connTypeData = [
    {
      name: 'Said',
      accent_color: '#f59e0b',
      stroke_style: 'solid',
      verb: 'said',
      direction_preset: 'source_to_target',
      x_stage_labels: [
        { label: 'Interview Start', position: 0.0 },
        { label: 'Core Discussion', position: 0.5 },
        { label: 'Wrap-up', position: 1.0 },
      ],
    },
    {
      name: 'Relates To',
      accent_color: '#10b981',
      stroke_style: 'dashed',
      verb: 'supports',
      direction_preset: 'source_to_target',
      x_stage_labels: [
        { label: 'Weak Signal', position: 0.0 },
        { label: 'Emerging', position: 0.5 },
        { label: 'Confirmed', position: 1.0 },
      ],
    },
    {
      name: 'Experiences',
      accent_color: '#ef4444',
      stroke_style: 'solid',
      verb: 'experiences',
      direction_preset: 'source_to_target',
      x_stage_labels: [
        { label: 'Mentioned', position: 0.0 },
        { label: 'Detailed', position: 0.5 },
        { label: 'Validated', position: 1.0 },
      ],
    },
    {
      name: 'Requests',
      accent_color: '#8b5cf6',
      stroke_style: 'solid',
      verb: 'requested',
      direction_preset: 'source_to_target',
      x_stage_labels: [
        { label: 'Mentioned', position: 0.0 },
        { label: 'Explained', position: 0.5 },
        { label: 'Prioritized', position: 1.0 },
      ],
    },
  ];

  const connTypeIds: Record<string, string> = {};
  for (const ct of connTypeData) {
    const result = await api<{ id: string }>('POST', `/projects/${pid}/connection-types`, ct);
    connTypeIds[ct.name] = result.id;
    console.log(`  ✅ Connection type: ${ct.name}`);
  }

  // ── 4. Create Nords ──
  const nordData = [
    { type: 'Participant', title: 'Alex Rivera', properties: { name: 'Alex Rivera', role: 'Product Designer' }, position_x: 0.5, position_y: 0.3 },
    { type: 'Quote', title: 'Quote 1', properties: {}, position_x: 0.2, position_y: 0.5 },
    { type: 'Quote', title: 'Quote 2', properties: {}, position_x: 0.4, position_y: 0.5 },
    { type: 'Quote', title: 'Quote 3', properties: {}, position_x: 0.6, position_y: 0.5 },
    { type: 'Theme', title: 'Theme 1', properties: {}, position_x: 0.3, position_y: 0.7 },
    { type: 'Theme', title: 'Theme 2', properties: {}, position_x: 0.7, position_y: 0.7 },
    { type: 'Pain Point', title: 'Pain Point 1', properties: {}, position_x: 0.8, position_y: 0.5 },
    { type: 'Feature Request', title: 'Feature Request 1', properties: {}, position_x: 0.8, position_y: 0.3 },
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

  // ── 5. Create Connections ──
  const connData = [
    { type: 'Said', source: 'Alex Rivera', target: 'Quote 1', distance_x: 0.0 },
    { type: 'Said', source: 'Alex Rivera', target: 'Quote 2', distance_x: 0.5 },
    { type: 'Said', source: 'Alex Rivera', target: 'Quote 3', distance_x: 1.0 },
    { type: 'Relates To', source: 'Quote 1', target: 'Theme 1', distance_x: 0.0 },
    { type: 'Relates To', source: 'Quote 2', target: 'Theme 1', distance_x: 0.5 },
    { type: 'Relates To', source: 'Quote 3', target: 'Theme 2', distance_x: 0.0 },
    { type: 'Experiences', source: 'Alex Rivera', target: 'Pain Point 1', distance_x: 0.0 },
    { type: 'Requests', source: 'Alex Rivera', target: 'Feature Request 1', distance_x: 0.0 },
  ];

  for (const c of connData) {
    await api('POST', `/projects/${pid}/connections`, {
      type_id: connTypeIds[c.type],
      source_nord_id: nordIds[c.source],
      target_nord_id: nordIds[c.target],
      direction: 'forward',
      distance_x: c.distance_x,
      distance_y: 0.5,
    });
    console.log(`  ✅ Connection: ${c.source} → ${c.target} (${c.type})`);
  }

  // ── 6. Create Personas ──
  const uxResearcher = await api<{ id: string }>('POST', `/projects/${pid}/personas`, {
    name: 'UX Researcher',
    primary_motivation: 'Understand the user\'s lived experience with project management tools. Extract honest, emotionally-grounded insights.',
    voice_and_tone: 'Warm, empathetic, curious. Use active listening. Reflect back what the user says before probing deeper. Validate emotions. Never judge.',
    temperature: 0.7,
  });
  console.log(`  ✅ Persona: UX Researcher`);

  const productManager = await api<{ id: string }>('POST', `/projects/${pid}/personas`, {
    name: 'Product Manager',
    primary_motivation: 'Identify actionable product insights. Prioritize by user impact and feasibility.',
    voice_and_tone: 'Friendly but efficient. Ask clarifying questions about impact and frequency. Probe for specifics. Summarize patterns.',
    temperature: 0.5,
  });
  console.log(`  ✅ Persona: Product Manager`);

  // Set UX Researcher as default persona
  await api('PUT', `/projects/${pid}`, { default_persona_id: uxResearcher.id, default_start_nord_id: nordIds['Alex Rivera'] });
  console.log(`  ✅ Default persona + start nord set`);

  // ── 7. Create Goals ──
  const goal1 = await api<{ id: string }>('POST', `/projects/${pid}/goals`, {
    name: 'Complete Interview',
    description: 'Gather all core participant information and at least 3 notable quotes from the interview.',
    icon: 'ClipboardCheck',
    accent_color: '#6366f1',
    sort_order: 1,
    end_type: null,
    achieved_prompt: 'You\'ve gathered all the core information for this interview. Great job! Take a moment to reflect on what you\'ve learned before wrapping up.',
  });
  console.log(`  ✅ Goal: Complete Interview`);

  const goal2 = await api<{ id: string }>('POST', `/projects/${pid}/goals`, {
    name: 'Identify Themes',
    description: 'Identify at least 2 emerging themes from the interview with evidence strength assessment.',
    icon: 'Layers',
    accent_color: '#10b981',
    sort_order: 2,
    end_type: 'continue',
    achieved_prompt: 'You\'ve identified key themes emerging from this interview. The evidence is starting to crystallize. Consider how these themes connect to the broader research question.',
  });
  console.log(`  ✅ Goal: Identify Themes`);

  // Create a goal edge: Complete Interview → Identify Themes (themes come after interview data)
  await api('POST', `/projects/${pid}/goal-edges`, {
    source_goal_id: goal1.id,
    target_goal_id: goal2.id,
  });
  console.log(`  ✅ Goal edge: Complete Interview → Identify Themes`);

  // ── 8. Bind Goal Properties ──
  // Goal 1: Complete Interview — bind to participant fields + 3 quotes
  const goal1Bindings = [
    { nord_id: nordIds['Alex Rivera'], property_name: 'experience_level' },
    { nord_id: nordIds['Alex Rivera'], property_name: 'company' },
    { nord_id: nordIds['Alex Rivera'], property_name: 'current_tools' },
    { nord_id: nordIds['Quote 1'], property_name: 'verbatim' },
    { nord_id: nordIds['Quote 2'], property_name: 'verbatim' },
    { nord_id: nordIds['Quote 3'], property_name: 'verbatim' },
  ];

  for (const b of goal1Bindings) {
    await api('POST', `/goals/${goal1.id}/properties`, b);
  }
  console.log(`  ✅ Goal 1 bindings: ${goal1Bindings.length} properties`);

  // Goal 2: Identify Themes — bind to theme names + evidence strength
  const goal2Bindings = [
    { nord_id: nordIds['Theme 1'], property_name: 'name' },
    { nord_id: nordIds['Theme 1'], property_name: 'evidence_strength' },
    { nord_id: nordIds['Theme 2'], property_name: 'name' },
    { nord_id: nordIds['Theme 2'], property_name: 'evidence_strength' },
  ];

  for (const b of goal2Bindings) {
    await api('POST', `/goals/${goal2.id}/properties`, b);
  }
  console.log(`  ✅ Goal 2 bindings: ${goal2Bindings.length} properties`);

  // ── 9. Create Test Scenarios ──
  const userObjective = "I'm Alex, a product designer at a mid-size SaaS company called Streamline. I'm here to talk about my experience with project management tools. I use Jira and Notion mainly. My team of 8 designers struggles with cross-functional visibility — we never know what engineering is working on until standup.";

  const scenarios = [
    {
      name: 'Cooperative Interview',
      description: 'A friendly, cooperative participant who answers clearly and volunteers information.',
      user_objective: userObjective,
      user_profile: 'cooperative',
      max_rounds: 15,
      stop_on_completion_pct: 80,
      min_completion_pct: 50,
    },
    {
      name: 'Tangential Storyteller',
      description: 'A participant who rambles and goes off on tangents. Tests the AI\'s ability to extract data.',
      user_objective: userObjective,
      user_profile: 'tangential',
      max_rounds: 20,
      stop_on_completion_pct: 70,
      min_completion_pct: 40,
    },
    {
      name: 'Reluctant Participant',
      description: 'A participant who gives short, vague answers. Tests the AI\'s probing behavior.',
      user_objective: userObjective,
      user_profile: 'reluctant',
      max_rounds: 20,
      stop_on_completion_pct: 50,
      min_completion_pct: 25,
    },
    {
      name: 'Rushed Executive',
      description: 'A VP who has 10 minutes. Tests efficiency under time pressure.',
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

  console.log(`\n🎉 UX Interview project ready!`);
  console.log(`   Project ID: ${pid}`);
  console.log(`   Open in browser: http://localhost:5173/projects/${pid}`);
  console.log(`   Test Runner: http://localhost:5173/projects/${pid}/tests`);
}

main().catch(err => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});
