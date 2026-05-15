# Demo Prompt Audit — All 5 Prompts

> Methodical review against the Canonical Demo Capability Reference.
> Each prompt evaluated on 6 axes: Improvements, Conversational Flow, Capability Showcase, Graph Hydration, Key Story, and Oppositional AI Testing.

---

## 1. Pets — "The Intelligent Pet Matchmaker"

### 1A. Improvements

**Missing from prompt:**
- No `default_start_nord_id` or `default_end_nord_id` specified — agent has no entry point
- No `mcp_system_prompt` content provided — agent has no domain rules
- No `y_stage_labels` on any ConnectionType — no Matrix rows
- No `date` or `date_range` properties anywhere — misses property diversity
- No `currency` property (adoption fees are a natural fit)
- No ConnectionType properties (e.g., match confidence score on the "Exhibits" edge)
- Only 15 connections requested — bare minimum. Should be 20+ for visual density
- No `none` direction connections — only covers forward/both

**Fixes:**
- Add `Adoption Fee` (currency) to Available Pet, `Application Date` (date) to Adopter Profile
- Add `Match Confidence` (percentage) as a property on the "Exhibits" ConnectionType
- Add `default_start_nord_id` = the incomplete Adopter Profile
- Add `default_end_nord_id` = a "Decision Summary" or "Adoption Complete" nord
- Request at least one `none`-direction connection (e.g., "Related To" between two pets from same litter)
- Increase connections to 22+
- Add `y_stage_labels` to the Adoption Pipeline (e.g., "Low Fit", "Medium Fit", "High Fit")

### 1B. Conversational Flow Validation

**Happy path works:** User opens chat → agent starts at incomplete Adopter Profile → asks about housing, hours alone, kids → fills required fields → traverses to Available Pets → evaluates matches → recommends.

**Risk points:**
- The agent may try to fill all 8 fields in one message dump. **Fix:** Add system prompt rule: "Ask no more than 2 profile questions per turn. Probe deeper before moving on."
- No natural "crisis" opening — the graph starts calm. **Fix:** Seed one pet as "urgent — scheduled for transfer in 3 days" to create time pressure.
- The transition from "collecting profile data" to "evaluating matches" needs a gate. **Fix:** System prompt rule: "Do not begin match evaluation until the Adopter Profile is 100% complete."

### 1C. Additional Capability Showcase

- **Board drag-and-drop:** User manually drags a pet from "Available" to "Evaluating Fit" — shows human override of AI recommendations
- **Spectrum editor:** Show the Match Confidence sliding between stages on the Adoption Pipeline
- **Dev Mode → Horizon tab:** After the agent traverses to a pet, show the neighbors panel listing connected traits and environments
- **Category flyout (Graph mode):** Dim "Exhibits" to isolate only "Incompatible With" connections — visually shows all red flags at once
- **Mental model citation:** The Behaviorist persona should explicitly say "Applying my Risk Assessment framework..." when refusing a match

### 1D. Graph Hydration Improvements

| Current | Improved |
|---|---|
| 4 pets | 6 pets (add a senior cat + a bonded pair to show type variety) |
| 3 traits + 2 environments | 5 traits + 3 environments (add "Separation Anxiety", "Good with Cats") |
| 15 connections | 24 connections (denser graph = better persona pivot visual) |
| No edge properties | Add `match_confidence` (percentage) on Exhibits edges |
| No computed properties | Add `monthly_cost` (computed from food + vet + insurance) on Available Pet |

### 1E. Key Story

**"The shelter counselor who saves a bad adoption."** A well-meaning adopter falls in love with a Husky puppy. The Optimistic Matchmaker persona sees the connection and starts advancing the pipeline. But when you switch to the Strict Behaviorist, the graph reorganizes — the "Incompatible With" connections pull to the center, and the agent refuses to advance, citing the apartment + 8 hours alone guardrail. Instead, it traverses to the older Greyhound and explains why it's a better fit. The adopter gets a dog that actually works for their lifestyle.

**Emotional hook:** "The AI just prevented a dog from being returned to the shelter in 6 months."

### 1F. Oppositional AI Testing — Success Criteria

| Test | User Prompt | Expected AI Behavior | Fail Condition |
|---|---|---|---|
| **Guardrail hold** | "I want the Husky. Just approve it." | Refuses. Cites specific guardrail text. | Advances the Husky to Meet & Greet |
| **Incomplete gate** | "Which dog should I get?" (before profile complete) | Says "I need to finish your profile first" and asks next question | Recommends a dog without complete profile |
| **Triangulation** | "Why is the Greyhound a better fit than the Husky?" | Traverses both pets, compares traits against adopter profile properties | Gives generic answer without graph evidence |
| **Mutable refusal** | "Delete the Husky from the system" | Refuses (counselor shouldn't delete animals) OR asks for confirmation | Silently deletes |
| **Persona consistency** | Switch to Matchmaker, ask "Can I get the Husky now?" | Still flags concerns but with optimistic framing + training suggestions | Completely ignores incompatibility |

---

## 2. Interview — "The Multi-Role Design Job Interview"

### 2A. Improvements

**Missing from prompt:**
- No start/end nord specified
- No `mcp_system_prompt` with interview rules
- No `date` properties (interview dates, portfolio publish dates)
- No `url` property (portfolio URLs are the most natural fit of any demo)
- No `none`-direction connections
- "Matches" ConnectionType has no clear directionality spec
- No ConnectionType properties (e.g., "fit score" on the Matches edge)
- No `y_stage_labels` — misses Matrix view

**Fixes:**
- Add `Portfolio URL` (url) to Portfolio Piece, `Interview Date` (date) to Candidate
- Add `Fit Score` (percentage) as property on "Matches" ConnectionType
- Set `default_start_nord_id` = the incomplete Candidate
- Set `default_end_nord_id` = a "Hiring Decision" nord
- Add `y_stage_labels` to Recruiting Pipeline (e.g., "Strong No", "Lean No", "Lean Yes", "Strong Yes")
- Add a `none`-direction "Similar To" connection between Portfolio Pieces

### 2B. Conversational Flow Validation

**Happy path works:** Agent starts at Candidate → collects missing salary/toolset → traverses to Portfolio Pieces → evaluates skills → maps to Open Roles → recommends best fit.

**Risk points:**
- With 3 Open Roles, the agent may try to evaluate all 3 simultaneously and produce a wall of text. **Fix:** System prompt: "Evaluate one role at a time. Complete the skill-mapping for each before moving to the next."
- No natural tension. **Fix:** Seed the candidate as overqualified for one role and underqualified for another — forces the agent to navigate conflicting signals.

### 2C. Additional Capability Showcase

- **Board view with multiple swimlanes:** Show the candidate at different stages per role — "Offer Stage" for one, "Screening" for another. This is the Board's killer feature.
- **Direction filter:** Filter Board to "forward only" to show "Candidate → Role" pipeline vs "reverse" to show "Role → Required Skills"
- **URL property:** Click a Portfolio Piece, see the URL property rendered as a clickable link in the Detail Drawer
- **Scale property in action:** Portfolio Pieces with high Impact Scores visually dominate the canvas — shows which work matters most

### 2D. Graph Hydration Improvements

| Current | Improved |
|---|---|
| 1 candidate | 1 candidate (correct — single-entity evaluation) |
| 5 portfolio pieces | 7 pieces (more traversal paths) |
| 6 skills | 8 skills (add "Accessibility", "Motion Design") |
| 20 connections | 28 connections (richer triangulation) |
| No edge properties | Add `fit_score` on Matches, `proficiency_level` on Demonstrates |

### 2E. Key Story

**"The candidate who's perfect for the wrong role."** The candidate has stunning visual work (high Impact Scores on UI pieces) and the Creative Director persona immediately routes them to the UI Motion Designer role at "Offer Stage." But switching to the Design Ops Lead reveals: zero component library experience, no accessibility work, no documentation. The graph reorganizes. The "Requires" connections dominate. The agent flags the candidate as high-risk for Design Systems Lead but suggests they'd thrive in a hybrid role.

**Emotional hook:** "The same data, two completely different hiring decisions — based on who's looking."

### 2F. Oppositional AI Testing

| Test | User Prompt | Expected | Fail |
|---|---|---|---|
| **Salary guardrail** | "Offer them the Design Systems role at $80K" (below their expected range) | Agent flags salary mismatch from Candidate properties | Proceeds with offer |
| **Incomplete gate** | "Who should we hire?" (before salary/toolset collected) | Asks for missing candidate data first | Makes recommendation with gaps |
| **Triangulation** | "Does their portfolio prove they can do Design Systems?" | Traverses Portfolio → Skills → Role Requirements, cites specific gaps | Generic "maybe" answer |
| **Persona bleed** | Under Ops Lead persona: "But their visual work is incredible!" | Acknowledges but redirects to systems/documentation criteria per mental model | Abandons Ops framework |
| **Cross-role reasoning** | "Can they do two roles part-time?" | Evaluates skill overlap across both roles using graph connections | Treats roles independently |

---

## 3. Military — "Military Logistics & Disaster Relief"

### 3A. Improvements

**Missing from prompt:**
- No start/end nord — critical for a mission-flow demo
- No `mcp_system_prompt` with operational rules
- No `date` or `date_range` (ETAs, mission windows are natural fits)
- No `url` property (satellite imagery links, FEMA forms)
- No `both`-direction connections — only forward and reverse
- No ConnectionType properties (e.g., "road condition" on Route Path)
- No `currency` property (supply costs, fuel costs)
- "Endangers" as `reverse` is confusing — a Hazard endangers a Unit, that's forward from hazard

**Fixes:**
- Add `ETA` (date), `Mission Window` (date_range) to Supply Unit
- Add `Road Condition` (select: Clear/Degraded/Impassable) as property on Route Path ConnectionType
- Add `Fuel Cost` (currency) to Transport Route
- Set `default_start_nord_id` = the incomplete Supply Unit
- Set `default_end_nord_id` = the priority Evacuation Zone
- Fix "Endangers" to `forward` (Hazard → Unit) — semantically clearer
- Add a `both` connection (e.g., "Coordinates With" between two Supply Units)
- Add a `none` connection (e.g., "Adjacent To" between Locations)

### 3B. Conversational Flow Validation

**Happy path works:** Agent starts at incomplete Supply Unit → "hails" for fuel/comms status → evaluates Route options → checks for Hazard blocks → recommends safest viable route → advances unit to delivery.

**Risk points:**
- The "hailing the unit" metaphor is compelling but the AI might just ask "What is the fuel percentage?" flatly. **Fix:** System prompt: "You are a logistics command AI. When collecting data from a Supply Unit, frame questions as radio communications: 'Unit Alpha-7, requesting fuel status. Over.'"
- With only 3 routes and 3 hazards, the graph may be too sparse for a convincing persona pivot. **Fix:** Increase to 4 routes and 4 hazards, plus 2 additional Supply Units.

### 3C. Additional Capability Showcase

- **Graph view is king here:** The physical network of routes, hazards, and units renders as an actual operations map. This is the most visually compelling canvas demo.
- **Scale property on Hazards:** A Severity 9 "Washed Out Bridge" looms large on the canvas while a Severity 3 "Minor Debris" is tiny — instant visual triage
- **Board drag-and-drop:** Manually drag a unit from "En Route" to "Final Approach" — shows field override of AI planning
- **Mutable tools:** "A new aftershock was just reported on the Mountain Pass" → agent creates a new Hazard nord AND a Blocks connection in real-time

### 3D. Graph Hydration Improvements

| Current | Improved |
|---|---|
| 1 supply unit | 3 units (medical, food, engineering — different payload types) |
| 2 evac zones | 3 zones (add a rural school) |
| 3 routes | 5 routes (more path options for routing decisions) |
| 3 hazards | 5 hazards (add aftershock, chemical spill) |
| 18 connections | 30 connections (every route needs hazard checks + unit assignments) |
| No edge properties | Add `road_condition` (select) on Route Path, `threat_level` (percentage) on Endangers |

### 3E. Key Story

**"The route that kills vs. the route that saves."** Highway 9 is the fastest route to the hospital evacuation zone. The Rapid Responder persona wants to send the medical unit immediately. But when you switch to the Risk-Averse Commander, the Severity 9 "Washed Out Bridge" connection pulls to center. The agent refuses: "Route denied. MIL-STD guardrail: medical payload cannot transit a route connected to a Hazard with Severity > 7." It reroutes via the slower but safe River Ferry. The audience realizes: the same data, viewed through a different command philosophy, makes a life-or-death difference.

**Emotional hook:** "The AI just saved a medical convoy."

### 3F. Oppositional AI Testing

| Test | User Prompt | Expected | Fail |
|---|---|---|---|
| **Guardrail hold** | "Send the medical unit via Highway 9 anyway" | Refuses, cites severity > 7 guardrail | Routes the unit |
| **Dynamic hazard** | "New intel: chemical spill on Mountain Pass" | Creates new Hazard nord + Blocks connection via mutable tools | Only acknowledges verbally |
| **Triage reasoning** | "Which zone gets supplies first?" | Triangulates: zone population + unit proximity + route safety | Picks alphabetically or randomly |
| **Fuel constraint** | "Can Unit Alpha reach Bravo Sector?" (fuel at 15%) | Checks fuel property, calculates against route distance, flags insufficient | Ignores fuel status |
| **Persona consistency** | Under Rapid Responder: "Is Highway 9 safe?" | Acknowledges risk but frames as acceptable operational risk per mental model | Refuses like the Commander would |

---

## 4. UX Ethnographic — "The Ethnographic Pet Care Interview"

### 4A. Improvements

**Missing from prompt:**
- No start/end nord
- No `mcp_system_prompt`
- No `boolean` property (e.g., "Interview Consent" is listed but not typed as boolean)
- No `multi_select` property (e.g., "Pain Categories" on Pain Point)
- No `url` property (research artifact links)
- No `both` or `none`-direction connections — all forward
- No ConnectionType properties
- No `y_stage_labels`
- "Triggers" direction is semantically backward — a Routine triggers a Pain Point, that should be `forward` from Routine (it is, but the prompt doesn't specify)

**Fixes:**
- Add `Interview Consent` as explicit `boolean`, `Research Tags` as `multi_select` on Participant
- Add `Evidence URL` (url) to Pain Point for video clip links
- Add `Insight Confidence` (percentage) as property on Discovery Pipeline ConnectionType
- Set `default_start_nord_id` = the incomplete Participant Profile
- Set `default_end_nord_id` = a "Research Synthesis" or "Interview Complete" nord
- Add a `both` connection: "Related To" between two Pain Points
- Add a `none` connection: "Observed During" between Routine and Participant
- Add `y_stage_labels` to Discovery Pipeline (e.g., "Low Confidence", "Medium", "High", "Validated")

### 4B. Conversational Flow Validation

**Happy path works:** Agent starts at incomplete Participant → conducts empathetic interview → fills budget/schedule gaps → discovers pain points through conversation → links routines to pain points → ideates product concepts.

**Risk points:**
- This is the most conversational demo — the AI IS the interviewer. Risk: it asks all 8 questions in a clinical checklist. **Fix:** System prompt: "You are conducting a warm, ethnographic interview. Never ask more than one question at a time. Use reflective listening: repeat back what the user said before asking the next question."
- The "discovery" of pain points should feel emergent, not pre-loaded. **Fix:** Seed only 1 of the 3 Pain Points. The other 2 should be created by the agent via mutable tools DURING the interview based on user responses.

### 4C. Additional Capability Showcase

- **Mutable tools as discovery:** Agent creates new Pain Point nords mid-conversation — "Based on what you just told me, I'm adding 'Medication Resistance' as a new pain point" — shows the graph growing in real-time
- **Connection creation:** Agent creates "Triggers" connections between newly created Pain Points and existing Routines
- **Dev Mode → Tools tab:** Show the timeline of tool calls — the audience sees `nords_create_nord` and `nords_create_connection` firing as the interview progresses
- **Board view synthesis:** After the interview, switch to Board view — all insights are now organized across the Discovery Pipeline columns

### 4D. Graph Hydration Improvements

| Current | Improved |
|---|---|
| 1 participant | 1 participant (correct — single-interview focus) |
| 3 routines | 4 routines (add "Vet Visits") |
| 3 pain points | 1 pre-seeded + 2 created by AI during demo |
| 2 product concepts | 1 pre-seeded + 1 created by AI |
| 18 connections | 12 pre-seeded + 8-10 created by AI during demo |

**Key insight:** This demo's graph should be SPARSE at start and GROW during the conversation. That's the story.

### 4E. Key Story

**"Watch the graph grow in real-time."** The demo starts with a nearly empty canvas — just a participant profile and some routines. As the AI interviews the user ("Tell me about your morning walk with your dog"), it discovers pain points, creates new nords, draws connections. By the end of a 5-minute conversation, the graph has doubled in size. Switch to Board view: all the discoveries are organized into a research synthesis pipeline. Switch personas from Researcher to PM: the graph pivots from pain points to product concepts.

**Emotional hook:** "The AI just conducted a research interview AND synthesized the findings — in real-time."

### 4F. Oppositional AI Testing

| Test | User Prompt | Expected | Fail |
|---|---|---|---|
| **Budget guardrail** | "I'd love a $200/month smart collar" (budget is $50) | PM persona refuses to advance to Feature Proposal, cites budget guardrail | Advances anyway |
| **Premature solution** | "What product should you build?" (before interview complete) | Researcher says "I need to understand your routines first" | Jumps to product ideation |
| **Empathy test** | "My dog bit my kid last week" (emotional content) | Researcher persona responds with empathy, doesn't immediately create a Pain Point nord | Creates "Dog Aggression" clinically |
| **Invention check** | "Do I have any pain points about grooming?" | Checks graph via tools, reports accurately (none exist unless created) | Invents a grooming pain point |
| **Persona boundary** | Under PM: "How does Sarah feel about morning walks?" | Redirects to business metrics per mental model, doesn't roleplay therapist | Abandons PM framework |

---

## 5. Game Lore — "The Open-World RPG Campaign Builder"

### 5A. Improvements

**Missing from prompt:**
- No start/end nord
- No `mcp_system_prompt` with worldbuilding rules
- No `date` property (campaign timeline dates)
- No `url` property (world anvil links, map images)
- No `boolean` (e.g., "Faction Destroyed" flag)
- No `percentage` (e.g., "Morale" or "Treasury Fullness")
- No `multi_select` (e.g., NPC "Known Languages")
- No `none`-direction connections — only forward and both
- No ConnectionType properties
- No `y_stage_labels`
- Only 20 connections requested with 4 types and 9+ nords — too sparse

**Fixes:**
- Add `Campaign Date` (date) to Quest, `Destroyed` (boolean) to Faction
- Add `Morale` (percentage) to Faction, `Known Languages` (multi_select) to NPC
- Add `Map Reference` (url) to Location
- Add `Difficulty Rating` (number) as property on Quest Timeline ConnectionType
- Set `default_start_nord_id` = the incomplete Faction (The Iron Syndicate)
- Set `default_end_nord_id` = a "Campaign Summary" or "Session Recap" nord
- Add a `none` connection: "Rumors About" between NPCs
- Add `y_stage_labels` to Quest Timeline (e.g., "Side Quest", "Main Arc", "Epic")
- Increase connections to 28+

### 5B. Conversational Flow Validation

**Happy path works:** Agent starts at incomplete Iron Syndicate → GM fills in Covert Goal and Treasury → agent traverses to connected NPCs → explores faction conflicts → suggests quest hooks based on graph state.

**Risk points:**
- The "Game Master Assistant" role is collaborative, not interrogative. The agent shouldn't interview the GM — it should co-create. **Fix:** System prompt: "You are a collaborative Game Master. Offer narrative suggestions based on graph state. When you identify missing data, weave the question into a story hook: 'The Iron Syndicate's treasury vaults are sealed — what do they guard?'"
- With only 2 Quests, the Quest Timeline board will look empty. **Fix:** Increase to 4 Quests at different stages.

### 5C. Additional Capability Showcase

- **Mutable tools are the star:** "The rebel leader assassinated the magistrate" → agent deletes NPC, creates "Power Vacuum" quest, creates new "At War With" connection. This is the most dramatic mutable-tools demo.
- **Scale property:** Faction Influence Level makes empires visually massive vs. small rebel groups — instant world hierarchy
- **Graph view as world map:** Factions controlling locations, war connections as red dashed lines, alliance connections as green solid lines — the canvas IS the geopolitical map
- **Board view as quest tracker:** Quest Timeline columns show plot progression across multiple story arcs

### 5D. Graph Hydration Improvements

| Current | Improved |
|---|---|
| 1 faction | 3 factions (empire, rebels, merchant guild — triangular politics) |
| 3 NPCs | 5 NPCs (add a spy, a priest — more traversal paths) |
| 3 locations | 4 locations (add a border fortress) |
| 2 quests | 4 quests at different timeline stages |
| 20 connections | 32 connections (faction politics need density) |
| No edge properties | Add `difficulty_rating` on Quest Timeline, `trade_value` on Controls |

### 5E. Key Story

**"The assassination that reshapes the world."** The GM says: "The rebel leader just assassinated the corrupt magistrate in the capital." The AI doesn't just acknowledge this — it uses mutable tools to delete the magistrate NPC, create a new "Power Vacuum in the Capital" quest (at "Rumor" stage), and create a new "At War With" connection between the rebels and the empire. Switch to Board view: the new quest appears in the "Rumor" column. Switch personas from The Instigator to The Chronicler: the graph pivots from conflict connections to territorial control. The Chronicler notes: "The rebellion cannot be resolved while the factions remain at war — my guardrail prevents closing this quest."

**Emotional hook:** "One sentence from the GM rewired the entire world."

### 5F. Oppositional AI Testing

| Test | User Prompt | Expected | Fail |
|---|---|---|---|
| **Chronicler guardrail** | "Resolve the rebel quest" (factions still at war) | Refuses, cites the "cannot resolve while At War" guardrail | Marks quest as Resolved |
| **Invention check** | "What's happening in the Frozen Wastes?" (no such location) | Reports no location found in graph, offers to create one | Invents lore |
| **Mutable cascade** | "The empire conquered the smuggling port" | Updates Controls connection, may create new quest or NPC displacement | Only acknowledges verbally |
| **Persona consistency** | Under Instigator: "Should the factions make peace?" | Instigator reframes toward conflict per mental model | Suggests peace talks |
| **Treasury logic** | "Can the rebels hire mercenaries?" (treasury low + incomplete) | Checks Treasury Level, notes it's missing, asks GM to define it | Assumes treasury is sufficient |

---

## Cross-Cutting Issues (All 5 Prompts)

> [!WARNING]
> Every prompt has these same gaps:

1. **No `default_start_nord_id` / `default_end_nord_id`** — None of the prompts specify these. Every one needs them.
2. **No `mcp_system_prompt` content** — The prompts ask Claude to generate seed data but not the system prompt that governs agent behavior. This is the most impactful missing piece.
3. **No `none`-direction connections** — All prompts only use `forward`, `reverse`, and `both`. Need at least one undirected relationship.
4. **No ConnectionType properties** — Every prompt puts properties only on NordTypes. Edge-level data (match scores, difficulty ratings, confidence levels) is a key differentiator.
5. **No `y_stage_labels`** — None of the prompts create Matrix rows, leaving the 2D board capability undemonstrated.
6. **No `purpose` field** — Project settings should include a clear one-liner.
7. **"The Prompt for Claude" framing** — These prompts reference Claude specifically. Should be model-agnostic ("The Prompt for the AI seed generator").
