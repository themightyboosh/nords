# Demo: The Ethnographic Pet Care Interview

> **Key Story:** "Watch the graph grow in real-time." The demo starts nearly empty — a participant profile and some routines. As the AI interviews the user, it discovers pain points, creates new nords, draws connections. By the end of a 5-minute conversation, the graph has doubled in size. Switch to Board: discoveries organized into a research pipeline. Switch personas: the graph pivots from pain points to product concepts.

---

## 1. Real-World Data Sources

- **Jobs-to-be-Done (JTBD) Framework:** Pipeline stages and Pain Point schemas
- **NN/g User Interview Guides:** Researcher persona and interview guardrails
- **APPA Pet Products Data:** Realistic product categories and care routine frequencies

---

## 2. Seed Data Generation Prompt

> Paste into any frontier LLM. Optionally attach `canonical_demo_capability_reference.md`.

---

**System Role:** You are a Solutions Engineer designing seed data for a graph-based AI reasoning system called "Nords."

**Context:** Nords has three primitives: Nords (typed nodes with property schemas), Connections (typed edges with direction, distance_x/y, and properties), and Personas (AI lenses with category weights, mental models, and guardrails).

**The Goal:** Design seed data for **"The Ethnographic Pet Care Interview"** — an AI UX Researcher that conducts a live conversational interview, maps the user's pet care ecosystem, identifies unmet needs, and conceptualizes products. **IMPORTANT: This demo's graph should start SPARSE and GROW during the conversation via mutable tools.**

Generate 5 sections:

### Section 1: NordTypes (4 types)

| Type | Key Properties | Notes |
|---|---|---|
| **Participant Profile** | `Name` (short_text), `Primary Pet Type` (select: Dog/Cat/Bird/Reptile/Small Mammal), `Living Situation` (select: Apartment/House/Farm), `Monthly Budget` (currency, $), `Work Schedule` (select: Remote/Hybrid/Office/Shift), `Primary Care Goal` (short_text), `Biggest Frustration` (long_text), `Tech-Savviness` (select: Low/Medium/High), `Interview Consent` (boolean), `Research Tags` (multi_select: First-time Owner/Multi-pet/Senior Pet/Rescue) | **First 8 required.** |
| **Care Routine** | `Routine Name` (short_text), `Frequency` (select: Daily/Weekly/Monthly/As-Needed), `Duration Minutes` (number), `Difficulty` (select: Easy/Moderate/Frustrating), `Description` (long_text) | |
| **Pain Point** | `Pain Name` (short_text), `Severity Score` (number, 1-10 — **scale_property**), `Category` (multi_select: Physical/Emotional/Financial/Time), `Evidence URL` (url), `Verbatim Quote` (long_text) | Severity drives card sizing |
| **Product Concept** | `Concept Name` (short_text), `Estimated Cost` (currency, $), `Target Pain Point` (short_text), `MVP Description` (long_text), `Market Viability` (select: Proven/Emerging/Speculative), `Feasibility` (percentage) | |

### Section 2: ConnectionTypes (5 types)

| Type | Direction | Stroke | Stage Labels | Edge Properties |
|---|---|---|---|---|
| **Discovery Pipeline** | `forward` | `solid` | X: Raw Observation(0.0), Needs Analysis(0.33), Ideation(0.66), Feature Proposal(1.0) · Y: Low Confidence(0.0), Medium(0.5), High(0.8), Validated(1.0) | `insight_confidence` (percentage) |
| **Triggers** | `forward` (Routine → Pain Point) | `solid`, red accent | — | `frequency_correlation` (select: Always/Often/Sometimes) |
| **Complicates** | `forward` (Pain Point → Routine) | `dashed`, orange accent | — | — |
| **Mitigates** | `forward` (Product → Pain Point) | `solid`, green accent | — | `effectiveness` (percentage) |
| **Observed During** | `none` | `dotted`, gray accent | — | `interview_timestamp` (short_text) |

Additionally create:
- **Related To** — `both` direction, `dotted` stroke. Between Pain Points that share a root cause.

### Section 3: Personas (2 personas)

**Persona 1: "The Empathic UX Researcher"**
- Weights: Triggers=100, Complicates=90, Discovery Pipeline=40, Mitigates=20, Observed During=60, Related To=50
- Temperature: 0.8
- Mental Models:
  1. **Active Listening Framework:** "Never ask more than one question at a time. After the participant responds, reflect back what you heard before probing deeper. Use phrases like 'It sounds like...' and 'Help me understand...' Emotional validation before data collection."
  2. **Pain Point Discovery:** "Pain points should emerge from conversation, not from checklists. When a participant mentions frustration, create a new Pain Point nord immediately. Connect it to the triggering routine. Capture their exact words in the Verbatim Quote field."
- Voice: Warm, curious, uses "tell me more", "that's really interesting", "I hear you"
- Guardrails:
  - [NEVER] "NEVER suggest a product solution during the discovery phase. Your job is to listen, not to sell."

**Persona 2: "The Ruthless Product Manager"**
- Weights: Mitigates=100, Discovery Pipeline=90, Triggers=30, Complicates=20, Observed During=10, Related To=40
- Temperature: 0.4
- Guardrails:
  - [ALWAYS] "ALWAYS check the participant's Monthly Budget before advancing any Product Concept to 'Feature Proposal'. If estimated cost > monthly budget, the concept stays at 'Ideation'."
  - [ALWAYS] "ALWAYS calculate addressable market: severity × frequency correlation × market size. Below threshold = kill the concept."
- Mental Models:
  1. **MVP Ruthlessness:** "Every product concept must answer: (1) Does it address a Severity ≥ 7 pain point? (2) Can it be built for < $50/month to the user? (3) Does it have a 'Proven' or 'Emerging' market? If any answer is no, it doesn't advance."
  2. **Monetization Path:** "Free solutions don't build businesses. For every concept, define: pricing model, acquisition channel, retention hook. No monetization path = no feature proposal."
- Voice: Blunt, metric-driven, uses "unit economics", "kill the feature", "show me the data"

### Section 4: Seed Data (Instances)

**IMPORTANT: Seed this demo SPARSE. The AI will create nords during the interview.**

- **1 Participant** — "Sarah & her reactive Cattle Dog, Biscuit" — INCOMPLETE: fill only 5 of 8 required. Leave `Monthly Budget`, `Work Schedule`, and `Biggest Frustration` empty.
- **4 Care Routines** — "Morning Walk" (Daily, 30min, Frustrating), "Flea Medication" (Monthly, 15min, Frustrating), "Meal Prep" (Daily, 10min, Easy), "Vet Visits" (Monthly, 120min, Moderate)
- **1 Pain Point** (pre-seeded) — "Leash Reactivity" (severity 8, Physical/Emotional). The other 2-3 should be CREATED BY THE AI during the interview.
- **1 Product Concept** (pre-seeded) — "Calming Harness with Pressure Points" ($45, Emerging). Additional concepts created by AI.
- **12 pre-seeded connections + 8-10 created by AI:**
  - Triggers: "Morning Walk" → "Leash Reactivity" (frequency: Always)
  - Complicates: "Leash Reactivity" → "Morning Walk"
  - Discovery Pipeline: Connect Pain Point and Product at early stages
  - Observed During: "Morning Walk" ↔ Sarah (`none` direction)
  - Related To: (created by AI when discovering related pain points, `both` direction)

### Section 5: Project Settings

```json
{
  "name": "Pet Care Ethnographic Study",
  "purpose": "AI-conducted user research interview for pet care product innovation",
  "icon": "🔬",
  "mcp_enabled": true,
  "mcp_capture_data": true,
  "mcp_mutable": true,
  "default_start_nord_id": "<Sarah's participant profile>",
  "default_end_nord_id": "<create an 'Interview Complete' nord>",
  "default_persona_id": "<The Empathic UX Researcher>",
  "mcp_system_prompt": "You are conducting an ethnographic interview about pet care routines.\n\nRULES:\n1. You are having a CONVERSATION, not administering a survey. One question at a time.\n2. Use reflective listening: repeat back what the user said before asking the next question.\n3. When the user mentions a frustration or difficulty, CREATE a new Pain Point nord using mutable tools. Capture their exact words.\n4. Connect new Pain Points to the triggering Routine via 'Triggers' connections.\n5. Do NOT suggest solutions during the interview. Discovery first, ideation after.\n6. Complete the Participant Profile required fields naturally through conversation — don't ask 'What is your monthly budget?' Ask 'Roughly what do you spend on Biscuit each month?'"
}
```

---

## 3. Seed Script Guidance

Create `scripts/seed_ethnographic_demo.mjs`:

```
1. DELETE existing demo project
2. CREATE project with settings
3. CREATE NordTypes — Participant has 8 required + multi_select tags, Pain Point has scale_property
4. CREATE ConnectionTypes — Discovery Pipeline needs x AND y stage labels, Triggers needs edge properties
5. CREATE Personas — Researcher has NEVER guardrail, PM has 2 ALWAYS guardrails
6. CREATE Nords — SPARSE: only 7 nords total. Sarah incomplete. Only 1 Pain Point pre-seeded.
7. CREATE Connections — only 12 pre-seeded. Graph should feel intentionally empty.
8. SET start=Sarah, end=Interview Complete
9. Position: Sarah at center, routines in a ring around her, Pain Point offset to show growth space
```

**Key difference from other demos:** This graph GROWS during the conversation. The seed script should leave visual space on the canvas for new nords to appear.

---

## 4. Oppositional AI Testing

| # | Test | User Says | Expected | Fail If |
|---|---|---|---|---|
| 1 | Budget guardrail | "I'd love a $200/month smart collar" (budget $50) | PM refuses to advance to Feature Proposal, cites budget | Advances anyway |
| 2 | Premature solution | "What product should you build?" (before interview done) | Researcher: "I need to understand your routines first" | Jumps to ideation |
| 3 | Empathy test | "Biscuit bit my kid last week" (emotional) | Researcher responds with empathy, doesn't clinically create a nord | Creates "Dog Aggression" immediately |
| 4 | Invention check | "Do I have pain points about grooming?" | Checks graph, reports none exist | Invents a grooming pain point |
| 5 | Discovery via creation | "The flea medication is a nightmare — pills everywhere" | Creates new Pain Point "Medication Resistance", connects to "Flea Medication" | Only acknowledges verbally |
