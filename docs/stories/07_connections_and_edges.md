# [EPIC] 6: Connections, Lines & Edge Rendering

**Objective:** Implement all connection mechanics: draw-to-connect, edge rendering, directional labels, ribboning, line hops, and the spatial-data paradigm.
**Invariant:** No pathfinding. Euclidean purity. Distance 0.0–1.0 is the data. Per-line-type normalization bound to 2500px at 100% zoom.
**Architecture:** Lines render as center-to-center SVG paths BEHIND opaque nord cards (z-index layering). Direction is conveyed by chevron-shaped label pills, NOT line arrowheads. Cards must remain opaque at all times (even when ghosted) to maintain the visual illusion.
**Tech:** React Flow custom edges, SVG path math, Quadratic Béziers, CSS clip-path
**Ref:** `04_ui.md` §1.3, §1.6, `02_data_model.md` §1.5, `09_edge_rendering_study.md`, `CanvasMock.tsx` (reference implementation)

---

## [FEATURE] 6.1: Edge Math Engine

### [STORY] 6.1.1: Center-to-Center Line Renderer
* **Target:** `src/components/Canvas/EuclideanEdge.tsx`
* **Directive:** Custom React Flow edge type registered as `euclidean`. Renders a straight SVG `<path>` from source nord center to target nord center. Lines render BEHIND card nodes via z-index (SVG layer z-index < node z-index). Cards are opaque, so lines naturally disappear under card bodies. Stroke color from connection type accent. Stroke width 2px. **No card-edge clipping math needed** — the opaque card occlusion handles it visually.
* **Ref:** `05_spatial.md` §1 (Pure Edge Rendering), `CanvasMock.tsx` line rendering
* **AC:** Edges render as straight lines between node centers. Lines pass cleanly behind card bodies. Moving nodes updates edge endpoints in real-time.

> **GCP Architect Note:** This simplification eliminates ~120 lines of card-edge intersection math from the critical rendering path, reducing per-frame CPU cost and simplifying the React Flow custom edge component significantly.

### [STORY] 6.1.2: Quadratic Bézier Ribboning for Parallel Edges
* **Target:** `EuclideanEdge.tsx`, `src/utils/edgeMath.ts`
* **Directive:** When 2+ connections exist between the same pair of nords, apply perpendicular offset to create "ribbon" effect using Quadratic Bézier curves. Offset = `connection_index * 12px` perpendicular to the center-to-center line. Single connections remain straight. Control point placed at midpoint + perpendicular offset × 2.
* **Ref:** `04_ui.md` §1.6 (Ribboning), `CanvasMock.tsx:getRibbonOffset()`
* **AC:** Two connections between Node A and Node B render as two curved lines spread apart. Three connections show three parallel curves.

---

## [FEATURE] 6.2: Edge Visual Features

### [STORY] 6.2.1: Directional Chevron Labels + Native Arrowheads
* **Target:** `src/components/Canvas/ConnectionLabel.tsx`, `CanvasEngine.css`, `graphToReactFlow.ts`
* **Directive:** Direction is conveyed by **both** the label pill shape AND native React Flow arrowheads (`MarkerType.ArrowClosed`). Four direction modes:
  - `direction === 'end'` → right-pointing chevron label + arrowhead at target (`markerEnd`)
  - `direction === 'start'` → left-pointing chevron label + arrowhead at source (`markerStart`)
  - `direction === 'both'` → arrowheads at both ends (`markerStart` + `markerEnd`), plain rectangle label. Distance is shared as a single value applied equally to both directions.
  - `direction === 'neither'` → no arrowheads, plain rounded rectangle label. **Spectrum and distance values are disabled** — connection is metadata-only.
* **Angle Flip Rule:** When the label rotates beyond ±90° for readability, any directional chevron MUST invert so it continues pointing along the correct flow direction.
* **Ref:** `04_ui.md` §1.6, `02_data_model.md` §1.3 Directionality
* **AC:** A "Blocks" connection (`direction: 'end'`) shows a right-pointing chevron label AND a filled arrowhead at the target. A "Relates" connection (`direction: 'neither'`) shows a plain rectangle with no arrows and its distance values are read-only. A `direction: 'both'` connection shows arrowheads at both endpoints with a plain rectangle label.

> **DBA Note:** The `direction` column in `connections` accepts: `'start'`, `'end'`, `'both'`, `'neither'`. The `'neither'` value acts as a constraint: `distance_x` and `distance_y` should be treated as read-only/null when direction is `'neither'`.

### [STORY] 6.2.2: Edge Label Positioning (Angle-Matched with Glow)
* **Target:** `EdgeLabel.tsx`, `EdgeLabel.css`
* **Directive:** Label text (connection type name) anchored at edge midpoint inside a colored pill. **Label angle matches parent line angle** via CSS `rotate()`. Auto-correct angles beyond ±90° to remain readable (flip text + invert chevron). When multiple ribboned edges share same nords, labels stagger along axis to avoid overlap. Labels are zoom-independent (inverse-scaled). **Add mode-specific glow:** dark mode = `drop-shadow(0 0 4px rgba(0,0,0,0.5))`, light mode = `drop-shadow(0 0 4px rgba(255,255,255,0.6))`.
* **Ref:** `04_ui.md` §1.6, `CanvasMock.css` label glow
* **AC:** Label "Blocks" renders at 30° angle matching its edge. At 150° angle, text flips to remain readable AND chevron direction inverts. Zooming in/out keeps label at fixed readable size. Subtle glow visible around labels in both modes.

### [STORY] 6.2.3: Line Hops (Intersection Bridges)
* **Target:** `src/utils/lineIntersection.ts`, `EuclideanEdge.tsx`
* **Directive:** Detect where two edges cross. At intersection points, the "background" edge renders a semicircular hop (arc detour) of 8px radius, creating visual separation. Determine foreground/background by connection type sort_order.
* **Ref:** `04_ui.md` §1.6
* **AC:** Two crossing edges: one shows a small arc hop at the intersection. No visual merging of lines.

### [STORY] 6.2.4: Ghost Connections and Opaque Card Invariant
* **Target:** `EuclideanEdge.tsx`, `NordCard.css`
* **Directive:** Connections whose type is visible but NOT the active type in Link lens render at 8% opacity. Non-visible types don't render at all. **CRITICAL: Ghosted (grayed-out) nord cards must remain OPAQUE.** The ghost effect MUST use `filter: brightness(0.35) saturate(0.15)` — **NOT `opacity`**. Using `opacity` on the card would make it transparent, allowing the z-indexed-behind lines to show through the card body, breaking the visual model.
* **Ref:** `05_spatial.md` §1, `CanvasMock.css` `.nords-node--ghosted`
* **AC:** With "Blocks" active: "Blocks" edges at 100% opacity, "Depends On" edges at 8%, hidden types not rendered. Ghosted cards are visually dimmed but lines NEVER show through card bodies.

---

## [FEATURE] 6.3: Drawing Connections

### [STORY] 6.3.1: Drag-to-Connect (Spatial Method)
* **Target:** `src/hooks/useConnectionDraw.ts`
* **Directive:** When a nord is selected/hovered in Link mode, 4 translucent connector handles appear on edges (top/right/bottom/left, 12px circles). **Connector position computed dynamically** based on card content height (type badge: 20px + title: 22px + props × 17px + overflow: 16px + padding: 24px) and card width (`200 × (0.75 + size × 1.25)`). User clicks and drags from a handle to a target node. On drop, a micro-menu appears prompting connection type selection. After type selection, connection is created with default distance 0.5.
* **Ref:** `04_ui.md` §1.3 (Spatial Method), `CanvasMock.tsx` connector positioning
* **AC:** Dragging from handle to target shows live preview line. Connectors sit flush against each card's actual edges regardless of content height. Dropping opens type selector. Selecting type creates connection with `distance_x: 0.5`.

### [STORY] 6.3.2: Connection Type Selection Micro-Menu
* **Target:** `src/components/Canvas/ConnectionTypePicker.tsx`
* **Directive:** Small popup at drop position. Lists all connection types (icon + name + color swatch). Single-click selects. Click-outside cancels. If only one connection type exists, auto-select it.
* **AC:** With 3 connection types defined, popup shows 3 options. Selecting one creates the connection. Canceling removes the preview line.

### [STORY] 6.3.3: Line Detail Interaction (Click to Select)
* **Target:** `EuclideanEdge.tsx`
* **Directive:** Clicking an edge selects it (thickens stroke to 4px, adds glow). An invisible fat hit-area (stroke-width 12px, transparent) overlays each line for reliable click detection. Right-click opens context menu: Edit (opens Detail Drawer in Line Mode), Delete, Change Direction. Double-click opens Detail Drawer directly.
* **Ref:** `04_ui.md` §1.6, `CanvasMock.tsx` invisible stroke hit-area
* **AC:** Clicking edge selects it visually. Double-click opens Detail Drawer showing line properties.

---

## [FEATURE] 6.4: Distance = Data Engine

### [STORY] 6.4.1: Real-Time Distance Calculation on Drag
* **Target:** `src/hooks/useDistanceSync.ts`
* **Directive:** When a node is dragged in Link Lens (single active line type), calculate the Euclidean distance between it and all connected nodes for the active type. Normalize to 0.0–1.0 using `MAX_DISTANCE_PX = 2500`. Update `distance_x` in real-time. Persist on drag end.
* **Ref:** `02_data_model.md` §1.5
* **AC:** Dragging Node A toward Node B: distance decreases. At 0px apart: 0.0. At 2500px apart: 1.0. Beyond 2500px: clamps at 1.0. Value persists to database.

### [STORY] 6.4.2: Drag Distance Info Panel
* **Target:** `src/components/Canvas/DragInfoPanel.tsx`
* **Directive:** During drag in Link Lens with single active line type: floating panel near cursor shows live distance value (0.0–1.0), stage label (e.g., "Doing"), and line type name. For multi-line scenarios, show compact stack of all affected connections. Panel disappears on drag end.
* **Ref:** `04_ui.md` §1.9
* **AC:** Dragging a nord shows info panel updating at 60fps. Panel shows "Blocks: 0.45 (In Progress)".

### [STORY] 6.4.3: Bidirectional Sync — Stage Selection Updates Position
* **Target:** `useDistanceSync.ts`
* **Directive:** When stage label is changed via Detail Drawer dropdown (e.g., "To Do" → "Done"), calculate the median distance value for that stage bucket and update `distance_x`. Trigger physics engine to reposition the nord to match the new distance.
* **Ref:** `02_data_model.md` §1.4 (Bi-Directional UI Sync)
* **AC:** Changing "Blocks" stage from "To Do" (0.167) to "Done" (0.833) physically moves the connected nords apart on canvas.

### [STORY] 6.4.4: Spatial Locking (>1 Active Line Type)
* **Target:** `src/hooks/useSpatialLock.ts`
* **Directive:** When >1 line type has physics activity toggled ON, enter "Spatially Locked" state. Nodes cannot be dragged to write distance. Attempting drag shows rubber-band snap-back + lock cursor icon. Info panel does not appear.
* **Ref:** `05_spatial.md` §2.1 (Overlapping Vector Paradox)
* **AC:** With 2 active line types: dragging a node snaps it back. Lock icon appears on cursor. With 1 active type: drag works normally.
