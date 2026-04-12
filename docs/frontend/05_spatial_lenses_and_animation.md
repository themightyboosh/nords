# Nords: Spatial Lenses & Animation

The underlying data is always the graph. Views (Lenses) are distinct visual frameworks filtering that data.

## 1. The Canvas Lens (Default)
The full spatial physics graph (2D at launch, 3D in Phase 2). Activated via the **Canvas** button in the Dock's 3-way Lens Toggle.
* Pan, zoom, select, drag behaviors
* Nords rendered with type-specific accent colors, properties, and size-driven widths
* Connections rendered with type styling, direction arrows, angle-matched labels in colored pills, and ribbon spreading for parallel connections
* Ghost Connections: Faint background connections for non-active connection types (8% opacity)
* **Dock Tools:** Display ▾ (unified visibility toggles for Nord Types + Connection Types), Comments, Snapshot, Add ▾ (creation grid + Manage Types)
* **Visibility Cascade:** See §1.12 in UI doc — hidden nord types with visible connections render as ghosts at 20% opacity

## 2. The Link Lens (Focused Editing)
Activated via the **Link** button in the Dock's Lens Toggle. This is the only mode where spatial editing (drag = write distance) is permitted. It isolates exactly one Connection Type for focused relationship management.
* **Active Relationship Selector:** The dock shows the active Connection Type (e.g., "Blocks") with its color swatch and a spectrum slider. Clicking opens a dropdown to switch types.
* **Ghosting:** Nords not connected by the active Connection Type render at 20% opacity (desaturated, non-interactive). The active connection type renders at full saturation with labels and arrows. Other connection types render as context ghosts (8% opacity) or are hidden entirely.
* **Context Toggle:** A toggle in the dock controls whether unconnected nords are shown as ghosts (ON) or completely hidden (OFF). This allows discovery of "what doesn't participate in this relationship."
* **Connect:** A crosshair-mode button lets the user click source nord → target nord to create a new connection of the active type.
* **Drag Info Panel:** Per §1.9, dragging a nord shows live distance values for the active connection type.
* **Dock Tools:** Relationship ▾, Context toggle, Connect, Comments, Snapshot.

### 2.1 Palette Visibility & Activity
The Canvas Lens manages Palettes with independent visibility and activity toggles. The Link Lens replaces this with a single-relationship focus.
* **Nord Type Toggles:** The Nord Palette (Canvas lens only) features a Visibility Toggle (Eye icon) for each Nord Type. Hiding a type follows the Visibility Cascade rules.
* **Line Type Toggles:** The Connections Palette controls all Line Types via two independent UI toggles:
  * **Visibility Toggle (Eye icon/Checkbox):** Turns the rendering on/off. Multiple Line Types can be visible simultaneously.
  * **Activity Toggle (Magnet/Physics icon/Checkbox):** Determines if the line participates in the force-directed physics engine.
* **The Overlapping Vector Paradox (Spatial Locking):** Activating more than one Line Type simultaneously creates physical conflicts (e.g. Line A wants nodes 10px apart, Line B wants them 500px apart). The physics engine manages this smoothly by pulling the nodes to an averaged visual equilibrium.
  * **Read-Only / Lock State:** However, *Distance = Data*. To prevent the system from overwriting the user's explicit values when finding this averaged visual equilibrium, the graph enters a "Spatially Locked" state whenever >1 Line Type is Active.
  * Users can *view* the overlap, but if they try to drag a Nord, it snaps back like a rubber band connected to a wall. A lock icon anchors to the user's cursor.
  * **Data Mutation:** Only when a *single* Line Type is Active (Link lens) is the lock removed, allowing manual object dragging to rewrite the semantic distance value into the database.
* **Cross-Highlighting:** 
  * *Selecting a Nord* on the canvas instantly illuminates its connected Line Types within the Connections Palette.
  * *Selecting a Line Type* in the palette instantly highlights all Nords currently connected by that line type across the canvas, dimming the rest.

## 3. Semantic Zooming & Scale Management
To handle 10 to 5,000 Nords while remaining responsive, the core rendering engine defines anatomical rendering based on the viewport scale.
* **Micro Scale (100% - 75% Zoom):** Full Nord anatomy. Titles, Descriptions, and Metadata Pills are visible. Connections display arrows and Semantic Stage labels.
* **Meso Scale (74% - 25% Zoom):** Descriptions and Metadata Pills fade out. Nords shrink to only showing Title and Icon. Connection labels drop, leaving only colored lines and arrows.
* **Macro Scale (< 25% Zoom):** Structural topology. Text completely removed. Nords are color-coded dots. Connections are un-labeled hairlines tracing physical clusters.
* **Global Spotlight Search (`CMD+K`):** At Macro scale where text is absent, discoverability relies on `CMD+K`. Querying a Nord triggers an instant Auto-Pan and Zoom (Camera Fly-To), centering the target Nord and applying a focus aura.

## 4. Elastic Zones (Dynamic Clustering)
Because active Connections push and pull Nords naturally, traditional static bounding boxes break (Nords would escape them).
* **Concept:** An Elastic Zone is a colored, translucent bounding area (Convex Hull) explicitly connectioned to a group of Nords.
* **Dynamic Morphing:** When the physics engine recalculates and Nords move, the Elastic Zone stretches, shrinks, and morphs to continuously wrap its assigned Nords.
* **Context Generation:** To encourage AI and human understanding, Elastic Zones accept a rich-text Description field and an explicit Name. Grouping Nords isn't just visual; users can explain *why* this cluster exists, providing high-level regional context to the MCP agent without cluttering individual Nord descriptions.

## 5. The Matrix Lens (Spatial Pivot Table / Kanban Bridge)
Activated via the **Matrix** button in the Dock's Lens Toggle. Users require a structured way to view and mass-update spatial data. Rather than a rigid Kanban board, the Matrix View acts as a **Spatial Pivot Table** — a fluid, composable grid driven by the user's own relationship types.

* **The Dual-Axis Model:** The Dock presents two axis slots (Columns and Rows):
  * **Column Axis (X):** The user selects any Line Type from the Columns dropdown. Its Semantic Stage labels become column headers (e.g., Progress: "To Do" | "Doing" | "Done").
  * **Row Axis (Y) — Optional:** The user selects a second Line Type for the Rows slot. Its Stage labels become swimlane row headers (e.g., Priority: "Critical" | "Normal" | "Low").
* **Single-Axis Mode (Classic Kanban):** With only the Column axis populated, the view operates as a standard Kanban board. Nords snap into columns by their quantized Stage value.
* **Dual-Axis Mode (The True Matrix):** With both axes populated, each cell represents the intersection of two qualitative states. Nords land in the cell matching both their Column and Row line values simultaneously. A 3-step Progress line × 3-step Priority line yields a 3×3 grid. Users instantly see: *"We have 5 Critical items still in To Do."*
* **Distance-to-Column Mapping:** Per Invariant #1 (Distance is Truth), the 0.0–1.0 distance value is the source of truth. Stage labels are quantized projections: `bucket_width = 1.0 / num_labels`. Value 0.00–0.33 → column 0, 0.34–0.66 → column 1, 0.67–1.00 → column 2 (for a 3-label stage).
* **Card Rendering:** Matrix cards show type icon, type label, title, and first property value. Cards are color-coded with a left border accent matching the nord type. Columns have a subtle header showing label name and nord count.
* **Pivoting:** The user can swap axes, or select a completely different Line Type onto either slot at any time. The Reveal plays — Nords animate from one grid configuration to another. This creates an infinitely recomposable dashboard.
* **Cell Density Heatmap:** At Meso and Macro zoom levels, cells display density-based background heat coloring (darker = more Nords). Empty cells become visible opportunities. Overloaded cells are instant risk indicators.
* **Bi-directional Sync:**
  * **Graph to Matrix:** Nords automatically sort into cells based on their current line values for the selected axes.
  * **Matrix to Graph:** Dragging a Nord to a new cell assigns it the median value of that cell's bucket on each axis (e.g., "To Do" = 0.167, "Doing" = 0.5, "Done" = 0.833). Returning to Canvas/Link Lens triggers the physics engine to reposition the Nord accordingly.
* **Dock Tools:** Columns ▾ (Line Type selector), Rows (optional Line Type), Comments, Snapshot, + New ▾.

## 6. Spatial Transitions & Tweening (The "Wow" Moment)
When a user switches how they view data (e.g., toggling a Connection's physics activity, pivoting the Matrix axes, or shifting from Graph to Matrix View), the shift must be comprehensible.
* **Transition Preview ("The Shimmer"):** Before committing a major layout change (e.g. toggling a Line Type's Activity state), the system briefly renders translucent silhouettes of where Nords will land in their new equilibrium. The user sees the ghost of the future layout, then confirms. This prevents the panic of *"Did I just destroy my board?"*
* **Animated State Changes:** No instant "hard cuts". 
* **The Tweening Mechanic ("The Reveal"):** The UI utilizes a 1.0 to 1.5-second easing animation. Users physically watch the Nords untangle, glide across the canvas using spring physics, and snap into a new geometric equilibrium. This preserves the spatial mental model without disorienting the user.
