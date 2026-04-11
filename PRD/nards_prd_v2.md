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

### 1.2 Glossary & Key Terms
* **Nard:** The fundamental visual node representing an entity (task, person, idea, etc.).
* **Tether (Line):** A relationship connecting two Nards, whose physical length translates to a 0.0-1.0 data value.
* **Semantic Stepper:** The user-defined text labels (e.g., "Blocker" to "Independent") that map to the 0.0-1.0 distance scale.
* **Snapshot:** An immutable, time-stamped keyframe saving the exact state of the entire project graph.
* **Lens (View):** A specific way to visualize the data, such as the Spatial Canvas or the Matrix View.
* **The Reveal:** The fluid physics-based animation that plays when data or views change, letting users track where nodes move.
* **Matrix View (Spatial Pivot Table):** A dual-axis layout combining line types into columns and swimlanes.
* **Elastic Zone (Grouping):** A dynamically morphing boundary drawn around a group of Nards to denote a loose geographic area.

### 1.3 Constitutional Invariants (AI Anti-Drift Architecture)
To prevent drift during implementation or when utilizing external LLM agents, these rules are unbending invariants of the system architecture:
* **INVARIANT 1 (Distance is Truth):** The Nard's geometric distance is the single source of truth. The UI Semantic Stepper text label is a calculated mathematical projection of that distance, never the underlying stored value.
* **INVARIANT 2 (Absolute vs. Relative):** A Nard's relative position is governed by the active force-directed physics engine. However, its absolute resting X/Y coordinates must be explicitly saved per Snapshot, ensuring nodes don't lose their place if the physics simulation is entirely toggled off.
* **INVARIANT 3 (Format Exclusivity):** The MCP server's Dual-Payload protocol (Mermaid topology + JSON parameters) is the one and only permitted bridge between the spatial graph database and an LLM context window. Any feature attempting to "read the graph" must consume this exact payload structure.---

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

**Optional Data Primitives (Adding Metadata):** 
Familiar to any Notion power user, individuals can enrich Nards via the Detail Drawer. By clicking "+ Add Property" on a Nard or tweaking its template globally via the Nard-Builder, users can attach:
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
Because a Line's primary data payload is its spatial distance, additional metadata remains lightweight to prevent canvas clutter. As with Nards, users can attach custom properties via the "+ Add Property" interface in the Line's Detail Drawer.

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

* **Mechanism:** The user defines a spectrum of qualitative text labels (steps) in the Line Library. By default, the system maps these steps evenly across the 0.0 to 1.0 physical distance scale.
  * *Example 1 (2 Steps):* "Blocker" (0.0 to 0.49) <-> "Independent" (0.50 to 1.0).
  * *Example 2 (3 Steps):* "Loves" (0.0 to 0.33) <-> "Tolerates" (0.34 to 0.66) <-> "Hates" (0.67 to 1.0).
* **Custom Breakpoints:** Because qualitative concepts are rarely evenly distributed (e.g., "Critical" might only span 0.0-0.1, while "Normal" spans 0.1-0.9), the Stepper supports user-adjustable breakpoints. In the Line Library, the label dividers render as draggable slider handles, allowing the user to weight each label's range precisely.

* **Bi-Directional UI Sync:**
  * **Visual Dragging (Graph to Data):** If a user drags two Nards further apart, the system calculates the new math value (e.g., 0.85) and automatically updates the Tether's visible UI label to the corresponding step (e.g., "Hates").
  * **Menu Selection (Data to Graph):** If a user clicks the Tether's metadata menu and changes the stepper from "Loves" to "Hates," the physics engine immediately forces the Nards physically apart on the canvas to match the new mathematical reality.

### 4.5 The Core Spatial-Data Paradigm (Distance = Data)
In the Nards ecosystem, there is no separation between visual proximity and relationship data. Physical distance *is* the data.

* **Per-Line-Type Normalization:** Each Line Type maintains its own independent 0.0 to 1.0 scale. To solve "infinite canvas stretching", the 1.0 maximum distance is bound to a hard system variable (e.g., 2,500 physical pixels at 100% zoom). If users drag linked nodes beyond 2,500 pixels, the line is visually stretched but the semantic distance peaks at 1.0. This prevents an outlier on a single line from squashing all other values to 0.01. When a new extreme distance is introduced that significantly recalibrates a local scale, the system surfaces a subtle toast notification (e.g., *"The 'Blocker' scale has shifted — 4 existing values were affected"*) to keep the user aware.
* **Dynamic Updating:** The system enforces continuous dynamic updates. If a user physically drags a Nard, the underlying 0.0 to 1.0 value of all its connected lines recalculates in real-time based on its new visual position relative to other nodes sharing that Line Type. "Dragging meaning" on the scale immediately updates the database.

Each line type defines its own spatial semantics independently. 
* **Distance meaning:** e.g., "reports-to -> distance = autonomy"
* **Direction meaning:** e.g., "influences -> above = positive influence, below = negative influence"

### 4.6 Conflict Resolution & The Physics Engine
* **The Geometric Challenge:** Because Nards exist in 2D space with many-to-many relationships, physical distance will naturally encounter geometric constraints.
* **The Force-Directed Solution:** The canvas operates on a continuous physics simulation (force-directed graph). Lines act as springs holding the 0.0 to 1.0 tension.
* **Auto-Equilibrium:** If a user forces a Nard into a position that mathematically conflicts with its other active lines, the system calculates the equilibrium. Connected Nards will "pull" or "relax" to balance the tension.
* **Z-Index Collision Avoidance:** In dense clusters, localized repulsion fields prevent Nards from achieving 100% overlap. Z-index is dynamically sorted by the Nard's structural "Size" property, ensuring larger, context-heavy nodes are not buried under smaller nodes.
* **The Fluid Undo (`CMD+Z`):** If a user drags a Nard, triggering systemic equilibrium changes, pressing Undo does not instantly teleport Nards back. The physics engine fluidly rewinds the displacement animation to prevent jarring the user's spatial mental model.
* **Zero-Gravity:** If a Nard has no connections, or its only active lines are toggled to invisible/inactive, it is unmoored. It will simply float in its absolute resting X/Y coordinates rather than snapping to an edge.
## 5. Application Views & Navigation

The underlying data is always the graph. Views (Lenses) are distinct visual frameworks filtering that data.

### 5.1 The Canvas View (Default)
The full spatial physics graph (2D at launch, 3D in Phase 2).
* Pan, zoom, select, drag behaviors
* Nards rendered with size and position based on core data
* Lines rendered with type styling, direction arrows, and distance
* Ghost Lines: Faint background connections for non-active line types

### 5.2 The Palettes (Visibility, Activity & Cross-Highlighting)
The Canvas View acts as the primary interaction lens, managed by the Project Palettes. Users must view context without it interfering with the physics engine.
* **Nard Type Toggles:** The Nard Palette features a Visibility Toggle (Eye icon) for each Nard Type. Hiding a type instantly removes all corresponding Nards from the canvas to reduce noise.
* **Line Type Toggles:** The Connections Palette controls all Line Types via two independent UI toggles:
  * **Visibility Toggle (Eye icon/Checkbox):** Turns the rendering on/off. Multiple Line Types can be visible simultaneously.
  * **Activity Toggle (Magnet/Physics icon/Checkbox):** Determines if the line participates in the force-directed physics engine.
* **The Overlapping Vector Paradox (Spatial Locking):** Activating more than one Line Type simultaneously creates physical conflicts (e.g. Line A wants nodes 10px apart, Line B wants them 500px apart). The physics engine manages this smoothly by pulling the nodes to an averaged visual equilibrium.
  * **Read-Only / Lock State:** However, *Distance = Data*. To prevent the system from overwriting the user's explicit values when finding this averaged visual equilibrium, the graph enters a "Spatially Locked" state whenever >1 Line Type is Active.
  * Users can *view* the overlap, but if they try to drag a Nard, it snaps back like a rubber band connected to a wall. A lock icon anchors to the user's cursor.
  * **Data Mutation:** Only when a *single* Line Type is Active is the lock removed, allowing manual object dragging to rewrite the semantic distance value into the database.
* **Cross-Highlighting:** 
  * *Selecting a Nard* on the canvas instantly illuminates its connected Line Types within the Connections Palette.
  * *Selecting a Line Type* in the palette instantly highlights all Nards currently connected by that line type across the canvas, dimming the rest.

### 5.3 Semantic Zooming & Scale Management
To handle 10 to 5,000 Nards while remaining responsive, the core rendering engine defines anatomical rendering based on the viewport scale.
* **Micro Scale (100% - 75% Zoom):** Full Nard anatomy. Titles, Descriptions (truncated to 2 lines), and Metadata Pills are visible. Tethers display arrows and Semantic Stepper labels.
* **Meso Scale (74% - 25% Zoom):** Descriptions and Metadata Pills fade out. Nards shrink to only showing Title and Icon. Tether labels drop, leaving only colored lines and arrows.
* **Macro Scale (< 25% Zoom):** Structural topology. Text completely removed. Nards are color-coded dots. Tethers are un-labeled hairlines tracing physical clusters.
* **Global Spotlight Search (`CMD+K`):** At Macro scale where text is absent, discoverability relies on `CMD+K`. Querying a Nard triggers an instant Auto-Pan and Zoom (Camera Fly-To), centering the target Nard and applying a focus aura.

### 5.4 Elastic Zones (Dynamic Clustering)
Because active Tethers push and pull Nards naturally, traditional static bounding boxes break (Nards would escape them).
* **Concept:** An Elastic Zone is a colored, translucent bounding area (Convex Hull) explicitly tethered to a group of Nards.
* **Dynamic Morphing:** When the physics engine recalculates and Nards move, the Elastic Zone stretches, shrinks, and morphs to continuously wrap its assigned Nards.
* **Context Generation:** To encourage AI and human understanding, Elastic Zones accept a rich-text Description field and an explicit Name. Grouping Nards isn't just visual; users can explain *why* this cluster exists (e.g., "Marketing Dept: Q3 Initiatives"), providing high-level regional context to the MCP agent without cluttering individual Nard descriptions.

### 5.5 The Spatial Pivot Table (Matrix / Kanban Bridge)
Users require a structured way to view and mass-update spatial data. Rather than a rigid Kanban board, the Matrix View acts as a **Spatial Pivot Table** — a fluid, composable grid driven by the user's own relationship types.

* **The Dual-Axis Model:** The Matrix View presents two axis slots at the top of the screen:
  * **Column Axis (X):** The user drags any Line Type here. Its Semantic Stepper labels become column headers (e.g., Progress: "To Do" | "Doing" | "Done").
  * **Row Axis (Y) — Optional:** The user drags a second Line Type here. Its Stepper labels become swimlane row headers (e.g., Priority: "Critical" | "Normal" | "Low").
* **Single-Axis Mode (Classic Kanban):** With only the Column axis populated, the view operates as a standard Kanban board. Nards snap into columns by their quantized Stepper value.
* **Dual-Axis Mode (The True Matrix):** With both axes populated, each cell represents the intersection of two qualitative states. Nards land in the cell matching both their Column and Row line values simultaneously. A 3-step Progress line × 3-step Priority line yields a 3×3 grid. Users instantly see: *"We have 5 Critical items still in To Do."*
* **Pivoting:** The user can swap axes, or drag a completely different Line Type onto either slot at any time. The Reveal plays — Nards animate from one grid configuration to another. This creates an infinitely recomposable dashboard.
* **Cell Density Heatmap:** At Meso and Macro zoom levels, cells display density-based background heat coloring (darker = more Nards). Empty cells become visible opportunities. Overloaded cells are instant risk indicators.
* **Bi-directional Sync:**
  * **Graph to Matrix:** Nards automatically sort into cells based on their current line values for the selected axes.
  * **Matrix to Graph:** Dragging a Nard to a new cell assigns it the median value of that cell's bucket on each axis. Returning to Graph View triggers the physics engine to reposition the Nard accordingly.

### 5.6 Spatial Transitions & Tweening (The "Wow" Moment)
When a user switches how they view data (e.g., toggling a Tether's physics activity, pivoting the Matrix axes, or shifting from Graph to Matrix View), the shift must be comprehensible.
* **Transition Preview ("The Shimmer"):** Before committing a major layout change (e.g. toggling a Line Type's Activity state), the system briefly renders translucent silhouettes of where Nards will land in their new equilibrium. The user sees the ghost of the future layout, then confirms. This prevents the panic of *"Did I just destroy my board?"*
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
* **Double-Click Radial Menu (Quick Spawn):** Double-clicking empty canvas summons a temporary, circular context menu. The wedges display the user's most recently used Nard Types (e.g., "Task", "Bug", "Character"), with a "More..." wedge that opens the full Nard Palette. This makes the radial menu a true accelerator rather than a single-button shortcut.
* **Hover-Focus (Graph Isolation):** Hovering over a Nard dims all non-connected Nards to 20% opacity, highlighting the active local graph path brightly.
* **The Detail Drawer:** Double-clicking a Nard opens a right-side "Detail Drawer" (resembling Trello or Notion side-peeks) for editing Markdown description and fields, keeping the canvas visible on the left. The Drawer contains tabs for: **Properties** (metadata fields), **Connections** (list of all Tethers with inline Stepper controls), and **Comments** (threaded conversation with @mention support).

### 7.3 Establishing Tethers (Drawing Lines)
Two distinct, purely mouse-driven interactions accommodate different cognitive models:
* **The Spatial Method (Drag-to-Connect):** Selecting a Nard surfaces 4 translucent connector nodes on its edges. The user clicks and drags from a node to the target. Upon drop, a micro-menu prompts the user to select the Line Type.
* **The Structured Method (Drawer Linking):** For dense clusters where drawing lines is visually cramped, the user opens the Detail Drawer, clicks "Add Connection", selects the Type dropdown, and types the target Nard's name. The system generates the physical math line implicitly.

### 7.4 Nard Card Anatomy & Typography
Card density relies strictly on "Collapsed" vs "Expanded" models to keep massive graphs readable.
* **Collapsed State (Canvas Default):** Soft 40 character Title limit (truncated w/ ellipsis). Description truncated to two lines text maximum. Metadata pill limit capped at 3 tags minimum.
* **Expanded State:** The Detail Drawer reveals the full, un-truncated markdown string and the entirety of Metadata fields inside a standard form UI.

### 7.5 Multi-Select & Bulk Actions
When 2+ Nards are selected (via lasso or shift-click), a **Group Action Toolbar** appears above the selection:
* **Bulk Property Edit:** Change a shared metadata field (e.g., Status, Assignee) across all selected Nards simultaneously.
* **Rigid Group Drag:** Move the entire selection as a locked formation, preserving internal distances between selected Nards while the physics engine recalculates their external Tethers.
* **Bulk Connect:** Draw a single Tether from the group to a target Nard; the system creates individual lines from each selected Nard to the target.
* **Bulk Delete:** Remove all selected Nards and their associated Tethers.

### 7.6 Line Interaction & Graph Readability
* **Line Directionality Toggle:** Clicking any active line displays a floating micro-toolbar allowing the user to tap an Arrow icon, cycling A -> B, A <- B, A <-> B or none.
* **Line Spreading (Ribboning):** When two Nards share multiple distinct line types between them (e.g. "Depends On" AND "Assigned To" are both visible), the lines do not stack invisibly on top of each other. They bow outward sequentially like a ribbon cable, ensuring all parallel relationships remain mutually visible and selectable.
* **Line Label Positioning:** Semantic Stepper labels (e.g., "Blocks", "Loves") anchor at the midpoint of the line inside a small background pill. Labels auto-hide if the line is shorter than a minimum pixel threshold to prevent clutter in tight clusters.
* **Line Intersections (Hops/Bridges):** Background/foreground optical parsing is preserved by giving overlapping lines "Line Hops" (a semi-circular visual jump or stroke-gap/halo) when routing so lines don't appear conjoined.

### 7.7 Accessible Color Strategy
* **HSL Constrained Locking:** Custom colors restrict Lightness/Saturation bands (pastel/dark mode matching) to remain strictly accessible. User controls Hue primarily.
* **Auto-Contrasting Text:** Changing a Nard to a deep/dark hue triggers the contrast-checking algorithm (WCAG standards), intelligently flipping Font and Icon colors to pure white automatically.

### 7.8 Canvas Annotations
Not everything on the canvas should be a formal graph node. Sometimes a user needs to leave a note for themselves or their team.
* **Canvas Notes:** Lightweight, translucent sticky-note elements that float on the canvas. They are completely disconnected from the physics engine, ignored by AI topology tools, and excluded from Snapshot data comparisons.
* **Use Cases:** "Don't reorganize this cluster until Thursday", "Sarah — review this section", or temporary brainstorm scratchpads that the user intends to convert into real Nards later.

### 7.9 Touch Interface & Responsive Gestures
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
Before accessing topology, the AI pulls `nards://[project]/semantic_dictionary`. This resource acts as the "Rulebook" containing Project Meta, Nard Lexicon, and Tether definitions. The AI deduces the specific qualitative meaning of the workspace *before* walking the data. If the user invokes a "Blank Canvas", the AI operates gracefully on minimal context (Project Name, Description, and any active user-selected prefabs) without forcing heavy rigid deductions.
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

### 8.8 The Gravity Summary (Always-On AI Insight)
A single button in the Viewport Header — **"Summarize This View"** — takes the current visible canvas state (respecting active Lens filters and zoom level) and generates a natural-language paragraph via MCP:
* *Example output:* "This project has 47 active tasks. 12 are blocked. The Marketing cluster has drifted 40% further from Engineering since last week's snapshot. 3 initiatives are orphaned."
* This is the feature that sells Nards to a C-suite viewer who opens a shared View-Only link and needs instant comprehension without learning the tool.
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

### 9.5 Snapshot Diffing
The Temporal Player shows *evolution*, but users also need *comparison*.
* **Split-Screen Diff Mode:** The user selects two Snapshots and the canvas renders them side-by-side with synchronized pan and zoom.
* **Overlay Diff Mode:** A single canvas overlays both Snapshots with color-coded annotations: **Green** = Nard added since Snapshot A. **Red** = Nard removed. **Amber** = Nard whose spatial position shifted beyond a configurable threshold.
* **Delta Summary:** A sidebar panel lists all changes in plain text (e.g., *"'API Integration' moved from 0.2 to 0.8 on the Blocker scale"*), providing a scannable changelog between two points in time.
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

### 10.4 Comments & Threaded Conversations
Comments live inside the Detail Drawer under the **Comments** tab.
* **Per-Nard Threads:** Each Nard has its own threaded conversation. Users and AI agents can post comments, @mention teammates, and attach inline references to other Nards or Snapshots.
* **Per-Line Comments:** Clicking a Tether and selecting "Comment" from the micro-toolbar opens a lightweight popover thread anchored to that specific relationship. This allows discussions about the nature or status of a connection without cluttering the Nard's own thread.
* **Notification Routing:** @mentions generate in-app notifications and optional email/Slack webhook alerts.

### 10.5 Activity Feed (Canvas Heartbeat)
In multiplayer sessions, changes happening off-screen are invisible. The Viewport Header displays a subtle **Activity Pulse** indicator.
* **Passive State:** A small dot that gently pulses when teammates make changes outside the current viewport (e.g., *"3 changes by Sarah in the last 2 minutes"*).
* **Click-to-Fly:** Clicking the pulse opens a compact activity log. Each entry is clickable, triggering a Camera Fly-To to the affected Nard or region.
* **AI Activity Distinction:** Changes made by AI agents are visually tagged with a bot icon in the feed, distinguishing autonomous mutations from human edits.
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
* The Spatial Pivot Table (Matrix / Kanban Bridge)
* Semantic Zoom scaling
* Heat View (thermal intensity overlay mapping hubs)
* The Temporal Player (Smooth playback histories)
* Snapshot Diffing (Split-screen and overlay comparison modes)
* Perspective Mode
* The Gravity Summary (Always-on AI view summarization)
* Template Marketplace capabilities (Admin publish)
* **Webhook & Event Bus:** Emit events on Nard creation, Tether changes, Snapshot saves, etc., enabling Slack notifications, Jira sync, and custom integrations alongside MCP.
* **Migration Importers:** Dedicated Trello and Notion importers that map columns to Semantic Stepper values and boards to projects, dramatically reducing onboarding friction for switchers.

### Phase 3: Expansion + Growth
* AI Author Mode (AI spawning and suggesting spatial setups natively requiring approval)
* The Gravity Well (Optional physics mode for discovery-driven exploratory layouts)
* **Wormholes (Cross-Project Tension):** Establish tethers across active projects. If Marketing drags a dependent deadline outward on their screen, the Engineering team watches the edge of their canvas stretch as the Marketing team exerts gravitational pull from another dimension.
* **Sandbox Branching:** Forking a Snapshot to play out "What-If" scenarios (e.g. destroying 30 Nards to watch the physics react) without affecting the Live State.
* **Flatten to Doc Export:** Exporting the spatial layout into a beautifully formatted, linear, readable PDF or Notion-style document for executive consumption.
* **Canvas Merge:** Combine two isolated projects natively, detecting overlaps, and resolving duplicates securely.
* **The Pitch (One-Click Story Mode):** Select a path through the graph; Nards generates a slide-by-slide presentation where transitions map physically to the camera following the path.
* **Workspace Folders:** Lightweight organizational grouping above the project level for enterprise teams managing dozens of projects.
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
* Matrix pivot axis swaps per session (Engaging with the Spatial Pivot Table)
* Snapshot Diff usage (Are users comparing states?)
* Return rate (7-day traction)
* MCP Token authentication metrics (AI integration adoption)
* Nard DNA link sharing frequencies
* Gravity Summary invocations (Are viewers engaging with AI insights?)

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
