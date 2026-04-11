Source: https://docs.google.com/document/d/13a83ZqMdqImPgXfQbqaBFbdYIBirD24RQ3DpsoMA5M0/export?format=txt

---

﻿Product Requirements Document: Nards
"I'm never going to use Trello again."
— Target user reaction after first 10 minutes
________________


1. Vision
Nards is a graph-native ideation and project management tool that replaces flat, column-based tools (Trello, Notion boards) with a spatial canvas where ideas, tasks, people, and concepts exist as nodes in a living network. Relationships are first-class citizens — not afterthoughts.
Core analogy: SQL is to Neo4j as Trello is to Nards.
Trello assumes your work belongs in a line. Nards assumes it belongs in a network.
1.1 Competitive Positioning
Why not Miro? Miro's data model is a drawing — shapes on a canvas with visual connectors. Nards' data model is a graph — typed nodes with typed, semantically-rich relationships. Miro can't query "show me everything that blocks the Q3 launch" because its connectors carry no meaning. This is an architectural difference, not a feature gap. It must be felt in the first 30 seconds.
Why not Trello/Notion? They are column-based. A card lives in one list. Nards exist in a network where the same node participates in many relationships, and each relationship type has its own spatial language.
Defensibility: Per-line-type spatial semantics, MCP-native AI integration, and the animated view transition system ("The Reveal") create a product experience that cannot be replicated by adding features to a drawing tool or a kanban board.
________________


2. Target User
Primary Persona
Project managers and innovation specialists who are:
* Already immersed in AI workflows and obsessed with context generation
* Outgrowing flat tools — they need intensity, relativity, direction, and relationship-to-knowledge to shape a project
* Comfortable with progressive complexity — they want simple to start, powerful when needed
Day-One User
A Trello power user who has tried to make Miro + Trello + spreadsheets work together and feels the friction of forcing non-linear thinking into linear tools.
Triggering Event
"I have a project where the relationships between things matter more than the sequence, and no tool lets me express that."
Path to Mass Market
The AI-obsessed PM is the wedge, not the ceiling. The viral loop is Nard DNA (Section 15.8) — shareable context URLs that make any AI tool smarter. Non-technical PMs adopt because their AI-native teammate says "just put it in Nards so Claude can see it."
________________


3. Core Concepts
3.1 Nards (Node Cards)
A nard is the atomic unit. It is a rich content object — closer to a Notion page than a sticky note.
Nard contents:
* Title
* Markdown body (full rich text)
* Status (customizable per workspace)
* Color
* Custom fields (multiple data types: text, number, date, select, multi-select, checkbox, URL)
* File attachments
* Comment threads
* Changelog / history
* Tags / labels
Nard spatial properties (normalized):
* Size — encodes a global, workspace-level meaning (e.g., importance, effort, budget)
Nard types are user-defined schemas (e.g., "Task", "Person", "Risk", "Idea"). Each type defines which fields are present. Types are managed by Admins.
3.2 Lines (Edges / Relationships)
Lines connect nards and represent the nature of their relationship.
Line properties:
* Type (user-defined label: "depends-on", "influences", "owns", "contradicts", etc.)
* Direction (optional arrow — encodes flow, causation, hierarchy)
* Distance (normalized proximity between connected nards — meaning defined per line type)
* Style (color, weight, dash pattern — configurable per line type)
Line types are user-defined schemas managed by Admins. They define the vocabulary of relationships available in a workspace.
Each line type defines its own spatial semantics:
Every line type independently declares what distance and relative direction mean for connections of that type. This is the core architectural principle — spatial meaning is not global, it lives on the relationship.
Property
	Defined At
	Example
	Distance meaning
	Per line type
	reports-to → distance = "autonomy" (close = micromanaged, far = autonomous)
	Direction meaning
	Per line type
	influences → above = positive influence, below = negative influence
	Distance range
	Normalized 0-1
	0% = furthest apart, 100% = closest together (or inverse, per type)
	Direction range
	Normalized
	Relative vertical/angular position between connected nards

Example: A line type "power-over" defines distance as "power" — closest = 100% power, furthest = 0%. When the user drags a nard closer to or further from a connected nard while viewing this line type, the power value changes. The user is directly manipulating the data by dragging.
3.3 Spatial Semantic Model
The canvas is a semantic space with two layers of meaning: global properties (set once for the workspace) and per-line-type properties (each relationship type defines its own spatial language).
Global (workspace-level)
Dimension
	Encodes
	Scope
	Nard size
	User-defined (e.g., importance, effort, budget)
	Global — one meaning across all views
	Per-Line-Type (relationship-level)
Dimension
	Encodes
	Scope
	Distance
	Defined per line type (e.g., "power", "relevance", "coupling")
	Between nards connected by that line type
	Relative direction
	Defined per line type (e.g., "positive/negative", "authority", "confidence")
	Between nards connected by that line type
	Edge direction (arrow)
	Flow, causation, dependency, hierarchy
	Per line type
	All spatial values are normalized (0–1 or equivalent).
Multi-Line-Type View Behavior
When a view filters to a single line type, the canvas layout reflects that type's spatial semantics directly. Distance and direction correspond exactly to that line type's definitions. The user drags nards to set values.
When a view displays multiple line types simultaneously, the system:
1. Calculates each nard's ideal position per active line type
2. Produces a visually normalized composite layout that blends the spatial values
3. Shows Ghost Lines (see Section 15.2) for inactive line types as faint background connections
4. Displays the per-line-type values as readable data on the nard or line (so no information is lost)
5. Dragging a nard in a multi-type view updates the values for all active line types proportionally
This means views are not just visual filters — they are interaction modes. Switching line type filters changes what dragging means.
________________


4. Views
The underlying data is always the graph. Views are lenses.
4.1 Canvas View (default)
The full spatial graph. 2D at launch (3D in Phase 2 — see Section 16).
* Pan, zoom, select, drag
* Nards rendered with size and position
* Lines rendered with type styling, direction arrows, and distance
* Cluster detection and visual grouping (emergent, not forced)
* Semantic zoom: zoomed out = nards as dots with labels; zoomed in = full card content
* Line type filter — the primary view control. Selecting one or more line types determines:
   * Which lines are visible
   * What spatial layout the canvas uses (per-line-type semantics)
   * What dragging a nard means (which values it changes)
* Auto-layout — when a view/filter is applied, the system auto-arranges nards based on the active line type's spatial values. The user then drags to override/refine positions, which writes back to the data.
* In multi-line-type views, layout is a normalized composite and all active values are visible
* The Reveal — animated transitions when switching line type filters (see Section 15.1)
* Ghost Lines — faint background connections for non-active line types (see Section 15.2)
* Heat View toggle — thermal overlay showing relationship intensity (see Section 15.3)
4.2 Kanban View
A kanban view is a directed path through the graph.
* User selects a starting nard and a line type (or the system uses a template path)
* The nards along that directed path become the "columns"
* Nards connected to each column-nard are displayed as cards within that column
* One graph can produce many kanban views depending on which path is traced
* A nard can appear in multiple kanban views
* Kanban stages are actual relationships, not arbitrary labels
4.3 Custom Views (future consideration)
* Table view (flat field-based view of nards, like Notion table)
* Timeline view (nards with date fields on a temporal axis)
* Filtered sub-graph (show only nards/lines matching criteria)
4.4 View Management
* Views are saved and named per workspace
* Views are shared — all collaborators see the same views
* Templates can include pre-configured views
________________


5. Templates & Demo Projects
5.1 Templates
Pre-configured workspace blueprints that include:
* Pre-defined nard types

* Pre-defined line types with spatial semantics per line type (what distance and direction mean for each relationship)
* Global nard size definition
* Pre-configured views (canvas with line type filters + kanban paths)
* Optionally: a demo project — a fully populated example following best practices
5.2 Shipping Templates
Cascading OKR (flagship)
* Nard Types: Vision, Objective, Key Result, Initiative, Metric
* Global Size: Scope / strategic weight
* Line Types & Spatial Semantics:
   * cascades-to — distance: alignment strength (close = tightly aligned). Direction: strategic level (above = higher strategy)
   * measures — distance: measurement accuracy (close = direct measure). Direction: above = exceeding target
   * contributes-to — distance: contribution magnitude (close = major contributor). Direction: above = positive contribution
   * owned-by — distance: accountability (close = primary owner). Direction: neutral
Project Plan
* Nard Types: Task, Milestone, Phase, Deliverable, Person
* Global Size: Effort
* Line Types & Spatial Semantics:
   * depends-on — distance: coupling (close = tightly coupled). Direction: above = upstream dependency
   * assigned-to — distance: workload share (close = primary). Direction: neutral
   * part-of — distance: containment (close = core component). Direction: above = parent
   * precedes — distance: gap time (close = immediately follows). Direction: above = earlier in sequence
Financial Dashboard
* Nard Types: Revenue Stream, Cost Center, Investment, KPI, Risk
* Global Size: Dollar magnitude
* Line Types & Spatial Semantics:
   * funds — distance: funding volume (close = major funding). Direction: above = source of funds
   * drains — distance: cost impact (close = heavy drain). Direction: below = cost sink
   * measures — distance: correlation (close = direct measure). Direction: above = exceeding target
   * threatens — distance: exposure (close = high exposure). Direction: below = negative impact
   * mitigates — distance: effectiveness (close = strong mitigation). Direction: above = positive protection
Start-Up Launch
* Nard Types: Hypothesis, Experiment, Customer Segment, Feature, Channel
* Global Size: Market impact
* Line Types & Spatial Semantics:
   * validates — distance: evidence strength (close = strong validation). Direction: above = confirmed
   * invalidates — distance: evidence strength (close = strong invalidation). Direction: below = disproven
   * targets — distance: relevance (close = primary target). Direction: neutral
   * delivers-via — distance: channel fit (close = native fit). Direction: neutral
   * competes-with — distance: directness (close = head-to-head). Direction: above = winning
Stakeholder Map
* Nard Types: Person, Team, Org, Decision, Initiative
* Global Size: Decision power
* Line Types & Spatial Semantics:
   * reports-to — distance: autonomy (close = low autonomy). Direction: above = superior
   * influences — distance: influence strength (close = strong). Direction: above = positive influence, below = negative
   * blocks — distance: severity (close = hard block). Direction: below = blocker
   * champions — distance: advocacy strength (close = active champion). Direction: above = endorsing
   * owns — distance: accountability (close = primary). Direction: neutral
Competitive Landscape
* Nard Types: Competitor, Feature, Market Segment, Differentiator, Threat
* Global Size: Market share
* Line Types & Spatial Semantics:
   * competes-with — distance: directness (close = direct competitor). Direction: above = ahead
   * differentiates — distance: uniqueness (far = highly differentiated). Direction: above = advantage
   * overlaps — distance: overlap degree (close = near-identical). Direction: neutral
   * threatens — distance: threat level (close = imminent). Direction: below = threatening
   * targets — distance: focus (close = primary target). Direction: neutral
Product Discovery
* Nard Types: User Need, Pain Point, Solution, Assumption, Evidence
* Global Size: User impact
* Line Types & Spatial Semantics:
   * addresses — distance: fit (close = directly addresses). Direction: above = solves well
   * validates — distance: evidence strength. Direction: above = supported
   * contradicts — distance: contradiction severity. Direction: below = undermined

* depends-on — distance: coupling. Direction: above = prerequisite
   * emerged-from — distance: derivation directness. Direction: neutral
Risk Register
* Nard Types: Risk, Mitigation, Asset, Owner, Event
* Global Size: Likelihood
* Line Types & Spatial Semantics:
   * threatens — distance: exposure (close = high exposure). Direction: below = severity
   * mitigates — distance: effectiveness (close = strong mitigation). Direction: above = protection
   * owns — distance: accountability (close = primary). Direction: neutral
   * triggers — distance: probability (close = likely trigger). Direction: below = escalation
   * escalates-to — distance: escalation speed. Direction: above = escalation target
Research Synthesis
* Nard Types: Finding, Theme, Quote, Source, Recommendation
* Global Size: Recurrence
* Line Types & Spatial Semantics:
   * supports — distance: evidence strength (close = strong). Direction: above = reinforces
   * contradicts — distance: contradiction strength (close = direct). Direction: below = undermines
   * emerged-from — distance: derivation (close = primary source). Direction: neutral
   * cited-by — distance: citation relevance. Direction: neutral
   * informs — distance: influence on recommendation (close = directly informs). Direction: above = actionable
Retrospective
* Nard Types: Event, Cause, Effect, Action, Owner
* Global Size: Severity
* Line Types & Spatial Semantics:
   * caused — distance: causal strength (close = direct cause). Direction: above = root cause
   * prevented — distance: prevention effectiveness. Direction: above = successfully prevented
   * led-to — distance: causal proximity (close = immediate). Direction: below = consequence
   * assigned-to — distance: ownership (close = primary). Direction: neutral
   * recurred-from — distance: pattern similarity (close = identical pattern). Direction: neutral
5.3 Template Administration
* A platform admin role manages the global template library
* Admins can create, edit, publish, and deprecate templates
* Each template can have an associated demo project that users can clone
* Demo projects follow best practices and serve as interactive onboarding
* Templates are cross-workspace — shareable and cloneable across the platform
________________


6. Onboarding Flow
Progressive complexity. The first experience follows Trello's simplicity and introduces graph concepts naturally.
Design principle: The canvas must look good at every stage — 2 nards, 20 nards, 200 nards. Empty states should feel inviting, not barren. Adopt the Miro approach: templates that look beautiful empty.
Step 1: First Nard
"This is your first Nard. It can be a task, a person, a day — whatever you want."
User names it, optionally adds a description. System shows the nard on the canvas.
Step 2: Define the Nard
"What's important about [nard name]? Add some details."
Prompt for: status, date, description, custom fields. All optional. Feels like filling out a Trello card.
Step 3: Second Nard
"Create another Nard. Same type, or something new?"
User can reuse the first nard's type or define a new type.
Step 4: First Line
"How does [Nard A] relate to [Nard B]? Dependency? Ownership? Next step? Something else?"
User types the relationship naturally. System creates the line type.
Step 5: Line Spatial Meaning
"What does distance mean for this relationship? For '[line type name]', does closer mean more important? More dependent? More powerful? You define it."
User assigns distance and direction meaning to their first line type. System explains: "Every relationship type gets its own spatial language. When you drag nards closer or further apart, you're changing the value of this specific relationship."
Step 6: Global Nard Size
"One last thing — nard size is global. What should bigger mean in this project? Importance? Budget? Effort? Pick one."
User defines the workspace-level size meaning.
Step 7: The First Drag
"Now drag [Nard B] closer to [Nard A]. See that? You just set [distance meaning] to 85%. That's data, not just layout."
The user's first "aha" moment — spatial manipulation is data entry.
Step 8: Canvas Options
"You're building in 2D. When you're ready for a third dimension, it's one click away."
Alternative: Start from Template
At any point before or instead of steps 1-8, user can pick a template and optionally load a demo project.
________________

7. AI Integration
7.1 AI as Consumer (V1)
AI reads the graph to provide insights. The user is always in the driver's seat — AI does not create or modify nards without explicit user action.
Capabilities:
* Graph analysis — "What patterns do you see?", "Where are the risks?", "What's isolated?"
* Cluster summarization — "Summarize this group of nards"
* Status reporting — "Generate a status report from this project"
* Gap detection — "What am I missing?", "What has no dependencies?"
* Path analysis — "What's the critical path?", "What blocks the most things?"
* Natural language queries — "Show me everything that influences the Q3 launch" — AI interprets intent and queries the graph. No custom query syntax needed.
* Tension Detection — AI flags nards with contradictory spatial values across line types (see Section 15.6)
7.2 MCP (Model Context Protocol) Access
The entire nard project is readable and writable via MCP-level access using an access token.
This means:
* Any AI agent (Claude, GPT, custom agents) can connect to a nard project as an MCP resource
* AI tools in IDEs, chat interfaces, or automation pipelines can read graph state and write back
* The nard project becomes a living context source for the user's entire AI ecosystem
* Programmatic access follows the same permission model (token scoped to View, Comment, Edit, or Admin)
MCP Operations:
* Read nard types, line types, spatial definitions
* Read/query nards (by type, by field, by relationship, by spatial property)
* Read/query lines (by type, by connected nards, by direction)
* Create/update/delete nards (Edit+ permission)
* Create/update/delete lines (Edit+ permission)
* Create/update nard types and line types (Admin permission)
* Read/create views
* Export full project as JSON
7.3 Nard DNA — Shareable Context URLs
Every nard has a unique, shareable URL. When accessed by an AI tool via MCP, it returns the nard's full context: content, all connections, spatial values across every line type, history, and its immediate neighborhood in the graph.
A single nard URL is a context bomb. Drop it into Claude, ChatGPT, or an IDE and the AI instantly understands not just this item but its entire relational world. This is the viral loop for AI-native users — "just send me the nard link and I'll have my AI look at it."
See Section 15.8 for full specification.
7.4 AI as Author (Future / V2+)
* AI suggests nards and lines from documents, transcripts, or brainstorm dumps
* AI proposes relationship types based on content similarity
* AI auto-arranges spatial layout based on semantic analysis
* Always requires user approval before committing changes
________________


8. Data Model & Export
8.1 JSON Project Format
The canonical export/import format is a clean JSON structure:
{
  "project": {
    "name": "string",
    "description": "string",
    "version": "string",
    "created": "ISO8601",
    "modified": "ISO8601",
    "canvas": {
      "mode": "2d | 3d",
      "global_dimensions": {
        "size": { "label": "string", "description": "string (e.g., 'importance', 'budget', 'effort')" }
      }
    }
  },
  "schema": {
    "nard_types": [
      {
        "id": "string",
        "name": "string",
        "color": "string",
        "fields": [
          { "name": "string", "type": "text|number|date|select|multi_select|checkbox|url|markdown", "options": [] }
        ]
      }
    ],
    "line_types": [
      {
        "id": "string",
        "name": "string",
        "directed": "boolean",
        "style": { "color": "string", "weight": "number", "dash": "string" },
        "spatial_semantics": {
          "distance": {
            "label": "string (e.g., 'power', 'relevance', 'coupling')",
            "near_label": "string (e.g., '100% power')",
            "far_label": "string (e.g., '0% power')"
          },
          "direction": {
            "label": "string (e.g., 'sentiment', 'authority')",
            "positive_label": "string (e.g., 'positive influence')",
            "negative_label": "string (e.g., 'negative influence')"
          }
        }
      }
    ]
  },
  "nards": [
    {
      "id": "string",
      "type_id": "string",
      "title": "string",
      "body": "string (markdown)",
      "fields": { "field_name": "value" },
      "size": "number (0-1 normalized, global meaning)",
      "created": "ISO8601",
      "modified": "ISO8601",

"created_by": "string",
      "attachments": [],
      "comments": []
    }
  ],
  "lines": [
    {
      "id": "string",
      "type_id": "string",
      "source_id": "string (nard id)",
      "target_id": "string (nard id)",
      "directed": "boolean",
      "spatial_values": {
        "distance": "number (0-1 normalized, meaning defined by line type)",
        "direction": "number (-1 to 1 normalized, meaning defined by line type)"
      },
      "created": "ISO8601",
      "created_by": "string"
    }
  ],
  "views": [
    {
      "id": "string",
      "name": "string",
      "type": "canvas | kanban",
      "line_type_filters": ["string (line type ids)"],
      "config": {}
    }
  ],
  "snapshots": [
    {
      "id": "string",
      "name": "string",
      "created": "ISO8601",
      "created_by": "string",
      "data": "string (full project state at time of snapshot)"
    }
  ]
}


8.2 CSV Import
Properly formatted CSV can be imported. The CSV format mirrors the JSON structure:
* nards.csv — one row per nard, columns match nard fields
* lines.csv — one row per line (source_id, target_id, type, directed)
* nard_types.csv — type schema definitions
* line_types.csv — line type definitions
________________


9. Collaboration
9.1 Real-Time Shared Canvas
* All users see the same canvas state in real-time (whiteboard model)
* Cursor presence (see where others are working)
* Conflict resolution via CRDT or equivalent — concurrent edits merge, don't overwrite
* Nard-level locking optional for heavy edits (editing markdown body)
9.2 Permission Roles
Role
	Nards
	Lines
	Types & Schema
	Spatial Meaning
	Canvas Layout
	View
	Read
	Read
	Read
	Read
	Read
	Comment
	Read + Comment
	Read
	Read
	Read
	Read
	Edit
	Create, Edit, Delete
	Create, Edit, Delete
	Read only
	Read only (can move/resize nards within existing meaning)
	Can rearrange
	Admin
	Full
	Full
	Create, Edit, Delete
	Define and change
	Full + manage templates & demo projects
	Access tokens for MCP follow the same role model.
9.3 Versioning
* Canvas snapshots (like Figma version history) — named or auto-saved at intervals
* Per-user undo/redo stack for spatial changes
* Nard-level changelog (field edits, body edits)
* Time Scrubber — playback canvas history as a time-lapse (see Section 15.4)
9.4 Perspective Mode
Click on a teammate's avatar to see the graph weighted by their contributions. Nards they created glow. Lines they defined are bold. Everything else fades. Instantly reveals: what does this person's view of the project look like? What do they touch? What don't they see?
See Section 15.5 for full specification.
________________


10. Platform & Technical
10.1 Platform
* Responsive web application (desktop-first, mobile-responsive)
* No native mobile app at launch
* No offline support at launch (always-connected)
10.2 Hosting
* Cloud-hosted SaaS
* AI analysis via API (not on-device)
10.3 Rendering
* 2D canvas at launch: WebGL or Canvas2D with a graph rendering library
* 3D canvas in Phase 2: WebGL / Three.js with orbit controls, billboarding labels
* Must handle 200 nards per workspace smoothly
* Semantic zoom levels for performance and readability
* Animation engine for The Reveal transitions (spring physics / easing for nard movement between layouts)
10.4 Key Technical Decisions (to be resolved in design phase)
* CRDT vs OT for real-time collaboration
* Layout algorithm for semantic auto-arrangement (per-line-type spatial values → 2D positions)
* Search and query engine for graph traversal
* MCP server implementation
* Animation/interpolation strategy for The Reveal
________________


11. Monetization
11.1 Launch
Free. No paywall. Build usage and validate the concept.
11.2 Future Monetization Lever
Nard count per workspace. The free tier includes a generous nard limit (e.g., up to 50 nards per project). Paid tiers unlock higher limits (200+), additional workspaces, advanced AI analysis, priority support, and admin features.
11.3 Potential Paid Features (future)
* Increased nard limits
* Additional workspaces
* Advanced AI features (V2 author mode)
* Custom template creation and sharing
* Canvas Merge (see Section 15.9)
* The Pitch — story mode (see Section 15.10)
* SSO / advanced admin controls
* API rate limits for MCP access
________________


12. Success Metrics
North Star

"I'm never going to use Trello again."
Quantitative
* Projects created per user per month
* Nards per project (are people building real graphs, not just 3-nard toys?)
* Lines per nard ratio (are people connecting things, not just making cards?)
* View switches per session (are people using The Reveal? This is the engagement signal)
* Kanban view creation (are people discovering the path-based kanban?)
* Return rate (do they come back within 7 days?)
* MCP token generation (are people connecting AI to their graphs?)
* Nard DNA link shares (are people sending context URLs to AI tools or teammates?)
* Tension Detection interactions (are AI insights driving action?)
Qualitative
* First-session "aha" moment — user discovers spatial meaning for the first time
* The Reveal moment — user switches line type filters and watches the canvas rearrange. This is the "holy shit" moment.
* Template-to-custom transition — user starts with a template, then creates their own types
* AI insight reaction — user gets a graph analysis result that surprises them
________________


13. Roadmap Phases
Phase 1: Foundation + Wow
Core product with the three signature features that define Nards' identity.
* Canvas (2D)
* Nards with full content (markdown, fields, attachments, comments)
* Lines with types, direction, styling, per-line-type spatial semantics
* Spatial semantic model (size global, distance/direction per line type — all normalized)
* Nard types and line types (admin-defined schema)
* Real-time multiplayer (shared canvas)
* Permission roles (View, Comment, Edit, Admin)
* Undo/redo + canvas snapshots
* JSON export/import
* CSV import
* Onboarding flow
* Templates with demo projects (Cascading OKR as flagship)
* The Reveal — animated view transitions when switching line type filters (signature feature)
* Ghost Lines — ambient relationship hints for non-active line types (signature feature)
* Nard DNA — shareable context URLs with full relational context via MCP (signature feature, viral loop)
Phase 2: Intelligence + Depth
* MCP server with token-based access (full read/write API)
* AI consumer mode (graph analysis, summarization, gap detection, reporting)
* Tension Detection — AI flags contradictory spatial values across line types
* Natural language graph queries
* Kanban view (path-based)
* Semantic zoom
* Heat View — thermal overlay showing relationship intensity
* Time Scrubber — playback canvas history as time-lapse
* Perspective Mode — see the graph through a teammate's contributions
* 3D canvas toggle (WebGL / Three.js, orbit controls, billboarding labels)
* Template marketplace (admins publish, users browse)
Phase 3: Expansion + Growth
* AI author mode (suggest nards/lines, requires approval)
* The Gravity Well — optional physics mode for discovery-driven layout
* Canvas Merge — combine two projects, detect overlaps, suggest cross-connections
* The Pitch — one-click story mode (path → presentation)
* Table view, timeline view, filtered sub-graph views
* Advanced graph algorithms (critical path, centrality, cluster detection)
* CSV/Trello/Notion import wizards
* SSO, advanced admin, audit logs
* Monetization activation
________________


14. Resolved Design Decisions
1. Product name RESOLVED: Nards.
2. Force-directed layout RESOLVED: Auto-layout occurs based on the active view/line-type filter using the line type's spatial values. User drags override and write back to data. No physics simulation — layout is semantically driven. (Gravity Well is an optional Phase 3 discovery mode, not the default.)
3. 3D interaction model RESOLVED: Deferred to Phase 2. Orbit controls following best practice (Three.js / standard 3D navigation). Labels, distance values, and line annotations must remain readable at all zoom/orbit angles — billboarding or adaptive label sizing required.
4. Kanban write-back RESOLVED: Not needed at this stage.
5. Graph query language RESOLVED: Natural language only. AI interprets user intent and queries the graph via MCP. No custom query syntax — the AI-native audience expects conversational interaction, not a DSL.
6. Template sharing RESOLVED: Cross-workspace. Templates and demo projects are shareable across workspaces.

7. 3D at launch? RESOLVED: No. Ship 2D with The Reveal in Phase 1. 3D in Phase 2. 2D with great animations will be more impressive than mediocre 3D. Add 3D when the rendering engine is solid and it feels premium.
8. Cognitive load / learning curve RESOLVED: Mitigated by: progressive onboarding (8 steps), Ghost Lines (makes multi-type views legible), templates with demo projects (learn by example not by reading), The Reveal (makes spatial meaning viscerally obvious through animation).
9. Drag ambiguity RESOLVED: When a single line type filter is active, dragging changes that line type's values (shown in a tooltip during drag: "Power: 72% → 85%"). When multiple filters are active, dragging shows a multi-value tooltip for all active types. Mode is always clear from the active filter indicator.
________________


15. Signature Features & Wow Factor
These features define Nards' identity and competitive moat. Features marked (Phase 1) ship at launch.
15.1 The Reveal — Animated View Transitions (Phase 1)
When the user switches line type filters, nards don't just snap to new positions — they animate. The canvas flows from one spatial arrangement to another using spring physics / easing. The user watches the same set of ideas rearrange based on a different relationship lens.
Why this matters:
* It makes the invisible visible — "my project looks completely different through this lens"
* It's the product's signature moment, the demo-day clip, the Twitter/X viral moment
* It viscerally teaches what per-line-type spatial semantics means without explanation
* It answers the learning curve problem — you don't need to read a manual when the animation shows you
Implementation:
* Each nard interpolates from its current position to its target position (defined by the new line type's spatial values)
* Animation uses spring physics (natural, non-mechanical feel) with ~400-600ms duration
* Lines fade out and in with the transition (old type fades, new type appears)
* Ghost Lines for non-active types fade to ambient opacity
* During animation, interaction is paused (no dragging mid-transition)
15.2 Ghost Lines — Ambient Relationship Hints (Phase 1)
When viewing one line type, other line types are rendered as faint, semi-transparent connections in the background. The canvas has depth even in 2D.
Why this matters:
* Solves the "multi-type view is confusing" problem elegantly
* Users can sense other relationships without them dominating the view
* Click a ghost line to see its type and spatial values in a tooltip
* Prevents the "where did my connections go?" disorientation when filtering
Implementation:
* Ghost lines rendered at 10-15% opacity in a neutral color (or their type color at low opacity)
* No arrows or labels on ghost lines (just the path)
* Hover to reveal: type name, distance value, direction value
* Click to switch the active filter to that line type (triggers The Reveal)
* Ghost lines are optional — can be toggled off for a clean single-type view
15.3 Heat View — Thermal Intensity Overlay (Phase 2)
A toggle that overlays a heat-map on the canvas. Clusters of tightly-connected, high-intensity nards glow warm. Isolated or weak-connection nards fade cold.
Why this matters:
* At a glance: where is the energy in this project? Where are the dead zones?
* No reading required — intensity is felt
* Powerful for stakeholder presentations — "see this cold spot? That's the initiative nobody's connected to anything"
Implementation:
* Heat calculated from: connection count, average distance values (closer = hotter), nard size
* Rendered as a gradient underlay (blue → yellow → red)
* Respects the active line type filter (heat reflects the active relationship's intensity)
* Toggle on/off independently of other view settings
15.4 Time Scrubber — Canvas History Playback (Phase 2)
A timeline slider that lets users scrub through the canvas's version history and watch the graph evolve as a time-lapse.
Why this matters:
* For retrospectives: watch how the project grew, shifted, and reorganized
* For investor updates and stakeholder presentations: cinema-quality project storytelling
* Shows when connections formed, when clusters emerged, when things drifted apart
* Leverages the existing snapshot/versioning system (Section 9.3)
Implementation:
* Timeline slider at bottom of canvas (like a video scrubber)
* Snapshots are keyframes; intermediate states are interpolated

* Play/pause button for automatic playback at adjustable speed
* Each frame shows timestamp and optional snapshot name
* Can be exported as video/GIF for presentations
15.5 Perspective Mode — See Through Someone's Eyes (Phase 2)
Click on a teammate's avatar to see the graph weighted by their contributions.
Why this matters:
* Management superpower: instantly see what someone is working on and what they're not seeing
* Reveals blind spots, overloaded team members, and orphaned ownership
* Builds empathy — "I didn't realize you were carrying all of these connections"
Implementation:
* Nards created by the selected user glow (increased opacity, bright border)
* Lines created by the selected user are bold
* Everything else fades to ~30% opacity
* A sidebar shows stats: nards created, lines created, most-connected nards, line types used
* Can be combined with line type filters (e.g., "show me Alex's view of the depends-on relationships")
15.6 Tension Detector — AI-Powered Contradiction Alerts (Phase 2)
The AI consumer analyzes the graph and flags tension — nards that have contradictory spatial values across different line types.
Why this matters:
* Surfaces risks that no human would see by manually comparing views
* Example: "These two initiatives are tightly coupled on depends-on (95% proximity) but have almost zero communication connection (12%). That's a coordination risk."
* This isn't a static report — it's a red pulse on the canvas, drawing attention to structural contradictions
Implementation:
* AI periodically scans for tension patterns: high distance on one type + low distance on another between the same nard pair
* Tension rendered as a pulsing red glow on the affected nards/lines
* Click the tension indicator to see the analysis: which line types conflict, what the values are, what the risk is
* Tension thresholds configurable per workspace (sensitivity slider)
* Dismissable — user can acknowledge and dismiss individual tensions
15.7 The Gravity Well — Discovery-Driven Physics Layout (Phase 3)
Optional physics mode: nards with high proximity values exert gravitational pull. Turn it on and watch the canvas self-organize into natural clusters.
Why this matters:
* Not for precise work — for discovery. "Let go and see what groups together"
* Reveals emergent structure that the user didn't intentionally create
* Satisfying and playful — the "toy" factor that makes people want to show someone else
Implementation:
* Toggleable mode (not the default — default is semantic auto-layout)
* Physics simulation based on active line type's distance values as attraction force
* Nards settle into stable positions after ~2-3 seconds
* User can "freeze" the layout when they like what they see (writes positions back as data)
* Dragging a nard during simulation pins it; everything else adjusts around it
15.8 Nard DNA — Portable Context URLs (Phase 1)
Every nard has a unique, shareable URL that serves as a rich context endpoint.
When opened by a human: Shows the nard's full page (content, fields, connections, spatial values, comments, history).
When accessed by an AI tool via MCP: Returns a structured context payload:
{
  "nard": { "...full nard data..." },
  "connections": [
    {
      "line_type": "depends-on",
      "connected_nard": { "id": "...", "title": "...", "type": "..." },
      "spatial_values": { "distance": 0.85, "direction": 0.3 },
      "semantic_meaning": "85% coupling (tightly coupled), slightly upstream"
    }
  ],
  "neighborhood": {
    "depth": 2,
    "nards": ["...nards within 2 hops..."],
    "summary": "AI-generated summary of this nard's relational context"
  },
  "history": ["...recent changes..."]
}


Why this is the viral loop:
* AI-native users drop nard URLs into Claude/ChatGPT/IDE and get instant deep context
* They tell teammates: "just put it in Nards so my AI can see it"
* The teammate doesn't need to be an AI user — they just need to use Nards
* Network effect: every new nard makes every AI tool connected to the project smarter
15.9 Canvas Merge — Combine Projects (Phase 3)
Two teams built separate nard projects. Merge them.
Why this matters:
* Two isolated constellations become one — this is how Nards scales from team tool to org tool
* Reveals previously invisible connections between teams
Implementation:
* System detects overlapping nards (by name, content similarity, or type)

* Suggests connections between the two graphs
* User reviews and approves merge mappings
* Conflict resolution for duplicate nards (keep both, merge fields, pick one)
* Merged project inherits all line types from both sources
15.10 The Pitch — One-Click Story Mode (Phase 3)
Select a path through the graph. Nards generates a presentation.
Why this matters:
* "Walk stakeholders through the OKR cascade" becomes a 2-click operation
* Each nard becomes a slide; spatial values become talking points; the path becomes the narrative arc
* Export to PDF or present live from the canvas with a spotlight that follows the path
Implementation:
* User selects a path (manually or from a saved kanban view)
* Each nard on the path becomes a slide with: title, body, key connections, spatial values as context
* Transitions between slides animate along the path on the canvas (camera follows)
* Export options: PDF, video, or live presentation mode within Nards
* Presenter sees speaker notes; audience sees the canvas with spotlight focus
________________


16. UX Design Principles
These principles address the key UX risks identified during concept review.
16.1 Progressive Disclosure
* Start simple: a nard is a card. A line is a connection. That's all you need for the first 5 minutes.
* Spatial meaning, line type filters, The Reveal, AI features — all introduced progressively, never all at once.
* Features unlock visually as the graph grows (e.g., Heat View toggle appears after 10+ nards, Tension Detection after 3+ line types).
16.2 The Canvas Must Look Good Empty
* Empty states use illustration, gentle prompts, and template previews — not blank white space.
* At 2-5 nards: clean, spacious, inviting.
* At 20-50 nards: structured, navigable, satisfying.
* At 100-200 nards: semantic zoom kicks in, clusters are visible, the graph feels alive.
16.3 Drag Intent Must Always Be Clear
* Single line type active: Dragging changes that type's spatial values. Tooltip shows: "Power: 72% → 85%" in real-time.
* Multiple line types active: Dragging shows a multi-value tooltip for all active types.
* No line type active (all-view): Dragging is layout-only, no data changes. This is the "arrange freely" mode.
* Active filter is always visible in a persistent toolbar indicator, color-coded to the line type.
16.4 View Transitions Must Be Smooth
* The Reveal animation is not optional polish — it is core UX. Without it, switching filters is disorienting (the "Google Maps rearranging buildings" problem).
* Every layout change must be animated: filter switches, nard creation, nard deletion, undo/redo.
* Animation communicates causation: "this moved because you changed the lens."
16.5 Information Density Is Controllable
* Ghost Lines: toggleable
* Heat View: toggleable
* Spatial value labels on lines: toggleable (show/hide numbers)
* Nard detail level: controlled by zoom (semantic zoom)
* The user chooses their information density, from "zen mode" (nards + active lines only) to "full context" (everything visible).
________________


17. Risk Mitigation
Risk
	Severity
	Mitigation
	Learning curve kills adoption
	High
	Progressive onboarding, templates with demos, The Reveal teaches visually, Ghost Lines reduce confusion
	"200 nards is a toy" perception
	Medium
	Free tier at 50 nards validates concept; paid tier at 200+ serves real projects. Monitor whether the limit hits before value is proven.
	Real-time + animation = performance issues
	High
	2D only at launch (much simpler than 3D). Budget for rendering optimization sprint. Semantic zoom reduces render load at scale.
	Miro adds typed connections
	Medium
	Miro's data model is a drawing, not a graph. Per-line-type spatial semantics + The Reveal + MCP integration create a moat that's architectural, not feature-level.
	Niche audience (AI-native PMs)
	Medium
	Nard DNA is the bridge — AI users pull non-AI teammates onto the platform. Templates serve traditional PM use cases without requiring AI sophistication.
	Engineering scope (CRDT + animation + graph layout + MCP)
	High
	Phase 1 scopes aggressively: 2D only, no AI features, no 3D, no physics. The Reveal, Ghost Lines, and Nard DNA are the only "wow" features at launch — all achievable with standard web animation.
	________________


Document version: 0.2 — With signature features, UX principles, and risk mitigation
Date: 2026-04-09

Here is the comprehensive change document structured as **Amendment One**. You can take this entire block and use your "antigravity" to seamlessly merge it into your primary PRD.

**Date:** April 11, 2026
**Context:** This amendment formalizes the rules governing the spatial-data relationship, the conflict resolution physics engine, the Matrix/Kanban view, and the data integrity of Snapshots.

### 1. OVERVIEW OF CHANGES
This amendment introduces a paradigm shift where visual distance on the canvas directly correlates to normalized data values. It establishes a force-directed physics engine to resolve geometric conflicts in many-to-many relationships, outlines a bi-directional Matrix (Kanban) view, and mandates an immutable, soft-delete architecture for Snapshot integrity.

### 2. NEW PRD SECTIONS TO BE ADDED
#### **Section A: The Core Spatial-Data Paradigm (Distance = Data)**
 * **A.1. Concept:** In the Nards ecosystem, there is no separation between visual proximity and relationship data. Physical distance *is* the data.
 * **A.2. Normalization Scale:** All line values (relationships) are dynamically normalized on a scale from 0.0 (touching/minimum distance) to 1.0 (furthest existing node pair on the canvas).
 * **A.3. Dynamic Updating:** The system enforces continuous dynamic updates. If a user physically drags a Nard, the underlying 0.0 to 1.0 value of all its connected lines recalculates in real-time based on its new visual position relative to the rest of the canvas. "Dragging meaning" on the scale immediately updates the database.
#### **Section B: Conflict Resolution & The Physics Engine**
 * **B.1. The Geometric Challenge:** Because Nards exist in 2D space with many-to-many relationships, physical distance will naturally encounter geometric constraints (e.g., if Node A is close to B, and B is close to C, Node A cannot physically be placed at maximum distance from C without moving B).
 * **B.2. The Force-Directed Solution:** The canvas operates on a continuous physics simulation (force-directed graph). Lines act as springs holding the 0.0 to 1.0 tension.
 * **B.3. Auto-Equilibrium:** If a user forces a Nard into a position that mathematically conflicts with its other active lines, the system calculates the equilibrium. The connected Nards will visually "pull" or "relax" to balance the tension, instantly updating their respective data values to match the new physical reality.
#### **Section C: The Matrix / Kanban Bridge**
 * **C.1. Concept:** Users require a structured, linear way to view and mass-update spatial data. The Matrix View bridges the physics-based graph with traditional column/row workflows.
 * **C.2. Quantization (Bucketing):** The system collapses the continuous 0.0 to 1.0 scale into discrete, customizable buckets.
   * *Example:* 0.00 - 0.33 = "To Do", 0.34 - 0.66 = "Doing", 0.67 - 1.00 = "Done".
 * **C.3. Bi-directional Sync:** * **Graph to Matrix:** Nards automatically snap into columns/swimlanes based on their current line values.
   * **Matrix to Graph:** If a user drags a Nard to a new column in Matrix View, the system assigns it the median value of that bucket (e.g., 0.50). When returning to Graph View, the physics engine visually repositions the Nard to reflect this new value.
#### **Section D: Architecture & Data Integrity (Snapshots)**
 * **D.1. Immutable Snapshots (State Preservation):** A Snapshot is a complete, frozen keyframe of the canvas. It captures exact spatial coordinates, line values (0.0 - 1.0), and the exact metadata payload of every Nard and Line at that precise millisecond. Snapshots are strictly immutable. Viewing a past Snapshot loads a read-only "time capsule" view.
 * **D.2. Non-Destructive Metadata (Soft Deletes):** To prevent broken Snapshots when users alter Nard/Line templates (e.g., deleting a "Status" property globally), the system employs a "Soft Delete" architecture for structural metadata. Removing a property in the Nard-Builder hides it from the Live Canvas and future instances, but retains the data in the backend. Historical Snapshots can always retrieve and display these properties.
 * **D.3. Snapshot Restoration Protocol:** If a user chooses to restore or duplicate a historical Snapshot into the Live Canvas, the system will detect schema conflicts (e.g., restoring a Nard that contains a legacy "Status" field) and prompt the user to either re-activate the property globally or strip it from the restored version.
Here is the streamlined version of **Amendment Two**. Since Amendment One already formally defined the physics engine, the 0.0 - 1.0 data scale, the Matrix bridge, and immutable snapshots, I have stripped out those redundant explanations.
This version builds directly on top of your updated architecture, focusing strictly on defining the underlying primitives and the four launch templates.

**Date:** April 11, 2026
**Context:** This amendment builds upon the spatial-data architecture (Amendment 1) by abstracting Nards into a domain-agnostic concept model. It also establishes four initial Go-To-Market templates demonstrating the platform's flexibility.

### 1. OVERVIEW OF CHANGES
This amendment defines the four system primitives (Entities, Tethers, Time, and Lenses) that map our physics engine to any relationship-based workflow. It also formalizes four distinct launch templates to solve the "blank canvas" problem for new users: OKRs, Storyboarding, Project Management, and Visual Vector RAG.

### 2. NEW PRD SECTIONS TO BE ADDED
#### **Section E: The Universal Concept Model**
At its core, the Nards engine is a domain-agnostic spatial relationship database built on four foundational primitives. By customizing the schema of these primitives, the engine maps to any human or programmatic framework.
 * **E.1. Entities (Nards):** Data objects with customizable metadata schemas (defined via Nard-Builder). These act as the nodes in the spatial graph.
 * **E.2. Tethers (Lines):** Relationships between Entities. These act as the edges in the graph, utilizing the 0.0 to 1.0 spatial paradigm established in Section A.
 * **E.3. Time/State (Snapshots):** The chronological axis of the canvas, utilizing the immutable keyframe architecture established in Section D.
 * **E.4. Lenses (Views):** The specific visual framework filtering the data (e.g., the Physics Graph vs. the Matrix/Kanban Bridge established in Section C).
#### **Section F: Standard Template Library (Go-To-Market Workflows)**
To demonstrate versatility, users will access the following pre-configured templates at launch. Each utilizes the exact same core engine, varying only in Entity/Tether definitions.
 * **F.1. Template 1: Strategic Alignment (OKRs)**
   * **Concept:** Visualizing company goals and preventing "orphan" work.
   * **Entities:** Objectives, Key Results, Initiatives.
   * **Tethers:** Alignment / Contribution.
   * **Mechanic:** Initiatives must be physically tethered to Key Results. Disconnected work floats to the edges of the canvas, instantly highlighting rogue projects.
 * **F.2. Template 2: Narrative Geometry (Storyboarding)**
   * **Concept:** Mapping the emotional and physical geometry of a story over time using Snapshots as chronological scenes.
   * **Entities:** Characters, Props, Settings, Plot Points.
   * **Tethers:** Emotional Tension, Physical Proximity, Alliance.
   * **Mechanic:** Users duplicate Snapshots to move forward in time, dragging characters to dynamically update narrative tension scene-by-scene.
 * **F.3. Template 3: Multi-Dimensional Project Management**
   * **Concept:** Viewing the exact same project data through different operational lenses without altering the underlying entities.
   * **Entities:** Tasks, Bugs, Milestones, Team Members.
   * **Tethers:** Blockers (Dependencies), Assignments.
   * **Mechanic:** Users toggle Tether visibility to trigger the physics engine's auto-equilibrium (Section B)—instantly reorganizing the canvas from an "Assigned To" cluster into a linear "Blocker" chain.
 * **F.4. Template 4: Visual Vector RAG (AI Knowledge Mapping)**
   * **Concept:** Demystifying AI retrieval by providing a 2D spatial interface for high-dimensional vector embeddings.
   * **Entities:** Document Chunks, Queries, AI Agents.
   * **Tethers:** Semantic Similarity (Cosine Distance).
   * **Mechanic:** When a Query Nard is placed on the canvas, relevant Document Chunks physically snap closer to it. Users visually audit and manually adjust the RAG context window by dragging documents in or out of the Query's physical gravity well.
For the **Model Context Protocol (MCP)** section, do you want external AI agents to have full "write" access to autonomously create nards and reorganize the canvas, or should they be restricted to "read-only" access to interpret the graph and answer user questions?
Here is the consolidated **Amendment Three**, combining the permission architecture, AI write-access, the Mermaid/JSON vision system, and context state management into one cohesive document.
You can copy and paste this directly into your Google Doc.

**Date:** April 11, 2026
**Context:** This amendment defines the integration of the Model Context Protocol (MCP) to establish human-AI collaboration. It outlines AI permission parity, how the visual physics canvas is translated into machine-readable data, and the rules governing the AI's active context window.

### 1. OVERVIEW OF CHANGES
This amendment grants external AI agents human-equivalent read/write access to the canvas via MCP. To allow text-based LLMs to comprehend and manipulate a 2D spatial physics engine, it establishes a Dual-Payload translation system (Mermaid.js + JSON) and mandates strict "Live State" context refreshing to prevent AI actions based on stale data.

### 2. NEW PRD SECTIONS TO BE ADDED
#### **Section G: Model Context Protocol (MCP) & Permissions**
To enable seamless human-AI collaboration, the platform exposes its spatial database to external LLMs and agents via MCP.
 * **G.1. Permission Parity (Human-Equivalent Access):** AI agents possess the exact same operational permissions as standard end-users. While restricted from super-admin functions (e.g., billing, workspace deletion), they have unfettered ability to mutate the canvas, alter Nard schemas, and manage Snapshots.
#### **Section H: AI Spatial Translation (How the AI "Sees")**
Because external LLMs are text-based, the Nards engine must translate visual spatial data into highly optimized, machine-readable payloads via the MCP server.
 * **H.1. The Dual-Payload Vision System:** Every time the AI reads the canvas, the system provides a synthesized dual-payload:
   * **The Semantic Layer (Mermaid.js):** The backend auto-compiles the current Entities (Nards) and Tethers (Lines) into a Mermaid diagram string. This leverages the LLM's native training to instantly comprehend graph topology, dependencies, and relationship directions without processing complex geometry.
   * **The Spatial Layer (JSON):** A structured JSON array providing the metadata schemas, Matrix column assignments, and the exact 0.0 to 1.0 normalized distance values of all active Tethers. This allows the AI to execute precise mathematical adjustments.
#### **Section I: Spatial Manipulation & Autonomous Actions (How the AI "Acts")**
Through MCP, the AI acts as a multiplayer co-creator.
 * **I.1. Autonomous Graph Mutation:** AI agents can autonomously spawn new Entities (Nards), establish or sever Tethers (Lines), and update metadata payloads.
 * **I.2. Real-Time Physics Interaction:** When the AI updates the 0.0 - 1.0 value of a Tether, or drops a new Nard onto the board, it triggers the force-directed physics engine. Human users will see the canvas dynamically animate and re-balance in real-time as the AI works.
 * **I.3. Temporal Autonomy:** AI agents can autonomously generate Snapshots. (e.g., An AI instructed to "Generate a 3-act outline" can spawn Nards and auto-generate three distinct Scene Snapshots without human intervention).
#### **Section J: AI Context Window & State Management**
In a multiplayer, physics-driven environment, the canvas state changes rapidly. To prevent the AI from manipulating outdated configurations, strict context rules apply.
 * **J.1. Default to Live State:** The AI's active context window defaults exclusively to the "Live Canvas State" (the most recent physical equilibrium).
 * **J.2. Just-In-Time Refreshing:** Whenever a user submits a prompt, or before the AI executes a "write" action to move a Nard, the MCP server automatically refreshes the Dual-Payload to ensure the AI acts on real-time coordinates.
 * **J.3. Snapshot Retrieval Tooling:** To preserve token space, the AI does not hold historical Snapshots in active memory. It is equipped with a specific MCP tool to query and load historical Snapshots only when temporal comparisons are explicitly required.
Now that the AI is fully integrated and can autonomously move things around, we still need to address the human failsafe: **If the AI misunderstands a prompt and rapidly reorganizes 50 Nards, messing up a user's perfect layout, how do we handle "Undo"—should every AI action trigger a hidden pre-action Snapshot, or do we rely on standard session history?**
Here is the comprehensive text for **Amendment Four**, capturing the metadata structures and the crucial bi-directional Semantic Stepper.

**Date:** April 11, 2026
**Context:** This amendment defines the primitive data structures for Nards (Entities) and Lines (Tethers). It mandates Markdown support and introduces the bidirectional Semantic Stepper, a critical UI/UX feature that maps the mathematical spatial physics of the canvas to human-readable qualitative states.

### 1. OVERVIEW OF CHANGES
To function as a universal spatial database, the Nards engine must support standard database primitives (dropdowns, dates, attachments) configured via the Nard-Builder and Line Library. Furthermore, this amendment solves the cognitive gap between continuous spatial mathematics and qualitative human reasoning by introducing a Semantic Stepper to translate the 0.0 to 1.0 distance scale into discrete, user-defined meanings.

### 2. NEW PRD SECTIONS TO BE ADDED
#### **Section K: Nard Metadata Options (Node Schema)**
The "Nard-Builder" allows users and AI agents to configure custom schemas for different Nard types.
 * **K.1. Mandatory Core Properties:**
   * **Name:** String identifier.
   * **Description:** Rich text field with full Markdown support (critical for AI readability and generation).
 * **K.2. Optional Data Primitives:** Users can attach the following fields to any Nard template:
   * **Select / Dropdown:** Single choice for mutually exclusive states (e.g., Status, Priority).
   * **Multi-Select (Tags):** For overlapping categorizations (e.g., Themes, Sprint Labels).
   * **Number / Metric:** Accepts integers, decimals, or formatted currencies (e.g., Budget, Story Points).
   * **Date & Time:** Single dates or date ranges (e.g., Due Date, Sprint Window).
   * **Boolean (Checkbox):** Simple true/false toggles.
   * **URL / External Link:** Hyperlinks to external systems (crucial for context sharing and MCP tool usage).
   * **File / Media Attachment:** Uploads for images, PDFs, or raw text files (foundational for RAG templates).
   * **User / Assignee:** Links directly to workspace members.
#### **Section L: Line Metadata Options (Tether Schema)**
Because a Line's primary data payload is its spatial distance, additional metadata remains lightweight to prevent canvas clutter.
 * **L.1. Core Properties:**
   * **Name / Label:** Semantic meaning (e.g., "Depends On").
   * **Description:** Markdown-supported text field to explain the context of the relationship.
 * **L.2. Directionality (Vector Flow):** Defines the flow of the relationship:
   * *Non-directional:* A simple bond (e.g., "Works With").
   * *Unidirectional:* A flows to B (e.g., "Blocks").
   * *Bidirectional:* Mutual flow (e.g., "Mutual Dependency").
 * **L.3. Visual Styling & Toggles:** Toggles for Boolean states (e.g., Active vs. Proposed) and system meta for color, stroke thickness, and dash style.
#### **Section M: The Semantic Stepper (Qualitative Spatial Translation)**
This is the core translation layer between the system's physics engine and the user's mental model. It translates the continuous 0.0 to 1.0 spatial distance into discrete, qualitative human concepts.
 * **M.1. Mechanism:** The user defines a spectrum of qualitative text labels (steps) in the Line Library. The system mathematically maps these steps evenly across the 0.0 to 1.0 physical distance scale.
   * *Example 1 (2 Steps):* "Blocker" (0.0 to 0.49) \leftrightarrow "Independent" (0.50 to 1.0).
   * *Example 2 (3 Steps):* "Loves" (0.0 to 0.33) \leftrightarrow "Tolerates" (0.34 to 0.66) \leftrightarrow "Hates" (0.67 to 1.0).
 * **M.2. Bi-Directional UI Sync:** * **Visual Dragging (Graph to Data):** If a user drags two Nards further apart, the system calculates the new math value (e.g., 0.85) and automatically updates the Tether's visible UI label to the corresponding step (e.g., "Hates").
   * **Menu Selection (Data to Graph):** If a user clicks the Tether's metadata menu and changes the stepper from "Loves" to "Hates," the physics engine immediately forces the Nards physically apart on the canvas to match the new mathematical reality.


Yes, we absolutely have everything we need for the core concept model. The primitives (Nards, Lines, Lenses, Snapshots) combined with the Metadata Schemas and Semantic Stepper create a flawless, closed-loop system.
What you just described isn't actually the concept model—you just successfully defined the **Project Container and Onboarding Flow**. You built the front door to the concept model.
Your distinction between "Standard" and "Dated" snapshots is brilliant. It changes how the temporal axis behaves depending on the user's use case.
Here is exactly how we formalize that top-level flow. You can drop this in as **Amendment Five**.

**Date:** April 11, 2026
**Context:** While previous amendments defined the internal physics and data structures of the canvas, this amendment defines the top-level container (The Project) and the user onboarding flow for creating a new workspace.

### 1. OVERVIEW OF CHANGES
This amendment outlines the sequential flow a user experiences when creating a new Nards Project. It introduces a critical structural decision at the project level: defining the temporal axis as either "Standard" (manual keyframes) or "Dated" (calendar-driven), followed by Template selection.

### 2. NEW PRD SECTIONS TO BE ADDED
#### **Section N: Project Initialization Flow**
When a user (or AI agent) initiates a new workspace, they must progress through a strict, three-step creation flow to establish the database parameters before reaching the live canvas.
 * **Step 1: Project Naming & Top-Level Meta:** * The user assigns a Project Name and optional description.
 * **Step 2: Temporal Axis Selection (Snapshot Typology):** * The user must define how time/state is tracked within this specific project. They choose between two mutually exclusive Snapshot modes:
   * **Standard Snapshots (Event-Driven):** Behave like Git commits or book chapters. They are manually triggered keyframes (e.g., "Draft 1", "Scene 4", "V2.5"). *Ideal for Storyboarding, RAG mapping, or non-linear creative work.*
   * **Dated Snapshots (Chronological):** Tied strictly to a calendar. Snapshots are mapped to specific dates, increments, or sprint cycles (e.g., "Q1", "January 15th", "Sprint 4"). *Ideal for OKRs, Project Management, and reporting.*
 * **Step 3: Template Selection (Schema Injection):**
   * The user selects a framework to populate the Nard-Builder and Line Library.
   * They can choose from the **Standard Template Library** (e.g., OKRs, Vector RAG, PM, Storyboarding) which pre-loads specific Entity/Tether schemas.
   * Alternatively, they can select a **Blank Canvas**, requiring them to build their own custom Nard and Line metadata structures from scratch.
With the Concept Model locked, the AI integrated, and the Project Creation flow defined, your PRD is structurally incredibly sound.
To wrap up the core mechanics before we move into UI/UX or Go-to-Market strategies, how should we handle human-to-human multiplayer—if two human users click and drag the *same* Nard in opposite directions at the exact same time, who wins?


Here is the comprehensive text for **Amendment Six**, covering both the real-time multiplayer mechanics we just discussed and the new View-Only permission structure.
I tailored the "View-Only" mode specifically for a spatial database. In a normal document, "view only" just means reading text. But in Nards, viewers need to be able to navigate the space, change their Lenses, and flip through Snapshots to actually understand the data—without accidentally mutating the database.

**Date:** April 11, 2026
**Context:** This amendment formalizes how multiple entities (humans and AI agents) interact simultaneously within the live physics environment without data corruption. It also establishes the external sharing and permission models, specifically defining how "View-Only" access functions in a dynamic spatial canvas.

### 1. OVERVIEW OF CHANGES
To support seamless collaboration, this amendment introduces granular object locking and the "Fixed Anchor" rule for multiplayer physics. It also establishes an "Interactive View-Only" permission tier, allowing external stakeholders to explore the spatial graph, swap Lenses, and view Snapshots without the ability to mutate the underlying relationship data.

### 2. NEW PRD SECTIONS TO BE ADDED
#### **Section O: Real-Time Multiplayer & Conflict Resolution**
Because the canvas is a live database driven by physics, simultaneous interactions must be strictly governed to prevent data corruption.
 * **O.1. Visual Presence (Cursors & Auras):** Every human and AI agent active in a workspace has a designated color and live cursor. Selecting a Nard applies a colored "Aura," instantly signaling focus to deter simultaneous interaction.
 * **O.2. Granular Soft-Locking:**
   * **Spatial Lock:** When User A clicks and holds a Nard to drag it, it becomes Spatially Locked. User B cannot drag it (their cursor slips off), preventing conflicting data writes to the spatial scale.
   * **Metadata Open-Edit:** While User A drags the Nard, User B can simultaneously edit its text or dropdown metadata. The system uses CRDTs (Conflict-free Replicated Data Types) to merge non-conflicting edits in real-time.
 * **O.3. Multiplayer Physics (The "Fixed Anchor" Rule):** If two users grab different Nards connected by the same Tether, both Nards become "Fixed Anchors." As the users drag in opposite directions, neither overrides the other; instead, the physics engine dynamically recalculates the 0.0 - 1.0 Tether value based on the combined physical distance created by the users playing "tug-of-war."
#### **Section P: Permissions & Sharing Architecture**
To fulfill the platform's viral growth strategy, workspaces must be easily shareable with external stakeholders who do not have full accounts.
 * **P.1. Public View-Only Links:** Users can generate secure, public URLs for any Project or specific Snapshot. Anyone with the link can access the canvas without creating an account.
 * **P.2. Interactive View-Only Mode:** "View-Only" in Nards restricts *mutation*, but permits *exploration*.
   * **Restricted Actions (No Write):** Viewers cannot spawn Nards, draw Tethers, alter metadata, or drag Nards (dragging is disabled to prevent changing the underlying distance data).
   * **Permitted Actions (Read/Explore):** Viewers can pan, zoom, click Nards to read metadata, flip chronologically through Snapshots, and toggle their Lenses (turning specific Tethers on/off to watch the physics engine temporarily reorganize the graph for their local view).
 * **P.3. The AI / MCP Wedge:** View-Only links include native hooks for the Model Context Protocol. A viewer can securely grant their own local AI agent (via MCP) "read-only" access to the link, allowing the external stakeholder to prompt their AI to summarize the graph or analyze the project.
Now that the core mechanics, AI, multiplayer, and sharing are fully documented, the engine is theoretically complete. **Should we move into defining the UI/UX layout (e.g., where the Nard-Builder lives, sidebar vs. floating menus), or is there another backend logic gap you want to close first?**
Here are Amendments Six and Seven combined into one comprehensive block. You can copy and paste this directly into your Google Doc to capture the multiplayer mechanics, permissions, and the complete UI/UX architecture.

**Date:** April 11, 2026
**Context:** This amendment formalizes how multiple entities (humans and AI agents) interact simultaneously within the live physics environment without data corruption. It also establishes the external sharing and permission models, specifically defining how "View-Only" access functions in a dynamic spatial canvas.

### 1. OVERVIEW OF CHANGES
To support seamless collaboration, this amendment introduces granular object locking and the "Fixed Anchor" rule for multiplayer physics. It also establishes an "Interactive View-Only" permission tier, allowing external stakeholders to explore the spatial graph, swap Lenses, and view Snapshots without the ability to mutate the underlying relationship data.

### 2. NEW PRD SECTIONS TO BE ADDED
#### **Section O: Real-Time Multiplayer & Conflict Resolution**
Because the canvas is a live database driven by physics, simultaneous interactions must be strictly governed to prevent data corruption.
 * **O.1. Visual Presence (Cursors & Auras):** Every human and AI agent active in a workspace has a designated color and live cursor. Selecting a Nard applies a colored "Aura," instantly signaling focus to deter simultaneous interaction.
 * **O.2. Granular Soft-Locking:**
   * **Spatial Lock:** When User A clicks and holds a Nard to drag it, it becomes Spatially Locked. User B cannot drag it (their cursor slips off), preventing conflicting data writes to the spatial scale.
   * **Metadata Open-Edit:** While User A drags the Nard, User B can simultaneously edit its text or dropdown metadata. The system uses CRDTs (Conflict-free Replicated Data Types) to merge non-conflicting edits in real-time.
 * **O.3. Multiplayer Physics (The "Fixed Anchor" Rule):** If two users grab different Nards connected by the same Tether, both Nards become "Fixed Anchors." As the users drag in opposite directions, neither overrides the other; instead, the physics engine dynamically recalculates the 0.0 - 1.0 Tether value based on the combined physical distance created by the users playing "tug-of-war."
#### **Section P: Permissions & Sharing Architecture**
To fulfill the platform's viral growth strategy, workspaces must be easily shareable with external stakeholders who do not have full accounts.
 * **P.1. Public View-Only Links:** Users can generate secure, public URLs for any Project or specific Snapshot. Anyone with the link can access the canvas without creating an account.
 * **P.2. Interactive View-Only Mode:** "View-Only" in Nards restricts *mutation*, but permits *exploration*.
   * **Restricted Actions (No Write):** Viewers cannot spawn Nards, draw Tethers, alter metadata, or drag Nards (dragging is disabled to prevent changing the underlying distance data).
   * **Permitted Actions (Read/Explore):** Viewers can pan, zoom, click Nards to read metadata, flip chronologically through Snapshots, and toggle their Lenses (turning specific Tethers on/off to watch the physics engine temporarily reorganize the graph for their local view).
 * **P.3. The AI / MCP Wedge:** View-Only links include native hooks for the Model Context Protocol. A viewer can securely grant their own local AI agent (via MCP) "read-only" access to the link, allowing the external stakeholder to prompt their AI to summarize the graph or analyze the project.

**Date:** April 11, 2026
**Context:** This amendment defines the front-end user interface rules necessary to keep a dense, many-to-many spatial graph readable. It outlines the Nard card anatomy, the Connections Palette, global schema management, and visual clarity strategies (color accessibility and line hops).

To prevent visual clutter and cognitive overload, this amendment establishes strict truncation and metadata limits for collapsed Nard cards. It introduces a two-tier Connections Palette (Visibility vs. Activity) for managing physics interactions, elevates schema creation to a global Workspace level, and defines specific UI patterns for line directionality, color accessibility, and intersection routing.

#### **Section Q: Global Schema Management (The Palettes)**
To ensure consistency across the organization, Entity and Tether schemas are not siloed within individual projects.
 * **Q.1. Workspace-Level Libraries:** The "Nard-Builder" and "Line Library" exist at the global Workspace level.
 * **Q.2. Project Application:** When users are inside a Project, they access the "Nard Palette" and "Connections Palette" to drag-and-drop these globally defined templates into their specific canvas. Updating a template in the global library propagates the schema changes to all projects using it.
#### **Section R: The Connections Palette (Visibility vs. Activity)**
Users must be able to view relationship context without that context constantly interfering with the physics engine. The Connections Palette controls the state of all Line Types on the canvas via two independent toggles:
 * **R.1. Visibility Toggle (The "Eye" Icon):** Turns the rendering of the line on or off.
 * **R.2. Activity Toggle (The "Magnet/Physics" Icon):** Determines if the line participates in the data-driven physics engine.
   * **Visible + Active:** The line acts as a spring. The normalized position takes over, and dragging the Nard dynamically alters the rolled-up 0.0 - 1.0 distance values for this line type.
   * **Visible + Inactive:** The line appears as a "ghost" or dashed connection. It shows the relationship exists, but it exerts zero physical gravity on the layout. Moving connected Nards will *not* alter the data values of an inactive line.
   * **Hidden:** The line is neither seen nor calculated in the active layout.
#### **Section S: Nard Card Anatomy & Typography**
To ensure the canvas remains readable regardless of zoom level, Nard cards utilize a strict "Collapsed" vs. "Expanded" state.
 * **S.1. The Collapsed State (Default Canvas View):**
   * **Title:** Hard character limit (e.g., 40 characters) enforced via UI input or visually truncated with an ellipsis to prevent container expansion.
   * **Description:** Truncated strictly after two lines of text.
   * **Metadata Slots:** Displays a maximum of three (3) custom metadata properties (e.g., Status, Assignee, Due Date) as pill-shaped UI elements at the bottom of the card.
 * **S.2. The Expanded State (Detail Panel):** Clicking a Nard opens a floating side-panel or modal revealing the full, un-truncated Description (Markdown rendered) and the complete list of attached metadata properties.
#### **Section T: Line Interaction & Graph Readability**
Borrowing from best-in-class graph visualization libraries (e.g., Cytoscape, D3.js), the UI employs specific routing and interaction strategies.
 * **T.1. Line Directionality Toggle:** Clicking any active line summons a micro-toolbar hovering over the line. Users can click an "Arrow" icon to instantly cycle through the vector states: A -> B, A <- B, A <-> B, or None.
 * **T.2. Line Intersections (Hops/Bridges):** To prevent the optical illusion of lines merging where they cross, the rendering engine utilizes "Line Hops." When two lines intersect, the foreground line renders a small, semi-circular visual jump (or a brief stroke-gap/halo) over the background line, ensuring the user can trace paths effortlessly.
#### **Section U: Accessible Color Strategy**
Allowing users to customize Nard and Line colors introduces the risk of unreadable, low-contrast combinations.
 * **U.1. Constrained Selection (HSL Locking):** The color picker allows users to choose the Hue, but the system locks the Lightness/Saturation within specific accessible bands (e.g., enforcing pastel backgrounds).
 * **U.2. Auto-Contrasting Text:** The UI utilizes a contrast-checking algorithm (WCAG standards). If a user selects a dark background color for a Nard, the system automatically flips the Title, Description, and Icon text from its default dark gray to pure white, ensuring legibility is mathematically guaranteed.


The animated transition is going to be your platform's viral "wow" moment. When users see their messy graph gracefully untangle and snap into a perfect Kanban grid, they will lose their minds. It completely validates the underlying spatial data model.
Before I give you the formal amendment, let's address your question about **Containers/Zones**.

Because your Nards fluctuate and physically move whenever a user changes which lines are "active," a traditional drawn box (like in Miro) would break. The Nards would simply fly out of the box! Therefore, Nard Zones must be **Elastic Bounding Boxes** (technically called a Convex Hull). They wrap around a specific group of Nards and dynamically stretch, shrink, and follow those Nards as the physics engine moves them.
Here is why this is massively beneficial for our three launch templates:
 1. **Benefit for OKRs (Strategic Alignment):** Imagine you create Elastic Zones for different departments ("Marketing," "Engineering," "Sales"). You turn on the "Alignment" lines, and the physics engine pulls all the Nards toward the central Company Objective. The Zones stretch and deform to show you exactly how much of Marketing's work is getting pulled into Engineering's territory.
 2. **Benefit for Storyboarding (Narrative Geometry):** Zones act as physical **Locations** or **Scenes** (e.g., "The Coffee Shop" vs. "The Office"). You can turn on the "Emotional Tension" lines, and watch characters get pushed to opposite corners of the screen. The Elastic Zone stretches to contain them, visually representing how "tense" that specific location feels right now.
 3. **Benefit for Project Management:** Zones act as **Sprints** or **Epics**. You turn off "Assigned To" lines and turn on "Dependencies." The Nards completely reorganize to form a linear chain of blockers. As they move, the "Sprint 1" Zone stretches like a rubber band to wrap around its tasks, immediately showing you if Sprint 1 is spread out across too many dependencies.
Here is **Amendment Eight**, capturing Semantic Zooming, Elastic Zones, and Animated Transitions.

**Date:** April 11, 2026
**Context:** This amendment addresses the cognitive load of navigating massive datasets by introducing Semantic Zooming and Elastic Zones. It also formalizes the animation logic for Lens transitions to preserve spatial mental models.

### 1. OVERVIEW OF CHANGES
To manage visual density, the canvas will employ discrete Semantic Zoom levels, progressively removing metadata as the camera pulls back. It introduces "Elastic Zones" as dynamic grouping containers that react to the physics engine. Finally, it mandates a smooth tweening animation for all spatial reorganizations (Lens switching) to maintain user context.

### 2. NEW PRD SECTIONS TO BE ADDED
#### **Section V: Semantic Zooming & Scale Management**
To ensure the canvas remains highly performant and readable at any scale (from 5 Nards to 5,000 Nards), the UI enforces Semantic Zooming. The rendering engine alters the Nard anatomy based on the viewport scale:
 * **V.1. Micro Scale (100% - 75% Zoom):** Full Nard anatomy. Titles, Descriptions (truncated to 2 lines), and Metadata Pills are fully visible. Tethers display their directional arrows and Semantic Stepper labels.
 * **V.2. Meso Scale (74% - 25% Zoom):** Contextual clarity. Descriptions and Metadata Pills fade out. Nards shrink to display only their Title and Icon. Tether labels fade out, leaving only the colored lines and arrows.
 * **V.3. Macro Scale (< 25% Zoom):** Structural topology. Text is entirely removed. Nards render as solid, color-coded geometric dots. Tethers render as thin, un-labeled hairlines. The user sees only the pure physical clusters and "galaxy" shape of the data.
#### **Section W: Elastic Zones (Dynamic Clustering)**
Because active Tethers constantly push and pull Nards across the canvas, traditional static bounding boxes are ineffective. Users can organize Nards using "Elastic Zones."
 * **W.1. Concept:** An Elastic Zone is a colored, translucent bounding area (Convex Hull) tethered to a specific group of Nards.
 * **W.2. Dynamic Morphing:** When the physics engine recalculates and Nards move (e.g., due to line activity toggling), the Elastic Zone automatically stretches, shrinks, and morphs to continuously wrap its assigned Nards. This provides a constant geographical anchor (e.g., a "Marketing Dept" zone or "Sprint 1" zone) even as the underlying topology fluctuates.
#### **Section X: Spatial Transitions (The "Wow" Moment)**
When a user changes how they view the data, the spatial shift must be comprehensible, not jarring.
 * **X.1. Animated State Changes:** There are no instant "hard cuts" when a user toggles a Tether's physics activity or swaps Lenses (e.g., shifting from the Physics Graph View to the Matrix/Kanban View).
 * **X.2. The Tweening Mechanic:** The UI utilizes a 1.0 to 1.5-second easing animation. Users will physically watch the Nards untangle, glide across the canvas, and snap into their new geometric equilibrium or Kanban column. This ensures the user's spatial mental model remains unbroken, allowing them to track exactly where a specific data point moved.
Now that we know exactly how the cards look and how they move, we need to decide where the user controls all this.
**For the core UI layout—where should the Nard Builder, Line Palette, and Lens controls live? Do you picture a fixed left sidebar (like Notion/Slack), a floating bottom dock (like MacOS/Figma), or a hidden command menu invoked via keyboard shortcut (like Raycast or Superhuman) to maximize the blank canvas space?**
That is a great product principle. Relying on keyboard shortcuts too early caters only to power users and creates a steep learning curve. If the interface is truly spatial and tactile, the user should be able to do everything seamlessly with just a mouse or a touchscreen.
To give you the "best of all worlds," we need to support both the **Visual Thinker** (who wants to physically draw a line) and the **Structured Thinker** (who wants to select a relationship from a list), entirely through point-and-click interactions.
Here is the revised **Amendment Nine**. I have removed the keyboard-reliant "Notion Slash" command, replaced it with a mouse-friendly interaction, and added the definitive mechanics for drawing Tethers.

**Date:** April 11, 2026
**Context:** This amendment establishes the macro UI layout of the application workspace. Drawing inspiration from FigJam, Trello, and Milanote, it relies purely on tactile, point-and-click interactions to ensure the complex graph database feels consumer-friendly, entirely avoiding a reliance on keyboard shortcuts.

### 1. OVERVIEW OF CHANGES
The UI aggressively minimizes persistent sidebars in favor of a bottom dock and context-aware floating panels. To support different mental models without keyboard shortcuts, it establishes two distinct, mouse-driven methods for establishing relationships (Tethers) between Nards: the Spatial "Drag-to-Connect" method and the Structured "Drawer Link" method.

### 2. NEW PRD SECTIONS TO BE ADDED
#### **Section Y: Macro Workspace Layout**
The application avoids heavy, persistent left-side navigation panes. The workspace is divided into three distinct UI zones:
 * **Y.1. The Canvas:** The infinite 2D space takes up 95% of the screen.
 * **Y.2. The Global Dock:** A floating, pill-shaped dock centered at the bottom of the screen housing the global tools (Nard Palette, Connections Palette, Lens Selector, Snapshot Timeline).
 * **Y.3. The Viewport Header:** A minimalist top-left floating element showing the Project Name and current Snapshot, with top-right icons for Multiplayer avatars and Settings.
#### **Section Z: Tactile Interaction Design**
The graph must feel physical and immediately responsive, relying entirely on direct manipulation.
 * **Z.1. The Detail Drawer:** Double-clicking a Nard opens a right-side "Detail Drawer" (resembling a Trello card back) for editing the Markdown description and metadata, keeping the canvas visible on the left.
 * **Z.2. Hover-Focus (Graph Isolation):** Hovering the cursor over a Nard instantly dims all non-connected Nards to 20% opacity, highlighting the active local graph path in bright colors.
 * **Z.3. Double-Click Radial Menu (Quick Spawn):** Double-clicking the empty canvas summons a temporary, circular context menu at the cursor's location. This allows the user to click and instantly spawn a default Nard or a text block without needing to drag all the way from the bottom dock.
#### **Section AA: Establishing Tethers (Drawing Lines)**
Users can connect Nards using two distinct, purely mouse-driven interactions, accommodating both visual and structured workflows.
 * **AA.1. The Spatial Method (Drag-to-Connect):** * When a user selects a Nard, four translucent "connector nodes" (plus icons) appear on its edges.
   * The user clicks and drags from a node to any other Nard.
   * Upon releasing the mouse over the target Nard, a micro-menu pops up asking the user to click the desired Line Type from their active Connections Palette (e.g., "Depends On"). The line is instantly established.
 * **AA.2. The Structured Method (Drawer Linking):**
   * For users dealing with dense clusters where drawing a line is visually difficult, they can open the Nard's Detail Drawer.
   * Under the metadata properties, the user clicks an "Add Connection" button.
   * They select the Line Type from a dropdown, and search/select the target Nard's name. The system then automatically draws the physical line on the canvas.
Now that we have locked in a purely tactile, point-and-click interface, we have to think about the reality of modern work: **How much of this PRD needs to accommodate mobile or tablet screens? Are we designing this as a desktop-first powerhouse, or do we need to ensure the physics engine and drag-to-connect mechanics work flawlessly on an iPad?**
Here is **Amendment Ten**, utilizing established UX best practices and mobile/tablet conventions from industry leaders like Apple (Human Interface Guidelines), Miro, and Figma.
By applying these standards, we ensure the complex graph feels natively designed for touch, rather than feeling like a clunky desktop port.

**Date:** April 11, 2026
**Context:** This amendment addresses responsive behavior across desktop, tablet, and mobile web. It establishes UX best practices for touch gestures, resolves desktop "hover" states for touchscreens, and defines viewport-adaptive UI layouts.

### 1. OVERVIEW OF CHANGES
To provide a seamless experience on tablets and touch devices, this amendment replaces desktop-only mechanics (like hover states) with standard touch paradigms (single-tap to focus, double-tap to open). It implements strict gesture rules for canvas navigation, adapts the Detail Drawer into a Bottom Sheet for smaller screens, and relocates toolbars to respect OS-level safe areas.

### 2. NEW PRD SECTIONS TO BE ADDED
#### **Section BB: Touch Gestures & Canvas Navigation**
Following spatial UI best practices, touch interactions must predictably separate canvas movement from object manipulation.
 * **BB.1. Navigation Gestures:**
   * **1-Finger Drag (on empty canvas):** Pans the canvas.
   * **2-Finger Pinch/Spread:** Zooms in and out.
   * **1-Finger Drag (on a Nard):** Moves the Nard (activating the Spatial Lock outlined in Section O).
 * **BB.2. The Selection / Lasso Tool:** Because 1-finger dragging pans the canvas, users cannot draw a selection box by default. A dedicated "Select/Lasso" tool toggle is added to the Global Dock. When active, 1-finger dragging draws an Elastic Zone or bounding box, temporarily disabling panning.
#### **Section CC: Touch-Optimized Object Interaction (Resolving "Hover")**
Touch devices lack a persistent cursor, requiring discrete tap actions to replace desktop hover states.
 * **CC.1. Single-Tap (Focus & Isolate):** Tapping a Nard or a Ghost Line triggers the "Hover-Focus" state. The selected object highlights, tooltips appear, and non-connected graph elements dim to 20% opacity. Tapping the empty canvas clears the focus.
 * **CC.2. Double-Tap (Execute/Open):** Double-tapping a Nard opens the Detail Drawer. Double-tapping the empty canvas opens the Radial Menu (Quick Spawn).
 * **CC.3. Accessible Connection Nodes:** On touch devices, the "drag-to-connect" nodes on the edges of a Nard scale up to a minimum accessible hit target of 44x44 pt (Apple HIG standard) when the Nard is in Focus.
#### **Section DD: Responsive UI Layouts & Safe Areas**
The UI must morph based on viewport dimensions to maximize the visible physics canvas and avoid OS-level interference.
 * **DD.1. Adaptive Detail Drawer:**
   * **Desktop / Tablet Landscape:** Opens as a Right-Side Drawer, compressing the canvas slightly to the left.
   * **Tablet Portrait / Mobile:** Opens as a Bottom Sheet (modal) covering the lower 50-70% of the screen. Users can swipe it down to dismiss it.
 * **DD.2. Adaptive Global Dock:**
   * **Desktop:** Pill-shaped dock floating at the bottom center.
   * **Tablet / Mobile:** The dock morphs into a compact, vertical toolbar snapped to the left or right edge of the screen. This entirely avoids the iOS/Android "Home Bar" gesture area at the bottom and prevents the dock from being obscured when the on-screen software keyboard deploys.
With the UI, UX, core physics engine, AI integration, and metadata models completely defined, the product side of the PRD is incredibly robust.
**What is the next frontier you want to tackle—should we dive into the Technical Architecture (e.g., specifying the tech stack, database structure, or API endpoints), or should we define the Go-to-Market & Analytics requirements?**
This is the exact right time to think about this. You are essentially building the "SaaS wrapper" (authentication, onboarding, and template management) around the core spatial engine we just designed.
Here is my advice on how to handle the Template Hierarchy without confusing the user:

The easiest way to structure this is to separate the *Schemas* from the *Content*.
 * **Nard-Level & Line-Level Templates (The Ingredients):** These are purely **Schemas**. A "Task Nard Template" doesn't have a specific task written on it; it just dictates that the Nard will be blue, have a checkbox, and a dropdown for "Assignee." These live in the Global Workspace Library.
 * **Project-Level Templates (The Meal Kit):** A Project Template is a bundle. When a user selects the "Project Management" template, the system auto-imports the "Task" and "Bug" Nard Schemas into their local palette.
 * **Sample Data (The Pre-Cooked Meal):** If the user toggles "Load with Sample Data," the system actually spawns instances of those Nards onto the canvas (e.g., "Task 1: Design Logo") so the user can immediately play with the physics engine without having to build a graph from scratch.
Regarding the Snapshots—the ability to **"Cycle (Animate)"** them is brilliant. You are basically turning the Snapshot Timeline into a video player. If the user hits "Play," the canvas smoothly animates from Snapshot 1 \rightarrow Snapshot 2 \rightarrow Snapshot 3, effectively turning the spatial database into a presentation tool.
Here is **Amendment Eleven**, capturing the template hierarchy, authentication, the landing page, and the Snapshot player.

**Date:** April 11, 2026
**Context:** This amendment defines the standard SaaS wrapper around the core Nards engine. It clarifies the hierarchy between component schemas and project templates, introduces "Sample Data" for onboarding, establishes the authentication/landing pages, and upgrades the Snapshot timeline into an animated playback tool.

### 1. OVERVIEW OF CHANGES
To provide a frictionless onboarding experience, this amendment defines a marketing-focused Landing Page with Google SSO. It clarifies that Nard/Line Templates act as structural schemas, while Project Templates act as bundles that can optionally inject Sample Data to immediately demonstrate value. Finally, it introduces the "Temporal Player," allowing users to automatically cycle and animate through their saved Snapshots.

### 2. NEW PRD SECTIONS TO BE ADDED
#### **Section EE: Template Hierarchy & Sample Data**
To prevent user confusion, templates are strictly divided into Schemas (structure) and Projects (bundles).
 * **EE.1. Component Templates (Nards & Lines):** These are metadata schemas (e.g., "Standard Task," "OKR Objective," "Dependency Line"). They dictate color, shape, and data fields, but contain no specific user content.
 * **EE.2. Project Templates:** A pre-packaged bundle of Component Templates and pre-configured Lens settings (e.g., the "Storyboarding" Project Template auto-loads Character Nards and Tension Lines).
 * **EE.3. Sample Data Injection:** During the Project Creation Wizard, users can toggle "Load with Sample Data." If enabled, the engine populates the canvas with a pre-built, fully tethered graph of mock data, allowing the user to immediately interact with the physics engine and Lens transitions without starting from a blank screen.
#### **Section FF: Authentication & Account Management**
The platform utilizes standard SaaS authentication flows to reduce friction.
 * **FF.1. The Landing Page (Logged Out):** The public-facing marketing page. It features high-level copy explaining the "spatial database" concept, looping video examples of the physics engine auto-balancing, and clear Call-to-Action (CTA) buttons.
 * **FF.2. Authentication:** Users can "Create Account" or "Sign In" using standard email/password or Google Single Sign-On (SSO).
 * **FF.3. User Profile & Settings:** A dedicated account screen accessible from the Workspace Dashboard. Users can manage their avatar, name, email, connected Google account, and basic system preferences (e.g., default light/dark mode).
#### **Section GG: The Temporal Player (Snapshot Cycling)**
Snapshots are not just static backup files; they are a presentation and storytelling medium.
 * **GG.1. Snapshot Management:** Users can explicitly Save, Name, View, and Delete Snapshots along the bottom timeline dock.
 * **GG.2. The Playback Mechanic:** The timeline includes a "Play" button. When clicked, the engine automatically cycles through the chronologically ordered Snapshots.
 * **GG.3. Interpolated Tweening:** As the player cycles from Snapshot A to Snapshot B, the transition is not a hard cut. The physics engine utilizes the 1.5-second easing animation (defined in Section X) to smoothly move the Nards to their new positions, allowing users to watch the evolution of their project or the progression of a narrative over time.
With the standard SaaS wrappers (Auth, Landing pages, Profiles) now defined around the core engine, are we ready to move into defining the Technical Architecture, or do we need to figure out the Monetization/Billing strategy next?
This is the exact right question to ask. If you dump a 1,000-node spatial graph into an LLM's context window all at once, it will hallucinate, lose the plot, and burn through tokens.
Anthropic’s absolute golden rule for building an MCP (Model Context Protocol) server is **Progressive Disclosure via structured Tools and Resources.** The AI should not be handed the entire database; it should be handed a "map" and a "flashlight," allowing it to walk the graph intelligently.
Based on Claude's MCP best practices, we must architect the server using a rigid URI scheme and specific traversal tools. Here is how we design the architecture so the AI can smartly navigate the Nards universe.

**Date:** April 11, 2026
**Context:** This amendment translates Anthropic’s best practices for the Model Context Protocol (MCP) into the Nards architecture. To prevent token-limit exhaustion and context degradation, it establishes a "Progressive Disclosure" model, allowing AI agents to intelligently traverse massive spatial graphs step-by-step rather than ingesting the entire database at once.

### 1. OVERVIEW OF CHANGES
This amendment structures the MCP server by defining specific URIs (Resources) for static data and dynamic endpoints (Tools) for graph traversal. It introduces a "Macro to Micro" traversal methodology, equipping the AI with tools to explore local node clusters, follow specific line vectors, and request scoped Mermaid diagrams on demand.

### 2. NEW PRD SECTIONS TO BE ADDED
#### **Section II: The Nards URI Scheme (Resources)**
Following MCP standards, all static components of the workspace are exposed to the AI via a REST-like hierarchical URI scheme. The AI uses these to read specific, isolated data payloads:
 * nards://[workspace_id]/projects \rightarrow Lists all accessible projects.
 * nards://[workspace_id]/templates/schemas \rightarrow Returns the JSON definitions of global Nard and Line templates (so the AI knows what data types are allowed).
 * nards://[project_id]/snapshots/[snapshot_id] \rightarrow Returns the high-level metadata (Date, Name) of a specific point in time.
#### **Section JJ: Progressive Traversal Tooling (How the AI Walks)**
Instead of pushing the entire canvas to the AI, the MCP server provides specific dynamic tools that the AI must call to explore the graph.
 * **Tool 1: get_macro_topology(project_id, active_lines_only)**
   * **Purpose:** The "Map." Used when the AI first enters a project.
   * **Returns:** A highly compressed, high-level Mermaid.js diagram showing only Elastic Zones, isolated clusters, and Nards with the highest number of connections (Hubs). It strips out Nard descriptions to save tokens.
 * **Tool 2: read_nard_detail(nard_id)**
   * **Purpose:** The "Magnifying Glass."
   * **Returns:** The complete Markdown description and custom metadata JSON payload for a single, specific Nard.
 * **Tool 3: explore_neighborhood(nard_id, depth, line_type_filter)**
   * **Purpose:** The "Flashlight." This is the core traversal tool.
   * **Returns:** A localized Dual-Payload (Mermaid + spatial JSON).
   * **Usage:** The AI can say, "I am looking at Nard A. Give me a 1-degree radius of all Nards connected to it specifically via 'Blocker' lines." The server returns only that small, highly relevant sub-graph.
 * **Tool 4: calculate_spatial_delta(nard_id, snapshot_A, snapshot_B)**
   * **Purpose:** The "Velocity Tracker."
   * **Returns:** The exact mathematical change in a Nard's 0.0 to 1.0 spatial relationships between two points in time, saving the AI from having to do the complex math itself.
#### **Section KK: The AI Traversal Loop (System Prompting)**
To ensure the AI utilizes these tools correctly, the Nards platform will inject a strict system prompt instruction alongside the MCP connection:
 * **The Instruction:** *"You are navigating a massive, physics-driven 2D spatial graph. Do not attempt to guess the layout. 1. Use get_macro_topology to understand the broad clusters. 2. Identify target nodes and use read_nard_detail to understand their context. 3. Use explore_neighborhood to trace dependencies, blockers, or relationships outward from your target node. If a user asks you to modify the graph, verify the current local neighborhood before executing a write tool."*

### Why this architecture is bulletproof:
By forcing the AI to ask for explore_neighborhood(depth: 1), it perfectly mimics how a human reads a map. If a user asks, *"Why is the marketing campaign delayed?"* the AI will:
 1. Find the "Marketing Campaign" Nard.
 2. Call the neighborhood tool filtered by "Blocker" lines.
 3. Discover the "API Integration" Nard is connected.
 4. Read the "API Integration" Nard to find out *why* it's blocked.
**This makes the AI incredibly cheap to run (low token usage) and blazingly fast.** Shall we move into the actual **Database/Backend Tech Stack** required to support live multiplayer CRDTs, a force-directed physics engine, and these lightning-fast MCP queries?
This is a razor-sharp catch. If the AI just starts looking at a web of nodes without first understanding the "rules of the game," it's effectively flying blind.
If it doesn't know that it's looking at a "Storyboarding" template, it might misinterpret a distance of 0.1 on a "Tension" line as a "Blocker" instead of "High Emotional Conflict." We need to force the AI to build a semantic mental model of the specific universe it is looking at *before* it takes a single step.
Here is **Amendment Fourteen**, which updates the MCP architecture to include a mandatory "Semantic Primer" step.

**Date:** April 11, 2026
**Context:** This amendment refines the MCP architecture (Amendment 13) by ensuring the AI understands the qualitative, domain-specific meaning of the canvas before initiating any graph traversal. It introduces a "Semantic Dictionary" resource and updates the AI's core system prompt to enforce pre-traversal deduction.

### 1. OVERVIEW OF CHANGES
To prevent the AI from misinterpreting spatial data, it must first ingest the custom schemas, Project Template context, and Semantic Stepper definitions. By reading this "Semantic Dictionary," the LLM can leverage its native reasoning capabilities to deduce the operational reality of the canvas (e.g., recognizing that it is looking at an OKR framework rather than a RAG vector space) prior to plotting a traversal path.

### 2. NEW PRD SECTIONS TO BE ADDED
#### **Section LL: The Semantic Dictionary (MCP Resource)**
Before accessing topology or node details, the AI is granted access to a new, highly condensed REST-like resource that acts as the rulebook for the current project.
 * **URI:** nards://[project_id]/semantic_dictionary
 * **Payload Contents:**
   * **Project Meta:** The Project Name, Description, and the base Template utilized (if any).
   * **Nard Lexicon:** A list of active Nard Types in the project and their custom metadata fields (e.g., "Nard Type: Character. Contains fields: Role, Motivation").
   * **Tether Lexicon & Stepper Logic:** The active Line Types, their directionality rules, and most importantly, the exact math-to-text translations from the Semantic Stepper (e.g., "Line Type: Tension. 0.0-0.3 = High Conflict, 0.7-1.0 = Peace").
#### **Section MM: Upgraded AI Traversal Loop (The "Step Zero" Mandate)**
The system prompt injected alongside the MCP connection (previously defined in Section KK) is updated to enforce a strict "deduce before you walk" sequence.
 * **The Upgraded System Instruction:**
   * *"You are navigating a custom, physics-driven 2D spatial graph. Before you attempt to traverse or modify this graph, you must follow this sequence:"*
   * **Step 0 (Semantic Deduction):** *"Read the semantic_dictionary resource. Use this data to deduce the domain and operational rules of this specific workspace. Understand what a Nard represents here, and what spatial distance physically means for these specific Line Types."*
   * **Step 1 (Macro Topology):** *"Use get_macro_topology to understand the broad clusters."*
   * **Step 2 (Targeted Discovery):** *"Identify target nodes and use read_nard_detail to understand their text context."*
   * **Step 3 (Micro Traversal):** *"Use explore_neighborhood to trace relationships outward from your target node, applying the semantic rules you deduced in Step 0 to interpret the distances."*
By forcing the AI to execute **Step 0**, you are essentially giving it a few tokens to "think" and establish its own context window rules. If the user asks, "Who is the villain?", the AI will read the Semantic Dictionary, realize it's a storyboarding project, and know exactly which Nard type and Line type to filter for when it calls the explore_neighborhood tool.
**This makes the MCP integration remarkably intelligent. Are there any other edge cases with the AI's ability to read, write, or understand the canvas that you want to nail down, or is the MCP architecture feeling rock solid?**

