# Nords: Data Model & Physics Engine

## 1. Core Concepts & The Universal Concept Model
At its core, the Nords engine is a domain-agnostic spatial relationship database built on four foundational primitives. By customizing the schema of these primitives, the engine maps to any human or programmatic framework.

### 1.1 The Four Primitives
* **Entities (Nords):** Data objects with customizable metadata schemas (defined via Nard-Builder). These act as the nodes in the spatial graph.
* **Tethers (Lines):** Relationships between Entities. These act as the edges in the graph, utilizing the 0.0 to 1.0 spatial paradigm.
* **Time/State (Snapshots):** The chronological axis of the canvas, utilizing an immutable keyframe architecture.
* **Lenses (Views):** The specific visual framework filtering the data (e.g., the Physics Graph vs. the Kanban Bridge).

### 1.2 Nords (Node Cards)
A nard is the atomic unit. It is a rich content object — closer to a Notion page than a sticky note.
Nard types are user-defined schemas (e.g., "Task", "Person", "Risk", "Idea"). Each type defines which fields are present. Types are managed by Admins.

#### Nard Metadata Options (Node Schema)
The "Nard-Builder" allows users and AI agents to configure custom schemas for different Nard types.

**Mandatory Core Properties:**
* **Name:** String identifier.
* **Description:** Rich text field with full Markdown support (critical for AI readability and generation).

**Optional Data Primitives (Adding Metadata):** 
Familiar to any Notion power user, individuals can enrich Nords via the Detail Drawer. By clicking "+ Add Property" on a Nard or tweaking its template globally via the Nard-Builder, users can attach:
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

### 1.3 Lines (Tethers / Relationships)
Lines connect nords and represent the nature of their relationship. Line types are user-defined schemas managed by Admins. They define the vocabulary of relationships available in a workspace.

#### Line Metadata Options (Tether Schema)
Because a Line's primary data payload is its spatial distance, additional metadata remains lightweight to prevent canvas clutter. As with Nords, users can attach custom properties via the "+ Add Property" interface in the Line's Detail Drawer.

**Core Properties:**
* **Name / Label:** Semantic meaning (e.g., "Depends On").
* **Description:** Markdown-supported text field to explain the context of the relationship.

**Directionality (Vector Flow):** Defines the flow of the relationship:
* *Non-directional:* A simple bond.
* *Unidirectional:* A flows to B.
* *Bidirectional:* Mutual flow.

**Visual Styling & Toggles:** Toggles for Boolean states (e.g., Active vs. Proposed) and system meta for color, stroke thickness, and dash style.

### 1.4 The Semantic Stepper (Qualitative Translation)
This is the core translation layer between the system's physics engine and the user's mental model. It solves the cognitive gap between continuous spatial mathematics and qualitative human reasoning by translating the 0.0 to 1.0 distance scale into discrete meanings.

* **Mechanism:** The user defines a spectrum of qualitative text labels (steps) in the Line Library. By default, the system maps these steps evenly across the 0.0 to 1.0 physical distance scale.
* **Custom Breakpoints:** Because qualitative concepts are rarely evenly distributed (e.g., "Critical" might only span 0.0-0.1, while "Normal" spans 0.1-0.9), the Stepper supports user-adjustable breakpoints. In the Line Library, the label dividers render as draggable slider handles.
* **Bi-Directional UI Sync:**
  * **Visual Dragging (Graph to Data):** If a user drags two Nords further apart, the system calculates the new math value (e.g., 0.85) and automatically updates the Tether's visible UI label.
  * **Menu Selection (Data to Graph):** If a user clicks the Tether's metadata menu and changes the stepper from "Loves" to "Hates," the physics engine immediately forces the Nords physically apart on the canvas to match the new mathematical reality.

### 1.5 The Core Spatial-Data Paradigm (Distance = Data)
In the Nords ecosystem, there is no separation between visual proximity and relationship data. Physical distance *is* the data.

* **Per-Line-Type Normalization:** Each Line Type maintains its own independent 0.0 to 1.0 scale. To solve "infinite canvas stretching", the 1.0 maximum distance is bound to a hard system variable (e.g., 2,500 physical pixels at 100% zoom). If users drag linked nodes beyond 2,500 pixels, the line is visually stretched but the semantic distance peaks at 1.0. This prevents an outlier on a single line from squashing all other values. 
* **Dynamic Updating:** The system enforces continuous dynamic updates. If a user physically drags a Nard, the underlying 0.0 to 1.0 value of all its connected lines recalculates in real-time. "Dragging meaning" on the scale immediately updates the database.

### 1.6 Conflict Resolution & The Physics Engine
* **The Geometric Challenge:** Because Nords exist in 2D space with many-to-many relationships, physical distance will naturally encounter geometric constraints.
* **The Force-Directed Solution:** The canvas operates on a continuous physics simulation (force-directed graph). Lines act as springs holding the 0.0 to 1.0 tension.
* **Auto-Equilibrium:** If a user forces a Nard into a position that mathematically conflicts with its other active lines, the system calculates the equilibrium. Connected Nords will "pull" or "relax" to balance the tension.
* **Z-Index Collision Avoidance:** In dense clusters, localized repulsion fields prevent Nords from achieving 100% overlap. Z-index is dynamically sorted by the Nard's structural "Size" property.
* **The Fluid Undo (`CMD+Z`):** Pressing Undo fluidly rewinds the displacement animation to prevent jarring the user's spatial mental model.
* **Zero-Gravity:** If a Nard has no connections, or its only active lines are toggled to invisible/inactive, it is unmoored. It will simply float in its absolute resting X/Y coordinates.

---

## 2. Data Model, Snapshots, & History

### 2.1 Data Format Architecture (Postgres Storage)
The canonical export/import engine runs purely on structured JSON payloads mapping standard graph-edges semantics (Nard Types, Line Types, the graph arrays, Views/Filters arrays, and Snapshots). Under the hood, this relies on Postgres utilizing graph/relational patterns.

### 2.2 Immutable Snapshots (State Preservation)
A Snapshot is an explicitly wrapped keyframe of the entire canvas.
* **Scope:** It captures exact coordinates, line values (0.0-1.0), and the exact metadata payloads of every Nard and Line at a precise millisecond.
* **Immutability:** Snapshots are strictly Read-Only time capsules. They act similarly to a formal Git Commits natively wrapped for presentation/reference usage.

### 2.3 Non-Destructive Metadata (Soft Deletes)
To prevent generating corrupted snapshots when users modify schemas globally (e.g., deleting a "Status" property on a Nard Template), the system leverages a "Soft Delete" data pipeline.
* Stripping a field hides it from the Live Canvas and future implementations.
* Legacy Snapshots inherently retrieve the archived metadata field gracefully.
* **Snapshot Restoration Protocol:** If a historical Snapshot block is pushed into the Live Canvas, the platform detects schema drift and prompts the user to universally re-activate the missing schema or strip the relic.

### 2.4 The Temporal Player (Snapshot Cycling)
Snapshots function natively as a presentation and storytelling medium.
* **Management:** Explicit saves, named tagging, and deletions available along the visual timeline.
* **The Playback Mechanic:** Clicking 'Play' on the timeline triggers an automated sequence through the chronological history.
* **Interpolated Tweening (Time Scrubber):** As the player cycles from Snapshot A to B, the physics engine implements a 1.5-second easing transition pulling Nords morphologically.

### 2.5 Snapshot Diffing
The Temporal Player shows *evolution*, but users also need *comparison*.
* **Split-Screen Diff Mode:** The canvas renders two snapshots side-by-side with synchronized pan and zoom.
* **Overlay Diff Mode:** A single canvas overlays both Snapshots with color-coded annotations: **Green** = added, **Red** = removed, **Amber** = spatially shifted.
* **Delta Summary:** A sidebar panel lists all changes in plain text (e.g., *"'API Integration' moved from 0.2 to 0.8 on the Blocker scale"*).
