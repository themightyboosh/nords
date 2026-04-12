# [EPIC] 4: React Flow Spatial Canvas Engine

**Objective:** Mount React Flow as the spatial rendering engine with custom node/edge overrides, pan/zoom, grid, and physics hooks.
**Invariant:** Default React Flow pathfinding DISABLED. All edge routing uses pure Euclidean geometry. Distance = Data.
**Tech:** React Flow v11+, custom nodes, custom edges, requestAnimationFrame
**Mock Ref:** `client-alt/src/components/Canvas/CanvasMock.tsx` (39KB)

---

## [FEATURE] 4.1: React Flow Initialization

### [STORY] 4.1.1: Mount React Flow Provider
* **Target:** `src/components/Canvas/CanvasEngine.tsx`
* **Directive:** Wrap canvas area in `<ReactFlowProvider>`. Initialize with `<ReactFlow>` component. Configure: `nodeTypes` (custom), `edgeTypes` (custom), `fitView` on mount, `panOnScroll`, `zoomOnPinch`, `minZoom: 0.25`, `maxZoom: 2.0`, `defaultEdgeOptions: { type: 'euclidean' }`.
* **Ref:** `10_technology_and_infrastructure.md` §1 (React Flow)
* **AC:** Canvas renders. Pan and zoom work. No default node types visible.

### [STORY] 4.1.2: Canvas Background Grid
* **Target:** `CanvasEngine.tsx`
* **Directive:** React Flow `<Background>` component with dot pattern. Grid scales with zoom. Major grid lines every 100px. Colors from CSS tokens (`--canvas-grid-color`).
* **AC:** Grid dots visible. Zooming in/out scales grid appropriately.

### [STORY] 4.1.3: Keyboard Shortcuts for Pan/Zoom
* **Target:** `src/hooks/useCanvasShortcuts.ts`
* **Directive:** `Cmd+0`: reset to 100%. `Cmd+=`/`Cmd+-`: step zoom 10%. `Cmd+K`: open search palette. Space+drag: pan. Register via `useEffect` on mount, cleanup on unmount.
* **Ref:** `04_ui.md` §1.10
* **AC:** Unit test: simulating `Cmd+0` calls `setZoom(1.0)`. E2E: pressing `Cmd+K` opens search overlay.

---

## [FEATURE] 4.2: Custom Node Registration

### [STORY] 4.2.1: Base Nord Node Wrapper
* **Target:** `src/components/Canvas/NordNode.tsx`
* **Directive:** Custom React Flow node type `nordNode`. Receives `data` prop with: `title`, `typeName`, `typeIcon`, `typeColor`, `properties`, `scale`, `isGhosted`, `isSelected`. Renders card shell with type-tinted background via `color-mix()`. Registers 4 connection handles (top, right, bottom, left) for drag-to-connect.
* **Ref:** `04_ui.md` §1.4, `05_spatial.md` §1
* **AC:** Registering `nodeTypes={{ nordNode: NordNode }}` renders cards. Cards show type tinting. Connection handles visible on hover.

### [STORY] 4.2.2: Node Selection & Focus Behavior
* **Target:** `NordNode.tsx`, `src/hooks/useNodeSelection.ts`
* **Directive:** Single click selects node (blue outline). Multi-select via shift-click or lasso drag. Selected nodes expose Group Action Toolbar. Hover triggers "focus isolation" (dim non-connected nodes to 20% opacity).
* **Ref:** `04_ui.md` §1.2 (Hover-Focus), §1.5 (Multi-Select)
* **AC:** Clicking a node sets `selected: true`. Hovering dims unconnected nodes. Shift-clicking adds to selection.

### [STORY] 4.2.3: Node Dragging & Position Persistence
* **Target:** `src/hooks/useNodeDrag.ts`
* **Directive:** Dragging a node updates `position` in React Flow state. On drag end, persist new `position_x`/`position_y` to database via API call. Debounce persistence by 300ms.
* **AC:** Drag a node. Release. Refresh page. Node is in the new position.

### [STORY] 4.2.4: Node Right-Click Context Menu
* **Target:** `src/components/Canvas/NodeContextMenu.tsx`
* **Directive:** Right-click on node: Edit (opens Detail Drawer), Duplicate, Delete, Change Type, Add Connection. Positioned at cursor. Dismisses on click-outside.
* **AC:** Right-clicking a node shows menu. Clicking "Delete" removes node and associated connections.

---

## [FEATURE] 4.3: Node Spawning
## [FEATURE] 4.3: Node Spawning

### [STORY] 4.3.0: 2500 Node Hard Cap (Performance Guardrail)
* **Target:** `src/hooks/useNodeCountLimit.ts`
* **Directive:** Export a hook that tracks total node count. If `total >= 2500`, disable all Add buttons, Radial Spawns, and MCP creation APIs. Show persistent warning toast: "Workspace at maximum capacity (2500 Nords)."
* **Ref:** `10_technology_and_infrastructure.md` (Node Limits)
* **AC:** Reaching exactly 2500 nodes visibly disables creation UI. Attempting to spawn node 2501 via API rejects with 422 limit error.



### [STORY] 4.3.1: Add Nord via Dock Flyout
* **Target:** `src/components/Canvas/AddNordFlyout.tsx`
* **Directive:** "Add ▾" dock button opens flyout grid. Grid shows all nord types (icon + name). Clicking a type creates a new nord at canvas center with that type. Also shows "Manage Types" button at bottom.
* **Ref:** `04_ui.md` §1.1 (Add ▾)
* **AC:** Clicking "Task" in flyout creates a new task nord at viewport center. Nord appears on canvas immediately.

### [STORY] 4.3.2: Double-Click Radial Quick-Spawn Menu
* **Target:** `src/components/Canvas/RadialMenu.tsx`
* **Directive:** Double-clicking empty canvas shows circular context menu at cursor position. Wedges display 4 most recently used nord types + "More..." wedge. Selecting a type spawns a nord at that position. Menu disappears on selection or click-outside.
* **Ref:** `04_ui.md` §1.2 (Double-Click Radial Menu)
* **AC:** Double-click empty area → radial menu appears. Selecting a type creates a nord at that exact position.

---

## [FEATURE] 4.4: Display & Visibility Controls

### [STORY] 4.4.1: Display Flyout (Nord Type Visibility Toggles)
* **Target:** `src/components/Canvas/DisplayFlyout.tsx`
* **Directive:** "Display ▾" dock button opens flyout panel. Two sections: **Nord Types** (each with eye toggle) and **Connection Types** (each with eye toggle + physics/magnet toggle). Toggling eye hides/shows that type. Toggling physics activates/deactivates force-directed participation.
* **Ref:** `04_ui.md` §1.12, §1.1, `05_spatial.md` §2.1
* **AC:** Toggling a nord type's eye to OFF hides all nords of that type. Ghost rendering follows visibility cascade rules.

### [STORY] 4.4.2: Visibility Cascade (Ghost Rendering — Opaque Invariant)
* **Target:** `src/hooks/useVisibilityCascade.ts`, `NordCard.css`
* **Directive:** Implement ghost rendering rules: connection visible + connected nord hidden → nord renders as ghost. Nord visible + connection hidden → nord renders normally, connection not drawn. Both hidden → nothing. **CRITICAL INVARIANT:** Ghosted nords use `filter: brightness(0.35) saturate(0.15)` — **NEVER `opacity`.** Lines render behind cards via z-index layering; if the card becomes transparent via `opacity`, lines would show through the card body. The ghost class (`nords-node--ghosted`) must be non-interactive and desaturated but its background must remain fully opaque.
* **Ref:** `04_ui.md` §1.12, `07_connections_and_edges.md` §6.2.4, `CanvasMock.css` ghost styles
* **AC:** Unit test: hiding "Bug" type while "Blocks" connection is visible → blocked bugs render as ghosts. Ghosts cannot be clicked or dragged. **Lines never show through ghosted card bodies at any zoom level.**

### [STORY] 4.4.3: Semantic Zoom Thresholds
* **Target:** `src/hooks/useSemanticZoom.ts`
* **Directive:** At zoom 100%-75% (Micro): full card anatomy visible. At 74%-25% (Meso): hide descriptions and property rows, show only title + icon. Below 25% (Macro): nords become colored dots, connections become hairlines, all text removed.
* **Ref:** `05_spatial.md` §3
* **AC:** Zooming to 50% hides property rows. Zooming to 20% renders nords as dots. Performance: 500+ nords at Macro zoom renders at 60fps.

### [STORY] 4.4.4: Lasso Multi-Select & Group Actions Toolbar
* **Target:** `src/components/Canvas/GroupToolbar.tsx`
* **Directive:** Lasso drag selects contained nodes. When 2+ nodes selected, toolbar floats above selection: "Bulk Edit" (shared property change), "Move Group" (rigid formation drag), "Bulk Connect" (draw single connection from group), "Delete All". Toolbar dismisses on click-outside.
* **Ref:** `04_ui.md` §1.5
* **AC:** Lasso-selecting 3 nords shows toolbar with 4 buttons. "Move Group" drags all 3 maintaining relative positions.

### [STORY] 4.4.5: Fit-to-View Camera Animation
* **Target:** `src/hooks/useCameraFly.ts`
* **Directive:** `fitView()` wrapper that animates smoothly (300ms ease-out) instead of snapping. Also exposes `flyToNode(id)` that centers and zooms to a specific node with a brief pulse animation.
* **Ref:** `04_ui.md` §1.10, `05_spatial.md` §3 (Camera Fly-To)
* **AC:** Calling `flyToNode('abc')` smoothly pans and zooms to center on that node. Node pulses briefly with accent color after arrival.
