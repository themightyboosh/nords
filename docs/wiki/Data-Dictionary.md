# Data Dictionary

> Comprehensive inventory of every value collected across the five core configuration entities.
> For each field: name, data type, description, and how (or whether) it feeds the AI via MCP.

---

## How to Read This Document

| Column | Meaning |
|--------|---------|
| **Field** | The stored value name |
| **Type** | Data type (see [Property Types](#property-types) reference) |
| **MCP Usage** | How the value reaches the AI — `system prompt`, `horizon`, `dictionary`, `tool context`, or `—` (not sent) |
| **Mode** | Which project modes use this value: 🧭 Explore, 📋 Collect, 🎯 Guided, or ★ All |

---

## 1. Project

The top-level container. Configures which features are active and how the AI behaves.

| Field | Type | Description | MCP Usage | Mode |
|-------|------|-------------|-----------|------|
| `name` | text | Display name of the project | **System prompt** — injected as `## Project: {name}` | ★ All |
| `description` | text | Human-readable summary for the dashboard | **—** UI only | ★ All |
| `purpose` | text | Why the project exists; guides AI intent | **System prompt** — appended below project name. Also in **horizon** → `session_meta.project_purpose` | ★ All |
| `icon` | text | Lucide icon name for dashboard display | **—** UI only | ★ All |
| `project_mode` | enum: `explore` · `collect` · `guided` | MCP integration tier (see [Project Modes](#project-modes)) | **Horizon** → `session_meta.project_mode`. Also drives server-side goal initialization and neighbor sorting | ★ All |
| `mcp_enabled` | boolean | Master switch — enables Agent Preview, chat, and MCP tools | **Gate** — if false, no MCP features are available at all | ★ All |
| `mcp_capture_data` | boolean | *(Derived from mode)* — enables property collection and analytics audit trail | **Tool context** — passed as `mcpCaptureData` to `dispatchTool`; gates `nords_update_session_nord` writes | 📋🎯 |
| `mcp_mutable` | boolean | Whether the AI can create/delete nords and connections | **Tool context** — passed as `mcpMutable`; gates `nords_create_nord`, `nords_create_connection`, etc. | ★ All |
| `goals_enabled` | boolean | *(Derived from mode)* — enables the goal DAG orchestration engine | **Server-side** — controls whether `initializeSessionGoals` creates session goal records | 🎯 only |
| `mcp_system_prompt` | text (long) | Custom business logic, capabilities, and guardrails for the AI | **System prompt** — injected as `## Project Instructions` block | ★ All |
| `mcp_welcome_message` | text | First message shown in chat before user types | **Chat response** — returned as `welcomeMessage` on new session creation | ★ All |
| `end_prompt_suggestion` | text | Suggested closing message template | **—** UI hint for project designers | 📋🎯 |
| `default_persona_id` | uuid | The persona auto-assigned to new sessions | **Session init** — passed to `createSession()`, determines which persona's voice/weights are active | ★ All |
| `default_start_nord_id` | uuid | Nord where new sessions begin | **Session init** — sets `current_nord_id` on session creation | ★ All |
| `default_end_nord_id` | uuid | Nord that triggers session completion | **Horizon** → `session_meta.end_nord`. Server auto-transitions to this nord when all required fields are filled | 📋🎯 |

### Project Modes

| Mode | `mcp_capture_data` | `goals_enabled` | AI Behavior |
|------|-------------------|-----------------|-------------|
| 🧭 **Explore** | `false` | `false` | Pure knowledge graph navigation. AI follows the user's lead, no data collection |
| 📋 **Collect** | `true` | `false` | Opportunistic capture. AI collects MCP properties as they surface in conversation |
| 🎯 **Guided** | `true` | `true` | Goal-directed. AI actively steers toward completing objectives in the goal DAG |

---

## 2. Nord Type

Defines a category of nords. Each type has a schema of properties that nords of this type can hold.

| Field | Type | Description | MCP Usage | Mode |
|-------|------|-------------|-----------|------|
| `name` | text | Type label (e.g., "Candidate", "Pet", "Task") | **Dictionary** → `nord_types[].name`. **Horizon** → `current_nord.type_name`, `neighbors[].nord.type_name` | ★ All |
| `description` | text | Explains what this type represents | **Dictionary** → `nord_types[].description` | ★ All |
| `icon` | text | Lucide icon name | **Dictionary** → `nord_types[].icon` | ★ All |
| `accent_color` | text | Hex color for visual distinction | **Dictionary** → `nord_types[].accent_color`. UI canvas rendering | ★ All |
| `properties_schema` | PropertySchema[] | Array of property definitions (see below) | **Dictionary** → full schema. **Horizon** → filtered to `remaining_schema` (only uncollected fields) | ★ All |
| `scale_property` | text | Which property to use for visual scaling on canvas | **—** UI only (canvas node size) | ★ All |
| `sort_order` | number | Ordering in the ManageTypes sidebar | **—** UI only | ★ All |

### PropertySchema (embedded in Nord Type)

Each property in `properties_schema` is an object with these fields:

| Field | Type | Description | MCP Usage | Mode |
|-------|------|-------------|-----------|------|
| `name` | text | Property key name | **Horizon** → appears in `remaining_schema[].name` and `session_properties` keys | ★ All |
| `type` | enum (see below) | Data type of the property | **Dictionary** → schema type info. Validates input in `nords_update_session_nord` | ★ All |
| `required` | boolean | Whether the property must be filled for completion | **Server** — drives `required_count` / `filled_count` on `mcp_session_nords`. Determines session completion | 📋🎯 |
| `defaultValue` | any | Pre-populated value for new instances | **—** Applied at nord creation time | ★ All |
| `options` | string[] | Dropdown choices (only when type = `select`) | **Dictionary** → included in schema | ★ All |
| `source` | enum: `user` · `mcp` | Who fills this property | **Horizon** — `source: 'user'` properties are excluded from `remaining_schema`. `source: 'mcp'` properties are collectible by the AI | See below |
| `card_row` | number | Visual row position on the detail drawer card | **—** UI only | ★ All |
| `config` | object | Extra config (formula, output_type for computed) | **—** UI computation only | ★ All |

#### Source Behavior by Mode

| Source | 🧭 Explore | 📋 Collect | 🎯 Guided |
|--------|-----------|-----------|----------|
| `user` | Visible, admin-editable | Visible, admin-editable. Excluded from AI collection | Same as Collect |
| `mcp` | **Hidden entirely** (MCP Properties section not shown in ManageTypes) | Visible. AI collects opportunistically | Visible. AI actively seeks to fill. Bound to goals |

---

## 3. Category (Connection Type)

Defines the relationship vocabulary between nords. Categories carry semantic meaning the AI uses for navigation.

| Field | Type | Description | MCP Usage | Mode |
|-------|------|-------------|-----------|------|
| `name` | text | Category name (e.g., "Pipeline Stage", "Dependency") | **Dictionary** → `connection_types[].name`. **Horizon** → `neighbors[].relationship.type_name` | ★ All |
| `description` | text | What this relationship represents | **Dictionary** → `connection_types[].description` | ★ All |
| `verb` | text | Action word (e.g., "flows into", "depends on") | **Dictionary** + **Horizon** → `relationship.verb`. System prompt teaches AI to infer sequencing from verbs | ★ All |
| `accent_color` | text | Hex color for connection edges | **—** UI canvas rendering | ★ All |
| `stroke_style` | text | Visual line style (solid, dashed, dotted) | **—** UI only | ★ All |
| `measurement_mode` | enum: `spectrum` · `quadrant` · `none` | How distance is interpreted | **Dictionary** + **Horizon** → `relationship.measurement_mode`. Determines whether stage labels apply | ★ All |
| `x_stage_labels` | StageLabel[] | Array of `{label, position}` for the X axis | **Dictionary** → `connection_types[].x_stage_labels`. **Horizon** — resolved to nearest label as `relationship.stage` | ★ All |
| `y_stage_labels` | StageLabel[] | Array of `{label, position}` for the Y axis | **Dictionary** → `connection_types[].y_stage_labels` | ★ All |
| `properties_schema` | PropertySchema[] | Schema for per-connection properties | **Dictionary** + **Horizon** → `relationship.connection_schema`, `relationship.connection_properties` | ★ All |
| `is_system` | boolean | Whether this is a built-in category | **—** Prevents deletion in UI | ★ All |
| `sort_order` | number | Ordering in the ManageTypes sidebar | **—** UI only | ★ All |

### Connection Instance Fields

Each connection (edge) between two nords also carries:

| Field | Type | Description | MCP Usage | Mode |
|-------|------|-------------|-----------|------|
| `direction` | enum: `forward` · `reverse` · `both` · `neither` · `none` | Directionality of the relationship | **Horizon** → `relationship.direction`. AI uses this for traversal logic | ★ All |
| `distance_x` | float (0.0–1.0) | Position on the X spectrum | **Horizon** → `relationship.distance_x`, resolved to `relationship.stage` via stage labels | ★ All |
| `distance_y` | float (0.0–1.0) | Position on the Y spectrum (quadrant mode) | **Horizon** → `relationship.distance_y` | ★ All |
| `properties` | object | Per-instance values matching the category's `properties_schema` | **Horizon** → `relationship.connection_properties` | ★ All |

---

## 4. Persona

Defines an AI voice, personality, and attention profile. Controls *how* the AI speaks and *what* it prioritizes.

| Field | Type | Description | MCP Usage | Mode |
|-------|------|-------------|-----------|------|
| `name` | text | Persona display name | **System prompt** → `## Active Persona: {name}`. **Dictionary** → `personas[].name`. **Horizon** → `persona.name` | ★ All |
| `avatar_seed` | text | DiceBear Notionists seed for avatar generation | **—** UI only | ★ All |
| `background` | text | 1-2 sentence history/expertise of the persona | **System prompt** → `Background: {background}`. **Dictionary** → `personas[].background` | ★ All |
| `primary_motivation` | text | The persona's ultimate goal or priority | **System prompt** → `Motivation: {primary_motivation}`. **Dictionary** → `personas[].primary_motivation` | ★ All |
| `voice_and_tone` | text | Communication style instructions | **System prompt** → `### Voice & Tone` block. **Dictionary** → `personas[].voice_and_tone` | ★ All |
| `temperature` | float (0.0–2.0) | AI response creativity level | **System prompt** → directly sets the Gemini `temperature` parameter. Default: 1.0. **Dictionary** → `personas[].temperature` | ★ All |
| `guardrails` | json array: `[{mode, text}]` | Behavioral constraints (`always` / `never` rules) | **System prompt** → `### Guardrails` block. **Dictionary** → `personas[].guardrails` | ★ All |
| `sort_order` | number | Ordering in the persona list | **—** UI only | ★ All |

### Mental Models (child of Persona)

Cognitive frameworks the AI should apply when reasoning. Max 5 per persona.

| Field | Type | Description | MCP Usage | Mode |
|-------|------|-------------|-----------|------|
| `name` | text | Framework name (e.g., "Risk Assessment Matrix") | **System prompt** → `### Decision Frameworks` bullet. **Dictionary** → `personas[].mental_models[].name` | ★ All |
| `body` | text | Description of the framework | **System prompt** → framework description. **Dictionary** → `personas[].mental_models[].body` | ★ All |
| `sort_order` | number | Display order | **—** UI only | ★ All |

### Category Weights (child of Persona)

Per-category attention bias. Shapes which connections the AI explores first.

| Field | Type | Description | MCP Usage | Mode |
|-------|------|-------------|-----------|------|
| `connection_type_id` | uuid | Which category this weight applies to | **System prompt** → `### Attention Bias` list. **Horizon** → drives `persona_bias` score on neighbors (higher weight = explore first) | ★ All |
| `weight` | int (-100 to 100) | Relevance score. >50 = HIGH, >0 = MED, >-50 = LOW, ≤-50 = IGNORE | **System prompt** + **Horizon** — mapped to 🔴/🟡/⚪/⬛ labels. Directly influences neighbor sort order | ★ All |

---

## 5. Goal

Defines a completion objective in the goal DAG. Goals are composed of property bindings (nord + property pairs). **Only active in 🎯 Guided mode.**

| Field | Type | Description | MCP Usage | Mode |
|-------|------|-------------|-----------|------|
| `name` | text | Goal display name | **Horizon** → `goals[].goal_name`. System prompt: referenced in `goal_events` | 🎯 only |
| `description` | text | What this goal achieves | **—** UI only (visible in ManageGoals) | 🎯 only |
| `icon` | text | Emoji or Lucide icon | **Horizon** → `goals[].icon` | 🎯 only |
| `accent_color` | text | Hex color for the goal DAG canvas | **—** UI only | 🎯 only |
| `sort_order` | number | Display ordering | **—** UI only | 🎯 only |
| `end_type` | enum: `reset` · `continue` · `null` | What happens when this goal completes | **Horizon** → `goals[].end_type`. `reset` = end session & clear state. `continue` = end session & carry over completed goals. `null` = does not end session | 🎯 only |
| `achieved_prompt` | text | Message template the AI should weave in upon completion | **Horizon** → `goals[].achieved_prompt`. System prompt instructs AI: "If the goal has an achieved_prompt, weave it naturally" | 🎯 only |
| `is_implicit` | boolean | If true, hidden from the UI but tracked internally | **Horizon** — implicit goals are filtered out of the `goals` array | 🎯 only |

### Goal Edges (DAG connections)

Directed edges between goals that define prerequisite ordering.

| Field | Type | Description | MCP Usage | Mode |
|-------|------|-------------|-----------|------|
| `source_goal_id` | uuid | Prerequisite goal | **Server** — used by `initializeSessionGoals` to determine which goals start as `active` vs `pending` | 🎯 only |
| `target_goal_id` | uuid | Dependent goal (unlocked when source completes) | **Server** — on source completion, target transitions from `pending` → `active` via `goal_activated` event | 🎯 only |

### Goal Properties (completion criteria)

Binds specific nord+property pairs to a goal. The goal is complete when all bound properties are collected.

| Field | Type | Description | MCP Usage | Mode |
|-------|------|-------------|-----------|------|
| `nord_id` | uuid | Which nord instance | **Server** — after each `nords_update_session_nord`, evaluates if bound properties are now filled | 🎯 only |
| `property_name` | text | Which property key on that nord | **Server** — checks `mcp_session_nords.properties[property_name]` for non-null value | 🎯 only |

### Persona Goal Weights (cross-entity)

Links personas to goals with a priority weight.

| Field | Type | Description | MCP Usage | Mode |
|-------|------|-------------|-----------|------|
| `persona_id` | uuid | Which persona | **Horizon** — influences `goal_proximity` scoring on neighbors | 🎯 only |
| `goal_id` | uuid | Which goal | **Horizon** — neighbors bound to active goals get a +0.3 priority boost | 🎯 only |
| `weight` | number | Priority (higher = more important) | **Horizon** — combined with `persona_bias` for neighbor sort order | 🎯 only |

---

## Property Types Reference

All available property types for both User Properties and MCP Properties schemas:

| Type Key | Display Name | Input Widget | Validation | Available For |
|----------|-------------|-------------|------------|---------------|
| `string` | Text | Single-line text input | No constraints | User, MCP |
| `number` | Number | Numeric input | Number only | User, MCP |
| `select` | Dropdown | Select from predefined `options[]` | Must match options list | User, MCP |
| `date` | Date | Date picker | ISO 8601 date | User, MCP |
| `markdown` | Markdown | Multi-line textarea with markdown preview | Free text | User, MCP |
| `url` | URL | Text input with URL placeholder | Valid URL format | User, MCP |
| `tags` | Tags | Tag chip input (multi-value) | Array of strings | User, MCP |
| `computed` | Computed ƒ | Formula-driven (read-only) | Defined by `config.formula` | User only |

### Computed Property Config

When type = `computed`, the `config` object contains:

| Config Key | Type | Description |
|-----------|------|-------------|
| `formula` | text | Expression referencing other property names (e.g., `Allocated Hours * Effective Rate`) |
| `output_type` | enum: `number` · `currency` · `percentage` | How the result is displayed |
| `output_config.symbol` | text | Currency symbol (only when `output_type = currency`) |

---

## MCP Delivery Channels

How data reaches the AI, ordered by frequency of delivery:

| Channel | When Delivered | What It Contains |
|---------|---------------|-----------------|
| **System Prompt** | Once per conversation turn | Project name/purpose, custom instructions, active persona (voice, guardrails, mental models, attention bias), session resume context |
| **Horizon** (`nords_get_horizon`) | Every tool call that moves or updates | Current nord + remaining schema, neighbors with connection semantics, completion %, goals, planning queue, predicted path |
| **Dictionary** (`nords_get_dictionary`) | On-demand (cached 5 min) | Full ontology: all nord types + schemas, all connection types + verbs + stages, all personas + mental models + weights |
| **Tool Context** | Internal, every tool dispatch | `sessionId`, `projectId`, `mcpMutable`, `mcpCaptureData` — gates which tool operations are allowed |
| **Goal Events** | Returned from `nords_update_session_nord` | `goal_completed`, `goal_activated`, `goal_cancelled`, `session_terminating` — real-time reactions to data changes |
