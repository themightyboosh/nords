# Product Requirements Document: Nards

*"I'm never going to use Trello again."*
— Target user reaction after first 10 minutes

---

## 1. Vision

Nards is a graph-native ideation and project management tool that replaces flat, column-based tools (Trello, Notion boards) with a spatial canvas where ideas, tasks, people, and concepts exist as nodes in a living network. Relationships are first-class citizens — not afterthoughts.

Core analogy: SQL is to Neo4j as Trello is to Nards.
Trello assumes your work belongs in a line. Nards assumes it belongs in a network.

### 1.1 Competitive Positioning
**Why not Miro?** Miro's data model is a drawing — shapes on a canvas with visual connectors. Nards' data model is a graph — typed nodes with typed, semantically-rich relationships. Miro can't query "show me everything that blocks the Q3 launch" because its connectors carry no meaning. This is an architectural difference, not a feature gap. It must be felt in the first 30 seconds.

**Why not Trello/Notion?** They are column-based. A card lives in one list. Nards exist in a network where the same node participates in many relationships, and each relationship type has its own spatial language.

**Defensibility:** Per-line-type spatial semantics, MCP-native AI integration, and the animated view transition system ("The Reveal") create a product experience that cannot be replicated by adding features to a drawing tool or a kanban board.

---

## 2. Target User

### 2.1 Primary Persona
Project managers and innovation specialists who are:
* Already immersed in AI workflows and obsessed with context generation
* Outgrowing flat tools — they need intensity, relativity, direction, and relationship-to-knowledge to shape a project
* Comfortable with progressive complexity — they want simple to start, powerful when needed

### 2.2 Day-One User
A Trello power user who has tried to make Miro + Trello + spreadsheets work together and feels the friction of forcing non-linear thinking into linear tools.

### 2.3 Triggering Event
"I have a project where the relationships between things matter more than the sequence, and no tool lets me express that."

### 2.4 Path to Mass Market
The AI-obsessed PM is the wedge, not the ceiling. The viral loop is Nard DNA — shareable context URLs that make any AI tool smarter. Non-technical PMs adopt because their AI-native teammate says "just put it in Nards so Claude can see it."

---

## 3. Authentication & Account Management (The SaaS Wrapper)

The platform utilizes standard SaaS authentication flows to reduce friction while acting as the front door to the core engine.

### 3.1 The Landing Page (Logged Out)
The public-facing marketing page. It features high-level copy explaining the "spatial database" concept, looping video examples of the physics engine auto-balancing, and clear Call-to-Action (CTA) buttons.

### 3.2 Authentication
Users can "Create Account" or "Sign In" using standard email/password or Google Single Sign-On (SSO).

### 3.3 User Profile & Settings
A dedicated account screen accessible from the Workspace Dashboard. Users can manage their avatar, name, email, connected Google account, and basic system preferences (e.g., default light/dark mode).
## 4. Core Concepts & The Universal Concept Model

At its core, the Nards engine is a domain-agnostic spatial relationship database built on four foundational primitives. By customizing the schema of these primitives, the engine maps to any human or programmatic framework.

### 4.1 The Four Primitives
* **Entities (Nards):** Data objects with customizable metadata schemas (defined via Nard-Builder). These act as the nodes in the spatial graph.
* **Tethers (Lines):** Relationships between Entities. These act as the edges in the graph, utilizing the 0.0 to 1.0 spatial paradigm.
* **Time/State (Snapshots):** The chronological axis of the canvas, utilizing an immutable keyframe architecture.
* **Lenses (Views):** The specific visual framework filtering the data (e.g., the Physics Graph vs. the Kanban Bridge).

### 4.2 Nards (Node Cards)
A nard is the atomic unit. It is a rich content object — closer to a Notion page than a sticky note.
Nard types are user-defined schemas (e.g., "Task", "Person", "Risk", "Idea"). Each type defines which fields are present. Types are managed by Admins.

#### Nard Metadata Options (Node Schema)
The "Nard-Builder" allows users and AI agents to configure custom schemas for different Nard types.

**Mandatory Core Properties:**
* **Name:** String identifier.
* **Description:** Rich text field with full Markdown support (critical for AI readability and generation).

**Optional Data Primitives:** 
Users can attach the following fields to any Nard template:
* **Select / Dropdown:** Single choice for mutually exclusive states (e.g., Status, Priority).
* **Multi-Select (Tags):** For overlapping categorizations (e.g., Themes, Sprint Labels).
* **Number / Metric:** Accepts integers, decimals, or formatted currencies (e.g., Budget, Story Points).
* **Date & Time:** Single dates or date ranges (e.g., Due Date, Sprint Window).
* **Boolean (Checkbox):** Simple true/false toggles.
* **URL / External Link:** Hyperlinks to external systems (crucial for context sharing and MCP tool usage).
* **File / Media Attachment:** Uploads for images, PDFs, or raw text files.
* **User / Assignee:** Links directly to workspace members.

**Nard Spatial Properties (Normalized):**
* **Size:** Encodes a global, workspace-level meaning (e.g., importance, effort, budget).

### 4.3 Lines (Tethers / Relationships)
Lines connect nards and represent the nature of their relationship. Line types are user-defined schemas managed by Admins. They define the vocabulary of relationships available in a workspace.

#### Line Metadata Options (Tether Schema)
Because a Line's primary data payload is its spatial distance, additional metadata remains lightweight to prevent canvas clutter.

**Core Properties:**
* **Name / Label:** Semantic meaning (e.g., "Depends On").
* **Description:** Markdown-supported text field to explain the context of the relationship.

**Directionality (Vector Flow):** Defines the flow of the relationship:
* *Non-directional:* A simple bond (e.g., "Works With").
* *Unidirectional:* A flows to B (e.g., "Blocks").
* *Bidirectional:* Mutual flow (e.g., "Mutual Dependency").

**Visual Styling & Toggles:** Toggles for Boolean states (e.g., Active vs. Proposed) and system meta for color, stroke thickness, and dash style.

### 4.4 The Semantic Stepper (Qualitative Translation)
This is the core translation layer between the system's physics engine and the user's mental model. It solves the cognitive gap between continuous spatial mathematics and qualitative human reasoning by translating the 0.0 to 1.0 distance scale into discrete meanings.

* **Mechanism:** The user defines a spectrum of qualitative text labels (steps) in the Line Library. The system mathematically maps these steps evenly across the 0.0 to 1.0 physical distance scale.
  * *Example 1 (2 Steps):* "Blocker" (0.0 to 0.49) <-> "Independent" (0.50 to 1.0).
  * *Example 2 (3 Steps):* "Loves" (0.0 to 0.33) <-> "Tolerates" (0.34 to 0.66) <-> "Hates" (0.67 to 1.0).

* **Bi-Directional UI Sync:**
  * **Visual Dragging (Graph to Data):** If a user drags two Nards further apart, the system calculates the new math value (e.g., 0.85) and automatically updates the Tether's visible UI label to the corresponding step (e.g., "Hates").
  * **Menu Selection (Data to Graph):** If a user clicks the Tether's metadata menu and changes the stepper from "Loves" to "Hates," the physics engine immediately forces the Nards physically apart on the canvas to match the new mathematical reality.

### 4.5 The Core Spatial-Data Paradigm (Distance = Data)
In the Nards ecosystem, there is no separation between visual proximity and relationship data. Physical distance *is* the data.

* **Normalization Scale:** All line values (relationships) are dynamically normalized on a scale from 0.0 (touching/minimum distance) to 1.0 (furthest existing node pair on the canvas).
* **Dynamic Updating:** The system enforces continuous dynamic updates. If a user physically drags a Nard, the underlying 0.0 to 1.0 value of all its connected lines recalculates in real-time based on its new visual position relative to the rest of the canvas. "Dragging meaning" on the scale immediately updates the database.

Each line type defines its own spatial semantics independently. 
* **Distance meaning:** e.g., "reports-to -> distance = autonomy"
* **Direction meaning:** e.g., "influences -> above = positive influence, below = negative influence"

### 4.6 Conflict Resolution & The Physics Engine
* **The Geometric Challenge:** Because Nards exist in 2D space with many-to-many relationships, physical distance will naturally encounter geometric constraints (e.g., if Node A is close to B, and B is close to C, Node A cannot physically be placed at maximum distance from C without moving B).
* **The Force-Directed Solution:** The canvas operates on a continuous physics simulation (force-directed graph). Lines act as springs holding the 0.0 to 1.0 tension.
* **Auto-Equilibrium:** If a user forces a Nard into a position that mathematically conflicts with its other active lines, the system calculates the equilibrium. The connected Nards will visually "pull" or "relax" to balance the tension, instantly updating their respective data values to match the new physical reality.
## 5. Application Views & Navigation

The underlying data is always the graph. Views (Lenses) are distinct visual frameworks filtering that data.

### 5.1 The Canvas View (Default)
The full spatial physics graph (2D at launch, 3D in Phase 2).
* Pan, zoom, select, drag behaviors
* Nards rendered with size and position based on core data
* Lines rendered with type styling, direction arrows, and distance
* Ghost Lines: Faint background connections for non-active line types

### 5.2 The Connections Palette (Visibility vs. Activity)
The Canvas View acts as the primary interaction lens, managed by the Connections Palette. Users must view relationship context without everything interfering with the physics engine. The Palette controls all Line Types via two independent toggles:
* **Visibility Toggle (Eye icon):** Turns the rendering on/off.
* **Activity Toggle (Magnet/Physics icon):** Determines if the line participates in the data-driven physics engine.
  * **Visible + Active:** Acts as a spring. Normalized position takes over, and dragging alters 0.0 - 1.0 distance values.
  * **Visible + Inactive:** Line appears as a "ghost" or dashed connection. Exerts zero physical gravity. Moving connected Nards will *not* alter values.
  * **Hidden:** Neither seen nor calculated.

### 5.3 Semantic Zooming & Scale Management
To handle 10 to 5,000 Nards while remaining responsive, the core rendering engine defines anatomical rendering based on the viewport scale.
* **Micro Scale (100% - 75% Zoom):** Full Nard anatomy. Titles, Descriptions (truncated to 2 lines), and Metadata Pills are visible. Tethers display arrows and Semantic Stepper labels.
* **Meso Scale (74% - 25% Zoom):** Descriptions and Metadata Pills fade out. Nards shrink to only showing Title and Icon. Tether labels drop, leaving only colored lines and arrows.
* **Macro Scale (< 25% Zoom):** Structural topology. Text completely removed. Nards are color-coded dots. Tethers are un-labeled hairlines tracing physical clusters.

### 5.4 Elastic Zones (Dynamic Clustering)
Because active Tethers push and pull Nards naturally, traditional static bounding boxes break (Nards would escape them).
* **Concept:** An Elastic Zone is a colored, translucent bounding area (Convex Hull) explicitly tethered to a group of Nards.
* **Dynamic Morphing:** When the physics engine recalculates and Nards move, the Elastic Zone stretches, shrinks, and morphs to continuously wrap its assigned Nards, providing a geographical anchor (e.g., "Marketing Dept") irrespective of graphical topology.

### 5.5 The Matrix / Kanban Bridge
Users require a structured, linear workflow to mass-update spatial data. The Matrix View bridges the physics-based graph with a column/row display.
* **Quantization (Bucketing):** The system collapses the continuous 0.0 to 1.0 scale into discrete, customizable buckets (e.g., 0.0-0.33 = "To Do", 0.34-0.66 = "Doing", 0.67-1.0 = "Done").
* **Bi-directional Sync:**
  * **Graph to Matrix:** Nards automatically snap into columns/swimlanes based on their current line values.
  * **Matrix to Graph:** Dragging a Nard to a new column assigns it the median value of that bucket (e.g., 0.50). When returning to Graph View, the physics engine physically repositions the Nard to reflect this newly written value.

### 5.6 Spatial Transitions & Tweening (The "Wow" Moment)
When a user switches how they view data (e.g., toggling a Tether's physics activity or shifting from Graph to Matrix View), the shift must be comprehensible.
* **Animated State Changes:** No instant "hard cuts". 
* **The Tweening Mechanic ("The Reveal"):** The UI utilizes a 1.0 to 1.5-second easing animation. Users physically watch the Nards untangle, glide across the canvas using spring physics, and snap into a new geometric equilibrium. This preserves the spatial mental model without disorienting the user.
## 6. Project Admin, Templates & Onboarding

### 6.1 Project Initialization Flow
When initiating a new workspace, users progress through a strict creation flow to establish database parameters before reaching the live canvas.
* **Step 1: Project Naming & Top-Level Meta:** Assign name and description.
* **Step 2: Temporal Axis Selection (Snapshot Typology):** Time/state tracking must be selected.
  * *Standard Snapshots (Event-Driven):* Manual keyframes (e.g., "Draft 1", "Scene 4"). Ideal for Storyboarding, RAG mapping, non-linear creative work.
  * *Dated Snapshots (Chronological):* Tied strictly to a calendar/sprint cycle. Ideal for OKRs, Project Management.
* **Step 3: Template Selection (Schema Injection):** Choose a pre-built framework from the Template Library or select a Blank Canvas to build custom structures.

### 6.2 Template Hierarchy & Sample Data
To prevent user confusion, templates are strictly divided:
* **Component Templates (Nards & Lines):** Metadata schemas (e.g., "Standard Task"). They dictate color, shape, and data fields, but contain no user content.
* **Project Templates:** A pre-packaged bundle of Component Templates and pre-configured Lens settings.
* **Sample Data Injection:** Users can toggle "Load with Sample Data". The engine populates the canvas with a pre-built, fully tethered mock-graph so the user can immediately interact with the physics engine and see Lens transitions.

### 6.3 Global Schema Management (The Palettes)
Entity and Tether schemas are not siloed within individual projects, guaranteeing cross-organization consistency.
* **Workspace-Level Libraries:** The "Nard-Builder" and "Line Library" exist globally.
* **Project Application:** Inside a project, users access a "Nard Palette" and "Connections Palette" filtering in down the global templates. Updating a template globally propagates the schema changes across all affiliated projects.

### 6.4 Standard Template Library (Go-To-Market Workflows)
Four initial Go-To-Market templates demonstrate the engine's versatility, answering the "blank canvas" problem.

#### Template 1: Strategic Alignment (OKRs)
* **Concept:** Visualizing company goals and preventing "orphan" work.
* **Entities:** Objectives, Key Results, Initiatives.
* **Tethers:** Alignment / Contribution.
* **Mechanic:** Initiatives must physically tether to Key Results. Disconnected (orphan) work floats to the edges of the canvas, immediately highlighting rogue projects.

#### Template 2: Narrative Geometry (Storyboarding)
* **Concept:** Mapping emotional/physical geometry using Snapshots as scenes.
* **Entities:** Characters, Props, Settings, Plot Points.
* **Tethers:** Emotional Tension, Physical Proximity, Alliance.
* **Mechanic:** Users duplicate Snapshots to move chronologically, dragging characters to dynamically update narrative tension in each scene.

#### Template 3: Multi-Dimensional Project Management
* **Concept:** View identical project data through different operational lenses without altering entities.
* **Entities:** Tasks, Bugs, Milestones, Team Members.
* **Tethers:** Blockers (Dependencies), Assignments.
* **Mechanic:** Toggling Tether visibility reorganizes the canvas from an "Assigned To" cluster into a linear "Blocker" sequence dynamically via physics.

#### Template 4: Visual Vector RAG (AI Knowledge Mapping)
* **Concept:** Demystify AI retrieval through a 2D spatial interface mapping high-dimensional vector embeddings.
* **Entities:** Document Chunks, Queries, AI Agents.
* **Tethers:** Semantic Similarity (Cosine Distance).
* **Mechanic:** When a Query Nard is placed, relevant Document Chunks physically snap tighter. Users visually audit / manually tweak the RAG context window by dragging documents in or out of the Query's gravity well.

### 6.5 Onboarding Flow (Progressive Complexity)
* **First Nard:** Create the first item natively.
* **First Line:** User defines first relationship manually ("Depends on", "Is Led By").
* **Spatial Definition:** User explicitly tells the system what distance means for that line ("Closer means more important").
* **The First Drag:** User drags Nard B towards A, watching the raw mathematical data entry occur via visual spatialization.
## 7. User Interface & Tactile Interactions

The app utilizes tactile, point-and-click logic rather than keyboard-heavy power-user shortcuts context. It draws inspiration from FigJam, Trello, and Milanote. 

### 7.1 Macro Workspace Layout
The UI explicitly minimizes persistent sidebars to keep 95% of space aimed at the Spatial Canvas.
* **The Global Dock:** A floating, pill-shaped dock centered at the bottom of the screen housing the Nard Palette, Connections Palette, Lens Selector, and Snapshot Timeline.
* **The Viewport Header:** A minimalist top-left floating element showing Project Name and Snapshot state. Top-right houses Multiplayer avatars and Settings.

### 7.2 Tactile Interaction Design
* **Double-Click Radial Menu (Quick Spawn):** Double-clicking empty canvas summons a temporary, circular context menu to quickly spawn a default Nard or text block without reaching for the dock.
* **Hover-Focus (Graph Isolation):** Hovering over a Nard dims all non-connected Nards to 20% opacity, highlighting the active local graph path brightly.
* **The Detail Drawer:** Double-clicking a Nard opens a right-side "Detail Drawer" (resembling Trello or Notion side-peeks) for editing Markdown description and fields, keeping the canvas visible on the left.

### 7.3 Establishing Tethers (Drawing Lines)
Two distinct, purely mouse-driven interactions accommodate different cognitive models:
* **The Spatial Method (Drag-to-Connect):** Selecting a Nard surfaces 4 translucent connector nodes on its edges. The user clicks and drags from a node to the target. Upon drop, a micro-menu prompts the user to select the Line Type.
* **The Structured Method (Drawer Linking):** For dense clusters where drawing lines is visually cramped, the user opens the Detail Drawer, clicks "Add Connection", selects the Type dropdown, and types the target Nard's name. The system generates the physical math line implicitly.

### 7.4 Nard Card Anatomy & Typography
Card density relies strictly on "Collapsed" vs "Expanded" models to keep massive graphs readable.
* **Collapsed State (Canvas Default):** Soft 40 character Title limit (truncated w/ ellipsis). Description truncated to two lines text maximum. Metadata pill limit capped at 3 tags minimum.
* **Expanded State:** The Detail Drawer reveals the full, un-truncated markdown string and the entirety of Metadata fields inside a standard form UI.

### 7.5 Line Interaction & Graph Readability
* **Line Directionality Toggle:** Clicking any active line displays a floating micro-toolbar allowing the user to tap an Arrow icon, cycling A -> B, A <- B, A <-> B or none.
* **Line Intersections (Hops/Bridges):** Background/foreground optical parsing is preserved by giving overlapping lines "Line Hops" (a semi-circular visual jump or stroke-gap/halo) when routing so lines don't appear conjoined.

### 7.6 Accessible Color Strategy
* **HSL Constrained Locking:** Custom colors restrict Lightness/Saturation bands (pastel/dark mode matching) to remain strictly accessible. User controls Hue primarily.
* **Auto-Contrasting Text:** Changing a Nard to a deep/dark hue triggers the contrast-checking algorithm (WCAG standards), intelligently flipping Font and Icon colors to pure white automatically.

### 7.7 Touch Interface & Responsive Gestures
The platform avoids desktop-first compromises to support tablets and mobile interactions flawlessly.
* **Resolution of "Hover":** Touchscreens use Single-Tap to replace Hover states (Triggering Focus & Isolate). Tapping empty canvas clears focus. Double-Tap triggers the Detail Drawer/Radial menu equivalent.
* **Touch-Sized Hit Targets:** Connector nodes scale to 44x44pt (Apple HIG standard minimum) upon Focus selection.
* **Navigation Gestures:**
  * *1-Finger Drag (Empty space):* Pans canvas.
  * *2-Finger Pinch/Spread:* Zoom control.
  * *1-Finger Drag (On Nard):* Moves Nard, locking the physics payload.
  * *Select/Lasso Tool toggle:* Explicit UI button toggles 1-Finger drag to act as bounding-box lasso generation for drawing Elastic Zones or mass-selects.
* **Adaptive Layouts:**
  * *Global Dock:* On mobile/portrait, it abandons the bottom (to dodge OS home bars/keyboards) and snaps vertically to a side edge.
  * *Detail Drawer:* Degrades on mobile from Right-Slide-over into a swipeable Bottom Sheet covering the lower 70% of the screen.
## 8. Human-AI Collaboration via MCP

### 8.1 AI as Consumer (Graph Analysis)
AI reads the graph to provide insights. The AI can execute natural language queries (e.g., "Show me everything that influences the Q3 launch") by interpreting intent and routing via MCP. Capabilities include:
* Graph Analysis, Cluster summarization, Status reporting, Path/Gap detection.
* **Tension Detection:** AI analyzes the graph to flag contradictions — nards that have opposing spatial values across different line types (e.g. tight proximity on "Depends-On" but 0 proximity on "Communication").

### 8.2 Model Context Protocol (MCP) & Permissions
To enable seamless human-AI collaboration, the platform exposes its spatial database to external LLMs and agents via an MCP Server.
* **Permission Parity:** AI agents possess the exact same operational permissions as standard human users. They can mutate the canvas, alter Nard schemas, and manage Snapshots based on their access token (View, Comment, Edit, Admin limits apply).

### 8.3 AI Spatial Translation (How the AI "Sees")
Because external LLMs are text-based, the Nards engine cannot just dump x/y coordinates into context. It utilizes a highly optimized Dual-Payload translation. Every time the AI reads the canvas, it receives:
* **The Semantic Layer (Mermaid.js):** The backend compiles active Nards and Tethers into a Mermaid string. This leverages the LLM's native training to grasp topology, dependencies, and flow instantly.
* **The Spatial Layer (JSON):** A structured JSON array providing explicit schemas, Kanban matrix buckets, and the exact 0.0 to 1.0 normalized value of all active Tethers.

### 8.4 The AI Traversal Architecture (How the AI Walks)
*Anthropic's MCP Golden Rule: Progressive Disclosure.* Avoid dumping infinite JSON into context.
#### The Nards URI Scheme (Resources):
Static payload resources:
* `nards://[workspace]/projects` (List projects)
* `nards://[workspace]/templates` (Global Schemas)
* `nards://[project]/snapshots/[id]` (Historical keyframes)
#### The Semantic Dictionary (Step Zero Resource):
Before accessing topology, the AI pulls `nards://[project]/semantic_dictionary`. This resource acts as the "Rulebook" containing Project Meta, Nard Lexicon, and Tether definitions (The exact math-to-text semantic stepper rules). The AI deduces the specific qualitative meaning of the workspace *before* walking the data.
#### Progressive Traversal Tooling:
* `get_macro_topology(args)`: The "Map". Returns highly compressed Mermaid diagram.
* `read_nard_detail(args)`: The "Magnifying Glass". Full markdown and specific fields for a node.
* `explore_neighborhood(args)`: The "Flashlight". Returns a Dual-Payload radius outward from a target node.
* `calculate_spatial_delta(args)`: Compares 0.0-1.0 shifts across snapshots automatically.

#### The AI Traversal Loop (System Prompt Mandate)
MCP injects this prompt wrapper to the connected agent:
* **Step 0 (Semantic Deduction):** Read Semantic Dictionary to understand schemas and line implications.
* **Step 1 (Macro Topology):** Run `get_macro_topology`.
* **Step 2 (Targeted Discovery):** Identify targets and `read_nard_detail`.
* **Step 3 (Micro Traversal):** Trace specific vectors using `explore_neighborhood(depth: 1)`.

### 8.5 Spatial Manipulation & Autonomous Actions (How the AI "Acts")
AI agents act as multiplayer co-creators.
* **Autonomous Graph Mutation:** Spawning Nards, establishing and severing Tethers, updating metadata.
* **Real-Time Physics Interaction:** When an AI updates the 0.0-1.0 value of a Tether natively, it triggers the force-directed physics engine on the user's screen — visually animating the canvas live.
* **Temporal Autonomy:** AI agents can spawn and lock Snapshots autonomously (e.g. generating a 3-act story arc into 3 Snapshot views immediately).

### 8.6 AI Context Window & State Management
* **Default to Live State:** AI active context defaults exclusively to the "Live Canvas State".
* **Just-In-Time Refreshing:** Before the AI executes a physical movement via write tool, the MCP Server auto-refreshes the Dual-Payload array so the AI acts on real-time coordinates.
* **Snapshot Retrieval:** The AI only loads historical Snapshots when directed vs. keeping them in context memory.

### 8.7 Nard DNA (Portable Context URLs)
Every nard has a unique URL. For an AI tool handling the URL via MCP, it dumps a massive context-bomb payload including the single Nard details, the 1st degree neighborhood arrays, spatial distances, and textual connection descriptions immediately to the local chat stream. It acts as the ultimate viral loop wrapper for PMs dropping knowledge bits into IDEs.
## 9. Data Model, Snapshots, & History

### 9.1 Data Format Architecture
The canonical export/import engine runs purely on structured JSON payloads mapping standard graph-edges semantics (Nard Types, Line Types, the graph arrays, Views/Filters arrays, and Snapshots). CSV exports follow suite mapping relational UUIDs.

### 9.2 Immutable Snapshots (State Preservation)
A Snapshot is an explicitly wrapped keyframe of the entire canvas.
* **Scope:** It captures exact coordinates, line values (0.0-1.0), and the exact metadata payloads of every Nard and Line at a precise millisecond.
* **Immutability:** Snapshots are strictly Read-Only time capsules. They act similarly to a formal Git Commits natively wrapped for presentation/reference usage.

### 9.3 Non-Destructive Metadata (Soft Deletes)
To prevent generating corrupted snapshots when users modify schemas globally (e.g., deleting a "Status" property on a Nard Template), the system leverages a "Soft Delete" data pipeline.
* Stripping a field hides it from the Live Canvas and future implementations.
* Legacy Snapshots inherently retrieve the archived metadata field gracefully.
* **Snapshot Restoration Protocol:** If a historical Snapshot block is pushed into the Live Canvas, the platform detects schema drift and prompts the user to universally re-activate the missing schema or strip the relic.

### 9.4 The Temporal Player (Snapshot Cycling)
Snapshots function natively as a presentation and storytelling medium.
* **Management:** Explicit saves, named tagging, and deletions available along the visual timeline.
* **The Playback Mechanic:** Clicking 'Play' on the timeline triggers an automated sequence through the chronological history.
* **Interpolated Tweening (Time Scrubber):** As the player cycles from Snapshot A to B, the shift is not a hard frame cut. The physics engine implements the standard 1.5-second easing transition (pulling the Nards morphologically), simulating an evolving project timeline or animated pitch deck. 
## 10. Real-Time Multiplayer & Permissions

### 10.1 Real-Time Multiplayer & Conflict Resolution
All users view the same real-world canvas state in a white-board implementation. Concurrent edits resolve efficiently without arbitrary rewrites due to physics engine limitations demanding rigid rulesets constraints.

* **Visual Presence (Cursors & Auras):** Humans and Agents retain distinct cursors. Selecting a Nard applies a colored "Aura" indicating focused access control deterrence.
* **Granular Soft-Locking:**
  * *Spatial Lock:* User A clicks/holds a Nard to drag. It Spatially Locks. User B's cursor slips off (cannot drag simultaneously).
  * *Metadata Open-Edit:* CRDTs (Conflict-free Replicated Data Types) allow User B to edit the Nard's markdown text or dropdown values simultaneously while User A drags it across the canvas.
* **Multiplayer Physics (The "Fixed Anchor" Rule):** If User A and User B grab linked Nards concurrently and pull in opposing directions, the system interprets the Nards as Fixed Anchors. Neither cursor breaks. Instead, the underlying 0.0 - 1.0 data relationship rapidly recalculates to mediate the combined tug-of-war distance explicitly.

### 10.2 Perspective Mode
Click on a teammate's avatar to see the graph weighted by their contributions. Nards they created glow. Lines they defined are bold. Everything else fades structurally. Instantly reveals visual blind spots and operational loads.

### 10.3 Permissions & Sharing Architecture
* **Roles:** Admin (Full access + scheme control), Edit (Create/Modify Nards and Lines), Comment (Read-only + spatial movement locked), View.
* **Public View-Only Links:** Secure, public URLs for any Project or specific Snapshot. No account required.
* **Interactive View-Only Mode:** View-Only restricts mutation but completely embraces exploration. Viewers are blocked from spawning nodes, altering metadata, and dragging Nards. However, they can fully pan, zoom, expand metadata cards, cycle the Temporal Player, and toggle Lenses locally to trigger the physics engine solely for their own device UI.
* **The AI / MCP Wedge:** View-Only links possess native hooks for MCP routing. External viewers can securely grant their Personal AI Agent read-only access to summarize and inspect the workspace securely via the shared link.
## 11. Roadmap Phases

### Phase 1: Foundation + Wow
Core product with the three signature features defining Nards' identity capabilities (2D only, no AI features natively drawing layout).
* Canvas (2D)
* Nards with full content (markdown, fields, attachments, comments)
* Lines with schemas, directional arrows, styles
* Spatial Semantic Paradigm (Size global, distance/direction mapped via Semantic Stepper)
* Real-time multiplayer (shared canvas, Granular soft-locking)
* Immutable Snapshots & History scrubbing
* CSV & JSON Import/Export
* Initialization Flow & Template Injection workflows
* **Signature Fast-Follows:** The Reveal (Animated Tweening Transitions), Ghost Lines (Ambient connection hints), and Nard DNA (context URLs).

### Phase 2: Intelligence + Depth
* MCP Server with token-based access scaling (Full AI human-parity API logic)
* AI Consumer Mode (Graph Analysis, Gap Detection)
* Tension Detection (AI flags spatial contradictions)
* The Matrix / Kanban Bridge logic implementation
* Semantic Zoom scaling
* Heat View (thermal intensity overlay mapping hubs)
* The Temporal Player (Smooth playback histories)
* Perspective Mode
* Template Marketplace capabilities (Admin publish)

### Phase 3: Expansion + Growth
* AI Author Mode (AI spawning and suggesting spatial setups natively requiring approval)
* The Gravity Well (Optional physics mode for discovery-driven exploratory layouts)
* **Canvas Merge:** Combine two isolated projects natively, detecting overlaps, and resolving duplicates securely.
* **The Pitch (One-Click Story Mode):** Select a path through the graph; Nards generates a slide-by-slide presentation where transitions map physically to the camera following the path.
* 3D Canvas toggle (WebGL/Three.js integration utilizing billboarding labels). 
* Advanced Algorithms (Centrality plotting, Critical Paths)
* Enterprise SSO & Audit logs

## 12. Tech Stack & Platform Strategy
* **Platform:** Responsive Web Application (Desktop-first, mobile/tablet layout optimized resolving touch interactions).
* **Hosting:** Cloud-hosted SaaS with separate MCP routing servers.
* **Rendering:** 2D canvas at launch (WebGL or Canvas2D with force-directed graph rendering libraries). 
* **Performance:** Must handle 200+ active Nards per workspace rendered natively using Semantic Zoom boundaries.
* **Animation Engine:** Spring-physics & Easing engines dedicated for The Reveal and Temporal Player transitions.

## 13. Monetization Strategy
* **Launch:** Free. No paywall. Focus purely on validation and concept adoption.
* **Future Monetization Levers:** Nard count per workspace. The free tier carries a generous Nard limit (e.g. 50 nards). Paid tiers unlock 200+ bounds, advanced AI analyses models, administrative controls, custom workspace templates, The Pitch features, and increased MCP API rate limits.

## 14. Success Metrics
### North Star Indicator
*"I'm never going to use Trello again."*

### Quantitative
* Projects created per user per month
* Nards per project (Building true graphs vs 3-node toys)
* Lines per Nard ratio (Connecting items vs isolated card drops)
* View switches / Lens toggles per session (Engaging with 'The Reveal' animations)
* Matrix/Kanban view bridging usage
* Return rate (7-day traction)
* MCP Token authentication metrics (AI integration adoption)
* Nard DNA link sharing frequencies

### Qualitative
* First-session "Aha" moment when the user drags a Nard and sees math data change.
* "The Reveal" reaction when filtering Tethers triggers layout rewrites.
* Tension Detection insights prompting manual behavior shifts.

## 15. Risk Mitigation
* **Learning curve blocks adoption:** Countered by Progressive Onboarding, Templates with Sample Data, Ghost Lines, and The Reveal making concepts visceral.
* **"200 nards is a toy" perception:** Countered by Semantic Zooming. Free tier caps at 50 to prove value before complexity strikes.
* **Performance issues via Animation/CRDTs:** Countered by limiting to 2D at launch, heavily resourcing the initial rendering optimization sprints, and aggressive line-hop limits.
* **Miro features overlap:** Countered by the architectural moat; Miro is a drawing app, Nards is a mapped database with spatial APIs yielding logic that Miro lines mathematically cannot answer.

---

*(End of Product Requirements Document)*
