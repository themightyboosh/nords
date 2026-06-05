const API = 'http://localhost:3000/api';

console.log(`🐾 Seeding "Pet Owner Pain Point Discovery" — Full Capability Demo\n`);

// ── Helper functions ──────────────────────────────────────
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
  const res = await fetch(`${API}${path}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`DELETE ${path} failed: ${res.status} ${await res.text()}`);
}

// ── Seed ──────────────────────────────────────────────────
async function seed() {
  try {
    const PROJECT_NAME = 'Pet Owner Pain Point Discovery';

    // ═══════════════════════════════════════════════════════
    // 1. CLEANUP
    // ═══════════════════════════════════════════════════════
    console.log('1. Checking for existing project...');
    const existingProjects = await get('/projects');
    const existing = existingProjects.find(p => p.name === PROJECT_NAME);
    if (existing) {
      console.log(`   ↳ Found (${existing.id}), deleting...`);
      await del(`/projects/${existing.id}`);
      console.log(`   ↳ Deleted.`);
    }

    // ═══════════════════════════════════════════════════════
    // 2. CREATE PROJECT
    // ═══════════════════════════════════════════════════════
    console.log('\n2. Creating Project...');
    const project = await post('/projects', {
      name: PROJECT_NAME,
      description: 'A comprehensive pet owner interview that discovers, captures, and deeply probes up to 4 pain points across health, behavioral, environmental, financial, time, and emotional categories.',
      purpose: 'AI-conducted ethnographic interview to understand pet owner pain points for product and service innovation',
      icon: 'Heart',
      accent_color: '#f97316',
      project_mode: 'guided',
      mcp_mutable: false,
      mcp_system_prompt: `You are a warm, professional researcher conducting an in-depth interview with a pet owner. Your opening message should be something like:

"Hi there! I'm so glad you're here. Our goal today is simple — I want to understand the biggest issues and frustrations you face as a pet owner. Not the highlight reel, but the real stuff — the daily annoyances, the things that stress you out, the problems that cost you time and money. Your honest answers will help shape better products and services for pet owners like you.

Before we dive in, can I get your name? And most importantly — tell me about your pet! What's their name?"

THE FLOW:
1. NAMES FIRST — Get the owner's name and their pet's name immediately. These are the two most important variables. Once you have them, ALWAYS use them. Say "Luna" not "your pet." Say "Jordan" not "you." This is a conversation between humans about someone they love.

2. GET TO KNOW THEM — Learn about the pet: species, breed, age. Learn about the owner: living situation, schedule. But do it conversationally: "Tell me about {{pet_name}} — how old, what breed?" NOT "Please provide your pet's species and age."

3. OPEN THE PAIN DISCOVERY — The transition to pain points should feel natural: "Now that I have a picture of you and {{pet_name}}, I want to hear about the hard parts. Walk me through a typical day — when does pet ownership feel like a struggle?"

4. CAPTURE PAIN POINTS (UP TO 4) — Each pain point follows a TWO-PHASE pattern:
   PHASE 1 — NAME IT: When frustration surfaces, name it and save it as ppN_name immediately.
   PHASE 2 — PROBE IT: Now go deep. Use {{ppN_name}} and {{pet_name}} in your probing questions. Capture up to 4 long-text context items per pain point. Each context item should be a rich quote, insight, or story. The achieved_prompt will guide you.

5. PROBING EACH PAIN POINT:
   → "You mentioned {{ppN_name}} — tell me more. When does this happen with {{pet_name}}?"
   → "When {{ppN_name}} happens, what goes through your mind?"
   → "What have you tried to fix {{ppN_name}}? How much have you spent?"
   → "If you could snap your fingers and solve {{ppN_name}} for {{pet_name}}, what would that look like?"
   Save each substantive answer as ppN_context_1, ppN_context_2, etc. After up to 4 context captures OR when the owner has said enough, set ppN_probed to true.

6. CHECK FOR MORE — After probing each pain point: "Are there other frustrations with {{pet_name}} we haven't covered, or have we hit the big ones?" If they say "that's the main ones" or "I think that covers it" — set pain_points_done to true and ask about their top priority.

7. PRIORITIZE — When they're done: "Of everything we talked about with {{pet_name}}, which one keeps you up at night?"

INTERVIEW TECHNIQUES:
• ONE QUESTION AT A TIME — Never stack questions. Let them answer fully.
• REFLECTIVE LISTENING — Mirror back: "So it sounds like {{pet_name}}'s anxiety is really affecting YOUR daily life too..."
• THE ECHO PROBE — Repeat their emotional phrase as a question: "She just goes completely crazy?" — this draws out more detail.
• COMFORTABLE SILENCES — Don't rush to fill pauses. They often lead to the deepest insights.
• NATURAL DATA COLLECTION — Don't interrogate. "Roughly what do you spend on {{pet_name}} each month?" not "What is your monthly pet budget?"
• ORGANIC CONTEXT CAPTURE — Save context items as the owner shares them. Don't treat them as a checklist. If they give you a vivid story about {{ppN_name}}, save the whole thing as ppN_context_1.

PET-TYPE PROBING (reference Expert Knowledge and Breed Profile nords for deeper questions):
• DOGS: Exercise needs, training, grooming, separation anxiety, leash reactivity, socialization
• CATS: Litter box, scratching, hidden illness, indoor enrichment, nighttime activity
• BIRDS: Noise, cage cleaning, social needs, feather health, finding avian vets
• EXOTIC: Habitat requirements, specialized vets, legal/permits, enclosure sizing

RULES:
• ALWAYS use {{pet_name}} by name — never "your pet" or "the dog."
• ALWAYS use {{owner_name}} — never generic "you."
• NEVER suggest solutions during pain point discovery. Listen and capture.
• ALWAYS capture verbatim quotes in their exact words when possible.
• Reference Expert Knowledge nords for domain expertise when probing.
• When a goal completes, the system tells you what to do next via the achieved_prompt.
• The graph is READ-ONLY reference material. All data capture goes through session variables.`,
    });
    const PID = project.id;
    console.log(`   ✅ Project: ${PID}`);

    // ═══════════════════════════════════════════════════════
    // 3. NORD TYPES (7) — Knowledge Domain Types
    //
    // These define categories of KNOWLEDGE, not data to collect.
    // Each nord is a rich reference article the AI reads.
    // ═══════════════════════════════════════════════════════
    console.log('\n3. Creating NordTypes...');
    const typeSpecs = [
      {
        name: 'Life Stage',
        description: 'A period in a pet\'s life with unique health risks, behavioral shifts, owner challenges, and care requirements.',
        icon: 'Clock',
        accent_color: '#3b82f6',
        properties_schema: [
          { name: 'Stage Name', type: 'short_text', required: true, card_row: 1 },
          { name: 'Species', type: 'select', required: true, card_row: 1, config: { options: ['Dog', 'Cat', 'Bird', 'Exotic', 'All'] } },
          { name: 'Age Range', type: 'short_text', required: true, card_row: 2 },
          { name: 'Key Milestones', type: 'long_text', required: false, card_row: 3 },
          { name: 'Common Health Risks', type: 'long_text', required: false, card_row: 4 },
          { name: 'Owner Challenges', type: 'long_text', required: false, card_row: 5 },
          { name: 'Behavioral Shifts', type: 'long_text', required: false },
          { name: 'Transition Signs', type: 'long_text', required: false },
          { name: 'Content', type: 'long_text', required: true, card_row: 6 },
        ],
      },
      {
        name: 'Breed Profile',
        description: 'Breed-specific intelligence — health predispositions, temperament, care needs, and common owner frustrations.',
        icon: 'Heart',
        accent_color: '#f59e0b',
        properties_schema: [
          { name: 'Breed Name', type: 'short_text', required: true, card_row: 1 },
          { name: 'Species', type: 'select', required: true, card_row: 1, config: { options: ['Dog', 'Cat', 'Bird', 'Reptile', 'Small Mammal'] } },
          { name: 'Size Category', type: 'select', required: false, card_row: 2, config: { options: ['Toy (<10 lbs)', 'Small (10-25 lbs)', 'Medium (25-50 lbs)', 'Large (50-90 lbs)', 'Giant (90+ lbs)', 'N/A'] } },
          { name: 'Energy Level', type: 'number', required: false, is_scale_property: true, card_row: 2 },
          { name: 'Lifespan', type: 'short_text', required: false, card_row: 3 },
          { name: 'Annual Cost Range', type: 'short_text', required: false, card_row: 3 },
          { name: 'Health Predispositions', type: 'long_text', required: true, card_row: 4 },
          { name: 'Behavioral Tendencies', type: 'long_text', required: true, card_row: 5 },
          { name: 'Grooming Needs', type: 'long_text', required: false },
          { name: 'Content', type: 'long_text', required: true, card_row: 6 },
        ],
      },
      {
        name: 'Common Pain',
        description: 'A well-documented pain point pattern experienced by many pet owners — with prevalence data, owner quotes, cost impact, and what works vs. what doesn\'t.',
        icon: 'AlertTriangle',
        accent_color: '#ef4444',
        properties_schema: [
          { name: 'Pain Name', type: 'short_text', required: true, card_row: 1 },
          { name: 'Category', type: 'multi_select', required: true, card_row: 1, config: { options: ['Health & Medical', 'Behavioral', 'Financial', 'Time & Lifestyle', 'Environmental', 'Emotional'] } },
          { name: 'Severity', type: 'number', required: false, is_scale_property: true, card_row: 2 },
          { name: 'Prevalence', type: 'short_text', required: false, card_row: 2 },
          { name: 'Cost Impact', type: 'short_text', required: false, card_row: 3 },
          { name: 'Typical Owner Quote', type: 'long_text', required: false, card_row: 4 },
          { name: 'What Works', type: 'long_text', required: false, card_row: 5 },
          { name: 'Species Affected', type: 'multi_select', required: false, config: { options: ['Dog', 'Cat', 'Bird', 'Exotic', 'All'] } },
          { name: 'What Doesn\'t Work', type: 'long_text', required: false },
          { name: 'Content', type: 'long_text', required: true, card_row: 6 },
        ],
      },
      {
        name: 'Living Environment',
        description: 'An archetype of where pets live — with specific challenges, enrichment opportunities, and which pain points it amplifies.',
        icon: 'Home',
        accent_color: '#10b981',
        properties_schema: [
          { name: 'Environment Name', type: 'short_text', required: true, card_row: 1 },
          { name: 'Space Type', type: 'select', required: true, card_row: 1, config: { options: ['Apartment', 'Condo/Townhouse', 'House', 'Farm/Rural', 'Assisted Living'] } },
          { name: 'Outdoor Access', type: 'select', required: true, card_row: 2, config: { options: ['None', 'Balcony Only', 'Small Yard', 'Large Yard', 'Acreage'] } },
          { name: 'Pet-Friendly Rating', type: 'number', required: false, is_scale_property: true, card_row: 2 },
          { name: 'Common Challenges', type: 'long_text', required: true, card_row: 3 },
          { name: 'Pain Amplifiers', type: 'long_text', required: false, card_row: 4 },
          { name: 'Best Suited Pets', type: 'long_text', required: false, card_row: 5 },
          { name: 'Enrichment Opportunities', type: 'long_text', required: false },
          { name: 'Content', type: 'long_text', required: true, card_row: 6 },
        ],
      },
      {
        name: 'Behavioral Pattern',
        description: 'A specific behavioral issue with its triggers, science-based explanation, intervention approaches, and cost burden.',
        icon: 'Zap',
        accent_color: '#06b6d4',
        properties_schema: [
          { name: 'Behavior Name', type: 'short_text', required: true, card_row: 1 },
          { name: 'Species', type: 'select', required: true, card_row: 1, config: { options: ['Dog', 'Cat', 'Bird', 'Exotic', 'All'] } },
          { name: 'Valence', type: 'select', required: true, card_row: 2, config: { options: ['Normal', 'Concerning', 'Problematic', 'Dangerous'] } },
          { name: 'Trigger', type: 'short_text', required: true, card_row: 2 },
          { name: 'Intensity', type: 'number', required: false, is_scale_property: true, card_row: 3 },
          { name: 'Science Explanation', type: 'long_text', required: true, card_row: 4 },
          { name: 'Intervention Approaches', type: 'long_text', required: false, card_row: 5 },
          { name: 'Cost of Intervention', type: 'short_text', required: false },
          { name: 'Success Rate', type: 'short_text', required: false },
          { name: 'Content', type: 'long_text', required: true, card_row: 6 },
        ],
      },
      {
        name: 'Expert Knowledge',
        description: 'Deep reference material on a domain — veterinary science, nutrition, finance, psychology. The AI reads these to be an expert, not just an interviewer.',
        icon: 'BookOpen',
        accent_color: '#8b5cf6',
        properties_schema: [
          { name: 'Topic', type: 'short_text', required: true, card_row: 1 },
          { name: 'Domain', type: 'select', required: true, card_row: 1, config: { options: ['Veterinary', 'Nutrition', 'Behavior', 'Finance', 'Psychology', 'General'] } },
          { name: 'Species', type: 'multi_select', required: false, card_row: 2, config: { options: ['Dog', 'Cat', 'Bird', 'Exotic', 'All'] } },
          { name: 'Key Statistics', type: 'long_text', required: false, card_row: 3 },
          { name: 'Probing Questions', type: 'long_text', required: false, card_row: 4 },
          { name: 'Red Flags', type: 'long_text', required: false, card_row: 5 },
          { name: 'Common Questions & Answers', type: 'long_text', required: false },
          { name: 'Content', type: 'long_text', required: true, card_row: 6 },
        ],
      },
      {
        name: 'Interview Guide',
        description: 'Methodology for effective ethnographic interviewing — rapport building, probing frameworks, emotional handling, and stage-specific techniques.',
        icon: 'MessageSquare',
        accent_color: '#ec4899',
        properties_schema: [
          { name: 'Technique Name', type: 'short_text', required: true, card_row: 1 },
          { name: 'When to Use', type: 'long_text', required: true, card_row: 2 },
          { name: 'How to Apply', type: 'long_text', required: true, card_row: 3 },
          { name: 'Examples', type: 'long_text', required: false, card_row: 4 },
          { name: 'Common Mistakes', type: 'long_text', required: false, card_row: 5 },
          { name: 'Content', type: 'long_text', required: true, card_row: 6 },
        ],
      },
    ];

    const types = {};
    for (const spec of typeSpecs) {
      const t = await post(`/projects/${PID}/nord-types`, spec);
      types[spec.name] = t.id;
      console.log(`   ↳ ${spec.name}`);
    }

    // ═══════════════════════════════════════════════════════
    // 4. CONNECTION TYPES (7) — Knowledge Relationships
    // ═══════════════════════════════════════════════════════
    console.log('\n4. Creating ConnectionTypes...');
    const connSpecs = [
      {
        name: 'Predisposes',
        description: 'This life stage or factor makes this condition/behavior more likely',
        direction: 'forward',
        line_style: 'dashed',
        accent_color: '#ef4444',
        x_stage_labels: [],
        properties_schema: [
          { name: 'likelihood', type: 'select', required: false, config: { options: ['Low', 'Moderate', 'High', 'Very High'] } },
        ],
      },
      {
        name: 'Amplifies',
        description: 'This environment or factor makes this issue worse',
        direction: 'forward',
        line_style: 'solid',
        accent_color: '#f97316',
        x_stage_labels: [],
        properties_schema: [
          { name: 'severity_increase', type: 'short_text', required: false },
        ],
      },
      {
        name: 'Causes',
        description: 'This directly leads to or produces this outcome',
        direction: 'forward',
        line_style: 'solid',
        accent_color: '#ef4444',
        x_stage_labels: [],
        properties_schema: [
          { name: 'frequency', type: 'select', required: false, config: { options: ['Sometimes', 'Often', 'Usually', 'Always'] } },
        ],
      },
      {
        name: 'Informs',
        description: 'This knowledge helps understand or contextualize this topic',
        direction: 'forward',
        line_style: 'dotted',
        accent_color: '#8b5cf6',
        x_stage_labels: [],
        properties_schema: [
          { name: 'relevance', type: 'select', required: false, config: { options: ['Background', 'Contextual', 'Directly Applicable'] } },
        ],
      },
      {
        name: 'Guides',
        description: 'This methodology or technique applies at this stage',
        direction: 'forward',
        line_style: 'dotted',
        accent_color: '#3b82f6',
        x_stage_labels: [],
        properties_schema: [
          { name: 'priority', type: 'select', required: false, config: { options: ['Optional', 'Recommended', 'Essential'] } },
        ],
      },
      {
        name: 'Common In',
        description: 'This issue is frequently observed in this breed, life stage, or environment',
        direction: 'forward',
        line_style: 'solid',
        accent_color: '#f59e0b',
        x_stage_labels: [],
        properties_schema: [
          { name: 'prevalence', type: 'short_text', required: false },
        ],
      },
      {
        name: 'Related To',
        description: 'These concepts are connected or often co-occur',
        direction: 'none',
        line_style: 'dotted',
        accent_color: '#7986cb',
        x_stage_labels: [],
        properties_schema: [
          { name: 'relationship_note', type: 'short_text', required: false },
        ],
      },
    ];

    const conns = {};
    for (const spec of connSpecs) {
      const c = await post(`/projects/${PID}/connection-types`, spec);
      conns[spec.name] = c.id;
      console.log(`   ↳ ${spec.name}`);
    }

    // ═══════════════════════════════════════════════════════
    // 5. PERSONAS (5)
    // ═══════════════════════════════════════════════════════
    console.log('\n5. Creating Personas...');
    const personaSpecs = [
      {
        name: 'The Empathic Interviewer',
        avatar_seed: 'empathic_interviewer',
        accent_color: '#3b82f6',
        background: 'A seasoned UX researcher with 12 years conducting ethnographic interviews in health and consumer products. Trained in contextual inquiry, motivational interviewing, and service design research.',
        primary_motivation: 'Create psychological safety so the owner shares authentic frustrations — not the sanitized version they tell their friends.',
        voice_and_tone: 'Warm, genuinely curious, unhurried. Uses "Tell me more about that…", "That sounds really challenging — walk me through what happens…". Never interrupts. Allows comfortable silences.',

        mental_models: [
          'Grand Tour Method: Open every new topic with a broad question ("Walk me through a typical morning with {{pet_name}}") and let the owner narrate. Listen for friction signals: sighs, "I guess", "it\'s fine", hedging language. These are gold — probe them gently.',
          'Emotional Laddering (5 Whys Variant): When a pain point surfaces, climb the emotional ladder: (1) "What happens?" → behavioral description. (2) "How often?" → frequency. (3) "How does that make you feel?" → emotional weight. (4) "What have you tried?" → coping and spend. (5) "What would perfect look like?" → unmet need.',
          'The Echo Probe: After the owner finishes speaking, repeat back the last emotionally charged phrase as a question. "She just goes completely crazy?" — this validates their experience and naturally prompts elaboration.',
          'Pain Point Two-Phase Protocol: PHASE 1 — When frustration surfaces, name it immediately (save ppN_name). PHASE 2 — Probe deeply using the named pain point: "You mentioned {{ppN_name}} — tell me everything." Capture up to 4 context items (long-text quotes, stories, insights). Set ppN_probed = true when the owner has shared enough or after 4 captures.',
        ],
        guardrails: [
          { mode: 'never', text: 'NEVER suggest solutions, products, or recommendations during pain point discovery.' },
          { mode: 'never', text: 'NEVER ask more than one question at a time.' },
          { mode: 'always', text: 'ALWAYS capture verbatim quotes in the owner\'s exact words when they express frustration.' },
          { mode: 'always', text: 'ALWAYS use {{owner_name}} and {{pet_name}} in follow-up questions.' },
        ],
      },
      {
        name: 'Dr. Patel — Veterinary Expert',
        avatar_seed: 'vet_expert',
        accent_color: '#ef4444',
        background: 'Board-certified veterinarian (DVM, DACVIM) with 18 years of clinical practice across small animal, avian, and exotic medicine.',
        primary_motivation: 'Assess health-related pain points for medical urgency, identify preventive care gaps, and understand the financial barriers that prevent owners from following through on veterinary recommendations.',
        voice_and_tone: 'Clinical but warm — the vet you trust. Uses "From a veterinary perspective…", "That symptom pattern is worth noting…", "Many owners experience exactly this…".',

        mental_models: [
          'Clinical Triage Framework: Classify every health-related pain point by urgency: RED (Emergency), ORANGE (Urgent — within 48hr), YELLOW (Routine), GREEN (Preventive). Always probe: "When did this start?" and "Is it getting worse?"',
          'The Owner-Compliance Gap: When an owner describes a health concern, probe the compliance chain: (1) Were they told by a vet? (2) Did they follow through? (3) If not, why? Common barriers: cost anxiety, inconvenience, denial, conflicting internet advice.',
          'Breed-Specific Risk Awareness: Reference the Expert Knowledge and Breed Profile nodes for breed-specific health predispositions. If the owner mentions a Labrador, ask about hip dysplasia and obesity. If a Bulldog, ask about breathing.',
        ],
        guardrails: [
          { mode: 'always', text: 'ALWAYS flag any pain point involving lethargy combined with appetite loss as potentially urgent.' },
          { mode: 'never', text: 'NEVER diagnose. Use language like "that\'s worth discussing with your vet" rather than "your pet has…".' },
          { mode: 'always', text: 'ALWAYS ask about preventive care compliance when health pain points surface.' },
        ],
      },
      {
        name: 'Maya — Animal Behaviorist',
        avatar_seed: 'behaviorist',
        accent_color: '#f59e0b',
        background: 'Certified Applied Animal Behaviorist (CAAB) with a PhD in ethology. Expert in operant conditioning, desensitization protocols, and the human-animal bond.',
        primary_motivation: 'Understand behavioral pain points through the lens of why the animal is communicating — not just what they are doing. Every "problem behavior" is an unmet need.',
        voice_and_tone: 'Patient, educational, empowering. Uses "Behaviors are communications — let\'s decode what {{pet_name}} is telling you…", "That\'s actually really common and very addressable…".',

        mental_models: [
          'ABC Analysis (Antecedent–Behavior–Consequence): For every behavioral pain point, map the full chain: ANTECEDENT ("What was happening right before?"), BEHAVIOR ("Exactly what does the pet do?"), CONSEQUENCE ("What happens after — how do you respond?"). Most owners only describe the B.',
          'Environment-Behavior Matrix: 80% of behavioral issues are environment-driven. When a behavioral pain point surfaces, assess: Space, Stimulation, Routine Consistency, Social Exposure.',
          'The Owner-Behavior Feedback Loop: Owners often unknowingly reinforce the exact behaviors they want to stop. Listen for accidental reinforcement patterns.',
        ],
        guardrails: [
          { mode: 'never', text: 'NEVER label a pet as "bad," "aggressive," or "dominant." Label BEHAVIORS, not animals.' },
          { mode: 'always', text: 'ALWAYS ask about the trigger before categorizing any behavioral pain point.' },
          { mode: 'always', text: 'ALWAYS probe the owner\'s emotional response to the behavior — shame, frustration, helplessness are often the real pain points.' },
        ],
      },
      {
        name: 'Sam — Home Environment Specialist',
        avatar_seed: 'environment_specialist',
        accent_color: '#10b981',
        background: 'Interior architect turned pet-space design consultant with 8 years specializing in multi-species households.',
        primary_motivation: 'Assess how the physical environment contributes to or alleviates pet-related pain points.',
        voice_and_tone: 'Observant, practical, spatial. Uses "Your space tells a story about this frustration…", "Small spatial changes can have outsized impact…".',

        mental_models: [
          'Space-Stress Correlation Map: Dogs need ~100 sq ft per 25 lbs + outdoor access. Cats need vertical territory more than floor space. Birds need minimum 2x wingspan cage width. Below-threshold space predicts specific pain points.',
          'Environmental Enrichment Audit: Score the environment on 5 dimensions: Feeding enrichment, Social enrichment, Physical enrichment, Sensory enrichment, Novel stimulation. Deficits predict specific behavioral issues.',
          'The Cohabitation Conflict Index: When pain points involve damage or mess, assess: Where does the pet spend most time? Where does conflict happen? Often the fix is redesigning the space, not the pet.',
        ],
        guardrails: [
          { mode: 'always', text: 'ALWAYS assess outdoor access before attributing behavioral pain points to temperament.' },
          { mode: 'always', text: 'ALWAYS ask about the pet\'s primary resting spot and feeding location.' },
        ],
      },
      {
        name: 'Riley — Consumer Insights Researcher',
        avatar_seed: 'product_researcher',
        accent_color: '#8b5cf6',
        background: 'Consumer insights lead with 7 years at pet care startups. Expert in Jobs-to-be-Done methodology and willingness-to-pay analysis.',
        primary_motivation: 'Identify pain points with commercial viability — where severity × frequency × willingness-to-pay signals a genuine product opportunity.',
        voice_and_tone: 'Analytical, probing, commercially astute. Uses "What have you already tried to solve this?", "How much have you spent on this?", "If something perfectly solved this, what would you pay?".',

        mental_models: [
          'Jobs-to-be-Done Framework: Every pain point represents a "job" the owner is "hiring" a solution for. Map: (1) The functional job, (2) The emotional job, (3) The social job. The emotional and social jobs often have higher willingness-to-pay.',
          'Pain-Spend Correlation Matrix: For each pain point, capture severity (1-10) and total money spent trying to solve it ($). High severity + high spend = validated demand. High severity + low spend = access barrier.',
          'Solution Exhaustion Mapping: "Walk me through everything you\'ve tried." For each attempt: What was it? How much? How long? Why did you stop? The graveyard of failed solutions is the roadmap for the next product.',
        ],
        guardrails: [
          { mode: 'always', text: 'ALWAYS ask what solutions the owner has already tried and how much they spent.' },
          { mode: 'always', text: 'ALWAYS capture the willingness-to-pay signal: "If something perfectly solved this, would that be worth $10/month? $50? $100?"' },
          { mode: 'never', text: 'NEVER pitch or recommend specific products during the interview.' },
        ],
      },
    ];

    const personas = {};
    for (const spec of personaSpecs) {
      const p = await post(`/projects/${PID}/personas`, spec);
      personas[spec.name] = p.id;
      console.log(`   ↳ ${spec.name}`);
    }

    // ── Persona Category Weights ──
    console.log('   Setting category weights...');
    const weights = {
      'The Empathic Interviewer': { 'Predisposes': 60, 'Amplifies': 50, 'Causes': 80, 'Informs': 40, 'Guides': 100, 'Common In': 70, 'Related To': 70 },
      'Dr. Patel — Veterinary Expert': { 'Predisposes': 100, 'Amplifies': 80, 'Causes': 100, 'Informs': 70, 'Guides': 40, 'Common In': 90, 'Related To': 50 },
      'Maya — Animal Behaviorist': { 'Predisposes': 80, 'Amplifies': 80, 'Causes': 90, 'Informs': 60, 'Guides': 30, 'Common In': 100, 'Related To': 50 },
      'Sam — Home Environment Specialist': { 'Predisposes': 50, 'Amplifies': 100, 'Causes': 50, 'Informs': 40, 'Guides': 30, 'Common In': 60, 'Related To': 70 },
      'Riley — Consumer Insights Researcher': { 'Predisposes': 40, 'Amplifies': 50, 'Causes': 60, 'Informs': 30, 'Guides': 90, 'Common In': 40, 'Related To': 80 },
    };
    for (const [pName, w] of Object.entries(weights)) {
      for (const [cName, weight] of Object.entries(w)) {
        await put(`/personas/${personas[pName]}/weights/${conns[cName]}`, { weight });
      }
    }

    // ═══════════════════════════════════════════════════════
    // 6. NORDS — The AI's Knowledge Brain
    //
    // Every nord is a rich reference article. The AI reads
    // these to be SMART — to know about breeds, life stages,
    // common pains, environments, behavior, and methodology.
    // Nords do NOT collect data. Variables do that.
    // ═══════════════════════════════════════════════════════
    console.log('\n6. Creating Nords...');
    let nc = 0;

    // ── LIFE STAGES ──
    const lsPuppy = await post(`/projects/${PID}/nords`, {
      type_id: types['Life Stage'],
      title: 'Puppy Stage',
      position_x: 0.05, position_y: 0.10,
      properties: {
        'Stage Name': 'Puppy',
        'Species': 'Dog',
        'Age Range': '0–12 months',
        'Key Milestones': `• 3-4 weeks: Eyes/ears open, first steps
• 6-8 weeks: First vaccinations, weaning
• 8-16 weeks: CRITICAL socialization window — experiences in this period shape lifelong temperament
• 4-6 months: Teething peak — most destructive chewing happens here
• 6-12 months: Sexual maturity, adolescent rebellion begins`,
        'Common Health Risks': `• Parvo, distemper (if unvaccinated) — $2,000-$5,000 treatment
• Intestinal parasites — 85% of puppies have roundworms at birth
• Hypoglycemia in toy breeds — can be fatal
• Panosteitis ("growing pains") in large breeds`,
        'Behavioral Shifts': `• Mouthing/nipping peaks at 3-5 months — normal but startling for new owners
• Fear periods at 8-11 weeks and 6-14 months — single bad experience can create lifelong phobia
• Boundary testing escalates at 5-8 months — "puppy adolescence"
• Housetraining typically takes 4-6 months of consistent work`,
        'Owner Challenges': `• Sleep deprivation (nighttime crying, 2am bathroom trips)
• Destruction: shoes, furniture, walls during teething
• Socialization pressure — "you only get one window"
• Financial shock: first-year costs average $1,500-$4,500
• Decision paralysis: training methods, food brands, vet schedules`,
        'Transition Signs': `Moving to adolescent when: permanent teeth fully in, attention span lengthening, testing boundaries more deliberately rather than randomly`,
        'Content': `THE PUPPY STAGE — COMPLETE REFERENCE

The puppy stage is where most pet ownership relationships are formed — and where most frustrations begin. 30% of dogs surrendered to shelters are under 1 year old, primarily due to behavioral issues that owners weren't prepared for.

FIRST-TIME OWNER TRAP: Many owners adopt a puppy expecting a cuddly companion and are blindsided by the reality — a teething, pooping, crying animal that requires 24/7 supervision. The gap between expectation and reality is the #1 predictor of rehoming.

COST REALITY: First-year puppy costs by size:
• Small breed: $1,500-$2,500 (vaccines, spay/neuter, food, supplies, initial vet visits)
• Medium breed: $2,000-$3,500
• Large breed: $2,500-$4,500
• Giant breed: $3,500-$6,000+

THE SOCIALIZATION WINDOW (8-16 weeks): This is the single most important period in a dog's life. Puppies who are positively exposed to 100+ novel stimuli (people, dogs, surfaces, sounds, environments) during this window develop into confident adults. Puppies who miss this window are significantly more likely to develop fear-based aggression, anxiety, and reactivity — problems that cost thousands to manage and are rarely fully resolved.

WHAT OWNERS DON'T KNOW THEY DON'T KNOW:
• Puppy teeth are razor-sharp by design — it teaches bite inhibition through play feedback
• Puppies need 18-20 hours of sleep per day — overstimulation causes MORE behavioral problems than understimulation
• "He'll grow out of it" is the most dangerous phrase in dog ownership — behaviors that aren't redirected are reinforced`,
      },
    }); nc++;

    const lsAdolescent = await post(`/projects/${PID}/nords`, {
      type_id: types['Life Stage'],
      title: 'Adolescent Dog',
      position_x: 0.15, position_y: 0.10,
      properties: {
        'Stage Name': 'Adolescent',
        'Species': 'Dog',
        'Age Range': '1–3 years',
        'Key Milestones': `• Physical maturity (size, muscle development)
• Sexual maturity if not spayed/neutered
• Continued brain development — impulse control still forming
• Permanent temperament emerging`,
        'Common Health Risks': `• ACL/CCL tears from high-energy play
• Allergies often first present at 1-3 years
• Weight gain if exercise doesn't match energy needs`,
        'Behavioral Shifts': `• "Selective deafness" — known commands are ignored, not forgotten
• Increased independence and confidence
• Leash reactivity often first emerges here
• Resource guarding may intensify`,
        'Owner Challenges': `• Training regression — "he knew this already!"
• Increased strength makes physical control harder
• Energy levels peak — 2+ hours of exercise daily for many breeds
• Social conflicts with other dogs increase`,
        'Content': `THE ADOLESCENT DOG — THE "TEENAGER" YEARS

This is when most dogs are surrendered. Not puppyhood — adolescence. The cute puppy becomes a strong, willful, high-energy animal that ignores commands and tests every boundary.

WHAT'S ACTUALLY HAPPENING: The canine prefrontal cortex (impulse control center) doesn't fully mature until 2-3 years. Dogs aren't being "bad" — their brain literally cannot override impulses yet. It's neurological, not behavioral defiance.

THE TRAINING REGRESSION TRAP: Owners invest heavily in puppy training, see results, then stop. At 12-18 months the dog "forgets everything." They didn't forget — the training wasn't proofed against adolescent hormones and environmental distractions. This is when owners feel the most betrayed and frustrated.

EXERCISE MATH: An under-exercised adolescent dog will create its own entertainment — chewing, digging, barking, escaping. For working breeds, 2+ hours/day of physical + mental stimulation is the minimum. Most owners provide 30 minutes.`,
      },
    }); nc++;

    const lsAdultDog = await post(`/projects/${PID}/nords`, {
      type_id: types['Life Stage'],
      title: 'Adult Dog',
      position_x: 0.25, position_y: 0.10,
      properties: {
        'Stage Name': 'Adult',
        'Species': 'Dog',
        'Age Range': '3–7 years',
        'Key Milestones': `• Full physical and mental maturity
• Settled temperament and predictable routine
• Peak performance and health
• Dental disease often accumulates silently`,
        'Common Health Risks': `• Dental disease — 80% of dogs have it by age 3
• Weight gain — 56% of dogs are overweight/obese
• Allergies (skin, food, environmental)
• Early arthritis signs in predisposed breeds`,
        'Owner Challenges': `• Complacency — "he's fine" masks creeping health issues
• Lifestyle friction — travel, work schedule changes, new babies
• Routine veterinary costs feel "unnecessary" when dog appears healthy
• Weight management requires discipline owners often lack`,
        'Content': `THE ADULT DOG — THE "INVISIBLE" STAGE

Adult dogs are the most overlooked stage because they appear stable. This is when preventive care matters most and when owners are least likely to invest in it.

THE COMPLACENCY TRAP: Adult dogs seem "fine." They've settled into routines. Owners skip annual vet visits, delay dental cleanings, and miss early signs of weight gain, dental disease, and joint degradation. By the time symptoms are visible, conditions are advanced and expensive.

DENTAL DISEASE: The single most under-treated condition in adult dogs. 80% have significant dental disease by age 3. Untreated dental disease causes chronic pain, organ damage (bacteria enter bloodstream), and dramatically reduces lifespan. A professional dental cleaning costs $300-$800. Owners who skip it spend $2,000-$5,000 on extractions and complications later.

WEIGHT: 56% of US dogs are overweight or obese. Every extra pound on a medium dog reduces lifespan by 2 months. Owners don't see it because the weight gain is gradual — "he's just big-boned." Overweight dogs develop arthritis, diabetes, and respiratory problems 2-3 years earlier.`,
      },
    }); nc++;

    const lsSeniorDog = await post(`/projects/${PID}/nords`, {
      type_id: types['Life Stage'],
      title: 'Senior Dog',
      position_x: 0.35, position_y: 0.10,
      properties: {
        'Stage Name': 'Senior',
        'Species': 'Dog',
        'Age Range': '7–12 years (varies by size)',
        'Key Milestones': `• Small breeds: senior at 10-12 years
• Medium breeds: senior at 8-10 years  
• Large breeds: senior at 6-8 years
• Giant breeds: senior at 5-6 years`,
        'Common Health Risks': `• Arthritis — 80% of dogs over 8 have some degree
• Cognitive dysfunction syndrome (canine dementia) — 28% of 11-12 year old dogs
• Cancer — leading cause of death in dogs over 10
• Kidney disease, liver disease, heart disease
• Vision and hearing loss`,
        'Owner Challenges': `• Escalating vet costs — senior panels, imaging, medications
• Mobility management — ramps, orthopedic beds, joint supplements
• Cognitive decline — nighttime pacing, confusion, house soiling
• Anticipatory grief — the awareness that time is limited
• Quality of life decisions`,
        'Content': `THE SENIOR DOG — THE EMOTIONAL STAGE

The senior stage is when the financial and emotional costs of pet ownership converge. Owners who breezed through puppyhood and adulthood are suddenly facing $500-$2,000 vet visits every few months, watching their companion slow down, and confronting mortality.

FINANCIAL REALITY: The last 2 years of a dog's life account for 30-40% of lifetime veterinary costs. Bi-annual bloodwork ($200-$400), arthritis management ($50-$200/month), dental procedures ($500-$1,500), diagnostic imaging ($300-$1,000) — costs that compound.

COGNITIVE DYSFUNCTION: Canine dementia affects 28% of dogs aged 11-12 and 68% of dogs aged 15-16. Symptoms: nighttime restlessness, staring at walls, forgetting housetraining, not recognizing family members. There is no cure. Management costs $50-$150/month in supplements and medications.

THE HARDEST QUESTION: "How will I know when it's time?" — 72% of senior dog owners report this as their greatest source of anxiety. They want a clear answer, but quality of life assessment is subjective and situational.`,
      },
    }); nc++;

    const lsKitten = await post(`/projects/${PID}/nords`, {
      type_id: types['Life Stage'],
      title: 'Kitten Stage',
      position_x: 0.05, position_y: 0.25,
      properties: {
        'Stage Name': 'Kitten',
        'Species': 'Cat',
        'Age Range': '0–12 months',
        'Key Milestones': `• 2-7 weeks: Socialization window (much shorter than dogs!)
• 8 weeks: Minimum adoption age
• 3-4 months: Adult teeth start coming in
• 5-6 months: Sexual maturity — spay/neuter timing critical
• 6-12 months: "Crazy kitten" energy peak`,
        'Common Health Risks': `• Upper respiratory infections (shelter kittens especially)
• FeLV/FIV testing essential
• Intestinal parasites common
• URI can become chronic if untreated`,
        'Owner Challenges': `• Underestimated energy — kittens are CHAOTIC
• Litter training is usually easy but not automatic
• Scratching — they WILL scratch furniture
• Nocturnal activity — they're crepuscular predators
• Multi-cat introductions are complex`,
        'Content': `THE KITTEN STAGE — DECEPTIVE SIMPLICITY

Cats are "easier than dogs" — until they're not. Kittens are adopted at high rates because they're cute and perceived as low-maintenance. The reality: kittens are tiny chaos agents with claws.

THE SCRATCHING TRUTH: Cats NEED to scratch. It's not behavioral — it's biological (claw maintenance, territory marking, stretching). Declawing is amputation and increasingly illegal. Owners who don't provide appropriate scratching surfaces lose furniture and blame the cat.

THE SOCIALIZATION WINDOW: Cats have a much shorter socialization window than dogs (2-7 weeks). Kittens who aren't handled regularly by multiple people during this period often become fearful adults. Unlike dogs, you can't easily "re-socialize" an under-socialized adult cat.

LITTER BOX FOUNDATION: The litter box relationship is established in kittenhood. One box per cat plus one extra. Wrong litter, wrong location, wrong cleaning schedule = lifelong litter box avoidance. This is the #1 reason cats are surrendered.`,
      },
    }); nc++;

    const lsAdultCat = await post(`/projects/${PID}/nords`, {
      type_id: types['Life Stage'],
      title: 'Adult Cat',
      position_x: 0.15, position_y: 0.25,
      properties: {
        'Stage Name': 'Adult',
        'Species': 'Cat',
        'Age Range': '1–10 years',
        'Key Milestones': `• Full size by 12-18 months (Maine Coons by 3-4 years)
• Settled territorial behavior
• Social hierarchy established in multi-cat homes
• Peak hunting and play drive`,
        'Common Health Risks': `• Obesity — 60% of US cats are overweight
• Dental disease — often silent until advanced
• Urinary tract issues (especially males)
• Diabetes (strongly linked to obesity)`,
        'Owner Challenges': `• "Invisible illness" — cats hide symptoms as survival instinct
• Weight management — free-feeding is the default and the problem
• Indoor enrichment — bored cats become destructive or depressed
• Veterinary visits — 52% of cats haven't seen a vet in 12+ months`,
        'Content': `THE ADULT CAT — THE HIDDEN CRISIS

Adult cats are the most undertreated pets in America. 52% haven't been to a vet in over a year. Owners assume "cats take care of themselves." They don't.

THE HIDING INSTINCT: Cats are both predator and prey in the wild. Showing weakness = death. This evolutionary programming means cats actively HIDE illness symptoms until conditions are severe. By the time an owner notices something is wrong, the disease is often advanced and expensive to treat.

OBESITY EPIDEMIC: 60% of US cats are overweight. The cause is almost always free-feeding dry food (high carb, calorie-dense). A 12-lb cat should be an 8-lb cat. The extra weight leads to diabetes ($150-$300/month management), arthritis, and hepatic lipidosis (fatty liver disease — fatal if untreated).

THE VET AVOIDANCE CYCLE: Cat owners avoid the vet because: (1) the cat is "fine" (hiding symptoms), (2) transporting the cat is stressful (carrier + car), (3) cost anxiety. This creates a vicious cycle: no preventive care → problems escalate → expensive emergency → more vet avoidance.`,
      },
    }); nc++;

    const lsSeniorCat = await post(`/projects/${PID}/nords`, {
      type_id: types['Life Stage'],
      title: 'Senior Cat',
      position_x: 0.25, position_y: 0.25,
      properties: {
        'Stage Name': 'Senior',
        'Species': 'Cat',
        'Age Range': '10+ years',
        'Key Milestones': `• Increased sleeping (16-20 hours/day)
• Reduced grooming → matted fur
• Appetite and weight changes
• Vocalization changes (often more vocal)`,
        'Common Health Risks': `• Chronic kidney disease — #1 killer of cats over 10 (30-40% affected)
• Hyperthyroidism — common, treatable, easy to miss
• Cancer (lymphoma most common)
• Dental disease — often severe by this age
• Hypertension`,
        'Owner Challenges': `• Multiple concurrent conditions requiring daily medication
• Increased thirst/urination (kidney disease sign)
• Nighttime vocalization disrupting owner sleep
• Sub-Q fluid administration at home (kidney disease)
• End-of-life planning`,
        'Content': `THE SENIOR CAT — QUIET DECLINE

Senior cats are masters of concealment. Kidney disease — their #1 killer — can progress for months before owners notice any change. By the time increased thirst or weight loss is visible, 75% of kidney function is already gone.

KIDNEY DISEASE: Affects 30-40% of cats over 10. Cannot be cured, only managed. Early detection through annual bloodwork ($100-$200) dramatically extends quality of life. Management: prescription diet ($30-$60/month), sub-Q fluids ($30-$50/month), medications ($20-$80/month). Total: $100-$200/month for the remainder of life.

HYPERTHYROIDISM: The most common endocrine disease in cats. Symptoms: weight loss despite increased appetite, hyperactivity, vomiting. Often dismissed as "she's just getting old." Untreated, it destroys the heart. Treatment options: daily medication ($30-$50/month for life), radioactive iodine ($1,500-$2,500 one-time cure), surgery ($500-$1,500).

THE MEDICATION MAZE: Senior cats often end up on 3-5 daily medications. Administering pills to a cat is a skill most owners don't have. Non-compliance is the #1 reason treatable conditions become fatal.`,
      },
    }); nc++;

    const lsEndOfLife = await post(`/projects/${PID}/nords`, {
      type_id: types['Life Stage'],
      title: 'End of Life',
      position_x: 0.35, position_y: 0.25,
      properties: {
        'Stage Name': 'End of Life',
        'Species': 'All',
        'Age Range': 'Varies by species and condition',
        'Key Milestones': `• Quality of life declining despite treatment
• More "bad days" than "good days"
• Loss of interest in favorite activities
• Withdrawal from family interaction`,
        'Common Health Risks': `• Pain management becomes primary focus
• Organ failure (kidney, liver, heart)
• Cancer progression
• Immobility and muscle wasting`,
        'Owner Challenges': `• "How will I know when it's time?"
• Guilt — "Am I giving up too soon? Am I waiting too long?"
• Children and family processing grief
• Cost of palliative care vs. quality of remaining life
• Euthanasia decision and logistics
• Grief — anticipatory and post-loss`,
        'Content': `END OF LIFE — THE HARDEST CONVERSATION

This is the most emotionally charged topic in all of pet ownership. 92% of pet owners cry when discussing it. Handle with extreme care.

THE TWO GUILTS: Owners face a cruel double-bind:
1. "Am I giving up too soon?" — guilt of euthanizing while the pet still has moments of joy
2. "Am I waiting too long?" — guilt of prolonging suffering for the owner's inability to let go
There is no "right" answer. Both guilts are valid. The role of the interviewer is to acknowledge this without resolving it.

QUALITY OF LIFE ASSESSMENT: The most widely used tool is the HHHHHMM Scale:
H - Hurt (pain management adequate?)
H - Hunger (eating enough?)
H - Hydration (drinking?)
H - Hygiene (able to groom/stay clean?)
H - Happiness (still engaged with family?)
M - Mobility (able to move without pain?)
M - More good days than bad? (the deciding factor)

COST OF DYING: Euthanasia at vet clinic: $50-$300. In-home euthanasia: $250-$500. Cremation: $50-$350. Many owners don't plan for this financially and face emergency decisions while grieving.

WHAT OWNERS NEED: Not solutions. Not timelines. Not platitudes. They need someone to say: "This is the hardest thing. There is no wrong answer. You know your pet better than anyone."`,
      },
    }); nc++;

    // ── BREED PROFILES ──
    const brLabrador = await post(`/projects/${PID}/nords`, {
      type_id: types['Breed Profile'],
      title: 'Labrador Retriever',
      position_x: 0.50, position_y: 0.05,
      properties: {
        'Breed Name': 'Labrador Retriever',
        'Species': 'Dog',
        'Size Category': 'Large (50-90 lbs)',
        'Energy Level': 8,
        'Lifespan': '10-14 years',
        'Annual Cost Range': '$1,200-$2,000',
        'Health Predispositions': `• Hip and elbow dysplasia — 12% incidence. X-rays at 2 years. Surgery: $3,000-$7,000 per joint.
• Obesity — Labs have a POMC gene mutation making 25% of them perpetually hungry. They CANNOT self-regulate food intake.
• Exercise-induced collapse (EIC) — genetic. Dog collapses after intense exercise. Terrifying but manageable.
• Ear infections — floppy ears + water = chronic infections. $75-$200/treatment.
• Cancer — leading cause of death. 70% of Labs die of cancer.`,
        'Behavioral Tendencies': `• Mouthy — bred to retrieve, they carry everything. Not aggression, it's breed purpose.
• Food-obsessed — will eat ANYTHING (socks, toys, rocks). Foreign body surgery: $2,000-$5,000.
• High energy through age 3-4 — need structured outlets or they self-destruct.
• Extremely social — poor candidates for homes where owners are gone 10+ hours.
• Generally excellent with children — but their size + enthusiasm knocks small kids down.`,
        'Grooming Needs': `Moderate: Double coat sheds heavily twice yearly ("coat blow"). Weekly brushing, monthly baths. Ear cleaning weekly to prevent infections.`,
        'Content': `LABRADOR RETRIEVER — AMERICA'S #1 BREED (AND #1 SOURCE OF PAIN POINTS)

The most popular dog in America for 31 consecutive years is also the most surrendered. Why? Because the breed's reputation as "easy, family-friendly" masks significant needs that unprepared owners can't meet.

THE FOOD PROBLEM: 25% of Labs carry a POMC gene deletion that prevents them from ever feeling full. These dogs are not greedy — they are genetically incapable of satiety. Owners who free-feed a Lab with this mutation will have a 100+ pound dog within 2 years. Counter-surfing, trash-raiding, and food aggression are downstream effects.

THE FOREIGN BODY RISK: Labs eat things. Not just food — socks, toys, rocks, corn cobs, fish hooks, underwear. Foreign body surgery costs $2,000-$5,000 and is one of the most common emergency surgeries across all breeds. Lab owners should pet-proof homes like they would child-proof them.

THE CANCER REALITY: 70% of Labs will die of cancer, primarily hemangiosarcoma and lymphoma. This is the breed's dark secret. Average cancer treatment: $5,000-$10,000.`,
      },
    }); nc++;

    const brFrenchie = await post(`/projects/${PID}/nords`, {
      type_id: types['Breed Profile'],
      title: 'French Bulldog',
      position_x: 0.60, position_y: 0.05,
      properties: {
        'Breed Name': 'French Bulldog',
        'Species': 'Dog',
        'Size Category': 'Small (10-25 lbs)',
        'Energy Level': 4,
        'Lifespan': '10-12 years',
        'Annual Cost Range': '$1,500-$4,000',
        'Health Predispositions': `• Brachycephalic Obstructive Airway Syndrome (BOAS) — 50%+ affected. Surgery: $2,000-$5,000.
• Spinal issues (IVDD, hemivertebrae) — 45% have spinal malformations.
• Skin fold dermatitis — chronic, requires daily cleaning.
• Allergies (food and environmental) — 20%+ affected.
• Heat intolerance — CANNOT regulate temperature. Heat stroke is an emergency.
• Cherry eye — surgical correction $500-$1,500.`,
        'Behavioral Tendencies': `• Stubborn but people-oriented — training requires patience and positive reinforcement only.
• Low exercise needs but high play drive — short bursts, not sustained activity.
• Separation anxiety common — bred to be companion dogs.
• Generally poor with extreme temperatures.
• Snoring, reverse sneezing, gas — all normal for the breed but alarming for new owners.`,
        'Grooming Needs': `Low coat care, but HIGH skin care: Daily wrinkle cleaning (face folds trap bacteria), weekly ear cleaning, regular nail trims. Skin fold infections require veterinary treatment ($100-$300/episode).`,
        'Content': `FRENCH BULLDOG — THE MOST EXPENSIVE "LOW-MAINTENANCE" DOG

Frenchies overtook Labs as the #1 breed in 2022. Their compact size and personality make them seem perfect for apartments and first-time owners. The reality: they are the most medically expensive breed in America.

THE BREATHING CRISIS: French Bulldogs cannot breathe normally. Their compressed skull, narrow nostrils, elongated soft palate, and narrowed trachea mean every breath is labored. 50%+ require surgical intervention. Owners describe "normal" breathing sounds that would be emergency symptoms in other breeds.

THE TEMPERATURE PROBLEM: Frenchies cannot pant efficiently to cool themselves. They are at serious risk of heat stroke at temperatures above 80°F. Every summer, emergency vets see Frenchie heat stroke cases that cost $3,000-$8,000 to treat — if the dog survives.

LIFETIME COST REALITY: A French Bulldog will cost $20,000-$40,000 over its lifetime in veterinary care alone — 2-3x more than most breeds. Breeders don't advertise this. Owners discover it at their first emergency visit.`,
      },
    }); nc++;

    const brMaineCoon = await post(`/projects/${PID}/nords`, {
      type_id: types['Breed Profile'],
      title: 'Maine Coon',
      position_x: 0.70, position_y: 0.05,
      properties: {
        'Breed Name': 'Maine Coon',
        'Species': 'Cat',
        'Size Category': 'Large (50-90 lbs)',
        'Energy Level': 6,
        'Lifespan': '12-15 years',
        'Annual Cost Range': '$800-$1,500',
        'Health Predispositions': `• Hypertrophic cardiomyopathy (HCM) — 30% of Maine Coons carry the mutation. Echocardiogram: $400-$600. Treatment: $100-$300/month.
• Hip dysplasia — unusual in cats, but 18% of Maine Coons affected.
• Spinal muscular atrophy (SMA) — genetic test available. No treatment.
• Polycystic kidney disease — less common but present in the breed.
• Dental disease — prone to resorptive lesions.`,
        'Behavioral Tendencies': `• "Dog-like" personality — follows owners, plays fetch, responds to name.
• Highly social — does NOT do well as a solo cat in empty homes.
• Vocal — chirps, trills, and "talks" rather than meows.
• Slow to mature — full size not reached until 3-4 years.
• Good with children and dogs — adaptable, patient temperament.`,
        'Grooming Needs': `High maintenance: Long, dense coat requires daily brushing during winter and bi-weekly during summer. Mat prevention is crucial — mats cause skin infections. Professional grooming every 6-8 weeks recommended ($60-$100/visit).`,
        'Content': `MAINE COON — THE GENTLE GIANT

The largest domestic cat breed, Maine Coons weigh 10-25 lbs and are 40 inches long. They're known for their dog-like personality, intelligence, and social nature. But their size and coat create unique challenges.

HCM — THE SILENT KILLER: 30% of Maine Coons carry a genetic mutation for hypertrophic cardiomyopathy. The heart muscle thickens until it can't pump effectively. There are often NO symptoms until sudden death. Screening echocardiograms ($400-$600) should be done annually starting at 2 years. Many breeders don't test.

THE GROOMING REALITY: That beautiful long coat needs daily attention. A matted Maine Coon coat is not cosmetic — mats pull on skin, cause pain, trap moisture, and create bacterial infections. Many owners buy a Maine Coon for the look and underestimate the grooming commitment. Professional grooming: $60-$100 every 6-8 weeks.

SIZE CONSIDERATIONS: A 20-lb cat needs a larger litter box, sturdier cat tree, and more food. Standard cat products are too small. Owners spend 20-30% more on appropriately sized supplies.`,
      },
    }); nc++;

    const brGSD = await post(`/projects/${PID}/nords`, {
      type_id: types['Breed Profile'],
      title: 'German Shepherd',
      position_x: 0.80, position_y: 0.05,
      properties: {
        'Breed Name': 'German Shepherd',
        'Species': 'Dog',
        'Size Category': 'Large (50-90 lbs)',
        'Energy Level': 9,
        'Lifespan': '9-13 years',
        'Annual Cost Range': '$1,500-$2,500',
        'Health Predispositions': `• Hip and elbow dysplasia — 19% incidence. OFA testing recommended.
• Degenerative myelopathy (DM) — progressive spinal cord disease, no cure.
• Exocrine pancreatic insufficiency (EPI) — can't digest food. Lifelong enzyme supplementation.
• Bloat/GDV — life-threatening stomach twist. Prophylactic gastropexy: $400-$1,000. Emergency GDV surgery: $3,000-$7,000.
• Perianal fistulas — painful, chronic, expensive to manage.`,
        'Behavioral Tendencies': `• Extremely intelligent — needs mental stimulation or develops behavioral issues.
• Strong protective instinct — can become reactive without socialization.
• Velcro dog — follows owner everywhere. Separation anxiety when alone.
• High prey drive — may not be safe with small animals.
• Requires confident, consistent leadership — not a first-time owner dog.`,
        'Grooming Needs': `Heavy shedding year-round with two major "coat blows" per year. Weekly brushing minimum; daily during coat blow. Invest in a quality vacuum ($300-$500). Hair on everything is the GSD lifestyle.`,
        'Content': `GERMAN SHEPHERD — THE WORKING DOG IN A PET HOME

GSDs are bred to work 8+ hours a day in police, military, and herding roles. When placed in a pet home with minimal stimulation, their intelligence and drive become liabilities. A bored GSD is a destructive GSD.

THE EXERCISE EQUATION: GSDs need 2+ hours of combined physical and mental exercise DAILY. This means: walks, runs, training sessions, puzzle toys, scent work, play. Owners who provide 30 minutes of walking will see: barking, digging, escaping, chewing, pacing, and reactivity.

THE REACTIVITY PIPELINE: Under-socialized GSDs often develop leash reactivity toward other dogs, strangers, or both. This is the #1 behavioral complaint among GSD owners. Root cause: protective instinct + insufficient socialization during 8-16 week window. Management: professional trainer ($100-$200/session, 6-12 sessions minimum).

BLOAT/GDV: German Shepherds are a high-risk breed for gastric dilatation-volvulus. The stomach fills with gas and rotates, cutting off blood supply. This is a SURGICAL EMERGENCY — death within hours without intervention. Surgery: $3,000-$7,000. Prophylactic gastropexy during spay/neuter: $400-$1,000.`,
      },
    }); nc++;

    const brMixed = await post(`/projects/${PID}/nords`, {
      type_id: types['Breed Profile'],
      title: 'Mixed Breed Dog',
      position_x: 0.90, position_y: 0.05,
      properties: {
        'Breed Name': 'Mixed Breed / Rescue Dog',
        'Species': 'Dog',
        'Size Category': 'Medium (25-50 lbs)',
        'Energy Level': 6,
        'Lifespan': '10-16 years',
        'Annual Cost Range': '$800-$1,500',
        'Health Predispositions': `• Hybrid vigor provides SOME protection but doesn't eliminate risk.
• Unknown genetic history — DNA tests ($100-$250) can identify breed-specific risks.
• Shelter dogs: higher rates of heartworm, mange, kennel cough at adoption.
• Behavioral unknown: trauma history may not be disclosed or known.`,
        'Behavioral Tendencies': `• Highly variable — depends on breed mix and early experiences.
• Shelter/rescue dogs may have unknown triggers.
• Adjustment period: 3-3-3 rule (3 days overwhelmed, 3 weeks learning, 3 months settled).
• Often more resilient than purebreds, but trauma-based behaviors can persist.`,
        'Grooming Needs': `Varies widely. Mixed breeds often have moderate grooming needs. Key: assess the individual dog, not the assumed breed mix.`,
        'Content': `MIXED BREED / RESCUE DOG — THE UNKNOWN QUANTITY

Mixed breed dogs make up 53% of the US pet dog population. They're also the majority of shelter dogs. Adopting a mixed breed is choosing uncertainty — and that uncertainty creates unique owner challenges.

THE 3-3-3 RULE: Rescue dogs go through three phases:
• First 3 days: Overwhelmed, shut down, may not eat or interact. This is NOT their personality.
• First 3 weeks: Starting to settle, testing boundaries, personality emerging.
• First 3 months: Fully decompressed, true personality visible.
Many returns happen in the first 3 days because owners mistake decompression behavior for permanent temperament.

THE DNA TEST DILEMMA: DNA tests ($100-$250) reveal breed composition and health risks. But they also create confirmation bias — "he's part Pit Bull, so I'm watching for aggression." The breed label changes how owners perceive and treat the dog, sometimes creating the very problems they fear.

BEHAVIORAL BAGGAGE: Many rescue dogs have trauma-based behaviors: resource guarding, fear of men, touch sensitivity, escape attempts. These require patience and often professional help. The narrative of "rescue dogs are just grateful" sets owners up for disappointment when their rescue has complex needs.`,
      },
    }); nc++;

    const brDSH = await post(`/projects/${PID}/nords`, {
      type_id: types['Breed Profile'],
      title: 'Domestic Shorthair Cat',
      position_x: 0.50, position_y: 0.25,
      properties: {
        'Breed Name': 'Domestic Shorthair',
        'Species': 'Cat',
        'Size Category': 'N/A',
        'Energy Level': 5,
        'Lifespan': '12-20 years',
        'Annual Cost Range': '$500-$1,000',
        'Health Predispositions': `• Lower breed-specific risk than purebreds, but same general cat risks.
• Urinary tract disease (especially males) — blockage is an emergency ($2,000-$5,000).
• Diabetes — strongly linked to obesity and sedentary lifestyle.
• Dental disease — universal in cats.
• Upper respiratory infections in shelter cats.`,
        'Behavioral Tendencies': `• Wildly variable — the "mixed breed" of cats. Each cat is an individual.
• Often independent but can be very affectionate.
• Hunting instinct strong — indoor cats need play that simulates hunting.
• Territorial — introductions to new cats must be slow and structured.
• Generally hardy and adaptable.`,
        'Grooming Needs': `Low: Short coat requires minimal brushing. Self-grooming is usually sufficient. Nail trimming every 2-3 weeks.`,
        'Content': `DOMESTIC SHORTHAIR — THE EVERYCAT

95% of pet cats are not a specific breed — they're domestic shorthairs. This "mutt" of the cat world is the most common pet on Earth and the least understood.

THE INDEPENDENCE MYTH: "Cats are low-maintenance." This myth kills cats. Cats need: daily play (15-30 minutes of active hunting simulation), clean litter boxes (scooped daily), mental stimulation (puzzle feeders, window access), and regular veterinary care. "They take care of themselves" is the reason 52% of cats don't see a vet annually.

INDOOR VS. OUTDOOR: The great debate. Outdoor cats have an average lifespan of 2-5 years. Indoor cats: 12-20 years. But indoor cats without enrichment develop obesity, depression, and behavioral problems. The compromise: "catio" enclosures, leash training, window perches with bird feeders.

THE URINARY EMERGENCY: Male cats are at high risk for urinary blockage — crystals or mucus plugs block the urethra. This is a life-threatening emergency. Signs: straining in litter box, crying, licking genitals. If not treated within 24-48 hours, the cat dies. Treatment: $2,000-$5,000.`,
      },
    }); nc++;

    // ── COMMON PAINS ──
    const cpVetCosts = await post(`/projects/${PID}/nords`, {
      type_id: types['Common Pain'],
      title: 'Unexpected Veterinary Costs',
      position_x: 0.05, position_y: 0.50,
      properties: {
        'Pain Name': 'Unexpected Veterinary Costs',
        'Category': ['Financial', 'Health & Medical', 'Emotional'],
        'Species Affected': ['All'],
        'Prevalence': '67% of pet owners report unexpected vet bills cause significant financial stress',
        'Severity': 9,
        'Typical Owner Quote': '"I love my dog more than anything, but when the vet said it would be $4,000 for the surgery, I just sat in the car and cried. I didn\'t even know how I was going to make rent that month."',
        'Cost Impact': '$500-$10,000+ per incident',
        'What Works': `• Pet insurance (if started early — before pre-existing conditions)
• Emergency savings fund ($1,000-$2,000 dedicated to pet)
• CareCredit or veterinary financing
• Preventive care to catch issues early`,
        'What Doesn\'t Work': `• "I'll cross that bridge when I come to it" — the bridge is expensive
• GoFundMe — only works once, creates shame
• Delaying treatment — conditions worsen, costs multiply
• Switching vets for cheaper prices — continuity of care matters`,
        'Content': `UNEXPECTED VETERINARY COSTS — THE #1 PET OWNER PAIN POINT

1 in 3 pets will need emergency veterinary care each year. The average emergency visit: $800-$1,500. The average surgery: $2,000-$5,000. 28% of pet owners have gone into debt for vet care. 12% have considered surrendering or euthanizing because of cost.

THE STICKER SHOCK CYCLE:
1. Owner notices a symptom
2. Waits to see if it resolves (hope as a strategy)
3. Symptom worsens
4. Emergency vet visit (2-3x more expensive than regular vet)
5. Financial shock → guilt → anxiety about future costs
6. Owner becomes MORE likely to delay next time → repeats cycle

WHY IT'S SO EMOTIONAL: The decision is never purely financial. It's "How much is my pet's life worth?" No other consumer decision carries that moral weight. A $5,000 car repair is frustrating. A $5,000 vet bill that determines whether your companion lives or dies is devastating.

INSURANCE PARADOX: Only 4.4% of US pets are insured. Owners who don't have insurance cite cost ($50-$70/month for dogs). But one emergency can cost 5 years of premiums. The math always favors insurance — except when it doesn't. Pre-existing conditions are never covered, premiums increase with age, and reimbursement is after-the-fact.`,
      },
    }); nc++;

    const cpSepAnxDamage = await post(`/projects/${PID}/nords`, {
      type_id: types['Common Pain'],
      title: 'Separation Anxiety Damage',
      position_x: 0.15, position_y: 0.50,
      properties: {
        'Pain Name': 'Separation Anxiety & Home Destruction',
        'Category': ['Behavioral', 'Financial', 'Emotional'],
        'Species Affected': ['Dog'],
        'Prevalence': '20-40% of dogs show some separation anxiety; 14% have clinical-level SA',
        'Severity': 8,
        'Typical Owner Quote': '"I came home and he had destroyed the entire couch. Stuffing everywhere. The door frame was chewed to splinters. And the neighbors left a note about the howling. I love him but I can\'t keep doing this."',
        'Cost Impact': '$500-$5,000/year in property damage + $1,000-$3,000 for behavioral treatment',
        'What Works': `• Systematic desensitization training (gradual alone-time increases)
• Crate training (when done correctly — not as punishment)
• Medication (fluoxetine/trazodone) — reduces anxiety enough for training to work
• Calming supplements (some evidence for L-theanine, adaptil)
• Exercise BEFORE leaving — a tired dog is a calmer dog`,
        'What Doesn\'t Work': `• Punishment ("he knows what he did" — NO, that's appeasement behavior, not guilt)
• Getting a second dog (may double the problem)
• Leaving TV/radio on (helps mild anxiety, useless for clinical SA)
• "He'll get used to it" — true SA doesn't self-resolve, it escalates`,
        'Content': `SEPARATION ANXIETY — THE PAIN POINT THAT DESTROYS HOMES AND RELATIONSHIPS

Separation anxiety (SA) is one of the most misunderstood and expensive behavioral problems in dogs. It's not about being "bad" when alone — it's a genuine panic disorder. Dogs with SA experience the physiological equivalent of a panic attack every time their owner leaves.

THE MISDIAGNOSIS PROBLEM: Not all destruction when alone is separation anxiety. Adolescent dogs destroy things from boredom. Dogs with insufficient exercise destroy things from excess energy. True SA involves: destruction focused on exit points (doors, windows), self-harm (broken teeth, bloody paws), excessive drooling, and vocalization that starts within minutes of owner leaving and doesn't stop.

THE LANDLORD/NEIGHBOR CASCADE: SA doesn't just affect the owner. It affects neighbors (noise complaints), landlords (property damage), and relationships (partners who didn't sign up for this). 15% of SA dog owners report that the dog caused a relationship conflict or housing crisis.

THE GUILT TRAP: Owners feel guilty leaving a dog with SA, so they stop going out, cancel plans, rearrange their entire life around the dog. This creates a codependent cycle that actually WORSENS the anxiety — the dog never learns that being alone is survivable.`,
      },
    }); nc++;

    const cpLitterBox = await post(`/projects/${PID}/nords`, {
      type_id: types['Common Pain'],
      title: 'Litter Box Problems',
      position_x: 0.25, position_y: 0.50,
      properties: {
        'Pain Name': 'Litter Box Avoidance & House Soiling',
        'Category': ['Behavioral', 'Environmental', 'Health & Medical'],
        'Species Affected': ['Cat'],
        'Prevalence': '#1 reason cats are surrendered to shelters',
        'Severity': 9,
        'Typical Owner Quote': '"She just started peeing on the bed. Our bed. I\'ve tried everything — different litter, more boxes, cleaning constantly. I don\'t know what else to do. My husband wants to get rid of her."',
        'Cost Impact': '$200-$1,000/year in cleaning supplies + potential medical bills',
        'What Works': `• Rule out medical causes FIRST (UTI, crystals, kidney disease)
• 1 box per cat + 1 extra, in separate locations
• Unscented, clumping litter in uncovered boxes
• Scoop daily, full change weekly
• Enzymatic cleaner on soiled areas (Nature's Miracle, etc.)`,
        'What Doesn\'t Work': `• Rubbing their nose in it — creates more anxiety, worsens problem
• Covered litter boxes — cats feel trapped
• Scented litter — humans like it, cats hate it
• Punishment of any kind — cat doesn't connect punishment to the act
• Moving the box frequently — cats need location consistency`,
        'Content': `LITTER BOX PROBLEMS — THE CAT OWNER'S CRISIS

Inappropriate elimination is the #1 reason cats are surrendered, euthanized, or banned from bedrooms/living spaces. It destroys furniture, carpets, and relationships. And in most cases, it's completely solvable — because it's usually HUMAN error, not cat behavior.

MEDICAL FIRST, ALWAYS: 60% of cats who suddenly stop using the litter box have a medical issue — UTI, crystals, kidney disease, diabetes, arthritis (can't get into the box). A vet visit ($150-$300 with urinalysis) should ALWAYS be the first step. Owners who skip this and go straight to behavioral solutions waste months while the cat is in pain.

THE DIRTY BOX EPIDEMIC: Cats are fastidious. A dirty litter box is like an unflushed toilet — they won't use it. Most owners scoop every 2-3 days. Cats need daily scooping and weekly full litter changes. The #1 fix for litter box avoidance is cleaning more.

THE COVERED BOX PROBLEM: Covered litter boxes are sold for HUMAN convenience (smell containment). Cats hate them — they trap odor inside (the cat smells it more), limit escape routes (cats feel vulnerable while eliminating), and make the box harder to clean. Removing the cover fixes 30% of avoidance cases.`,
      },
    }); nc++;

    const cpExercise = await post(`/projects/${PID}/nords`, {
      type_id: types['Common Pain'],
      title: 'Exercise Time Poverty',
      position_x: 0.35, position_y: 0.50,
      properties: {
        'Pain Name': 'Not Enough Time for Exercise & Enrichment',
        'Category': ['Time & Lifestyle', 'Behavioral'],
        'Species Affected': ['Dog'],
        'Prevalence': '45% of dog owners say they don\'t walk their dog enough',
        'Severity': 7,
        'Typical Owner Quote': '"I feel terrible. I know she needs more exercise but by the time I get home from work, make dinner, help with homework... I\'m just done. She gets a 15-minute walk and that\'s it."',
        'Cost Impact': '$0 direct but causes $500-$3,000 in downstream behavioral/health costs',
        'What Works': `• Dog daycare (2-3x/week): $25-$50/day
• Dog walker (midday): $15-$25/visit
• Puzzle toys and snuffle mats for mental stimulation
• Structured play (fetch, tug) — more efficient than walking
• Morning exercise routine before work`,
        'What Doesn\'t Work': `• "The yard is enough" — dogs don't self-exercise in yards, they wait
• Weekend warrior (intense weekend, nothing during week) — injury risk
• Guilt without action — acknowledging the problem doesn't solve it
• Getting a second dog for "exercise buddy" — dogs don't entertain each other reliably`,
        'Content': `EXERCISE TIME POVERTY — THE SLOW BURN PAIN POINT

This isn't dramatic. There's no emergency. No crisis moment. It's the slow, daily guilt of knowing your dog needs more than you're giving them — and not having the bandwidth to fix it.

THE ENERGY MISMATCH: Most owners choose dogs based on breed appearance, not energy needs. A Border Collie in a family that works 10-hour days. A Husky in a 700-sqft apartment. A Lab for a retired couple who walk 20 minutes/day. The dog's needs don't change because the owner is tired.

THE DOWNSTREAM CASCADE: Under-exercised dogs don't just miss out on fitness. They develop:
• Obesity (56% of dogs)
• Destructive behavior (chewing, digging, escaping)
• Excessive barking
• Reactivity on walks (over-aroused from pent-up energy)
• Anxiety and restlessness
Each of these becomes its own pain point that the owner doesn't connect back to the root cause: insufficient exercise.

THE GUILT ECONOMY: 45% of dog owners admit they don't exercise their dog enough. They KNOW. They feel guilty every time they see those eyes at the door. But the guilt doesn't create more hours in the day. This is a structural problem, not a willpower problem.`,
      },
    }); nc++;

    const cpGrooming = await post(`/projects/${PID}/nords`, {
      type_id: types['Common Pain'],
      title: 'Grooming Battles',
      position_x: 0.05, position_y: 0.65,
      properties: {
        'Pain Name': 'Grooming Resistance & Maintenance Burden',
        'Category': ['Time & Lifestyle', 'Financial', 'Health & Medical'],
        'Species Affected': ['Dog', 'Cat'],
        'Prevalence': '38% of pet owners find grooming stressful',
        'Severity': 5,
        'Typical Owner Quote': '"Nail trims are a two-person job in our house. He screams like I\'m killing him. The groomer charges extra because he\'s difficult. Last time she said she might not take him back."',
        'Cost Impact': '$400-$1,500/year for professional grooming',
        'What Works': `• Desensitization from puppyhood — handle paws, ears, mouth daily with treats
• Cooperative care training — teach the pet to participate in grooming voluntarily
• Professional groomer who uses fear-free methods
• Sedation for veterinary procedures if needed (safe, reduces trauma)`,
        'What Doesn\'t Work': `• Force and restraint — creates worse resistance next time
• Infrequent grooming sessions — matting and nail overgrowth compound
• DIY without proper tools or technique
• Skipping grooming entirely — leads to health problems (mats, infections, overgrown nails)`,
        'Content': `GROOMING BATTLES — THE PAIN POINT NOBODY TALKS ABOUT

Grooming isn't glamorous enough to be a headline pain point, but it's a consistent, recurring source of stress for millions of pet owners. It involves physical effort, pet resistance, and ongoing cost.

THE NAIL TRIM TRAUMA: Nail trims are the most dreaded grooming task. 62% of dog owners are uncomfortable trimming nails at home. The fear: cutting the quick (blood vessel inside the nail), causing pain and bleeding. This fear leads to avoidance, which leads to overgrown nails, which leads to pain and mobility issues. One bad experience at the groomer creates lifelong nail trim anxiety for the dog.

THE MATTING CASCADE: Long-coated breeds (Poodles, Doodles, Maine Coons) need regular brushing. When owners skip brushing sessions, coats mat. Mats tighten, pulling on skin, causing pain. Severely matted dogs require shaving under sedation. The "I wanted a fluffy dog" dream meets the "I don't have time to brush daily" reality.`,
      },
    }); nc++;

    const cpEndOfLife = await post(`/projects/${PID}/nords`, {
      type_id: types['Common Pain'],
      title: 'End-of-Life Decisions',
      position_x: 0.15, position_y: 0.65,
      properties: {
        'Pain Name': 'End-of-Life Decision Paralysis',
        'Category': ['Emotional', 'Financial', 'Health & Medical'],
        'Species Affected': ['All'],
        'Prevalence': '72% of senior pet owners cite this as their greatest anxiety',
        'Severity': 10,
        'Typical Owner Quote': '"How do I know when it\'s time? She still wags her tail when she sees me. But she can\'t walk anymore and she won\'t eat. Am I being selfish keeping her alive? Or would I be giving up?"',
        'Cost Impact': '$1,000-$10,000 in palliative care + $50-$500 for euthanasia/cremation',
        'What Works': `• Quality of life scoring tools (HHHHHMM scale)
• Open, honest veterinarian relationship
• In-home euthanasia services ($250-$500) — less stressful for pet and owner
• Pet loss support groups and grief counseling
• Advance planning — making the decision before crisis mode`,
        'What Doesn\'t Work': `• Waiting for "the pet to tell you" — some pets suffer silently
• Seeking certainty — there is no objectively "right" time
• Comparing to human end-of-life — different ethical framework
• Avoiding the conversation entirely — leads to crisis decisions`,
        'Content': `END-OF-LIFE DECISIONS — THE DEEPEST PAIN POINT

This is the hardest thing most pet owners will ever do. It's not a "pet problem" — it's a human existential crisis compressed into a decision about another living being.

THE IMPOSSIBLE CALCULUS: "Am I prolonging their life or prolonging their suffering?" Both feel true simultaneously. Owners search for a clear signal — a moment when the pet "tells them" it's time. For most, that moment never comes cleanly. It's a slow accumulation of bad days outweighing good ones.

THE FINANCIAL LAYER: End-of-life care adds financial stress to emotional devastation. Palliative care: $200-$1,000/month. Chemotherapy: $3,000-$10,000 per course. Owners face the implicit question: "Can I afford to keep my pet alive?" This creates shame and guilt regardless of the answer.

ANTICIPATORY GRIEF: 68% of senior pet owners experience grief BEFORE the pet dies. They grieve the vitality that's already gone — the walks they can't take, the play that's stopped, the companion who used to greet them at the door but now stays in their bed.`,
      },
    }); nc++;

    const cpTraining = await post(`/projects/${PID}/nords`, {
      type_id: types['Common Pain'],
      title: 'Training Frustration',
      position_x: 0.25, position_y: 0.65,
      properties: {
        'Pain Name': 'Training Overwhelm & Conflicting Advice',
        'Category': ['Behavioral', 'Emotional', 'Financial'],
        'Species Affected': ['Dog'],
        'Prevalence': '70% of dog owners attempt formal training; 43% quit within 6 months',
        'Severity': 6,
        'Typical Owner Quote': '"The YouTube trainer says use treats. My neighbor says that\'s bribery. The pet store trainer uses a prong collar. I read online that\'s abuse. I have no idea what I\'m supposed to do anymore."',
        'Cost Impact': '$200-$3,000 for professional training',
        'What Works': `• Force-free, positive reinforcement training (AVSAB recommended)
• Group classes for socialization + training ($150-$300 for 6-week course)
• Private trainer for specific behavioral issues ($100-$200/session)
• Consistency — same rules, same rewards, same cues from all household members`,
        'What Doesn\'t Work': `• Dominance theory / alpha rolling — debunked, creates fear and aggression
• Punishment-based methods — suppress behavior temporarily, create fallout
• YouTube as sole training source — no quality control, contradictory methods
• Training without exercise — can't teach impulse control to an over-aroused dog`,
        'Content': `TRAINING FRUSTRATION — THE INFORMATION OVERLOAD PAIN POINT

The pet training industry is unregulated. Anyone can call themselves a trainer. There are no licensing requirements. This means owners are exposed to a spectrum from excellent science-based trainers to harmful pseudoscience — and they can't tell the difference.

THE ADVICE CACOPHONY: New dog owners receive training advice from: breeders, pet store employees, neighbors, family members, TV shows, YouTube, TikTok, Reddit, and the random person at the dog park. Each source contradicts the last. The owner becomes paralyzed by conflicting information.

THE METHOD WAR: The dog training world is split between positive reinforcement (science-based, force-free) and aversive methods (dominance theory, corrections, e-collars). Both sides are passionate and vocal. Owners caught in the middle feel judged regardless of what they choose.

THE QUIT RATE: 43% of owners who start formal training quit within 6 months. Why? Because dog training is really OWNER training — and changing human behavior is harder than changing dog behavior. The owner who doesn't practice between sessions won't see results.`,
      },
    }); nc++;

    const cpDiet = await post(`/projects/${PID}/nords`, {
      type_id: types['Common Pain'],
      title: 'Diet & Nutrition Confusion',
      position_x: 0.35, position_y: 0.65,
      properties: {
        'Pain Name': 'Food Choice Paralysis & Diet Guilt',
        'Category': ['Financial', 'Health & Medical', 'Emotional'],
        'Species Affected': ['All'],
        'Prevalence': '58% of pet owners are unsure if they\'re feeding the right food',
        'Severity': 5,
        'Typical Owner Quote': '"Grain-free, raw, prescription, limited ingredient, ancestral, organic — there are literally 200 dog foods at PetSmart. How am I supposed to know which one won\'t give my dog cancer?"',
        'Cost Impact': '$30-$200/month depending on brand and pet size',
        'What Works': `• AAFCO-certified commercial diets from established brands
• Board-certified veterinary nutritionist consultation for special needs
• Consistent feeding schedule (not free-feeding)
• Measuring portions — most owners overfeed by 20-30%`,
        'What Doesn\'t Work': `• Raw food diets (CDC, FDA, AVMA all advise against — bacterial contamination risk)
• Grain-free fads (linked to heart disease in dogs — FDA investigation)
• Internet "research" replacing veterinary guidance
• Frequent diet switching ("variety" causes digestive upset)`,
        'Content': `DIET & NUTRITION CONFUSION — THE QUIET GUILT

Pet nutrition is a $50 billion industry that profits from owner anxiety. The more confused and guilty owners feel, the more premium products they buy.

THE GRAIN-FREE CRISIS: The grain-free trend was driven by marketing, not science. In 2018, the FDA investigated a link between grain-free diets and dilated cardiomyopathy (heart disease) in dogs. The trend was based on the false premise that grains are "bad" for dogs. They're not — dogs evolved to digest grains over 10,000 years of domestication.

THE RAW FOOD DEBATE: Raw feeding has passionate advocates who claim it's "natural." The evidence: no proven benefits over quality commercial diets, documented risks of Salmonella, Listeria, and E. coli (to pets AND humans in the household). Yet the movement persists because it feels intuitively right — "wolves eat raw meat."

THE REAL PROBLEM: It's not WHAT owners feed — it's HOW MUCH. Obesity is the #1 nutrition-related health problem, and it's caused by overfeeding, not ingredient quality. A dog eating the "best" food in the world will still become obese if portions aren't controlled.`,
      },
    }); nc++;

    // ── LIVING ENVIRONMENTS ──
    const envApartment = await post(`/projects/${PID}/nords`, {
      type_id: types['Living Environment'],
      title: 'Urban Apartment',
      position_x: 0.55, position_y: 0.40,
      properties: {
        'Environment Name': 'Urban Apartment',
        'Space Type': 'Apartment',
        'Outdoor Access': 'None',
        'Pet-Friendly Rating': 4,
        'Common Challenges': `• No yard — every bathroom break requires leashing up, elevator ride, walk to designated area
• Noise restrictions — barking dogs generate complaints and lease violations
• Space limitations — large/high-energy breeds feel confined
• Elevator encounters — forced close proximity with strangers and other dogs
• Limited storage for supplies (food, crates, beds)`,
        'Enrichment Opportunities': `• Window watching (visual stimulation)
• Urban walks provide massive sensory enrichment (smells, sights, sounds)
• Dog parks if available (but disease/conflict risk)
• Indoor puzzle toys, training sessions
• Cat-specific: vertical space (cat trees, shelves) compensates for limited floor space`,
        'Pain Amplifiers': `• Separation anxiety → noise complaints → housing risk
• Exercise time poverty → no yard backup → complete dependence on walks
• Litter box placement → limited options → proximity to living areas
• Grooming → no outdoor bathing option → tub/shower only`,
        'Best Suited Pets': `• Small to medium dogs with moderate energy
• Cats (excellent apartment pets if enriched)
• Quiet dog breeds (Cavalier King Charles, Basenji, Greyhound — yes, they're lazy)`,
        'Content': `URBAN APARTMENT — THE MOST COMMON PET ENVIRONMENT IN AMERICA

65% of US households with pets live in apartments or condos. Yet most pet care advice assumes a suburban house with a yard. This mismatch creates unique pain points.

THE BATHROOM MATH: An apartment dog needs to go outside 3-5 times per day. Each trip: leash up, shoes on, elevator wait, walk to spot, wait for the dog, clean up, walk back, elevator, unleash. Minimum 10-15 minutes per trip. That's 45-75 minutes per day JUST for bathroom breaks — before exercise even starts.

THE NOISE KNIFE-EDGE: A barking dog in an apartment is a housing emergency. Noise complaints lead to warnings, fines, and ultimately lease non-renewal. Owners of dogs with separation anxiety live in constant fear of eviction. This creates a perverse incentive to never leave the dog alone — worsening the anxiety.

THE CAT ADVANTAGE: Cats are ideal apartment pets IF owners provide vertical space and enrichment. A cat with a tall cat tree, window access, and daily play sessions is happier in a 600 sqft apartment than a bored cat in a 3,000 sqft house.`,
      },
    }); nc++;

    const envSuburban = await post(`/projects/${PID}/nords`, {
      type_id: types['Living Environment'],
      title: 'Suburban House',
      position_x: 0.65, position_y: 0.40,
      properties: {
        'Environment Name': 'Suburban House with Yard',
        'Space Type': 'House',
        'Outdoor Access': 'Large Yard',
        'Pet-Friendly Rating': 8,
        'Common Challenges': `• "The yard is enough" illusion — dogs don't self-exercise
• Fence integrity — gaps, digging, jumping create escape risk
• Wildlife encounters — ticks, snakes, coyotes, skunks
• Lawn chemicals — fertilizers and pesticides toxic to pets
• Neighbor conflicts — barking, loose dogs, property damage`,
        'Enrichment Opportunities': `• Outdoor play space (fetch, agility, digging zones)
• Sniff gardens and sensory trails
• Pet doors for indoor/outdoor access
• Multiple rooms for cat territory distribution`,
        'Pain Amplifiers': `• False sense of security — "he has a yard" doesn't address exercise needs
• Escape artists — fenced yards aren't escape-proof
• Wildlife-borne diseases (Lyme, leptospirosis)
• Increased parasite exposure (ticks, fleas, heartworm)`,
        'Best Suited Pets': `• All sizes and energy levels
• Multiple pet households
• Breeds that need outdoor access (retrievers, shepherds, hounds)`,
        'Content': `SUBURBAN HOUSE — THE "IDEAL" PET ENVIRONMENT (WITH HIDDEN TRAPS)

The suburban house with a fenced yard is the assumed "ideal" for pet ownership. And it IS better than an apartment — but it creates its own problems that owners don't anticipate.

THE YARD ILLUSION: "We got a yard so the dog can run." Dogs don't run in yards. They sniff, patrol the perimeter, and then stand at the door waiting to come in. A fenced yard is a bathroom, not a gym. Owners who rely on the yard for exercise end up with obese, under-stimulated dogs — same problems as apartment owners, but with less guilt.

THE WILDLIFE REALITY: Suburban yards expose pets to ticks (Lyme disease), fleas, heartworm (from mosquitoes), coyotes (responsible for 20% of small pet deaths in suburban areas), and toxic plants. Monthly parasite prevention: $15-$40/month. Lyme disease treatment: $500-$2,000.

THE FENCE ECONOMY: A secure, dog-proof fence costs $3,000-$8,000. Invisible fences ($1,500-$2,500) don't keep other animals OUT and cause anxiety. Many "fenced yards" have gaps, rotting sections, or are too short. Escape = lost dog emergency.`,
      },
    }); nc++;

    const envRural = await post(`/projects/${PID}/nords`, {
      type_id: types['Living Environment'],
      title: 'Rural / Farm',
      position_x: 0.75, position_y: 0.40,
      properties: {
        'Environment Name': 'Rural Property / Farm',
        'Space Type': 'Farm/Rural',
        'Outdoor Access': 'Acreage',
        'Pet-Friendly Rating': 7,
        'Common Challenges': `• Veterinary access — nearest vet may be 30-60+ minutes away
• Emergency care — 24-hour emergency vets may not exist locally
• Wildlife risk — coyotes, bears, porcupines, snakes, raptors
• Livestock conflicts — predator instinct vs. farm animals
• Limited pet services — no daycare, groomers, trainers nearby`,
        'Enrichment Opportunities': `• Unlimited outdoor space and sensory stimulation
• Working dog roles (herding, guarding, hunting)
• Natural terrain for physical conditioning
• Barn cat programs for rodent control`,
        'Pain Amplifiers': `• Vet costs amplified by travel time and limited options
• No emergency backup — every medical issue is a crisis decision
• Parasite exposure maximum
• Isolation — no socialization opportunities for pets or owners`,
        'Best Suited Pets': `• Working breeds with purpose (herding dogs, livestock guardians)
• Independent dog breeds (Anatolian Shepherd, Great Pyrenees)
• Barn cats — functional role, lower care expectations`,
        'Content': `RURAL / FARM — FREEDOM WITH CONSEQUENCES

Rural pet ownership is the most autonomous and the most dangerous. Pets have unlimited space but limited access to care. The nearest vet is often 30+ minutes away. Emergency care may not exist.

THE ACCESS GAP: Rural pet owners spend 2-3x as much time (and gas money) on veterinary care because of distance. A simple vet check that takes a city owner 30 minutes takes a rural owner half a day. This creates massive vet visit avoidance — rural pets see vets 40% less often than urban pets.

THE PREDATOR REALITY: In rural areas, outdoor cats have a life expectancy of 2-5 years due to predators (coyotes, raptors, foxes). Small dogs left outside unattended are at risk. Even large dogs can be injured by porcupines, skunks, or rattlesnakes. Each wildlife encounter = $500-$3,000 vet bill.`,
      },
    }); nc++;

    const envCondo = await post(`/projects/${PID}/nords`, {
      type_id: types['Living Environment'],
      title: 'Condo / High-Rise',
      position_x: 0.85, position_y: 0.40,
      properties: {
        'Environment Name': 'Condo / High-Rise',
        'Space Type': 'Condo/Townhouse',
        'Outdoor Access': 'Balcony Only',
        'Pet-Friendly Rating': 5,
        'Common Challenges': `• HOA pet restrictions — breed bans, size limits, pet deposits ($200-$500)
• Balcony safety — falls from height ("high-rise syndrome" in cats)
• Shared hallways — dog encounters in confined spaces
• Pet relief logistics — similar to apartments but with MORE floors
• Noise transmission between units`,
        'Enrichment Opportunities': `• Often higher-quality interior space than apartments
• Balcony catios possible (with safety netting)
• Community dog areas in some buildings
• Concierge pet services in luxury buildings`,
        'Pain Amplifiers': `• HOA rules create constant compliance anxiety
• Breed restrictions force owners to rehome or lie
• Weight limits exclude many medium/large breeds
• Pet fees ($25-$100/month) add to ownership cost`,
        'Best Suited Pets': `• Small dogs under HOA weight limits
• Cats (often exempt from weight/breed restrictions)
• Quiet breeds that won't trigger noise complaints`,
        'Content': `CONDO / HIGH-RISE — PET OWNERSHIP WITH PERMISSION

Condo pet ownership adds a unique layer of stress: the HOA. Breed restrictions, weight limits, pet deposits, and noise policies mean owners are constantly navigating rules that weren't designed with pet welfare in mind.

THE BREED BAN PROBLEM: Many HOAs ban "aggressive" breeds (Pit Bulls, Rottweilers, German Shepherds, Dobermans). These bans are not based on individual behavior — they're insurance-driven blanket policies. Owners of banned breeds face: rehoming, moving, or hiding their dog's breed. DNA testing by HOAs is becoming more common.

HIGH-RISE SYNDROME: Cats who fall from balconies and windows — 132 cats fell from high-rises in a single NYC study. Cats don't always land on their feet from extreme heights. Balcony netting: $50-$200. Emergency fall treatment: $2,000-$10,000.`,
      },
    }); nc++;

    // ── BEHAVIORAL PATTERNS ──
    const bpSepAnx = await post(`/projects/${PID}/nords`, {
      type_id: types['Behavioral Pattern'],
      title: 'Separation Anxiety',
      position_x: 0.10, position_y: 0.80,
      properties: {
        'Behavior Name': 'Separation Anxiety',
        'Species': 'Dog',
        'Valence': 'Problematic',
        'Trigger': 'Owner departure cues (keys, shoes, coat) or actual departure',
        'Intensity': 8,
        'Science Explanation': `Separation anxiety is a panic disorder, not a behavioral choice. When the attachment figure leaves, the dog experiences a cortisol spike equivalent to a human panic attack. The destruction, vocalization, and self-harm are NOT revenge — they're physiological responses to terror.

Neurochemistry: Decreased serotonin and GABA, elevated cortisol and norepinephrine. The same neurotransmitter imbalance seen in human anxiety disorders. This is why SSRIs (fluoxetine) work for canine SA — it's the same brain chemistry.

Risk factors: Single-owner households, dogs adopted from shelters, dogs who experienced early separation from mother (before 8 weeks), COVID dogs who were never alone.`,
        'Intervention Approaches': `1. MEDICATION FIRST (controversial but effective): Fluoxetine ($10-$30/month) + trazodone (as needed). Reduces anxiety enough for behavioral modification to work. Without medication, severe SA training has a 20% success rate. With medication: 70%.

2. SYSTEMATIC DESENSITIZATION: Start with 1-second departures. Literally. Open the door, step out, step back in. Reward calm. Build to 5 seconds. Then 30. Then 2 minutes. This process takes MONTHS. There are no shortcuts.

3. MANAGEMENT: Cameras ($30-$100), puzzle toys, calming supplements, doggy daycare on work days.`,
        'Cost of Intervention': '$500-$3,000 (trainer + medication + management)',
        'Success Rate': '70% significant improvement with medication + behavior modification; 20% without medication',
        'Content': `SEPARATION ANXIETY — DEEP BEHAVIORAL REFERENCE

SA affects 20-40% of dogs to some degree. Clinical-level SA (severe enough to cause property damage, self-harm, or housing risk) affects 14% of all dogs.

THE COVID SPIKE: Dogs adopted during 2020-2022 lockdowns never learned to be alone. Owners were home 24/7 for months or years. When return-to-office happened, SA cases doubled. Veterinary behaviorists report a 200% increase in SA consultations since 2021.

SIGNS OF TRUE SA (vs. boredom):
• Destruction focused on exit points (doors, windows, crates) — not random chewing
• Onset within 0-30 minutes of owner departure — not hours later
• Vocalization: non-stop howling/barking, not intermittent
• Self-harm: broken teeth (chewing metal crate), bloody paws (scratching doors)
• Physiological: drooling, panting, trembling, loss of bowel/bladder control
• Absence of symptoms when owner is present

WHAT MAKES IT WORSE (owner mistakes):
• Long, emotional goodbyes — amplifies departure as a significant event
• Punishment when returning to destruction — creates MORE anxiety about owner leaving AND returning
• Crating without desensitization — panicked dogs have broken teeth and nails escaping crates
• Inconsistency — sometimes gone 2 hours, sometimes 10 hours, no routine`,
      },
    }); nc++;

    const bpReactivity = await post(`/projects/${PID}/nords`, {
      type_id: types['Behavioral Pattern'],
      title: 'Leash Reactivity',
      position_x: 0.20, position_y: 0.80,
      properties: {
        'Behavior Name': 'Leash Reactivity',
        'Species': 'Dog',
        'Valence': 'Problematic',
        'Trigger': 'Seeing other dogs, strangers, or moving objects (bikes, skateboards) while on leash',
        'Intensity': 7,
        'Science Explanation': `Leash reactivity is NOT aggression in most cases. It's frustration (wanting to greet but can't) or fear (wanting to flee but can't). The leash removes the dog's ability to make distance decisions, triggering fight-or-flight with no flight option.

The "threshold" concept: Every reactive dog has a distance at which they can perceive a trigger without reacting. Below threshold = can think, can learn. Over threshold = flooded, can't think, only react. All training happens at or below threshold.

The leash tightening feedback loop: Owner sees trigger → tightens leash → dog feels restriction → cortisol spikes → dog reacts → owner tightens more → dog learns "seeing that thing = bad things happen on leash."`,
        'Intervention Approaches': `1. Counter-conditioning: Pair trigger (other dog) with high-value reward (chicken, cheese). Dog sees other dog at distance → treats appear. Over time, other dog predicts treats instead of predicting conflict.

2. BAT (Behavior Adjustment Training): Allow dog to observe trigger at distance, reward dog for choosing to look away or disengage voluntarily.

3. Management: Walk at low-traffic times, use barriers (parked cars), cross streets to maintain distance. Avoid dog parks, pet stores, and crowded areas.`,
        'Cost of Intervention': '$800-$2,500 (private trainer, 8-15 sessions)',
        'Success Rate': '60-80% see significant improvement; rarely "cured" but managed to livable levels',
        'Content': `LEASH REACTIVITY — THE WALK-RUINER

Leash reactivity is one of the most common behavioral complaints. It transforms what should be a pleasant walk into a stressful obstacle course of avoidance and embarrassment.

THE SHAME FACTOR: Owners of reactive dogs feel intense public shame. "Everyone thinks my dog is aggressive." They avoid walks, change routes, walk at odd hours, and isolate — which makes the problem worse (less socialization, less exercise, more pent-up energy).

THE ESCALATION PATTERN: Reactive dogs who aren't managed get worse, not better. The more they practice reactivity (lunge, bark, and the scary thing goes away because the owner crosses the street), the more they're reinforced for reacting. Every unmanaged encounter is a training session — for the wrong behavior.`,
      },
    }); nc++;

    const bpResourceGuard = await post(`/projects/${PID}/nords`, {
      type_id: types['Behavioral Pattern'],
      title: 'Resource Guarding',
      position_x: 0.30, position_y: 0.80,
      properties: {
        'Behavior Name': 'Resource Guarding',
        'Species': 'Dog',
        'Valence': 'Dangerous',
        'Trigger': 'Approach toward food, toys, sleeping spots, or valued items',
        'Intensity': 7,
        'Science Explanation': `Resource guarding is a natural survival behavior — protecting valuable resources from competitors. It exists on a spectrum from freezing (mild) to growling to snapping to biting. It is NOT about dominance — it's about insecurity.

The approach triggers a threat assessment: "Will this person take my thing?" If the dog's history says yes (owner has taken things before), guarding intensifies.`,
        'Intervention Approaches': `1. Trade-up protocol: Approach with something BETTER than what the dog has. Drop high-value treat near the dog, walk away. Over time: your approach predicts GOOD things, not theft.

2. NEVER take things by force — this confirms the dog's fear and escalates guarding.

3. Management: Feed in separate location, provide multiple toys, avoid confrontation.

4. Professional behaviorist for bite-level guarding — this is beyond YouTube training.`,
        'Cost of Intervention': '$500-$2,000 (veterinary behaviorist consultation + training)',
        'Success Rate': '80% manageable with consistent protocol; rarely eliminated entirely',
        'Content': `RESOURCE GUARDING — THE MISUNDERSTOOD BEHAVIOR

Resource guarding is the most common reason dogs bite family members. It's also one of the most misunderstood — owners are told to "take things away to show who's boss." This makes guarding WORSE.

THE DOMINANCE MYTH: Old-school trainers advise: "Take the bowl while eating to teach respect." This does the opposite — it confirms the dog's fear that humans take things. The dog learns to guard MORE aggressively, not less.

IN MULTI-PET HOMES: Resource guarding between pets is different from guarding toward humans. It requires management (separate feeding, supervised high-value toys) and often professional guidance. 65% of multi-dog households have some degree of resource conflict.`,
      },
    }); nc++;

    const bpLitterAvoid = await post(`/projects/${PID}/nords`, {
      type_id: types['Behavioral Pattern'],
      title: 'Litter Box Avoidance',
      position_x: 0.40, position_y: 0.80,
      properties: {
        'Behavior Name': 'Litter Box Avoidance',
        'Species': 'Cat',
        'Valence': 'Problematic',
        'Trigger': 'Dirty box, wrong litter, wrong location, medical pain, stress, territorial conflict',
        'Intensity': 8,
        'Science Explanation': `Cats are born with a strong instinct to bury waste in substrate. When they stop using the litter box, something is WRONG — either medically (pain during urination/defecation), environmentally (the box is aversive), or psychologically (stress, territorial anxiety).

The substrate preference: Cats develop litter preferences early. Changing litter type can trigger avoidance. Most cats prefer fine-grained, unscented, clumping litter.

The location instinct: Cats need escape routes while eliminating (vulnerable position). Covered boxes, boxes in dead-end corners, and boxes near loud appliances trigger avoidance.`,
        'Intervention Approaches': `1. VETERINARY EXAM FIRST — rule out UTI, crystals, kidney disease, arthritis
2. Litter box audit: 1 per cat + 1 extra, uncovered, unscented clumping litter, daily scoop
3. Location optimization: quiet, accessible, escape route available
4. Enzymatic cleaner on all soiled areas — cats return to spots they can smell
5. Feliway diffuser — synthetic pheromone reduces stress-related marking`,
        'Cost of Intervention': '$150-$500 (vet exam + supplies + enzymatic cleaners)',
        'Success Rate': '85% resolved when medical causes are treated and litter box setup is optimized',
        'Content': `LITTER BOX AVOIDANCE — THE #1 CAT BEHAVIOR PROBLEM

This behavior causes more cat surrenders than any other issue. It's also the most solvable — because it's usually a human setup problem, not a cat behavioral problem.

THE DIAGNOSTIC TREE:
1. Is the cat straining? Crying? Blood in urine? → MEDICAL EMERGENCY (male cats can die from urinary blockage within 24-48 hours)
2. Is the box clean? → Clean it daily
3. Is the litter scented? → Switch to unscented
4. Is the box covered? → Remove the cover
5. Enough boxes? → Add boxes (1 per cat + 1)
6. Near loud appliance or in dead end? → Move the box
7. New cat, new baby, recent move? → Stress-related — Feliway + time

If all of the above are addressed and the problem persists, it's likely territorial marking or chronic stress — veterinary behaviorist territory.`,
      },
    }); nc++;

    const bpDestructScratch = await post(`/projects/${PID}/nords`, {
      type_id: types['Behavioral Pattern'],
      title: 'Destructive Scratching',
      position_x: 0.50, position_y: 0.80,
      properties: {
        'Behavior Name': 'Destructive Scratching',
        'Species': 'Cat',
        'Valence': 'Normal',
        'Trigger': 'Biological need — claw maintenance, territory marking, stretching',
        'Intensity': 5,
        'Science Explanation': `Scratching is NOT a behavioral problem — it's a biological necessity. Cats scratch to: (1) remove dead outer nail sheaths, (2) mark territory (visual marks + scent from paw glands), (3) stretch muscles and tendons, (4) relieve stress.

Declawing is amputation: The "declaw" surgery removes the last bone of each toe — equivalent to cutting human fingers at the last knuckle. It causes chronic pain, gait changes, litter box avoidance (pain in paws), and increased biting (lost primary defense). It's banned in many countries and increasingly in US cities.`,
        'Intervention Approaches': `1. Provide appropriate scratching surfaces — tall, sturdy, sisal-rope posts (not carpet-covered)
2. Place near sleeping areas (cats scratch upon waking) and entry points (territory marking)
3. Nail caps (Soft Paws) — $15-$20 per application, replaced monthly
4. Regular nail trimming every 2-3 weeks
5. Double-sided tape or citrus spray on furniture (deterrent, not punishment)`,
        'Cost of Intervention': '$50-$200 (scratching posts + nail caps + trim supplies)',
        'Success Rate': '95% redirected with proper scratching surfaces and placement',
        'Content': `DESTRUCTIVE SCRATCHING — THE NORMAL BEHAVIOR OWNERS WANT TO ELIMINATE

Cats WILL scratch. It cannot be trained out. It can only be redirected to appropriate surfaces. The owner who says "I want my cat to stop scratching" needs education, not behavioral modification.

THE FURNITURE PROBLEM: Cats prefer vertical scratching surfaces that are tall enough for a full-body stretch, sturdy enough not to wobble, and textured (sisal rope or bare wood). Most cat scratchers sold in stores are: too short, too flimsy, and covered in carpet (which teaches cats that carpet = scratching surface). Invest in a TALL, HEAVY sisal post ($40-$80). It will save thousands in furniture.`,
      },
    }); nc++;

    const bpExcessBark = await post(`/projects/${PID}/nords`, {
      type_id: types['Behavioral Pattern'],
      title: 'Excessive Barking',
      position_x: 0.60, position_y: 0.80,
      properties: {
        'Behavior Name': 'Excessive Barking',
        'Species': 'Dog',
        'Valence': 'Problematic',
        'Trigger': 'Boredom, territorial response, attention seeking, anxiety, alerting',
        'Intensity': 6,
        'Science Explanation': `Barking is communication, not misbehavior. The type of bark tells you the motivation:
• Rapid, mid-pitch: Alert/territorial ("someone's here!")
• Continuous, lower pitch: Threat/warning ("go away!")
• High-pitched, repetitive: Excitement/frustration ("play with me!")
• Monotonous, spaced: Boredom ("I have nothing to do")
• Whining/yelping: Anxiety/distress

The owner who wants "no barking" is asking for a mute dog. The goal is to reduce EXCESSIVE barking by addressing the underlying motivation.`,
        'Intervention Approaches': `1. Identify the TYPE of bark → address the root cause
2. Boredom barking → more exercise, enrichment, puzzle toys
3. Alert barking → "thank you" protocol (acknowledge, redirect, reward quiet)
4. Anxiety barking → address the anxiety (SA protocol, desensitization)
5. Demand barking → extinction (completely ignore — it gets worse before better)`,
        'Cost of Intervention': '$100-$500 (enrichment supplies + potential trainer consultation)',
        'Success Rate': '75% significant reduction when root cause is addressed',
        'Content': `EXCESSIVE BARKING — THE NEIGHBOR COMPLAINT GENERATOR

Barking is the #1 noise complaint in residential areas and the #2 reason dogs are surrendered (after house soiling). In apartments and condos, excessive barking can lead to eviction.

THE "QUIET" COMMAND MYTH: Teaching "quiet" doesn't work if the underlying motivation isn't addressed. A bored dog who learns "quiet" will just bark again 30 seconds later. A fearful dog who is told "quiet" is still fearful — they've just been suppressed, not helped.

ANTI-BARK DEVICES: Citronella collars, ultrasonic devices, and shock collars suppress the symptom without addressing the cause. They also create side effects: anxiety, learned helplessness, redirected aggression. The bark stops, but the dog is now more stressed — which manifests as OTHER behavioral problems.`,
      },
    }); nc++;

    // ── EXPERT KNOWLEDGE ──
    const ekVetCosts = await post(`/projects/${PID}/nords`, {
      type_id: types['Expert Knowledge'],
      title: 'Veterinary Cost Economics',
      position_x: 0.55, position_y: 0.55,
      properties: {
        'Topic': 'Veterinary Cost Economics',
        'Domain': 'Finance',
        'Species': ['All'],
        'Content': `VETERINARY COST ECONOMICS — FULL REFERENCE

LIFETIME COSTS BY SPECIES:
• Dog (medium breed, 12 years): $15,000-$30,000
• Cat (indoor, 15 years): $10,000-$20,000
• Bird (medium parrot, 30+ years): $5,000-$15,000
First year is most expensive. Last 2 years are second most expensive.

COST BREAKDOWN (annual averages):
Routine care: $200-$400 (exam, vaccines, flea/tick/heartworm)
Dental: $300-$800 (if done — most owners skip it)
Emergency fund needed: $1,000-$2,000 (1 in 3 pets need ER yearly)
Food: $250-$700 (varies by size and quality)
Insurance: $300-$840/year (dogs), $180-$480/year (cats)

COMMON STICKER SHOCKS:
• Torn ACL surgery: $3,000-$6,000
• Foreign body surgery: $2,000-$5,000
• Cancer treatment: $5,000-$15,000
• Dental extraction: $500-$2,500
• Emergency bloat surgery: $3,000-$7,000
• Chronic kidney disease management: $1,200-$3,600/year`,
        'Key Statistics': `• 28% of pet owners have gone into debt for vet care
• 12% have considered euthanasia due to cost
• Only 4.4% of US pets are insured (vs. 80% in Sweden)
• Average ER visit: $800-$1,500
• 67% of pet owners report unexpected vet bills cause stress`,
        'Probing Questions': `→ "When was {{pet_name}}'s last vet visit? How did it go?"
→ "Have you ever had an unexpected vet bill? How did you handle it?"
→ "Do you have pet insurance? What's your experience with it?"
→ "What would you do if {{pet_name}} needed a $3,000 surgery tomorrow?"
→ "Is cost a factor in how often you take {{pet_name}} to the vet?"`,
        'Red Flags': `• Owner hasn't been to vet in 2+ years → likely cost avoidance
• "I'll just wait and see" about symptoms → delayed care risk
• Multiple pets with no preventive care → system overwhelm
• Owner mentions "credit card" or "borrowed money" for vet bills → financial distress`,
        'Common Questions & Answers': `Q: "Is pet insurance worth it?"
A: Actuarially, insurance companies profit. But one emergency ($3,000-$7,000) can cost 5-10 years of premiums. It's not about saving money — it's about never having to choose between your pet's life and your rent. Best value: insure early, before pre-existing conditions.

Q: "How much should I budget monthly?"
A: Rule of thumb: $100-$200/month total (food + supplies + savings for vet). Set aside $50-$100/month in a dedicated "pet emergency fund." After 2 years, you'll have $1,200-$2,400 — enough for most emergencies.

Q: "My vet is too expensive — should I switch?"
A: Maybe. But cheaper isn't always better. Ask: do they have digital X-ray? In-house lab? Board-certified staff on call? A $50 exam at a clinic without diagnostic capability costs more when they refer you to a specialist.`,
      },
    }); nc++;

    const ekNutrition = await post(`/projects/${PID}/nords`, {
      type_id: types['Expert Knowledge'],
      title: 'Pet Nutrition Science',
      position_x: 0.65, position_y: 0.55,
      properties: {
        'Topic': 'Pet Nutrition Science',
        'Domain': 'Nutrition',
        'Species': ['All'],
        'Content': `PET NUTRITION — WHAT THE SCIENCE ACTUALLY SAYS

THE HIERARCHY OF NUTRITIONAL IMPORTANCE:
1. CALORIES (most important) — overfeedling causes more problems than any ingredient issue
2. PROTEIN/FAT/CARB ratio — species-appropriate macronutrient balance
3. COMPLETENESS — AAFCO certification means all essential nutrients present
4. INGREDIENT QUALITY — matters, but less than the above three
5. BRAND PREMIUM — mostly marketing, not nutritional superiority

DOGS vs. CATS:
Dogs are omnivores — they evolved to eat grains, vegetables, and meat. They have amylase genes for starch digestion.
Cats are obligate carnivores — they REQUIRE animal protein. They cannot synthesize taurine (heart failure without it) or arachidonic acid. Cats on vegetarian/vegan diets will develop fatal deficiencies.

THE OBESITY EQUATION: 
It's not the food brand. It's the portion size.
• Most owners overfeed by 20-30%
• Treat calories often equal 25-50% of daily intake and aren't counted
• "But the bag says..." — feeding guidelines on bags are for ACTIVE dogs, not couch potatoes
• Measure food with a measuring cup, not a scoop or eyeball`,
        'Key Statistics': `• 56% of dogs and 60% of cats are overweight/obese
• Pet food is a $50 billion industry in the US
• AAFCO certification is the only evidence-based standard
• Grain-free diets linked to DCM (heart disease) in dogs — FDA investigation`,
        'Probing Questions': `→ "What do you feed {{pet_name}}? How did you choose that food?"
→ "Do you measure portions or eyeball them?"
→ "How many treats does {{pet_name}} get per day?"
→ "Has your vet ever discussed {{pet_name}}'s weight?"
→ "Have you ever changed foods? What happened?"`,
        'Red Flags': `• Grain-free diet for a dog → DCM risk
• Raw diet → bacterial contamination risk
• Free-feeding dry food for cats → obesity risk
• Owner reports pet is "a little chunky but healthy" → denial of weight issue`,
      },
    }); nc++;

    const ekSeniorCare = await post(`/projects/${PID}/nords`, {
      type_id: types['Expert Knowledge'],
      title: 'Senior Pet Care Medicine',
      position_x: 0.75, position_y: 0.55,
      properties: {
        'Topic': 'Senior Pet Care Medicine',
        'Domain': 'Veterinary',
        'Species': ['All'],
        'Content': `SENIOR PET CARE — VETERINARY REFERENCE

WHEN IS A PET "SENIOR"?
Small dogs (<20 lbs): 10-12 years
Medium dogs (20-50 lbs): 8-10 years
Large dogs (50-90 lbs): 6-8 years
Giant dogs (>90 lbs): 5-6 years
Cats: 10+ years (super-senior at 15+)

RECOMMENDED SENIOR SCREENING:
• Bi-annual physical exam (every 6 months, not annually)
• Complete blood count (CBC) + chemistry panel: $150-$300
• Urinalysis: $50-$100
• Thyroid panel: $50-$150
• Blood pressure: $25-$50
• Chest X-ray (baseline): $150-$300
Total annual screening: $500-$1,000

THE MOST MISSED CONDITIONS:
1. Dental disease — 80% of seniors have it. Owners don't check mouths.
2. Arthritis — 80% of dogs over 8. Owners attribute limping to "slowing down."
3. Kidney disease (cats) — no symptoms until 75% function gone.
4. Hypothyroidism (dogs) / Hyperthyroidism (cats) — weight changes, lethargy.
5. Cognitive dysfunction — nighttime restlessness, house soiling, disorientation.

PAIN MANAGEMENT:
Pets hide pain. Dogs wag tails through arthritis. Cats purr through kidney failure. The absence of obvious distress is NOT the absence of pain. Subtle signs: reluctance to jump, slower on stairs, sleeping more, eating less, irritability when touched.`,
        'Key Statistics': `• 80% of dogs over 8 have arthritis
• 30-40% of cats over 10 have kidney disease
• 28% of dogs aged 11-12 have cognitive dysfunction
• Senior pet care accounts for 30-40% of lifetime vet costs`,
        'Probing Questions': `→ "Has {{pet_name}} slowed down recently? In what ways?"
→ "Any changes in eating, drinking, or bathroom habits?"
→ "Does {{pet_name}} still enjoy the activities they used to?"
→ "When was {{pet_name}}'s last blood panel?"`,
      },
    }); nc++;

    const ekInsurance = await post(`/projects/${PID}/nords`, {
      type_id: types['Expert Knowledge'],
      title: 'Pet Insurance Decision Framework',
      position_x: 0.55, position_y: 0.70,
      properties: {
        'Topic': 'Pet Insurance Decision Framework',
        'Domain': 'Finance',
        'Species': ['All'],
        'Content': `PET INSURANCE — THE DECISION FRAMEWORK

WHO SHOULD GET IT:
• Puppy/kitten owners (before pre-existing conditions develop)
• Owners of breeds with known expensive health issues (Frenchies, Labs, GSDs)
• Owners who cannot absorb a $3,000-$5,000 emergency
• Owners who want to make medical decisions based on medicine, not money

WHO IT MAY NOT SUIT:
• Owners with $10,000+ emergency savings dedicated to pets
• Owners of senior pets (high premiums, many exclusions)
• Owners of mixed breeds with no known health issues (lower risk profile)

HOW IT WORKS:
1. You pay the vet upfront (this surprises people)
2. Submit claim to insurance
3. Insurance reimburses 70-90% AFTER deductible
4. Pre-existing conditions are NEVER covered
5. Premiums increase annually (10-20% per year as pet ages)

THE MATH:
Premium: $50/month × 12 months × 10 years = $6,000
One ACL surgery: $5,000
One foreign body surgery: $3,500
One cancer treatment: $8,000
Total of ONE major incident often exceeds lifetime premiums.`,
        'Key Statistics': `• 4.4% of US pets insured (vs 80% in Sweden, 25% in UK)
• $3.45 billion US market, growing 22% annually
• Average dog premium: $50-$70/month
• Average cat premium: $25-$40/month
• Most claims: ear infections, GI issues, skin allergies, ACL tears`,
        'Probing Questions': `→ "Do you have pet insurance? What's been your experience?"
→ "Have you ever had an unexpected vet bill over $1,000?"
→ "What would you do if {{pet_name}} needed a $5,000 surgery tomorrow?"
→ "Is cost uncertainty a source of stress for you?"`,
      },
    }); nc++;

    const ekPsychology = await post(`/projects/${PID}/nords`, {
      type_id: types['Expert Knowledge'],
      title: 'Owner Psychology & Guilt',
      position_x: 0.65, position_y: 0.70,
      properties: {
        'Topic': 'Owner Psychology & Guilt',
        'Domain': 'Psychology',
        'Species': ['All'],
        'Content': `OWNER PSYCHOLOGY — THE EMOTIONAL LANDSCAPE

PET OWNERSHIP GUILT IS UNIVERSAL. Every pet owner feels guilty about something — not enough exercise, wrong food, can't afford the best vet, works too much, doesn't train enough. This guilt is the emotional substrate beneath almost every pain point.

THE GUILT TAXONOMY:
1. CARE GUILT: "I should be doing more" (exercise, grooming, enrichment)
2. FINANCIAL GUILT: "I can't afford the best care" (cheaper food, delayed vet visits)
3. TIME GUILT: "I'm never home enough" (work, social life, family obligations)
4. KNOWLEDGE GUILT: "I should know more" (training methods, nutrition, health)
5. COMPARISON GUILT: "Other owners are doing better" (Instagram, dog park conversations)

THE ANTHROPOMORPHISM TRAP: Owners project human emotional frameworks onto pets. "He looks sad when I leave" → SAY: "Dogs show attachment behaviors that can look like sadness, but their emotional experience is different from human depression. What we can tell you is whether his behavior when alone indicates distress."

THE GOOD ENOUGH OWNER: There is no perfect pet owner. The concept of "enough" is more valuable than "optimal." A dog walked 20 minutes daily by someone who loves them lives a better life than a dog with a personal trainer whose owner is emotionally detached.`,
        'Key Statistics': `• 78% of pet owners report guilt about some aspect of pet care
• 45% say guilt affects their enjoyment of pet ownership
• 23% of pet owners have symptoms consistent with compassion fatigue
• The pet industry capitalizes on guilt — premium products marketed as moral obligations`,
        'Probing Questions': `→ "What's the hardest part about being {{pet_name}}'s owner?"
→ "Do you ever feel guilty about something with {{pet_name}}?"
→ "What would 'perfect' pet ownership look like for you?"
→ "Who do you compare yourself to when it comes to pet parenting?"`,
      },
    }); nc++;

    const ekMultiPet = await post(`/projects/${PID}/nords`, {
      type_id: types['Expert Knowledge'],
      title: 'Multi-Pet Household Dynamics',
      position_x: 0.75, position_y: 0.70,
      properties: {
        'Topic': 'Multi-Pet Household Dynamics',
        'Domain': 'Behavior',
        'Species': ['All'],
        'Content': `MULTI-PET HOUSEHOLDS — THE MULTIPLICATION EFFECT

67% of pet-owning households have 2+ pets. Every additional pet doesn't just add — it multiplies. Two dogs aren't twice the work; they're 3x (individual needs + relationship management). Three cats in one home have 3 bilateral relationships to manage.

THE INTRODUCTION PROBLEM:
• Dog-dog: Slow, neutral-ground introductions over days/weeks
• Cat-cat: Site swapping, scent exchange, visual introduction through barriers — takes 2-6 WEEKS minimum
• Dog-cat: Depends entirely on the dog's prey drive — some combinations are never safe
• New baby + existing pets: The #1 trigger for pet rehoming

RESOURCE MANAGEMENT:
• Food: separate feeding stations to prevent guarding
• Litter boxes: 1 per cat + 1 (3 cats = 4 boxes)
• Attention: perceived inequality creates behavioral issues
• Space: each animal needs "their" area — retreats and safe zones

INTER-PET CONFLICT:
Signs of stress (not play): stiff body language, hard staring, one animal consistently avoiding another, redirected aggression toward humans, resource guarding escalation. Don't wait for a fight — manage before it escalates.`,
        'Key Statistics': `• 67% of pet households have 2+ pets
• Multi-pet homes spend 2.3x more on vet care than single-pet homes
• 35% of cat introductions result in some inter-cat conflict
• The #2 reason for pet rehoming is conflict with existing pets`,
        'Probing Questions': `→ "How do your pets get along? Any tension?"
→ "How did you introduce {{pet_name}} to the other animals?"
→ "Do they eat in the same room or separately?"
→ "Has there ever been a fight or conflict between them?"`,
      },
    }); nc++;

    const ekEmergency = await post(`/projects/${PID}/nords`, {
      type_id: types['Expert Knowledge'],
      title: 'Emergency Preparedness',
      position_x: 0.85, position_y: 0.55,
      properties: {
        'Topic': 'Pet Emergency Preparedness',
        'Domain': 'General',
        'Species': ['All'],
        'Content': `PET EMERGENCY PREPAREDNESS — REFERENCE

KNOW YOUR ER: Every pet owner should know the location and phone number of their nearest 24-hour emergency vet BEFORE an emergency. Google Maps at 2 AM with a bleeding dog in the car is not a plan.

EMERGENCY RED FLAGS (GO TO ER NOW):
• Difficulty breathing or blue gums → respiratory/cardiac emergency
• Bloated, hard abdomen + retching without vomiting → GDV (bloat) → minutes matter
• Seizures lasting >3 minutes or multiple seizures → status epilepticus
• Inability to urinate (especially male cats) → urinary blockage → fatal within 24-48 hrs
• Suspected toxin ingestion (chocolate, xylitol, grapes, lilies, rat poison)
• Trauma (hit by car, fall from height, animal attack)
• Sudden inability to use back legs → disc disease or saddle thrombus (cats)

TOXINS EVERY OWNER SHOULD KNOW:
• Chocolate: dark > milk > white. Theobromine is the toxic compound.
• Xylitol (sugar substitute): in sugar-free gum, peanut butter, baked goods. Causes fatal hypoglycemia and liver failure in dogs. ANY amount is dangerous.
• Grapes/raisins: unpredictable — some dogs eat them without issue, others develop acute kidney failure from a single grape. No safe dose.
• Lilies: ALL parts of the lily are fatal to cats. One petal, one leaf, even the pollen. Acute kidney failure within 24-72 hours.
• Rat poison: secondary poisoning (dog eats poisoned rodent) is common.

POISON CONTROL: ASPCA Animal Poison Control — (888) 426-4435 — $95 consultation fee. Worth every penny.`,
        'Key Statistics': `• 1 in 3 pets will need emergency care each year
• Average ER visit: $800-$1,500
• Average emergency surgery: $2,000-$5,000
• 50% of pet poisonings happen with substances the owner didn't know were toxic`,
        'Probing Questions': `→ "Do you know where the nearest 24-hour emergency vet is?"
→ "Has {{pet_name}} ever had a medical emergency? What happened?"
→ "Do you keep human medications or toxic foods where {{pet_name}} could access them?"`,
      },
    }); nc++;

    // ── INTERVIEW GUIDES ──
    const igRapport = await post(`/projects/${PID}/nords`, {
      type_id: types['Interview Guide'],
      title: 'Rapport Building — The First 5 Minutes',
      position_x: 0.10, position_y: 0.95,
      properties: {
        'Technique Name': 'Rapport Building',
        'When to Use': `The first 5 minutes of every interview. Also useful when transitioning to sensitive topics (finances, end-of-life, guilt) mid-interview.`,
        'How to Apply': `1. NAME FIRST — Get their name and pet's name. Use them constantly thereafter.
2. WARM START — "Tell me about {{pet_name}}" before any pain points. Let them brag.
3. MATCH ENERGY — Chatty? Be chatty. Reserved? Be measured.
4. CONTEXT SET — "There are no right answers. I want YOUR experience."
5. PERMISSION TO BE NEGATIVE — "The hard parts are the most valuable."`,
        'Examples': `GOOD OPENER: "Hi! I'm so glad you're here. Before we get into anything, I want to hear about your pet. What's their name? Tell me about them!"

BAD OPENER: "Thank you for participating. I'll be asking you a series of questions about your pet ownership challenges. Let's begin with question one."

GOOD TRANSITION: "That's so sweet about Luna. Now, I also want to hear about the hard parts — the stuff nobody warns you about."

BAD TRANSITION: "OK, moving on to pain points. What frustrates you?"`,
        'Common Mistakes': `• Asking closed questions early ("Do you have a dog?" → "Yes" → awkward pause)
• Jumping to pain points in minute 1
• Reading from a script
• Interrupting stories
• Using formal language ("Can you describe your pet's behavioral challenges?")`,
        'Content': `RAPPORT BUILDING — THE FOUNDATION OF EVERYTHING

Research shows participants who feel safe in the first 5 minutes share 3x more actionable insights and provide 2x more emotional depth. Rapport isn't a warm-up — it's the entire foundation.

THE SCIENCE: Psychological safety activates the prefrontal cortex (thoughtful, reflective responses). Anxiety activates the amygdala (guarded, surface-level responses). Your opening sets which brain region dominates the entire session.

THE NAME EFFECT: Using someone's name activates their reticular activating system — literally making them more alert and engaged. Use their name AND their pet's name. "Tell me about Luna" hits different than "Tell me about your pet."

THE STORY GATEWAY: Once someone tells ONE story about their pet, they've entered narrative mode. Stories flow into stories. Pain points emerge naturally from stories without being asked. Your job is to start the first story — they'll do the rest.`,
      },
    }); nc++;

    const igProbing = await post(`/projects/${PID}/nords`, {
      type_id: types['Interview Guide'],
      title: 'Deep Probing Frameworks',
      position_x: 0.25, position_y: 0.95,
      properties: {
        'Technique Name': 'Deep Probing Frameworks',
        'When to Use': `After a pain point surfaces. When you need to move from "what happened" to "why it matters" and "what it really costs."`,
        'How to Apply': `THE 5 WHYS (softened):
1. "That sounds frustrating — what makes it so hard?"
2. "And why is THAT the hard part?"
3. "What does that mean for your daily life?"
4. "If this keeps happening, what's the long-term impact?"
5. "What would solving this change for you?"

LADDERING (Means-End Chain):
Surface level: "My cat won't eat the prescription food"
Consequence: "I'm worried she's not getting the nutrition she needs"  
Value: "I couldn't live with myself if I let her get sicker"
→ The VALUE is the real insight. Probe until you find it.

THE ECHO: Repeat their last emotional phrase as a question. "She just goes completely crazy?" → they elaborate naturally.

SILENCE: Wait 3-5 seconds after they answer. The silence draws out the real answer — the one they were deciding whether to share.`,
        'Examples': `THE MAGIC WAND: "If you could snap your fingers and fix one thing about life with {{pet_name}}, what would it be?"

THE TIME MACHINE: "If you could go back to before you got {{pet_name}}, what would you tell yourself?"

THE BEHAVIOR PROBE: "Walk me through the LAST TIME this happened — step by step."

THE SPEND PROBE: "How much have you spent trying to fix this? Total, rough ballpark."`,
        'Common Mistakes': `• Accepting the first answer ("It's fine, just annoying") — probe deeper
• Asking leading questions ("Don't you think that's really hard?")
• Stacking multiple questions in one turn
• Moving on too quickly — sit with the discomfort
• Treating probes as a checklist rather than a conversation`,
        'Content': `DEEP PROBING — THE SKILL THAT SEPARATES GOOD FROM GREAT

Amateur interviewers ask questions. Expert interviewers follow the emotional thread. The difference: amateurs get what people THINK they feel. Experts get what people ACTUALLY feel.

BEHAVIORAL vs. ATTITUDINAL:
Don't ask: "Do you care about X?" (attitude → often lies or aspirational)
Ask: "Walk me through the last time X happened" (behavior → truth)
People report what they WANT to do. Behavior reveals what they ACTUALLY do.

THE 3-SECOND RULE: After the participant answers, count to 3 before speaking. In those 3 seconds, they will either: (a) elaborate on what they just said, or (b) share something deeper they were holding back. Either outcome is gold.`,
      },
    }); nc++;

    const igEmotion = await post(`/projects/${PID}/nords`, {
      type_id: types['Interview Guide'],
      title: 'Handling Emotional Responses',
      position_x: 0.40, position_y: 0.95,
      properties: {
        'Technique Name': 'Handling Emotional Responses',
        'When to Use': `When discussing: end-of-life, guilt, financial inability to treat, behavioral problems leading to rehoming consideration, or any topic where the participant's voice changes, pace slows, or they pause significantly.`,
        'How to Apply': `DO:
• Acknowledge: "That's clearly really important to you. Thank you for sharing that."
• Normalize: "A lot of pet owners feel exactly this way."
• Give space: "Take your time. There's no rush."
• Validate: "It makes complete sense that you'd feel that way."
• Check in: "Would you like to keep talking about this, or move on?"

DON'T:
• Say "I understand" (you don't know their specific experience)
• Minimize: "It'll be okay" / "At least you have other pets"
• Redirect immediately: "Let's move on to something happier"
• Make it clinical: "How would you rate your sadness?"
• Provide unsolicited advice`,
        'Examples': `AFTER TEARS: "Tell me something {{pet_name}} does that always makes you laugh." (Regulates emotional state, reminds them why they love their pet.)

AFTER GUILT: "You clearly love {{pet_name}} deeply. The fact that you feel guilty means you care — and that matters more than being perfect."

AFTER FINANCIAL STRESS: "That's a really tough position to be in. A lot of people face exactly this and there's no easy answer."`,
        'Common Mistakes': `• Panicking when someone cries — it's normal, not a crisis
• Trying to "fix" the emotion — you're here to witness it, not solve it
• Changing the subject too quickly — they may WANT to talk about it
• Getting emotional yourself — stay grounded for their sake`,
        'Content': `HANDLING EMOTION — THE GRIEF-ADJACENT INTERVIEW

Pet interviews are inherently emotional. You are asking someone to talk about a being they love unconditionally and the problems that come with that love. Tears are data, not derailment.

THE GRIEF ADJACENCY PRINCIPLE: When discussing a sick or elderly pet, owners are often pre-grieving. They're processing anticipated loss while the pet is still alive. This isn't a conversation about veterinary costs — it's a conversation about mortality.

THE POST-EMOTION REBOUND: After a heavy moment, don't immediately go back to data collection. Ask something warm. Let them re-regulate. Then gently return to the interview. The transition: "Thank you for sharing that. [Pause.] When you're ready, I'd love to hear about..."`,
      },
    }); nc++;

    const igAnswering = await post(`/projects/${PID}/nords`, {
      type_id: types['Interview Guide'],
      title: 'Answering Owner Questions',
      position_x: 0.55, position_y: 0.95,
      properties: {
        'Technique Name': 'Answer-Then-Probe Pattern',
        'When to Use': `Whenever the owner asks YOU a question: "Is that normal?" "What should I do?" "How much does that usually cost?" "Do other people deal with this?"`,
        'How to Apply': `THE PATTERN:
1. ANSWER — Use your knowledge graph. Be specific, cite data.
2. VALIDATE — "That's a really smart question."
3. PROBE — "Now that you mention it — how long has this been going on?"

The answer builds trust. The probe gets data. Both happen naturally.`,
        'Examples': `Q: "Is it normal for my Maine Coon to drink so much water?"
A: "Actually, increased thirst in senior Maine Coons can be a sign of kidney disease or hyperthyroidism — both common in cats over 10. Has your vet run blood work recently?"

Q: "How much should I budget for vet care?"
A: "Most owners spend $200-$400 on routine care annually, but the real variable is emergencies — 1 in 3 pets need ER care each year, averaging $800-$1,500. What's your setup for unexpected costs?"

Q: "Is pet insurance worth it?"  
A: "Only 4.4% of US pets are insured, but one emergency can cost $3,000-$7,000. The math usually works if you insure early. Have you looked into it?"`,
        'Common Mistakes': `• Deflecting: "This interview is about YOU, not me" — kills trust
• Over-answering: 5-minute lecture when a 2-sentence answer + probe would do
• Making it prescriptive: "You should do X" — you're a researcher, not their vet
• Pretending to know: "I'm not sure, but here's what I do know..." is perfectly fine`,
        'Content': `ANSWERING QUESTIONS — THE TWO-WAY INTERVIEW

Great interviewers don't just ask. They ANSWER. When an owner asks "Is that normal?" — a dumb interviewer deflects. A smart interviewer demonstrates knowledge, builds trust, and THEN probes deeper.

WHY THIS WORKS:
• Demonstrates competence → increases trust → deeper sharing
• Owner feels heard, not interrogated  
• The answer naturally leads to the next probe
• You capture data as a BYPRODUCT of helping, not as the primary goal

THE EXPERTISE EFFECT: When the interviewer knows about breed-specific health risks, common costs, and behavioral science, the owner shifts from "answering questions for a researcher" to "talking with someone who understands." This shift produces richer, more honest data.`,
      },
    }); nc++;

    const igClosing = await post(`/projects/${PID}/nords`, {
      type_id: types['Interview Guide'],
      title: 'Closing & Prioritization',
      position_x: 0.70, position_y: 0.95,
      properties: {
        'Technique Name': 'Closing & Prioritization',
        'When to Use': `After pain points have been captured and probed. When the owner signals they've covered the main issues or after 3-4 pain points have been deeply explored.`,
        'How to Apply': `1. SUMMARY REFLECTION: "We've talked about [pp1], [pp2], and [pp3]. Those are significant."
2. THE PRIORITY QUESTION: "Of everything we talked about, which one keeps you up at night?"
3. THE MISSED CHECK: "Is there anything about {{pet_name}} we haven't covered that you want to mention?"
4. THE FUTURE PROBE: "Looking ahead, what worries you most about life with {{pet_name}}?"
5. WARM CLOSE: "Thank you. You've given me an incredible picture of what life with {{pet_name}} is really like. This is exactly the kind of insight that leads to real solutions."`,
        'Examples': `PRIORITIZATION: "If you could only solve ONE of these problems, which one would make the biggest difference in your life with {{pet_name}}?"

FUTURE-CASTING: "Where do you see things with {{pet_name}} in 2-3 years? What concerns you about that?"

WARM CLOSE: "I can tell how much you love {{pet_name}}. Thank you for being so honest about the hard parts — that takes courage."`,
        'Common Mistakes': `• Ending abruptly without summarizing — feels transactional
• Skipping prioritization — you have pain points but no hierarchy
• Not asking "anything else?" — the most important insight often comes last
• Formal, cold closing — the ending emotion determines how they remember the session`,
        'Content': `CLOSING & PRIORITIZATION — THE LAST IMPRESSION

The closing is where data becomes insight. Without prioritization, you have a list of problems. With prioritization, you have a RANKED list — and the ranking reveals what the owner truly values.

THE RECENCY EFFECT: What the owner says LAST shapes their memory of the entire interview. A warm, appreciative close makes them feel good about participating and willing to do it again. A cold, transactional close makes them regret sharing.

THE "ANYTHING ELSE" PHENOMENON: 40% of the time, when you ask "Is there anything else?", the owner shares something they've been holding back the entire session. Often it's the most important thing. Never skip this question.`,
      },
    }); nc++;

    console.log(`   ✅ Created ${nc} nords`);

    // ═══════════════════════════════════════════════════════
    // 7. CONNECTIONS — Knowledge Relationships
    // ═══════════════════════════════════════════════════════
    console.log('\n7. Creating Connections...');
    let cc = 0;
    const conn = async (from, to, type, extra = {}) => {
      await post(`/projects/${PID}/connections`, { source_nord_id: from, target_nord_id: to, type_id: type, ...extra });
      cc++;
    };

    // ── Life Stage Progressions (Related To — sequential) ──
    await conn(lsPuppy.id, lsAdolescent.id, conns['Related To'], { properties: { relationship_note: 'Progresses to' } });
    await conn(lsAdolescent.id, lsAdultDog.id, conns['Related To'], { properties: { relationship_note: 'Progresses to' } });
    await conn(lsAdultDog.id, lsSeniorDog.id, conns['Related To'], { properties: { relationship_note: 'Progresses to' } });
    await conn(lsSeniorDog.id, lsEndOfLife.id, conns['Related To'], { properties: { relationship_note: 'Progresses to' } });
    await conn(lsKitten.id, lsAdultCat.id, conns['Related To'], { properties: { relationship_note: 'Progresses to' } });
    await conn(lsAdultCat.id, lsSeniorCat.id, conns['Related To'], { properties: { relationship_note: 'Progresses to' } });
    await conn(lsSeniorCat.id, lsEndOfLife.id, conns['Related To'], { properties: { relationship_note: 'Progresses to' } });

    // ── Life Stages Predispose Pain Points ──
    await conn(lsPuppy.id, cpTraining.id, conns['Predisposes'], { properties: { likelihood: 'Very High' } });
    await conn(lsPuppy.id, cpDiet.id, conns['Predisposes'], { properties: { likelihood: 'High' } });
    await conn(lsAdolescent.id, cpExercise.id, conns['Predisposes'], { properties: { likelihood: 'Very High' } });
    await conn(lsAdolescent.id, cpTraining.id, conns['Predisposes'], { properties: { likelihood: 'Very High' } });
    await conn(lsAdultDog.id, cpVetCosts.id, conns['Predisposes'], { properties: { likelihood: 'Moderate' } });
    await conn(lsSeniorDog.id, cpVetCosts.id, conns['Predisposes'], { properties: { likelihood: 'Very High' } });
    await conn(lsSeniorDog.id, cpEndOfLife.id, conns['Predisposes'], { properties: { likelihood: 'Very High' } });
    await conn(lsSeniorCat.id, cpVetCosts.id, conns['Predisposes'], { properties: { likelihood: 'Very High' } });
    await conn(lsSeniorCat.id, cpEndOfLife.id, conns['Predisposes'], { properties: { likelihood: 'Very High' } });
    await conn(lsKitten.id, cpLitterBox.id, conns['Predisposes'], { properties: { likelihood: 'Moderate' } });
    await conn(lsAdultCat.id, cpLitterBox.id, conns['Predisposes'], { properties: { likelihood: 'High' } });

    // ── Life Stages Predispose Behaviors ──
    await conn(lsPuppy.id, bpSepAnx.id, conns['Predisposes'], { properties: { likelihood: 'High' } });
    await conn(lsAdolescent.id, bpReactivity.id, conns['Predisposes'], { properties: { likelihood: 'Very High' } });
    await conn(lsAdolescent.id, bpResourceGuard.id, conns['Predisposes'], { properties: { likelihood: 'Moderate' } });
    await conn(lsKitten.id, bpDestructScratch.id, conns['Predisposes'], { properties: { likelihood: 'Very High' } });
    await conn(lsKitten.id, bpLitterAvoid.id, conns['Predisposes'], { properties: { likelihood: 'Moderate' } });

    // ── Breeds → Common Pains (Common In) ──
    await conn(brLabrador.id, cpVetCosts.id, conns['Common In'], { properties: { prevalence: '70% die of cancer' } });
    await conn(brLabrador.id, cpExercise.id, conns['Common In'], { properties: { prevalence: 'High energy, needs 2+ hrs/day' } });
    await conn(brLabrador.id, cpDiet.id, conns['Common In'], { properties: { prevalence: '25% have POMC gene → can\'t feel full' } });
    await conn(brFrenchie.id, cpVetCosts.id, conns['Common In'], { properties: { prevalence: '$20k-$40k lifetime vet costs' } });
    await conn(brFrenchie.id, cpGrooming.id, conns['Common In'], { properties: { prevalence: 'Daily skin fold cleaning required' } });
    await conn(brMaineCoon.id, cpVetCosts.id, conns['Common In'], { properties: { prevalence: '30% carry HCM mutation' } });
    await conn(brMaineCoon.id, cpGrooming.id, conns['Common In'], { properties: { prevalence: 'Daily brushing required' } });
    await conn(brGSD.id, cpVetCosts.id, conns['Common In'], { properties: { prevalence: 'Bloat/GDV risk' } });
    await conn(brGSD.id, cpExercise.id, conns['Common In'], { properties: { prevalence: '2+ hours/day minimum' } });
    await conn(brMixed.id, cpTraining.id, conns['Common In'], { properties: { prevalence: 'Unknown background → training uncertainty' } });
    await conn(brDSH.id, cpLitterBox.id, conns['Common In'], { properties: { prevalence: 'Urinary issues common in males' } });

    // ── Breeds → Behavioral Patterns (Common In) ──
    await conn(brLabrador.id, bpResourceGuard.id, conns['Common In'], { properties: { prevalence: 'Food obsession → guarding' } });
    await conn(brGSD.id, bpReactivity.id, conns['Common In'], { properties: { prevalence: 'Protective instinct without socialization' } });
    await conn(brFrenchie.id, bpSepAnx.id, conns['Common In'], { properties: { prevalence: 'Companion breed → attachment' } });
    await conn(brDSH.id, bpDestructScratch.id, conns['Common In'], { properties: { prevalence: 'Biological need in all cats' } });
    await conn(brDSH.id, bpLitterAvoid.id, conns['Common In'], { properties: { prevalence: 'Males at urinary blockage risk' } });

    // ── Environments Amplify Pains ──
    await conn(envApartment.id, cpExercise.id, conns['Amplifies'], { properties: { severity_increase: 'No yard backup' } });
    await conn(envApartment.id, cpSepAnxDamage.id, conns['Amplifies'], { properties: { severity_increase: 'Noise complaints → housing risk' } });
    await conn(envApartment.id, cpLitterBox.id, conns['Amplifies'], { properties: { severity_increase: 'Limited placement options' } });
    await conn(envSuburban.id, cpExercise.id, conns['Amplifies'], { properties: { severity_increase: 'Yard illusion — dogs don\'t self-exercise' } });
    await conn(envRural.id, cpVetCosts.id, conns['Amplifies'], { properties: { severity_increase: 'Vet access 30-60+ min away' } });
    await conn(envCondo.id, cpSepAnxDamage.id, conns['Amplifies'], { properties: { severity_increase: 'HOA rules + noise = eviction risk' } });
    await conn(envCondo.id, cpGrooming.id, conns['Amplifies'], { properties: { severity_increase: 'No outdoor bathing option' } });

    // ── Environments Amplify Behaviors ──
    await conn(envApartment.id, bpExcessBark.id, conns['Amplifies'], { properties: { severity_increase: 'Noise complaints and lease violations' } });
    await conn(envApartment.id, bpSepAnx.id, conns['Amplifies'], { properties: { severity_increase: 'Confined space + neighbors' } });

    // ── Behaviors → Pains (Causes) ──
    await conn(bpSepAnx.id, cpSepAnxDamage.id, conns['Causes'], { properties: { frequency: 'Always' } });
    await conn(bpSepAnx.id, cpVetCosts.id, conns['Causes'], { properties: { frequency: 'Sometimes' } });
    await conn(bpReactivity.id, cpExercise.id, conns['Causes'], { properties: { frequency: 'Often' } });
    await conn(bpLitterAvoid.id, cpLitterBox.id, conns['Causes'], { properties: { frequency: 'Always' } });
    await conn(bpExcessBark.id, cpSepAnxDamage.id, conns['Causes'], { properties: { frequency: 'Often' } });
    await conn(bpResourceGuard.id, cpTraining.id, conns['Causes'], { properties: { frequency: 'Often' } });

    // ── Cross-Pain Relationships (Related To) ──
    await conn(cpVetCosts.id, cpEndOfLife.id, conns['Related To'], { properties: { relationship_note: 'End-of-life is the most expensive period' } });
    await conn(cpExercise.id, cpSepAnxDamage.id, conns['Related To'], { properties: { relationship_note: 'Under-exercised dogs have worse SA' } });
    await conn(cpTraining.id, cpDiet.id, conns['Related To'], { properties: { relationship_note: 'Conflicting advice in both domains' } });
    await conn(cpGrooming.id, cpVetCosts.id, conns['Related To'], { properties: { relationship_note: 'Skipped grooming → health costs later' } });

    // ── Expert Knowledge Informs Everything ──
    await conn(ekVetCosts.id, cpVetCosts.id, conns['Informs'], { properties: { relevance: 'Directly Applicable' } });
    await conn(ekVetCosts.id, cpEndOfLife.id, conns['Informs'], { properties: { relevance: 'Directly Applicable' } });
    await conn(ekNutrition.id, cpDiet.id, conns['Informs'], { properties: { relevance: 'Directly Applicable' } });
    await conn(ekSeniorCare.id, lsSeniorDog.id, conns['Informs'], { properties: { relevance: 'Directly Applicable' } });
    await conn(ekSeniorCare.id, lsSeniorCat.id, conns['Informs'], { properties: { relevance: 'Directly Applicable' } });
    await conn(ekSeniorCare.id, cpEndOfLife.id, conns['Informs'], { properties: { relevance: 'Directly Applicable' } });
    await conn(ekInsurance.id, cpVetCosts.id, conns['Informs'], { properties: { relevance: 'Directly Applicable' } });
    await conn(ekPsychology.id, cpEndOfLife.id, conns['Informs'], { properties: { relevance: 'Directly Applicable' } });
    await conn(ekPsychology.id, cpTraining.id, conns['Informs'], { properties: { relevance: 'Contextual' } });
    await conn(ekMultiPet.id, bpResourceGuard.id, conns['Informs'], { properties: { relevance: 'Directly Applicable' } });
    await conn(ekEmergency.id, cpVetCosts.id, conns['Informs'], { properties: { relevance: 'Contextual' } });

    // ── Interview Guides → Knowledge (Guides) ──
    await conn(igRapport.id, lsPuppy.id, conns['Guides'], { properties: { priority: 'Essential' } });
    await conn(igRapport.id, lsKitten.id, conns['Guides'], { properties: { priority: 'Essential' } });
    await conn(igProbing.id, cpVetCosts.id, conns['Guides'], { properties: { priority: 'Essential' } });
    await conn(igProbing.id, cpSepAnxDamage.id, conns['Guides'], { properties: { priority: 'Essential' } });
    await conn(igProbing.id, cpLitterBox.id, conns['Guides'], { properties: { priority: 'Essential' } });
    await conn(igProbing.id, cpExercise.id, conns['Guides'], { properties: { priority: 'Recommended' } });
    await conn(igEmotion.id, cpEndOfLife.id, conns['Guides'], { properties: { priority: 'Essential' } });
    await conn(igEmotion.id, lsEndOfLife.id, conns['Guides'], { properties: { priority: 'Essential' } });
    await conn(igEmotion.id, ekPsychology.id, conns['Guides'], { properties: { priority: 'Recommended' } });
    await conn(igAnswering.id, ekVetCosts.id, conns['Guides'], { properties: { priority: 'Essential' } });
    await conn(igAnswering.id, ekNutrition.id, conns['Guides'], { properties: { priority: 'Essential' } });
    await conn(igAnswering.id, ekInsurance.id, conns['Guides'], { properties: { priority: 'Recommended' } });
    await conn(igClosing.id, cpEndOfLife.id, conns['Guides'], { properties: { priority: 'Recommended' } });

    // ── Interview Guide Sequence (Related To) ──
    await conn(igRapport.id, igProbing.id, conns['Related To'], { properties: { relationship_note: 'Build rapport FIRST, then probe' } });
    await conn(igProbing.id, igEmotion.id, conns['Related To'], { properties: { relationship_note: 'Deep probing surfaces emotion' } });
    await conn(igEmotion.id, igClosing.id, conns['Related To'], { properties: { relationship_note: 'After emotion, close warmly' } });
    await conn(igRapport.id, igAnswering.id, conns['Related To'], { properties: { relationship_note: 'Answering questions builds rapport' } });

    console.log(`   ✅ Created ${cc} connections`);


    // ═══════════════════════════════════════════════════════
    // 8. COLLECTION GROUPS
    // ═══════════════════════════════════════════════════════
    console.log('\n8. Creating Collection Groups...');
    const groupSpecs = [
      { name: 'Owner Information', description: 'Contact details and demographics', icon: 'User', accent_color: '#3b82f6', sort_order: 0 },
      { name: 'Pet Details', description: 'Species, breed, age, and health info', icon: 'Heart', accent_color: '#f59e0b', sort_order: 1 },
      { name: 'Home Environment', description: 'Living situation and environmental factors', icon: 'Home', accent_color: '#10b981', sort_order: 2 },
    ];

    // Pain Point groups: Name + Context for each
    for (let i = 1; i <= 4; i++) {
      groupSpecs.push(
        { name: `Pain Point ${i}`, description: `Pain point #${i} — name and metadata`, icon: 'AlertTriangle', accent_color: '#ef4444', sort_order: 2 + (i * 2 - 1) },
        { name: `Pain Point ${i} Context`, description: `Deep probing quotes and context for pain point #${i}`, icon: 'MessageSquare', accent_color: '#f97316', sort_order: 2 + (i * 2) },
      );
    }

    groupSpecs.push(
      { name: 'Session Wrap-Up', description: 'Prioritization and session conclusion', icon: 'ClipboardCheck', accent_color: '#6366f1', sort_order: 20 },
    );

    const groups = {};
    for (const g of groupSpecs) {
      const res = await post(`/projects/${PID}/collection-groups`, g);
      groups[g.name] = res.id;
      console.log(`   ↳ ${g.name}`);
    }

    // ═══════════════════════════════════════════════════════
    // 9. PROJECT VARIABLES
    //
    // Per pain point (×4):
    //   PHASE 1 — ppN_name (required), ppN_severity, ppN_category
    //   PHASE 2 — ppN_context_1..4 (long text, not required),
    //             ppN_probed (boolean, required — gates context goal)
    // ═══════════════════════════════════════════════════════
    console.log('\n9. Creating Project Variables...');
    const vars = {};
    let vc = 0;

    async function createVar(spec) {
      const res = await post(`/projects/${PID}/variables`, spec);
      vars[spec.name] = res.id;
      vc++;
      return res;
    }

    // ── Owner Information ──
    await createVar({ name: 'owner_name', description: 'Pet owner\'s full name', type: 'string', required: true, hint: 'What\'s your name?', priority: 10, collection_group_id: groups['Owner Information'], sort_order: 0 });
    await createVar({ name: 'email', description: 'Contact email', type: 'email', required: true, hint: 'Best email to reach you?', priority: 8, collection_group_id: groups['Owner Information'], sort_order: 1 });
    await createVar({ name: 'phone', description: 'Phone number', type: 'phone', required: false, hint: 'Phone (optional)', priority: 3, collection_group_id: groups['Owner Information'], sort_order: 2 });

    // ── Pet Details ──
    await createVar({ name: 'pet_type', description: 'Type of pet — Dog, Cat, Bird, or Exotic', type: 'select', required: true, options: ['Dog', 'Cat', 'Bird', 'Exotic'], hint: 'What kind of pet?', priority: 10, collection_group_id: groups['Pet Details'], sort_order: 0 });
    await createVar({ name: 'pet_name', description: 'Pet\'s name — use this name throughout the entire conversation', type: 'string', required: true, hint: 'What\'s your pet\'s name?', priority: 10, collection_group_id: groups['Pet Details'], sort_order: 1 });
    await createVar({ name: 'species_breed', description: 'Species and breed', type: 'string', required: true, hint: 'What breed?', priority: 8, collection_group_id: groups['Pet Details'], sort_order: 2 });
    await createVar({ name: 'pet_age', description: 'Pet\'s age in years', type: 'number', required: true, hint: 'How old?', priority: 7, collection_group_id: groups['Pet Details'], sort_order: 3 });
    await createVar({ name: 'health_conditions', description: 'Known health conditions', type: 'multi_select', required: false, options: ['Allergies', 'Joint Issues', 'Dental', 'Obesity', 'Anxiety', 'Skin Conditions', 'Digestive Issues', 'Senior Care', 'None Known'], hint: 'Any known health issues?', priority: 5, collection_group_id: groups['Pet Details'], sort_order: 4 });

    // ── Home Environment ──
    await createVar({ name: 'living_situation', description: 'Type of home', type: 'select', required: true, options: ['Apartment', 'Condo', 'House', 'Farm/Rural'], hint: 'What type of home?', priority: 6, collection_group_id: groups['Home Environment'], sort_order: 0 });
    await createVar({ name: 'outdoor_access', description: 'Outdoor space for the pet', type: 'select', required: true, options: ['None', 'Balcony Only', 'Small Yard', 'Large Yard', 'Acreage'], hint: 'What outdoor space?', priority: 6, collection_group_id: groups['Home Environment'], sort_order: 1 });
    await createVar({ name: 'monthly_pet_budget', description: 'Approximate monthly spend on pet', type: 'number', required: false, hint: 'Roughly what do you spend per month?', priority: 4, collection_group_id: groups['Home Environment'], sort_order: 2 });

    // ── Pain Points (×4 slots, two phases each) ──
    for (let i = 1; i <= 4; i++) {
      const ppGroup = `Pain Point ${i}`;
      const ctxGroup = `Pain Point ${i} Context`;

      // PHASE 1 — Name it
      await createVar({ name: `pp${i}_name`, description: `Pain point #${i} — the frustration or struggle in the owner's words`, type: 'string', required: true, hint: 'What\'s the frustration?', priority: 10, collection_group_id: groups[ppGroup], sort_order: 0 });
      await createVar({ name: `pp${i}_severity`, description: `How severe is pain point #${i} on a 1-10 scale`, type: 'number', required: false, hint: '1-10, how much does this bother you?', priority: 7, collection_group_id: groups[ppGroup], sort_order: 1 });
      await createVar({ name: `pp${i}_category`, description: `What category does pain point #${i} fall into`, type: 'multi_select', required: false, options: ['Health & Medical', 'Behavioral', 'Environmental', 'Financial', 'Time & Lifestyle', 'Emotional & Psychological'], hint: 'What area?', priority: 6, collection_group_id: groups[ppGroup], sort_order: 2 });

      // PHASE 2 — Probe it (up to 4 long-text context captures)
      await createVar({ name: `pp${i}_context_1`, description: `First insight, quote, or story about pain point #${i}. Capture the owner's words verbatim when possible. Use the pain point name {{pp${i}_name}} and pet name {{pet_name}} when probing.`, type: 'string', required: false, hint: 'Tell me more about this…', priority: 9, collection_group_id: groups[ctxGroup], sort_order: 0, tags: ['context', 'quote'] });
      await createVar({ name: `pp${i}_context_2`, description: `Second insight about pain point #${i}. Probe deeper: "When {{pp${i}_name}} happens with {{pet_name}}, how does that make you feel?"`, type: 'string', required: false, hint: 'What else about this?', priority: 8, collection_group_id: groups[ctxGroup], sort_order: 1, tags: ['context', 'quote'] });
      await createVar({ name: `pp${i}_context_3`, description: `Third insight about pain point #${i}. Try: "What have you tried to fix {{pp${i}_name}}? How much have you spent?"`, type: 'string', required: false, hint: 'What have you tried?', priority: 7, collection_group_id: groups[ctxGroup], sort_order: 2, tags: ['context', 'quote'] });
      await createVar({ name: `pp${i}_context_4`, description: `Fourth insight about pain point #${i}. Try: "If you could snap your fingers and solve {{pp${i}_name}} for {{pet_name}}, what would that look like?"`, type: 'string', required: false, hint: 'What would ideal look like?', priority: 6, collection_group_id: groups[ctxGroup], sort_order: 3, tags: ['context', 'quote'] });
      await createVar({ name: `pp${i}_probed`, description: `Set to true when probing of pain point #${i} is complete — either the owner says "that covers it" or 4 context items have been captured.`, type: 'boolean', required: true, hint: 'Probing complete', priority: 10, collection_group_id: groups[ctxGroup], sort_order: 4 });
    }

    // ── Session Wrap-Up ──
    await createVar({ name: 'pain_points_done', description: 'Has the owner indicated they have no more pain points? Set to true when they say "that covers it" or similar.', type: 'boolean', required: true, hint: 'Any more frustrations, or have we covered the main ones?', priority: 8, collection_group_id: groups['Session Wrap-Up'], sort_order: 0 });
    await createVar({ name: 'top_priority_pain', description: 'Which pain point matters most to the owner — in their own words', type: 'string', required: true, hint: 'Of everything we discussed, which one matters most?', priority: 9, collection_group_id: groups['Session Wrap-Up'], sort_order: 1 });
    await createVar({ name: 'session_outcome', description: 'How the session concluded', type: 'select', required: false, options: ['Complete', 'Partial — Follow-Up Needed', 'Incomplete'], hint: 'Session outcome', priority: 5, collection_group_id: groups['Session Wrap-Up'], sort_order: 2 });

    console.log(`   ✅ Created ${vc} variables`);

    // ═══════════════════════════════════════════════════════
    // 10. GOALS (13) + DAG EDGES
    //
    //  Intake → Pet Profile → Env → PP1 → PP1Ctx → PP2 → PP2Ctx → PP3 → PP3Ctx → PP4 → PP4Ctx
    //                                       ↘       ↘      ↘       ↘      ↘       ↘      ↘
    //                                        Wrap-Up (prerequisite_gate: 'any')
    //                                            ↓
    //                                     Session Complete
    // ═══════════════════════════════════════════════════════
    console.log('\n10. Creating Goals...');

    const goalSpecs = [
      {
        name: 'Intake Complete',
        description: 'Collect the owner\'s name, email, and determine what type of pet they have.',
        icon: 'UserCheck', accent_color: '#3b82f6', sort_order: 0,
        achieved_prompt: 'Wonderful to meet you, {{owner_name}}! Now for the most important part — tell me about your pet! What\'s their name? What kind of animal are they? I want to hear all about them.',
      },
      {
        name: 'Pet Profile Complete',
        description: 'Capture the pet\'s name, species/breed, age, and any known health conditions.',
        icon: 'Heart', accent_color: '#f59e0b', sort_order: 1,
        achieved_prompt: 'I love that — {{pet_name}} sounds like quite a character, {{owner_name}}! I can already tell how much {{pet_name}} means to you. Let me ask about where you and {{pet_name}} live so I can understand the full picture.',
      },
      {
        name: 'Environment Assessed',
        description: 'Document the home environment — type, outdoor access, and spatial context.',
        icon: 'Home', accent_color: '#10b981', sort_order: 2,
        achieved_prompt: 'Perfect — I have a really clear picture of you, {{pet_name}}, and your home now, {{owner_name}}. Here\'s where it gets interesting. I want to hear about the HARD parts. Not the cute Instagram moments — the real stuff. The daily annoyances, the things that stress you out. Walk me through a typical day with {{pet_name}} — where do things get difficult?',
      },
    ];

    // Pain Point goals (×4, two phases each)
    const ppNamePrompts = [
      'Got it — "{{pp1_name}}" — I want to understand this one deeply, {{owner_name}}. Tell me everything about this frustration with {{pet_name}}. When does it happen? How does it make you feel? Don\'t hold back — the details matter.',
      'I hear you — "{{pp2_name}}" is a real one, {{owner_name}}. Walk me through what happens with {{pet_name}} when this comes up. What does it look like day-to-day?',
      '"{{pp3_name}}" — that\'s three frustrations now, {{owner_name}}. I can see this adds up. Tell me more about this one — when did it start with {{pet_name}}?',
      '"{{pp4_name}}" — thank you for sharing this, {{owner_name}}. I know this isn\'t always easy. Tell me what happens with {{pet_name}} when this comes up.',
    ];

    const ppContextPrompts = [
      'Thank you for going deep on {{pp1_name}}, {{owner_name}}. I really understand what you\'re dealing with now. Are there OTHER frustrations with {{pet_name}} that we haven\'t touched on yet? Or have we hit the big ones?',
      'I really appreciate you sharing all that about {{pp2_name}}, {{owner_name}}. That\'s incredibly valuable context. Is there anything else that frustrates you about life with {{pet_name}}, or are we getting close to covering everything?',
      'Three pain points fully explored — you\'re painting a clear picture, {{owner_name}}. Any other frustrations with {{pet_name}} still on your mind, or have we covered the main ones?',
      'That\'s four frustrations captured and explored, {{owner_name}}. You\'ve shared an incredible amount about life with {{pet_name}}. Now — of everything we\'ve discussed, which frustration is the one that keeps you up at night? If someone could wave a magic wand and fix ONE thing, which would it be?',
    ];

    for (let i = 1; i <= 4; i++) {
      goalSpecs.push({
        name: `Pain Point ${i}`,
        description: `Capture pain point #${i} name. The owner's frustration name is the only required field.`,
        icon: 'AlertTriangle', accent_color: '#ef4444', sort_order: 2 + (i * 2 - 1),
        achieved_prompt: ppNamePrompts[i - 1],
      });
      goalSpecs.push({
        name: `Pain Point ${i} Context`,
        description: `Deep probe pain point #${i} using {{pp${i}_name}} and {{pet_name}}. Capture up to 4 long-text context items (quotes, stories, insights). Set pp${i}_probed to true when the owner has shared enough or after 4 captures.`,
        icon: 'MessageSquare', accent_color: '#f97316', sort_order: 2 + (i * 2),
        achieved_prompt: ppContextPrompts[i - 1],
      });
    }

    // Wrap-Up + Session Complete
    goalSpecs.push({
      name: 'Wrap-Up',
      description: 'The owner is done sharing pain points. Capture their top priority.',
      icon: 'ListOrdered', accent_color: '#06b6d4', sort_order: 20,
      achieved_prompt: 'Of everything we talked about — {{pp1_name}}, and everything else — which frustration keeps you up at night, {{owner_name}}? If someone could fix ONE thing about life with {{pet_name}}, which would it be?',
    });

    goalSpecs.push({
      name: 'Session Complete',
      description: 'Interview complete — thank the owner and summarize.',
      icon: 'CheckCircle', accent_color: '#6366f1', sort_order: 21,
      end_type: 'reset',
      achieved_prompt: '{{owner_name}}, thank you so much for this conversation. I know some of those frustrations about {{pet_name}} weren\'t easy to talk about — the fact that you shared so openly means the world. {{top_priority_pain}} is clearly the one that weighs on you most, and everything you shared today will directly shape how we think about solving these problems for pet owners like you. {{pet_name}} is lucky to have someone who cares this much. Thank you for your time.',
    });

    const goals = {};
    for (const spec of goalSpecs) {
      const g = await post(`/projects/${PID}/goals`, spec);
      goals[spec.name] = g.id;
      console.log(`   ↳ ${spec.name}`);
    }

    // ── Goal Edges ──
    console.log('   Creating goal edges...');

    // Linear chain
    const linearEdges = [
      ['Intake Complete', 'Pet Profile Complete'],
      ['Pet Profile Complete', 'Environment Assessed'],
      ['Environment Assessed', 'Pain Point 1'],
      ['Pain Point 1', 'Pain Point 1 Context'],
      ['Pain Point 1 Context', 'Pain Point 2'],
      ['Pain Point 2', 'Pain Point 2 Context'],
      ['Pain Point 2 Context', 'Pain Point 3'],
      ['Pain Point 3', 'Pain Point 3 Context'],
      ['Pain Point 3 Context', 'Pain Point 4'],
      ['Pain Point 4', 'Pain Point 4 Context'],
    ];
    for (const [src, tgt] of linearEdges) {
      await post(`/projects/${PID}/goal-edges`, { source_goal_id: goals[src], target_goal_id: goals[tgt] });
      console.log(`   ↳ ${src} → ${tgt}`);
    }

    // Shortcut edges: each PPn Context → Wrap-Up
    for (let i = 1; i <= 4; i++) {
      await post(`/projects/${PID}/goal-edges`, { source_goal_id: goals[`Pain Point ${i} Context`], target_goal_id: goals['Wrap-Up'] });
      console.log(`   ↳ Pain Point ${i} Context → Wrap-Up`);
    }

    // Wrap-Up → Session Complete
    await post(`/projects/${PID}/goal-edges`, { source_goal_id: goals['Wrap-Up'], target_goal_id: goals['Session Complete'] });
    console.log(`   ↳ Wrap-Up → Session Complete`);

    // Set Wrap-Up gate to 'any' — activates after ANY PP Context completes
    await put(`/goals/${goals['Wrap-Up']}`, { prerequisite_gate: 'any' });
    console.log(`   ✅ Wrap-Up gate = 'any' (activates after first PP Context completes)`);

    // ── Variable Bindings ──
    console.log('   Binding variables to goals...');
    const bindingSpecs = {
      'Intake Complete': [
        { var: 'owner_name', required: true },
        { var: 'email', required: true },
        { var: 'pet_type', required: true },
      ],
      'Pet Profile Complete': [
        { var: 'pet_name', required: true },
        { var: 'species_breed', required: true },
        { var: 'pet_age', required: true },
        { var: 'health_conditions', required: false },
      ],
      'Environment Assessed': [
        { var: 'living_situation', required: true },
        { var: 'outdoor_access', required: true },
        { var: 'monthly_pet_budget', required: false },
      ],
    };

    for (let i = 1; i <= 4; i++) {
      // PP Name goal — only ppN_name is required
      bindingSpecs[`Pain Point ${i}`] = [
        { var: `pp${i}_name`, required: true },
        { var: `pp${i}_severity`, required: false },
        { var: `pp${i}_category`, required: false },
      ];
      // PP Context goal — ppN_probed is the ONLY required field (gates completion)
      // Context 1-4 are captured organically but don't gate the goal
      bindingSpecs[`Pain Point ${i} Context`] = [
        { var: `pp${i}_context_1`, required: false },
        { var: `pp${i}_context_2`, required: false },
        { var: `pp${i}_context_3`, required: false },
        { var: `pp${i}_context_4`, required: false },
        { var: `pp${i}_probed`, required: true },  // ← THE GATE
      ];
    }

    bindingSpecs['Wrap-Up'] = [
      { var: 'pain_points_done', required: true },
      { var: 'top_priority_pain', required: true },
    ];
    bindingSpecs['Session Complete'] = [
      { var: 'session_outcome', required: false },
    ];

    for (const [goalName, bindings] of Object.entries(bindingSpecs)) {
      for (const b of bindings) {
        await post(`/goals/${goals[goalName]}/variable-bindings`, {
          variable_id: vars[b.var],
          required: b.required,
        });
      }
      const req = bindings.filter(b => b.required).length;
      const opt = bindings.filter(b => !b.required).length;
      console.log(`   ↳ ${goalName}: ${req} required + ${opt} optional`);
    }

    // ── Goal Relevant Nord Types ──
    console.log('   Linking relevant nord types...');
    const goalTypeLinks = {
      'Intake Complete': ['Breed Profile', 'Interview Guide'],
      'Pet Profile Complete': ['Life Stage', 'Breed Profile'],
      'Environment Assessed': ['Living Environment', 'Expert Knowledge'],
      'Wrap-Up': ['Common Pain', 'Expert Knowledge'],
      'Session Complete': ['Interview Guide'],
    };
    for (let i = 1; i <= 4; i++) {
      goalTypeLinks[`Pain Point ${i}`] = ['Common Pain', 'Expert Knowledge'];
      goalTypeLinks[`Pain Point ${i} Context`] = ['Common Pain', 'Expert Knowledge', 'Behavioral Pattern'];
    }
    for (const [goalName, typeNames] of Object.entries(goalTypeLinks)) {
      for (const tn of typeNames) {
        await post(`/goals/${goals[goalName]}/relevant-types`, { nord_type_id: types[tn] });
      }
    }

    // ── Goal Relevant Nords ──
    console.log('   Linking relevant nords...');
    await post(`/goals/${goals['Intake Complete']}/relevant-nords`, { nord_id: igRapport.id });
    await post(`/goals/${goals['Pet Profile Complete']}/relevant-nords`, { nord_id: ekNutrition.id });
    await post(`/goals/${goals['Environment Assessed']}/relevant-nords`, { nord_id: envApartment.id });
    await post(`/goals/${goals['Session Complete']}/relevant-nords`, { nord_id: igClosing.id });

    // ── Persona Goal Weights ──
    console.log('   Setting persona goal weights...');
    const allGoalNames = Object.keys(goals);
    const personaGoalWeights = {
      'The Empathic Interviewer': { 'Intake Complete': 100, 'Pet Profile Complete': 80, 'Environment Assessed': 60, 'Wrap-Up': 90, 'Session Complete': 100 },
      'Dr. Patel — Veterinary Expert': { 'Intake Complete': 20, 'Pet Profile Complete': 90, 'Environment Assessed': 40, 'Wrap-Up': 60, 'Session Complete': 40 },
      'Maya — Animal Behaviorist': { 'Intake Complete': 20, 'Pet Profile Complete': 70, 'Environment Assessed': 80, 'Wrap-Up': 50, 'Session Complete': 30 },
      'Sam — Home Environment Specialist': { 'Intake Complete': 20, 'Pet Profile Complete': 50, 'Environment Assessed': 100, 'Wrap-Up': 40, 'Session Complete': 30 },
      'Riley — Consumer Insights Researcher': { 'Intake Complete': 30, 'Pet Profile Complete': 40, 'Environment Assessed': 50, 'Wrap-Up': 100, 'Session Complete': 90 },
    };
    // PP goals get uniform weights per persona
    const ppWeights = {
      'The Empathic Interviewer': 100,
      'Dr. Patel — Veterinary Expert': 70,
      'Maya — Animal Behaviorist': 90,
      'Sam — Home Environment Specialist': 60,
      'Riley — Consumer Insights Researcher': 80,
    };
    for (let i = 1; i <= 4; i++) {
      for (const [pName, w] of Object.entries(ppWeights)) {
        if (!personaGoalWeights[pName]) personaGoalWeights[pName] = {};
        personaGoalWeights[pName][`Pain Point ${i}`] = w;
        personaGoalWeights[pName][`Pain Point ${i} Context`] = w;
      }
    }

    for (const [pName, gw] of Object.entries(personaGoalWeights)) {
      for (const [gName, weight] of Object.entries(gw)) {
        await put(`/goals/${goals[gName]}/persona-weights/${personas[pName]}`, { weight });
      }
    }

    // ═══════════════════════════════════════════════════════
    // 11. PROJECT DEFAULTS
    // ═══════════════════════════════════════════════════════
    console.log('\n11. Setting project defaults...');
    await put(`/projects/${PID}`, {
      default_start_nord_id: igRapport.id,
      default_end_nord_id: igClosing.id,
      default_persona_id: personas['The Empathic Interviewer'],
    });

    // ═══════════════════════════════════════════════════════
    // 12. TEST SCENARIOS (4)
    // ═══════════════════════════════════════════════════════
    console.log('\n12. Creating Test Scenarios...');
    let tc = 0;

    // ── Scenario 1: Margaret — Cooperative elderly cat owner ──
    const margaret = await post(`/projects/${PID}/test-scenarios`, {
      name: 'Margaret — Elderly Maine Coon Cat Owner',
      description: 'Devoted elderly cat owner with a 14-year-old Maine Coon named Winston. Tests full two-phase capture, KB cat content activation, persona switching to Dr. Patel for health, and emotionally sensitive probing.',
      user_objective: `You are Margaret, a 72-year-old retired school teacher who lives alone with your 14-year-old Maine Coon cat named Winston. Winston is the center of your world — you talk to him, cook for him, and worry about him constantly. You have 3 major pain points you want to share:

1. VET COSTS (Financial + Health): Winston has kidney disease (early stage) and needs quarterly bloodwork ($380 each time), special prescription food ($90/month), and sub-Q fluids you give at home ($45/month supplies). You live on a fixed retirement income and the costs terrify you. You had a $2,400 emergency last year when he stopped eating. You delayed going to the vet for 3 days because you were scared of the bill. You feel guilty about that every day.

2. HIDDEN ILLNESS ANXIETY (Emotional + Health): Cats hide pain. You read about it constantly. Winston threw up twice last week and you cannot tell if it is hairballs or something worse. You check on him at night. You once found him hiding under the bed for a full day and rushed to the emergency vet — it was a $900 visit for what turned out to be nothing. You are haunted by the idea of missing something. Your previous cat, Biscuit, died of cancer you did not catch early enough.

3. END-OF-LIFE DREAD (Emotional): Winston is 14. Maine Coons live 12-15 years. You know the time is coming and you cannot think about it without crying. You have not discussed end-of-life care with your vet because you cannot handle the conversation. You do not know what quality of life indicators to watch for. You are terrified of making the wrong decision.

Share these pain points naturally — do NOT dump them all at once. Let the interviewer draw them out. Start with the vet costs since that is top of mind. Get emotional when talking about end-of-life. Mention Biscuit when it feels natural. Use phrases like "my boy", "he is my whole world", "I just do not know what I would do".`,
      user_profile: 'other',
      user_profile_custom: `You are Margaret, 72, a retired elementary school teacher. You speak warmly but with worry in your voice. You use complete sentences but sometimes trail off when emotional ("I just... I do not know"). You call Winston "my boy" or "Winnie" sometimes. You are polite and cooperative but get genuinely emotional — especially about end-of-life topics. You might need a moment to compose yourself. You are not tech-savvy — you would say things like "I read on the internet" not "I found on Reddit." You volunteer extra context when you trust the interviewer. You mention your late cat Biscuit when health topics come up. Keep responses 2-4 sentences — you are a talker but not a rambler.`,
      user_context: {
        name: 'Margaret Chen',
        age: 72,
        email: 'margaret.chen@gmail.com',
        pet_name: 'Winston',
        pet_type: 'Cat',
        breed: 'Maine Coon',
        pet_age: 14,
        living_situation: 'House',
        outdoor_access: 'Small Yard',
        monthly_budget: 250,
        health_conditions: ['Kidney Disease (Early Stage)', 'Dental Problems'],
        pain_points: [
          'Vet costs on fixed income — $380 bloodwork quarterly, $90/mo food, $45/mo fluids, $2400 emergency last year',
          'Hidden illness anxiety — cats mask pain, lost previous cat Biscuit to undetected cancer, checks on Winston obsessively',
          'End-of-life dread — Winston is 14, Maine Coons live 12-15, cannot face the conversation with vet',
        ],
      },
      agent_model: 'gemini-2.5-flash',
      user_model: 'gemini-2.5-flash',
      max_rounds: 30,
      stop_on_goal_id: goals['Session Complete'],
      stop_on_session_end: true,
    });
    console.log(`   ↳ ${margaret.name}`);
    tc++;

    // ── Scenario 2: Jake — Rushed young pit bull owner (behavioral + stigma) ──
    const jake = await post(`/projects/${PID}/test-scenarios`, {
      name: 'Jake — Rushed Pit Bull Owner in Apartment',
      description: 'A 28-year-old tech worker with a 2-year-old pit bull mix in a 600 sq ft apartment. Tests the "rushed" user profile, behavioral pain points (leash reactivity, separation anxiety), environment-behavior connections, and breed stigma. Should trigger Maya (behaviorist) and Sam (environment).',
      user_objective: `You are Jake, a 28-year-old software developer who works hybrid (3 days in-office). You have a 2-year-old pit bull mix named Diesel that you rescued 8 months ago. You love Diesel but you are overwhelmed and texting between meetings. You have 2 main pain points:

1. LEASH REACTIVITY (Behavioral + Social): Diesel goes INSANE when he sees other dogs on walks. Barking, lunging, pulling — you have been pulled to the ground twice. People cross the street when they see you coming. One neighbor called animal control. You have tried a prong collar, a gentle leader, and one group training class ($300) where Diesel could not focus at all. You now walk him at 5:30am and 11pm to avoid other dogs. You are exhausted and embarrassed. You worry someone will report him as aggressive and your landlord will make you give him up. Your lease says "no aggressive breeds" but the rescue listed him as a "terrier mix."

2. APARTMENT DESTRUCTION (Environmental + Financial): When you go to the office, Diesel destroys things. He has eaten through a couch cushion ($400 to replace), chewed the door frame ($800 security deposit risk), and shredded two pairs of shoes. You tried crate training but he bent the wire crate trying to escape and cut his gums. You now pay $45/day for doggy daycare on office days ($540/month) which is crushing your budget. Your landlord has given you a written warning.

You are in a rush. Keep answers SHORT — 1-2 sentences max. Use casual language. Say things like "yeah so basically..." and "can we speed this up?" Share the pain points when asked but do not elaborate unless really pressed. You are stressed but you love Diesel and would never give him up.`,
      user_profile: 'rushed',
      user_context: {
        name: 'Jake Morrison',
        age: 28,
        email: 'jake.morrison@gmail.com',
        phone: '555-0142',
        pet_name: 'Diesel',
        pet_type: 'Dog',
        breed: 'Pit Bull Mix (listed as Terrier Mix)',
        pet_age: 2,
        living_situation: 'Apartment',
        outdoor_access: 'None',
        monthly_budget: 800,
        health_conditions: ['Anxiety'],
        pain_points: [
          'Leash reactivity — lunging, barking at dogs, pulled to ground, neighbor called animal control, walks at 5:30am/11pm to avoid dogs',
          'Apartment destruction — ate couch, chewed door frame, bent crate, $540/mo daycare, landlord warning, security deposit at risk',
        ],
      },
      agent_model: 'gemini-2.5-flash',
      user_model: 'gemini-2.5-flash',
      max_rounds: 25,
      stop_on_goal_id: goals['Session Complete'],
      stop_on_session_end: true,
    });
    console.log(`   ↳ ${jake.name}`);
    tc++;

    // ── Scenario 3: Linda — Reluctant exotic pet owner (bird) ──
    const linda = await post(`/projects/${PID}/test-scenarios`, {
      name: 'Linda — Reluctant Parrot Owner',
      description: 'A 45-year-old accountant who inherited an African Grey parrot. Tests the "reluctant" user profile, exotic/bird edge case, and whether the AI can draw out pain points from a quiet person. Should test patience, echo probing, and the Expert Knowledge gap (no specific bird knowledge node).',
      user_objective: `You are Linda, a 45-year-old accountant. You inherited a 22-year-old African Grey parrot named Professor when your mother passed away 2 years ago. You did not choose to own a parrot — your mother loved him and you could not bear to rehome him. But honestly, you are struggling. You have 2 pain points but you are not great at talking about feelings:

1. NOISE (Environmental + Emotional): Professor screams. Loudly. Especially in the morning from 6-8am and again at sunset. Your neighbors have complained. You work from home and cannot take client calls when he is screaming. You have tried covering his cage (he screams more), moving him to another room (he screams MORE), and playing music (brief help). You read online that African Greys need 4+ hours of interaction per day. You feel guilty because you are working and cannot give him that. Your mother used to talk to him all day. You feel like you are failing your mother's memory.

2. SPECIALIZED VET ACCESS (Health + Financial): The nearest avian vet is 90 minutes away. Professor needs annual bloodwork and nail/beak trims that only an avian vet can do. Each visit is a full-day ordeal — drive, appointment, drive back — and costs $350-$500. Professor is stressed by the car ride and once bit your hand badly enough to need stitches. You are terrified of transporting him. You have skipped his last annual checkup because of this.

You are NOT a talker. Give short answers. Say "I think so" and "I am not sure" a lot. Do not volunteer information — make the interviewer work for it. But if they ask a really good question, you will open up a little. You feel guilt about Professor constantly. You did not ask for this.`,
      user_profile: 'reluctant',
      user_context: {
        name: 'Linda Kowalski',
        age: 45,
        email: 'linda.kowalski@outlook.com',
        pet_name: 'Professor',
        pet_type: 'Bird',
        breed: 'African Grey Parrot',
        pet_age: 22,
        living_situation: 'Condo',
        outdoor_access: 'Balcony Only',
        monthly_budget: 120,
        health_conditions: ['None Known'],
        pain_points: [
          'Screaming/noise — 6-8am and sunset, neighbors complaining, cannot take work calls, feels guilty about lack of interaction vs mother',
          'Avian vet access — 90 min away, $350-500/visit, Professor bites during transport, skipped last annual checkup',
        ],
      },
      agent_model: 'gemini-2.5-flash',
      user_model: 'gemini-2.5-flash',
      max_rounds: 25,
      stop_on_goal_id: goals['Session Complete'],
      stop_on_session_end: true,
    });
    console.log(`   ↳ ${linda.name}`);
    tc++;

    // ── Scenario 4: Marcus — Adversarial skeptic with senior lab ──
    const marcus = await post(`/projects/${PID}/test-scenarios`, {
      name: 'Marcus — Skeptical Senior Lab Owner',
      description: 'A 55-year-old contractor with a 12-year-old yellow Lab. Tests the "adversarial" profile — challenges assumptions, pushes back on questions, changes his mind. Tests whether the AI maintains composure, earns trust through competence, and still collects data. Should trigger Dr. Patel (health) and Riley (financial skepticism).',
      user_objective: `You are Marcus, a 55-year-old general contractor. You have a 12-year-old yellow Labrador named Duke. You are skeptical of this interview and are not sure why you agreed to do it. You think most pet products are scams and most advice is generic. You have 2 pain points but you will not hand them over easily:

1. MOBILITY/JOINT PAIN (Health): Duke can barely get up the stairs anymore. His back legs slip on hardwood floors. You have tried glucosamine supplements ($40/month for 2 years — "probably snake oil"), Adequan injections ($85/month — "the only thing that actually helps"), and an orthopedic bed ($200 — "he still sleeps on the floor"). Your vet recommended a $4,500 TPLO surgery for his left knee. You do not trust that it is necessary — "vets are always upselling." But watching Duke struggle hurts you more than you will ever admit. You built him a ramp for the back porch yourself.

2. DIETARY CONFUSION (Health + Financial): Duke's vet wants him on a prescription joint diet ($95/month). But you read online that grain-free is better. Then you read grain-free causes heart problems. Now you do not know WHAT to feed him. You have switched foods 4 times in the last year and Duke has had diarrhea twice. You are spending $130/month on food because you are buying the expensive stuff "just in case." You think the pet food industry is a racket. Your previous dog, Buddy, ate Purina his whole life and lived to 15.

You are NOT hostile — just skeptical and blunt. You test people. If the AI says something smart, you will respect it. If it says something generic, you will call it out: "Yeah, every website says that." You use phrases like "look," "here is the thing," "I have been around the block." You do NOT like being patronized. You will share real emotions about Duke if the interviewer earns it — but they have to earn it.`,
      user_profile: 'adversarial',
      user_context: {
        name: 'Marcus Williams',
        age: 55,
        email: 'marcus.w.contractor@gmail.com',
        phone: '555-0298',
        pet_name: 'Duke',
        pet_type: 'Dog',
        breed: 'Yellow Labrador Retriever',
        pet_age: 12,
        living_situation: 'House',
        outdoor_access: 'Large Yard',
        monthly_budget: 300,
        health_conditions: ['Joint Issues', 'Obesity', 'Dental Problems'],
        pain_points: [
          'Mobility/joint pain — can not do stairs, Adequan $85/mo, vet recommending $4500 TPLO, skeptical of necessity, built a ramp himself',
          'Dietary confusion — prescription diet vs grain-free vs regular, switched 4 times, diarrhea twice, $130/mo on food, thinks pet food industry is a racket',
        ],
      },
      agent_model: 'gemini-2.5-flash',
      user_model: 'gemini-2.5-flash',
      max_rounds: 28,
      stop_on_goal_id: goals['Session Complete'],
      stop_on_session_end: true,
    });
    console.log(`   ↳ ${marcus.name}`);
    tc++;

    // ═══════════════════════════════════════════════════════
    // DONE
    // ═══════════════════════════════════════════════════════
    const totalGoals = Object.keys(goals).length;
    const totalEdges = linearEdges.length + 4 + 1;
    console.log(`
╔══════════════════════════════════════════════════════════════════════╗
║  🐾  Pet Owner Pain Point Discovery — SEEDED!                      ║
╠══════════════════════════════════════════════════════════════════════╣
║  Project ID:  ${PID}                           ║
║  NordTypes:   7     ConnectionTypes: 7                              ║
║  Personas:    5     Goals (DAG):     ${String(totalGoals).padEnd(2)}                             ║
║  Nords:       ${String(nc).padEnd(4)}  Connections:     ${String(cc).padEnd(4)}                           ║
║  Variables:   ${String(vc).padEnd(4)}  Groups:          ${String(Object.keys(groups).length).padEnd(2)}                             ║
║  Goal Edges:  ${totalEdges}    (${linearEdges.length} linear + 4 shortcuts + 1 final)              ║
║  Test Scenarios: ${tc}  (Margaret, Jake, Linda, Marcus)                ║
║                                                                      ║
║  TWO-PHASE PAIN POINT CAPTURE:                                      ║
║  Intake → Pet → Env → PP1 → PP1 Ctx → PP2 → PP2 Ctx → ...         ║
║                         ↘     ↘        ↘      ↘                     ║
║                          Wrap-Up (gate: ANY) → Session Complete      ║
║                                                                      ║
║  Each PP: name (required) → context 1-4 (organic) + probed (gate)   ║
║  Graph is READ-ONLY. All data → session variables.                  ║
╚══════════════════════════════════════════════════════════════════════╝`);

  } catch (err) {
    console.error('\n❌ Seeding failed:');
    console.error(err);
    process.exit(1);
  }
}

seed();
