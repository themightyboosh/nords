# Nords — Canonical Demo Capability Reference

> **What this is:** The exhaustive catalog of everything Nords can do. Not a demo script — a capability bible. When designing any demo, check it against this document to ensure comprehensive coverage.
>
> **How to use it:** Pick a domain. Design seed data. Walk through each section below and confirm your demo exercises each capability at least once. The checklist at the end is your validation gate.

---

## 1. The Three Primitives

Everything in Nords is built from three peer-level graph entities. **No primitive is subordinate to another.** Any entity can connect to any other through any Connection Category.

### 1.1 Nords (Typed Nodes)

A Nord is a card representing any entity. It gets its schema from its **NordType**.

| Field | Source | Description |
|---|---|---|
| `title` | Instance | Free-text name displayed on card |
| `type_id` | Instance → NordType | Links to the type schema |
| `properties` | Instance (JSONB) | Key-value pairs conforming to the type's `properties_schema` |
| `position_x`, `position_y` | Instance | Canvas position (saved per-nord, restored when physics off) |
| `scale` | Instance (0.0–1.0) | Drives card width via `scale_property` on the type |
| `mcp_complete` | Computed | `true` when all `required` properties in the schema are filled |
| `created_at`, `updated_at` | Auto | Timestamps |

**NordType fields** (defined in Manage Types → Nords):

| Field | Description | Demo Relevance |
|---|---|---|
| `name` | Display name (e.g., "Task", "Person") | Every demo must define 3+ types |
| `icon` | Lucide icon key | Visual variety on cards |
| `accent_color` | Hex color | Cards, graph nodes, badges |
| `description` | Type purpose (shown in tooltips) | Agent context in Dictionary |
| `properties_schema` | Array of property definitions | Core data modeling |
| `scale_property` | Which property name drives node sizing | Graph view visual hierarchy |
| `sort_order` | Ordering in the type palette | — |

### 1.2 Connection Categories (Typed Edges)

A Connection is a relationship instance between two entities. It gets its schema from its **ConnectionType**.

| Field | Source | Description |
|---|---|---|
| `source_nord_id` | Instance | Origin entity |
| `target_nord_id` | Instance | Target entity |
| `type_id` | Instance → ConnectionType | Links to the category schema |
| `distance_x` | Instance (0.0–1.0) | Horizontal spectrum value; drives Board columns |
| `distance_y` | Instance (0.0–1.0) | Vertical spectrum value; drives Matrix rows |
| `direction` | Instance | `forward`, `reverse`, `both`, `none` |
| `properties` | Instance (JSONB) | Edge-level custom properties |

**ConnectionType fields** (defined in Manage Types → Categories):

| Field | Description | Demo Relevance |
|---|---|---|
| `name` | Display name (e.g., "Blocks", "Assigned To") | Semantic verb on edges |
| `accent_color` | Hex line color | Visual differentiation of edge types |
| `stroke_style` | `solid`, `dashed`, `dotted` | Visual encoding of relationship strength/type |
| `default_direction` | Default arrow: `forward`, `reverse`, `both`, `none` | Structural meaning |
| `verb` | Human-readable action (e.g., "blocks", "depends on") | Agent dictionary context |
| `x_stage_labels` | Array of `{label, position}` on 0.0–1.0 | Defines Board columns + Spectrum waypoints |
| `y_stage_labels` | Array of `{label, position}` on 0.0–1.0 | Defines Matrix rows |
| `properties_schema` | Array of property definitions | Edge-level data |

> [!IMPORTANT]
> **`x_stage_labels` is the single most important ConnectionType field for demos.** It defines the Board columns. A connection type with no stage labels produces no Board structure. Every demo needs at least one ConnectionType with 3+ stage labels.

### 1.3 Personas (AI Lens Configurations)

A Persona is an AI personality configuration that re-weights the graph through category weights and injects domain expertise via mental models.

**Persona fields** (defined in ViewportHeader → Personas):

| Field | Description | Demo Relevance |
|---|---|---|
| `name` | Display name | Switcher label in dock |
| `avatar_seed` | String for avatar generation | Visual identity |
| `accent_color` | Hex color | Persona badge/indicator |
| `background` | Domain expertise description | Injected into system prompt |
| `primary_motivation` | What drives this persona | Shapes AI behavior |
| `voice_and_tone` | Communication style | Controls AI output style |
| `temperature` | 0.0–2.0 (practical range 0.3–1.0) | Creativity vs precision |
| `guardrails` | Array of `{mode: 'always'|'never', text}` | Hard constraints on AI behavior |
| `mental_models` | Array of `{name, body}` | Deep domain knowledge injected into context |
| `category_weights` | Array of `{connection_type_id, weight}` | **Drives the Persona Pivot** |
| `sort_order` | Ordering in switcher | — |

**Mental Models — The Injection Chain:**

Each persona can have up to 5 mental models (`{name, body}` markdown). These are **not cosmetic** — they are injected verbatim into the system prompt under a `### Decision Frameworks` header. The assembled prompt tells the AI:

> *"When evaluating information or making decisions at each nord, apply these mental models:"*
> *"Use these frameworks to structure your reasoning. When presenting analysis, reference which framework led to your conclusion."*

This means a persona with a "Risk Assessment" mental model containing a 5-point severity matrix will cause the AI to actually apply that matrix when evaluating nords. **Demos must seed mental models with real analytical frameworks** — not placeholder text.

Example mental model bodies that produce visible AI behavior:
- **Cost-Benefit Analysis:** "Evaluate every resource allocation against ROI. Flag any commitment where marginal cost exceeds marginal return by >15%."
- **Dependency Chain Validation:** "Before approving any task advance, verify all upstream dependencies via connection traversal. A single incomplete dependency blocks the gate."

**Category Weights — Attention Bias:**

A number (0–100) per ConnectionType. Injected into the system prompt as an `### Attention Bias` section with emoji-coded priority levels:
- 🔴 HIGH (>50): Agent actively explores these connections first
- 🟡 MED (1–50): Agent considers these when relevant
- ⚪ LOW (0): Neutral — no preference
- ⬛ IGNORE (<0): Agent deprioritizes these

In the **Persona lens view**, these weights also drive the radial heatmap layout (see §4.4).

---

## 2. Property Type System

Both NordTypes and ConnectionTypes share the same property type system. Every property definition has:

| Meta Field | Description |
|---|---|
| `name` | Property key (e.g., "Budget") |
| `type` | One of the types below |
| `required` | Boolean — drives completeness calculation |
| `card_row` | Integer (1, 2, 3…) — which row on the collapsed card face. `null` = hidden from card |
| `config` | Type-specific configuration (options, symbol, etc.) |

### Available Property Types

| Type | Stored As | Config Options | Demo Notes |
|---|---|---|---|
| `short_text` | String (max 255) | — | Names, titles, contact info |
| `long_text` | String (markdown) | — | Descriptions, summaries, findings |
| `url` | String | — | Links, DOI references |
| `number` | Number | `min`, `max`, `default` | Hours, counts, scores |
| `currency` | Number | `symbol` (e.g., "$") | Rates, budgets, costs |
| `percentage` | Number (0–100) | — | Utilization, confidence, margins |
| `select` | String | `options[]` | Status, priority, category |
| `multi_select` | String[] | `options[]` | Tags, skills, platforms |
| `boolean` | Boolean | — | Flags, approvals |
| `date` | ISO date string | — | Deadlines, publication dates |
| `date_range` | `{start, end}` | — | Sprint windows |
| `computed` | Read-only | `formula`, `output_type` | Derived values (e.g., Line Cost) |

### Completeness System

Completeness is computed per-nord based on the `required` flag:

```
completeness % = (filled required fields / total required fields) × 100
mcp_complete = true when completeness = 100%
```

**Visual indicator:** A progress bar on the card face shows `filled/total` for types with required fields.

**MCP integration:** The `nords_get_incomplete_nords` tool returns all nords that haven't reached 100%. The Horizon endpoint surfaces per-nord session progress (`filled_count` / `required_count`).

> [!TIP]
> For demos, design at least one NordType with 8+ required fields, then seed a nord with only 60-70% filled. This creates a visible, incomplete progress bar that the AI can then help fill during the demo.

---

## 3. Spatial Engine

### 3.1 Distance Model (Spectrums)

Connections encode meaning through two independent distance axes:

| Axis | Range | Drives | Configured Via |
|---|---|---|---|
| **Distance X** | 0.0–1.0 | Board columns, Spectrum horizontal position | `x_stage_labels` on ConnectionType |
| **Distance Y** | 0.0–1.0 | Matrix rows, Spectrum vertical position | `y_stage_labels` on ConnectionType |

**INVARIANT 1:** Distance is truth. The stage label is a computed projection of the distance value — never the stored value itself.

**Spectrum Resolution:** The server resolves `distance_x` to the nearest stage label using closest-position matching. For example, with stages `[{"Backlog", 0.0}, {"In Progress", 0.33}, {"Review", 0.66}, {"Done", 1.0}]`, a distance of 0.4 resolves to "In Progress." The AI's system prompt instructs it to use stage labels, not raw numbers.

**Demo implications:** Seed connections with `distance_x` values spread across the full 0.0–1.0 range. Don't cluster everything at 0.0 or 1.0 — spread cards across multiple Board columns to show the spectrum in action. Include at least one connection positioned *between* stages (e.g., 0.5 in a 3-stage system) to demonstrate the resolution logic.

### 3.2 Directionality System

Every connection has a `direction` field with four possible values:

| Direction | Arrow | Verb Example | Semantic Meaning |
|---|---|---|---|
| `forward` | A → B | "blocks", "leads to" | Source causes/precedes target |
| `reverse` | A ← B | "depends on", "follows" | Target causes/precedes source |
| `both` | A ↔ B | "collaborates with" | Bidirectional relationship |
| `none` | A — B | "related to" | Undirected association |

**ConnectionType sets the default** via `default_direction`, but **each connection instance overrides it.** This means a "Depends On" category can have individual connections that are forward, reverse, or bidirectional.

**System prompt injection:** The assembled system prompt teaches the agent causal semantics:
> *"flows into / leads to → prerequisite gate: the source must be completed before the target can begin"*
> *"depends on → dependency: the target must be resolved before the source can proceed"*
> *"blocks → blocker: the source prevents progress on the target"*

**Board filtering:** The Direction flyout in the GlobalDock filters Board cards by connection direction — including an "Unconnected" option for orphan nords.

**Demo requirement:** Seed at least 3 different direction values across your connections. Show the agent inferring sequencing from direction (e.g., "I can't advance Task X because it has an unresolved `blocks` relationship").

### 3.3 Scale Model

Nords encode relative importance through a single scale axis:

| Property | Range | Drives | Configured Via |
|---|---|---|---|
| **Scale** | 0.0–1.0 | Card width (0.25x–2.0x base) | `scale_property` on NordType |

When `scale_property` is set on a NordType, the named property's value is normalized to 0.0–1.0 and drives visual card sizing. Larger values = larger cards = more visual prominence.

### 3.4 Position Persistence

Every nord has `position_x` and `position_y` coordinates. These are:
- Explicitly saved when the user drags a card on the canvas
- Restored when physics simulation is toggled off
- Preserved across snapshots
- Independent of distance values (which live on connections, not nords)

---

## 4. View Modes (Lens System)

Three view modes, toggled from the GlobalDock. Each mode has its own filter surface.

### 4.1 Canvas (Graph View)

**What it shows:** Free-form spatial graph. Nords as cards, connections as labeled edges with arrowheads.

**Filters available:**
- **Category flyout:** 3-state per ConnectionType (show → dim → hide)
- **Others toggle:** Show/hide nords not in the selected category

**Visual features:**
- Edge labels with connection type name, styled by `stroke_style`
- Arrowheads showing `direction`
- Node sizing via `scale_property`
- Comment badges (inverse-scaled at low zoom)
- Drag-to-connect from card border handles

**Demo value:** Best for showing the "shape" of a problem — blockers, clusters, dependencies visible at a glance.

### 4.2 Board (Matrix View)

**What it shows:** Kanban-style columns derived from `x_stage_labels` on ConnectionTypes. Swimlanes grouped by connection target.

**Filters available:**
- **Category flyout:** Show/hide entire swimlanes by ConnectionType
- **Nord flyout:** 3-state per NordType (show → dim → hide)
- **Direction flyout:** Filter by connection direction (forward, reverse, both, none, unconnected)

**Visual features:**
- Column headers from `x_stage_labels`
- Swimlane headers from connection target nords
- Cards show `card_row` properties
- Drag-and-drop between columns updates `distance_x`
- "Unconnected" overflow column for nords with no connection of the active type

**Demo value:** Most familiar to non-technical users. Shows lifecycle progression. Drag-and-drop is the most tactile interaction.

### 4.3 Persona (Weighted Graph + Radial Heatmap)

**What it shows:** A radial heatmap with the persona avatar at center. Nords orbit at distances determined by their persona relevance score.

**Filters available:**
- **Persona flyout:** Select which persona is active
- **Nord flyout:** 3-state per NordType (show → dim → hide)

**Radial Scoring Algorithm:**
1. For each nord, collect all *unique* ConnectionTypes touching it
2. Sum the persona's weights for those types → raw score
3. Normalize across all nords to [-1, +1]
4. Score +1 = closest to center (highest relevance), -1 = outermost (lowest relevance)
5. Layout uses **golden angle spiral** (sunflower seed distribution) to avoid overlaps

**Visual features:**
- **PersonaCenterNode:** 240px DiceBear avatar at the gravitational center, styled with persona's `accent_color`
- **PersonaZoneNodes:** Concentric colored rings (green→blue→red gradient) representing weight bands. The ring at weight=0 gets a white border (the "neutral boundary")
- 600ms cubic-bezier transition when switching personas (**"The Reveal"**)
- Nords with high persona scores cluster near center; low scores drift outward
- CSS opacity/grayscale on dimmed nords (not just position — also visual salience)

**Demo value:** The signature "wow moment." Switching between two personas with opposing weight profiles causes a dramatic spatial reorganization. The audience sees the *same data* reorganize around different priorities.

---

## 5. MCP Tool Surface

The MCP server exposes tools in three tiers. Every tool operates within a session context.

### 5.1 Tier 1: Read-Only

| Tool | Description | Returns |
|---|---|---|
| `nords_get_dictionary` | Full project ontology — all NordTypes, ConnectionTypes (with verbs, stages), Personas | Type schemas, stage labels, persona configs |
| `nords_get_horizon` | Current position + persona-weighted neighbors + completion % + predicted path | Neighbors with persona_bias, gaps (unvisited/orphans), suggested_next |
| `nords_get_graph` | Full project graph — all nords, connections, types | Complete graph data |
| `nords_get_nord` | Single nord by ID with all properties | Nord + type metadata |
| `nords_query_nords` | Search by type_id and/or title substring | Filtered nord list |
| `nords_get_connections` | All connections to/from a specific nord | Connection list with type metadata |
| `nords_get_session_state` | Full session: position, session nords, traversals | Session audit trail |
| `nords_get_incomplete_nords` | Nords with unfilled required properties | Incomplete nords with missing fields |

### 5.2 Tier 2: Session Tools

| Tool | Description | Effect |
|---|---|---|
| `nords_traverse_connection` | Move to a connected nord via a specific connection | Updates session position, logs traversal, returns new horizon |
| `nords_update_session_nord` | Save collected properties to a session nord | Validates against schema, updates filled/required counts |
| `nords_visit_nord` | Log a visit event with before/after snapshots | Creates audit trail entry |
| `nords_switch_persona` | Change the active persona lens | Returns reweighted horizon |

**Traversal types:** `read`, `advance`, `rework`, `create`, `assign`, `evaluate`
**Visit types:** `inspect`, `update`, `complete`, `create`, `gate_check`

### 5.3 Tier 3: Mutable Tools (requires `mcp_mutable = true`)

| Tool | Description | Effect |
|---|---|---|
| `nords_create_nord` | Create a new nord | Returns created nord with completeness state |
| `nords_update_nord` | Update title and/or properties | Returns updated nord |
| `nords_delete_nord` | Soft-delete a nord | Marks deleted |
| `nords_create_connection` | Create a typed connection with optional distance | Returns created connection |
| `nords_update_connection` | Update distance, direction, or properties | Returns updated connection |
| `nords_delete_connection` | Soft-delete a connection | Marks deleted |

### 5.4 Session Lifecycle

```
Create Session → Set Position → Traverse → Visit → Update Session Nords → Close
```

Sessions track:
- `current_nord_id` — agent's current position in the graph
- `persona_id` — active lens
- `status` — `active`, `completed`, `abandoned`
- `mcp_session_nords` — per-nord property collection with `filled_count`/`required_count`
- `mcp_session_visits` — audit trail of every nord visited (type, before/after, context)

### 5.5 Horizon Model

The Horizon is the agent's "view" of its local graph neighborhood. It includes:

- **Current Nord:** Title, type, session progress (filled/required)
- **Neighbors:** Connected nords ranked by persona_bias (0.0–1.0)
- **Completion:** Overall session progress (% of all required fields filled)
- **Gaps:** Unvisited required nords + orphan nords (no connections)
- **Suggested Next:** Agent's recommendation for where to go next

---

## 6. UI Surface Area

### 6.1 ViewportHeader (Top Bar)

| Element | Action | Demo Relevance |
|---|---|---|
| **Logo** | Navigate to Projects dashboard | — |
| **Nords** | Open ManageTypes panel (NordTypes) | Schema design |
| **Categories** | Open ManageTypes panel (ConnectionTypes) | Relationship design |
| **Personas** | Open ManagePersonas panel | AI persona configuration |
| **Settings** | Open Project Settings | MCP config, system prompt |
| **Agent Preview** | Open PreviewChat panel | AI conversation |
| **Theme Switcher** | Toggle dark/light/system | Visual polish |
| **User Menu** | Profile, Sign Out | Account management |

### 6.2 GlobalDock (Bottom Bar)

| Element | Modes | Action |
|---|---|---|
| **Board / Graph / Persona** toggle | All | Switch lens mode |
| **Category** flyout | Board, Graph | Board: show/hide lanes. Graph: 3-state show/dim/hide |
| **Nord** flyout | Board, Persona | 3-state show/dim/hide per NordType |
| **Direction** flyout | Board | Filter by connection direction (5 options) |
| **Persona** flyout | Persona | Select active persona |
| **Others** toggle | Graph | Show/hide nords not in selected category |

### 6.3 Detail Drawer

Opens when clicking a nord. Contains:

| Section | Contents |
|---|---|
| **Header** | Nord title (editable), type badge with icon and color |
| **Properties** | All properties from the type schema, rendered by type with inline editing |
| **Connections** | List of all connections with type, direction, target, distance |
| **Comments** | Threaded comments on the nord |
| **Metadata** | Created/updated timestamps |

### 6.4 PreviewChat (Agent Preview)

| Feature | Description |
|---|---|
| **Message input** | Send messages to Gemini proxy with MCP graph context |
| **Conversation history** | Per-session message list |
| **Session management** | Create, load, reset, abandon sessions |
| **Model selector** | `gemini-2.0-flash`, `gemini-2.5-flash`, `gemini-2.5-pro` |
| **Dev Mode toggle** | Expands the developer inspection panel |
| **Dev → Tools tab** | Timeline of MCP tool calls with expandable args/results |
| **Dev → System Prompt tab** | Full assembled system prompt (project prompt + persona + horizon) |
| **Dev → Horizon tab** | Live horizon state: current nord, neighbors, completion %, gaps, suggested next |
| **Dev → Token metrics** | Input/output token count + latency per response |
| **Tool call badges** | Color-coded: blue=read, green=mutate, amber=navigate |
| **Session transition** | System message when all required fields are filled |

### 6.5 ManageTypes Panel

Two tabs: **Nords** and **Categories**. Each tab allows:

| Action | Fields |
|---|---|
| Create type | Name, icon, color, description |
| Add property | Name, type, required flag, card_row, config |
| Reorder properties | Drag to reorder |
| Toggle property visibility | card_row = null hides from card face |
| Set scale property | Dropdown of numeric properties |
| Configure stage labels (categories only) | Add/remove/reorder labels with positions |
| Set stroke style (categories only) | solid, dashed, dotted |
| Set default direction (categories only) | forward, reverse, both, none |
| Delete type | Soft delete (fails if in use) |

### 6.6 ManagePersonas Panel

| Action | Fields |
|---|---|
| Create persona | Auto-generates with defaults |
| Edit persona fields | name, avatar_seed, accent_color, background, primary_motivation, voice_and_tone, temperature |
| Add/edit/delete guardrails | mode (always/never), text |
| Add/edit/delete/reorder mental models | name, body (markdown) |
| Set category weights | Slider per ConnectionType (0–100) |
| Delete persona | Removes from project |

### 6.7 Spectrum Editor

Inline editor for `distance_x` values on connections. Shows:
- Labeled waypoints from `x_stage_labels`
- Draggable handle on the 0.0–1.0 axis
- Current stage label resolved from position

### 6.8 Canvas Interactions

| Interaction | Effect |
|---|---|
| Click nord | Open Detail Drawer |
| Drag nord | Move on canvas, save position |
| Border-drag from nord | Start connection creation |
| Drop connection on nord | Create new connection (prompts for type) |
| Right-click nord | Context menu (delete, connect, inspect) |
| Scroll/pinch | Zoom canvas |
| Click edge label | Select connection for editing |
| Double-click canvas | Create new nord |

### 6.9 Board Interactions

| Interaction | Effect |
|---|---|
| Drag card between columns | Updates `distance_x` on the connection |
| Click card | Open Detail Drawer |
| Collapse/expand swimlane | Toggle via Category flyout |

---

## 7. Project Configuration

| Setting | Type | Description | Demo Relevance |
|---|---|---|---|
| `name` | String | Project display name | Center of ViewportHeader |
| `description` | String | Project purpose | Agent context |
| `purpose` | String | One-line project goal | Injected into system prompt as context |
| `icon` | String (emoji) | Project icon | Dashboard + header |
| `mcp_enabled` | Boolean | Enables MCP tool surface | Must be true for any AI demo |
| `mcp_capture_data` | Boolean | Enables session data capture | Required for audit trail demos |
| `mcp_mutable` | Boolean | Enables Tier 3 (create/update/delete) | Required if AI should modify graph |
| `mcp_system_prompt` | Text | Project-specific system prompt injected into every AI call | Defines agent behavior, rules, gate logic |
| `default_persona_id` | UUID | Auto-selected persona for new sessions | Starting lens |
| `default_start_nord_id` | UUID | Agent's initial position in the graph | Entry point for sessions |
| `default_end_nord_id` | UUID | Session completion target | Drives "all done" transition |

### 7.1 Start Nord & End Nord — Soft Direction

The Start Nord and End Nord are **soft guidance, not hard rails.** The agent is free to traverse anywhere in the graph — these just set the initial position and completion trigger.

**Start Nord (`default_start_nord_id`):**
- When a new chat session is created, `createSession(projectId, personaId, startNordId)` sets `current_nord_id` to this nord
- The agent's first `nords_get_horizon` call returns this nord's neighborhood
- The system prompt's `## Session Context` section says "You are currently at **[Start Nord Title]**"
- The agent can immediately traverse away — no lock-in

**End Nord (`default_end_nord_id`):**
- After every `nords_update_session_nord` call, `checkSessionCompletion` runs
- If ALL session nords have `complete = true` (all required fields filled), AND `default_end_nord_id` is set:
  - `current_nord_id` is auto-updated to the End Nord
  - The response includes `completion.shouldTransition = true`
  - PreviewChat shows: "✅ All required properties filled. Session transitioned to End Nord."
- If `default_end_nord_id` is NOT set, completion still fires but no position change occurs

**Demo design pattern:** Place the Start Nord at a "project intake" or "briefing" node and the End Nord at a "deliverable" or "sign-off" node. The agent naturally traverses from intake to deliverable through the graph. The audience sees the agent navigate a meaningful path without being forced along it.

> [!IMPORTANT]
> Every demo should set BOTH `default_start_nord_id` AND `default_end_nord_id`. The start gives the agent a natural entry point; the end gives the audience a visible "mission accomplished" moment when all required fields are collected.

### 7.2 System Prompt Assembly

The full system prompt is assembled in layers (code: `chat.ts → buildSystemPrompt`):

```
1. Base Protocol         — Graph navigation rules, tool ordering, semantic reference
2. Project Instructions  — mcp_system_prompt field (domain rules, gate logic)
3. Project Name/Purpose  — name + purpose fields
4. Persona Injection     — background, motivation, voice/tone
5. Mental Models         — "### Decision Frameworks" with each model as a bullet
6. Category Weights      — "### Attention Bias" with emoji-coded priority levels
7. Guardrails            — "### Guardrails" with [ALWAYS]/[NEVER] prefixes
8. Session Context       — Current position, completion %, neighbors, suggested next
```

The Dev Mode → System Prompt tab in PreviewChat shows this fully assembled prompt. **This is a key demo beat** — showing the audience how persona configuration translates into actual AI instructions.

### 7.3 MCP Configuration Modes

| Mode | `enabled` | `capture` | `mutable` | Use Case |
|---|---|---|---|---|
| **Read-only** | ✅ | ❌ | ❌ | Query-only AI assistant |
| **Capture** | ✅ | ✅ | ❌ | AI reads + tracks session state |
| **Full Mutable** | ✅ | ✅ | ✅ | AI reads + writes + tracks |

---

## 8. Wow Moment Mechanics

Three structural patterns produce jaw-drop moments in demos. These aren't features — they're emergent behaviors of the system architecture.

### 8.1 Persona Pivot

**Trigger:** Switch persona in the GlobalDock (Persona lens mode).

**What happens:**
1. `category_weights` on the new persona re-rank all edges
2. The force-directed layout recalculates
3. Nords connected via high-weight categories pull toward center
4. Nords connected via low-weight categories drift to periphery
5. Animated transition ("The Reveal") makes the reorganization visible

**Requirements for seed data:**
- ≥2 personas with *different* category weight profiles
- ≥2 ConnectionTypes with nords connected via each
- Enough nords (8+) to make the spatial shift visible

### 8.2 Constraint Tripwire

**Trigger:** AI attempts an action that violates a guardrail or system prompt rule.

**What happens:**
1. Agent reads the graph state via MCP tools
2. Identifies a constraint violation (e.g., resource over 90% utilization)
3. Refuses to proceed and explains why
4. Suggests corrective action using graph context

**Requirements for seed data:**
- ≥1 guardrail on the active persona that will fire
- Seed data that creates the exact violation (e.g., utilization = 110%)
- A user prompt that would naturally lead the agent to hit the guardrail

### 8.3 Triangulation

**Trigger:** AI cross-references multiple nords to derive insight.

**What happens:**
1. Agent queries nords of different types
2. Correlates properties across the graph (e.g., rate × hours = cost; team utilization + skill match = staffing recommendation)
3. Surfaces insight that no single nord contains
4. Uses the graph structure (connections) to know *which* nords to correlate

**Requirements for seed data:**
- ≥3 NordTypes with properties that meaningfully cross-reference
- Connections that create the traversal path between them
- A user prompt that asks a question requiring multi-node reasoning

---

## 9. Seed Data Requirements

Every demo seed script must satisfy:

| Requirement | Why |
|---|---|
| **3+ NordTypes** | Shows type diversity |
| **3+ ConnectionTypes** | Shows relationship variety |
| **1+ ConnectionType with 3+ stage labels** | Creates a meaningful Board |
| **1+ ConnectionType with spectrum stages** | Creates a meaningful Spectrum view |
| **2+ Personas with different category weights** | Enables Persona Pivot |
| **8+ Nords** | Enough visual density |
| **15+ Connections** | Rich graph structure |
| **1+ Nord with incomplete required fields** | Shows completeness bar |
| **1+ Nord at >90% of a threshold** | Sets up Constraint Tripwire |
| **Mixed `distance_x` values** | Cards spread across Board columns |
| **Mixed `stroke_style` on ConnectionTypes** | Visual variety in graph |
| **Mixed `direction` on connections** | Shows arrowhead variety |
| **1+ blocking/crisis relationship** | "In media res" opening |
| **MCP session with 2+ visits** | Pre-populated audit trail |
| **Deterministic dates** relative to `Date.now()` | Demo always feels current |
| **Real domain language** | Not lorem ipsum |
| **System prompt with rules** | Agent has enforceable behavior |
| **Guardrails that will fire** | Constraint Tripwire ready |

---

## 10. Demo Coverage Checklist

Use this checklist when designing or reviewing any demo. Every item should be covered at least once.

### Entities & Structure
- [ ] 3+ NordTypes with distinct icons and colors
- [ ] 3+ ConnectionTypes with distinct stroke styles and colors
- [ ] 2+ Personas with mental models AND category weights
- [ ] 1+ ConnectionType with 3+ `x_stage_labels` (Board columns)
- [ ] 1+ ConnectionType with `y_stage_labels` (Matrix rows)
- [ ] 1+ NordType with `scale_property` set (visual sizing)
- [ ] 8+ Nords with mixed types
- [ ] 15+ Connections spread across multiple categories

### Directionality
- [ ] At least 1 `forward` connection (A → B)
- [ ] At least 1 `reverse` connection (A ← B)
- [ ] At least 1 `both` connection (A ↔ B)
- [ ] At least 1 `none` connection (A — B)
- [ ] Direction filter used in Board mode to show filtering effect
- [ ] Agent infers sequencing from direction verbs during traversal

### Spectrum & Distance
- [ ] `distance_x` values spread across 0.0–1.0 (not all 0 or all 1)
- [ ] Board columns populated with cards in multiple stages
- [ ] Spectrum editor shown with draggable handle
- [ ] Stage label resolution visible (distance → label mapping)
- [ ] Board drag-and-drop updates `distance_x`

### Properties (Diverse Coverage)
- [ ] `short_text` property on a NordType
- [ ] `long_text` (markdown) property on a NordType
- [ ] `number` property on a NordType
- [ ] `currency` property with symbol config
- [ ] `percentage` property (e.g., utilization, confidence)
- [ ] `select` property with 3+ options
- [ ] `multi_select` property (e.g., tags, skills)
- [ ] `boolean` property (e.g., approved flag)
- [ ] `date` property (e.g., due date)
- [ ] `url` property (if applicable to domain)
- [ ] Properties on a **ConnectionType** (not just NordTypes)
- [ ] `required` flag on 5+ properties across types
- [ ] `card_row` set on 2+ properties per type (visible on card face)
- [ ] At least 1 incomplete nord showing progress bar

### Persona Deep Features
- [ ] 2+ personas with DIFFERENT category weight profiles
- [ ] Each persona has 2+ mental models with real analytical frameworks
- [ ] At least 1 persona guardrail that will fire during the demo
- [ ] Persona `background` and `primary_motivation` are distinct per persona
- [ ] Persona `voice_and_tone` creates noticeably different AI output style
- [ ] Category weights visible in ManagePersonas panel (slider per category)
- [ ] Dev Mode → System Prompt tab shows mental model injection
- [ ] Persona Pivot executed — radial heatmap reorganizes

### Start Nord & End Nord
- [ ] `default_start_nord_id` set in project settings
- [ ] `default_end_nord_id` set in project settings
- [ ] Agent begins at Start Nord (visible in Horizon tab)
- [ ] Agent traverses through graph (not stuck at start)
- [ ] Session completion triggers End Nord transition
- [ ] PreviewChat shows "✅ All required properties filled" system message

### Views
- [ ] Graph view shown with edge labels and arrowheads
- [ ] Board view shown with columns from `x_stage_labels`
- [ ] Persona view shown with radial heatmap + avatar center
- [ ] Detail Drawer opened and property edited inline
- [ ] Theme switch (dark mode preferred for demos)

### Dock & Filters
- [ ] Lens toggle used (Board ↔ Graph ↔ Persona)
- [ ] Category flyout opened (3-state: show/dim/hide)
- [ ] Nord visibility flyout opened
- [ ] Direction filter used (Board mode)
- [ ] Persona switcher used (switch between 2+ personas)
- [ ] "Others" toggle used (Graph mode)

### MCP & AI
- [ ] PreviewChat opened and message sent
- [ ] Agent calls `nords_get_horizon` (read)
- [ ] Agent calls `nords_traverse_connection` (session/navigate)
- [ ] Agent calls `nords_update_session_nord` (session/collect)
- [ ] Agent calls a Tier 3 tool — create or update (mutable)
- [ ] Dev Mode toggled — tool timeline shown with color-coded badges
- [ ] Dev Mode — System Prompt tab shows persona + mental models + weights
- [ ] Dev Mode — Horizon tab shows current nord, neighbors, gaps
- [ ] Dev Mode — Token metrics visible (in/out tokens + latency)
- [ ] Session history dropdown shown

### Wow Moments
- [ ] Persona Pivot — switch personas, watch graph reorganize
- [ ] Constraint Tripwire — agent refuses + explains why
- [ ] Triangulation — agent cross-references 2+ nords for insight
- [ ] Mental Model Application — agent cites a specific framework in its reasoning

### Project Settings
- [ ] `mcp_enabled` = true
- [ ] `mcp_capture_data` = true
- [ ] `mcp_mutable` = true (for full demo)
- [ ] `mcp_system_prompt` configured with domain-specific rules
- [ ] `default_persona_id` set
- [ ] `default_start_nord_id` set
- [ ] `default_end_nord_id` set
- [ ] `purpose` field set with clear project goal

### Header Actions
- [ ] "Nords" button → ManageTypes panel shown
- [ ] "Categories" button → ManageTypes (connection types) shown
- [ ] "Personas" button → ManagePersonas panel shown (with mental models visible)
- [ ] "Settings" button → Project Settings shown (start/end nords visible)
- [ ] "Agent Preview" button → PreviewChat opened
