#!/usr/bin/env node
/**
 * seed_goals_demo.mjs — Seeds goals for the "Paws & Claws Adoption Center" project.
 *
 * Creates a guided interview flow:
 *   1. "Understand the Adopter" (contact + lifestyle) — prerequisite for everything
 *   2. "Match a Pet" (find the right animal) — requires adopter understanding
 *   3. "Schedule a Visit" (book appointment) — requires match  [TERMINATES]
 *   4. "Net Promoter Score" (free-floating, no prerequisite, no gate)
 *   5. "Phone Interview" and "In-Person Visit" — exclusion group "contact_method"
 *
 * Also sets project_mode to 'guided' and updates the project end prompt.
 *
 * Usage:
 *   node server/scripts/seed_goals_demo.mjs
 */

const API_BASE = process.env.API_BASE || 'http://localhost:3000';
const PROJECT_ID = 'c0b033d0-38e9-4677-94c1-021befdc447c'; // Paws & Claws

async function api(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${API_BASE}${path}`, opts);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${method} ${path} → ${res.status}: ${text}`);
  }
  return res.json();
}

// Nord IDs from the Paws project
const NORDS = {
  JAMIE_CHEN: 'e1e4cec2-9e57-46a0-8a6f-3f483f5231ba',      // Adopter Profile
  BANDIT: '795ce736-b7f0-44f6-bf62-0973eddddcb3',           // Available Pet - Cattle Dog Mix
  ZEUS: '4d40fb66-bc0a-47c6-9732-ba8821502953',             // Available Pet - Husky Puppy
  PEANUT: '06550e23-c735-4751-8a01-c81322308944',           // Available Pet - Senior Chihuahua
  MILO: 'cd00e71b-8b7f-4027-93b7-74b7636ff2de',             // Available Pet - Tabby Cat
  PLACEMENT: 'b1a264be-d8dc-4a19-bd0f-8b357bd921a4',        // Placement Decision
  SUBURBAN: '4b9b247c-09d2-4c37-aa0a-e5d844c4e258',          // Home Environment
};

async function main() {
  console.log('🎯 Seeding goals for Paws & Claws Adoption Center...\n');

  // 1. Set project to guided mode
  console.log('  → Setting project_mode to "guided"...');
  await api('PUT', `/api/projects/${PROJECT_ID}`, {
    project_mode: 'guided',
    end_prompt_suggestion: 'Thank the adopter warmly for their time. Summarize the pet match and next steps for their visit.',
  });

  // 2. Clean up any existing goals
  const existingGoals = await api('GET', `/api/projects/${PROJECT_ID}/goals`);
  for (const g of existingGoals) {
    console.log(`  → Removing existing goal: ${g.name}`);
    await api('DELETE', `/api/goals/${g.id}`);
  }

  // 3. Create Goal 1: Understand the Adopter
  console.log('  → Creating goal: Understand the Adopter');
  const goal1 = await api('POST', `/api/projects/${PROJECT_ID}/goals`, {
    name: 'Understand the Adopter',
    description: 'Learn about Jamie\'s lifestyle, home environment, and what they\'re looking for in a pet.',
    icon: '👤',
    accent_color: '#6366f1',
    sort_order: 0,
    is_default: true,
    terminates: false,
    achieved_prompt: 'You now have a solid picture of this adopter. Reflect on what you\'ve learned about their lifestyle before transitioning to pet matching.',
  });
  // Bind properties: Adopter Profile fields
  await api('POST', `/api/goals/${goal1.id}/properties`, { nord_id: NORDS.JAMIE_CHEN, property_name: 'Housing Type' });
  await api('POST', `/api/goals/${goal1.id}/properties`, { nord_id: NORDS.JAMIE_CHEN, property_name: 'Hours Alone' });
  await api('POST', `/api/goals/${goal1.id}/properties`, { nord_id: NORDS.JAMIE_CHEN, property_name: 'Activity Level' });
  await api('POST', `/api/goals/${goal1.id}/properties`, { nord_id: NORDS.JAMIE_CHEN, property_name: 'Previous Pet Experience' });
  console.log('    ✓ Bound 4 properties to Adopter Profile');

  // 4. Create Goal 2: Match a Pet
  console.log('  → Creating goal: Match a Pet');
  const goal2 = await api('POST', `/api/projects/${PROJECT_ID}/goals`, {
    name: 'Match a Pet',
    description: 'Based on the adopter\'s profile, explore available animals and identify the best fit.',
    icon: '🐾',
    accent_color: '#f59e0b',
    sort_order: 1,
    is_default: false,
    terminates: false,
    requires_goal_id: goal1.id,
    achieved_prompt: 'A pet match has been identified. Summarize why this particular animal is a great fit for the adopter\'s lifestyle.',
  });
  // Bind properties: Placement Decision
  await api('POST', `/api/goals/${goal2.id}/properties`, { nord_id: NORDS.PLACEMENT, property_name: 'Decision' });
  await api('POST', `/api/goals/${goal2.id}/properties`, { nord_id: NORDS.PLACEMENT, property_name: 'Reasoning' });
  console.log('    ✓ Bound 2 properties to Placement Decision');

  // 5. Create Goal 3: Schedule a Visit (TERMINATES)
  console.log('  → Creating goal: Schedule a Visit');
  const goal3 = await api('POST', `/api/projects/${PROJECT_ID}/goals`, {
    name: 'Schedule a Visit',
    description: 'Book an in-person visit so the adopter can meet their matched pet.',
    icon: '📅',
    accent_color: '#10b981',
    sort_order: 2,
    is_default: false,
    terminates: true,
    requires_goal_id: goal2.id,
    achieved_prompt: 'The visit is scheduled! Close the conversation warmly. Remind them what to bring and express excitement about the match.',
  });
  // Bind: Home Environment (we'll use it as proxy for visit scheduling)
  await api('POST', `/api/goals/${goal3.id}/properties`, { nord_id: NORDS.SUBURBAN, property_name: 'Environment Type' });
  await api('POST', `/api/goals/${goal3.id}/properties`, { nord_id: NORDS.SUBURBAN, property_name: 'Noise Level' });
  console.log('    ✓ Bound 2 properties to Home Environment (visit prep)');

  // 6. Create Goal 4: Net Promoter Score (free-floating)
  console.log('  → Creating goal: Net Promoter Score');
  await api('POST', `/api/projects/${PROJECT_ID}/goals`, {
    name: 'Net Promoter Score',
    description: 'Gauge adopter satisfaction with the process. Free-floating — can be completed at any point.',
    icon: '⭐',
    accent_color: '#8b5cf6',
    sort_order: 10,
    is_default: true,
    terminates: false,
    achieved_prompt: null,
  });
  console.log('    ✓ No property bindings (implicit satisfaction tracking)');

  // 7. Create Exclusion Group: Phone vs In-Person
  console.log('  → Creating exclusion group: contact_method');
  const phoneGoal = await api('POST', `/api/projects/${PROJECT_ID}/goals`, {
    name: 'Phone Interview',
    description: 'Conduct the initial interview over the phone.',
    icon: '📞',
    accent_color: '#3b82f6',
    sort_order: 5,
    is_default: true,
    terminates: false,
    exclusion_group: 'contact_method',
  });
  await api('POST', `/api/goals/${phoneGoal.id}/properties`, { nord_id: NORDS.JAMIE_CHEN, property_name: 'Kids Under 12' });

  const visitGoal = await api('POST', `/api/projects/${PROJECT_ID}/goals`, {
    name: 'In-Person Visit',
    description: 'Meet the adopter in person at the shelter.',
    icon: '🤝',
    accent_color: '#ec4899',
    sort_order: 6,
    is_default: true,
    terminates: false,
    exclusion_group: 'contact_method',
  });
  await api('POST', `/api/goals/${visitGoal.id}/properties`, { nord_id: NORDS.JAMIE_CHEN, property_name: 'Yard Size' });
  console.log('    ✓ Phone Interview + In-Person Visit (only one completes)');

  // Done
  console.log('\n✅ Goals seeded successfully!\n');
  console.log('Goal chain:');
  console.log('  👤 Understand the Adopter (active)');
  console.log('    ↓ prerequisite');
  console.log('  🐾 Match a Pet (pending → activates after adopter)');
  console.log('    ↓ prerequisite');
  console.log('  📅 Schedule a Visit [END] (pending → activates after match)');
  console.log('');
  console.log('Free-floating:');
  console.log('  ⭐ Net Promoter Score (always active)');
  console.log('');
  console.log('Exclusion group "contact_method":');
  console.log('  📞 Phone Interview ←→ 🤝 In-Person Visit (only one can complete)');
  console.log('');
  console.log(`Project mode: guided`);
}

main().catch(err => {
  console.error('❌ Failed:', err.message);
  process.exit(1);
});
