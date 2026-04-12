# [EPIC] 8: Spatial Lenses (Link + Matrix)

**Objective:** Implement the 3 spatial lens views: Canvas (default, built in Epic 4), Link (focused single-type editing), and Matrix (spatial pivot table). The Reveal animations live in Epic 12.
**Invariant:** Distance is the singular source of truth. Matrix cells are quantized projections ONLY. Switching lenses preserves all data.
**Tech:** React Flow (Canvas/Link), custom grid layout (Matrix), CSS transitions
**Ref:** `05_spatial_lenses_and_animation.md`

---

## [FEATURE] 8.1: Link Lens

### [STORY] 8.1.1: Link Lens — Active Relationship Selector
* **Target:** `src/components/Lenses/LinkLens.tsx`
* **Directive:** When Link lens activated: dock shows active connection type name + color swatch. Clicking opens dropdown listing all connection types. Selecting one makes it the "active" type. Only the active type renders at full opacity. All other types render as ghosts (8% opacity) or hidden.
* **Ref:** `05_spatial.md` §2
* **AC:** Switching to Link lens and selecting "Blocks": only "Blocks" edges are fully visible. Other types are faint ghosts.

### [STORY] 8.1.2: Link Lens — Ghosting Unconnected Nords
* **Target:** `LinkLens.tsx`
* **Directive:** Nords NOT connected by the active connection type render at 20% opacity (desaturated, non-interactive `nords-node--ghosted` class). Nords WITH connections of active type render at full saturation.
* **Ref:** `05_spatial.md` §2
* **AC:** With "Blocks" active: nords with no "Blocks" connections appear ghosted. Ghosts cannot be clicked or dragged.

### [STORY] 8.1.3: Link Lens — Context Toggle
* **Target:** `LinkLens.tsx`
* **Directive:** Dock toggle: "Show Context" ON = unconnected nords shown as ghosts, OFF = completely hidden. This allows users to discover "what doesn't participate in this relationship."
* **Ref:** `05_spatial.md` §2
* **AC:** Toggle OFF: only nords with active-type connections visible. Toggle ON: all nords visible (unconnected as ghosts).

### [STORY] 8.1.4: Link Lens — Connect Mode (Crosshair Draw)
* **Target:** `src/hooks/useConnectMode.ts`
* **Directive:** Dock "Connect" button enters crosshair mode. Cursor becomes crosshair. Click source nord → click target nord → creates connection of active type with default distance 0.5. ESC exits connect mode.
* **Ref:** `04_ui.md` §1.3
* **AC:** In connect mode: clicking Nord A then Nord B creates a "Blocks" connection. New edge renders immediately.

### [STORY] 8.1.5: Link Lens — Physics Engine (Single-Type Active)
* **Target:** `src/hooks/useForceLayout.ts`
* **Directive:** In Link lens, only the active connection type participates in force-directed physics. Dragging a node recalculates `distance_x` for active-type connections only. Force-directed equilibrium uses spring physics with 300ms settle time on requestAnimationFrame. Bailout at 300ms if not converged.
* **Ref:** `02_data_model.md` §1.6
* **AC:** Dragging a node: connected nords gently pull to maintain their distance values. Releasing triggers 300ms settle animation.

---

## [FEATURE] 8.2: Matrix Lens

### [STORY] 8.2.1: Matrix Lens — Grid Shell & Column Headers
* **Target:** `src/components/Lenses/MatrixView.tsx`, `MatrixView.css`
* **Directive:** Full-viewport grid layout. Column headers from selected X-axis connection type's stage labels (e.g., "To Do" | "Doing" | "Done"). Each header shows label name and nord count. Headers are sticky on vertical scroll.
* **Ref:** `05_spatial.md` §5
* **AC:** Selecting connection type with 3 X-stage labels renders 3-column grid with sticky headers showing counts.

### [STORY] 8.2.2: Matrix Lens — Row Headers (Optional Y-Axis)
* **Target:** `MatrixView.tsx`
* **Directive:** If Y-axis connection type selected: row headers from Y-stage labels create swimlanes. Each cell = intersection of X-column and Y-row. If no Y-axis selected, single-row Kanban mode.
* **Ref:** `05_spatial.md` §5
* **AC:** X = 3-step Progress + Y = 3-step Priority = 3×3 grid. Each cell labeled correctly.

### [STORY] 8.2.3: Matrix Lens — Distance-to-Column Mapping
* **Target:** `src/utils/matrixHelpers.ts`
* **Directive:** Map continuous 0.0–1.0 distance to discrete column index. `bucket_width = 1.0 / num_labels`. Value 0.00–0.33 → column 0, 0.34–0.66 → column 1, 0.67–1.00 → column 2 (for 3 labels). Export `distanceToBucket(value, numLabels)` and `bucketToMedianDistance(bucketIndex, numLabels)`.
* **Ref:** `05_spatial.md` §5
* **AC:** Unit test: `distanceToBucket(0.5, 3)` returns 1. `bucketToMedianDistance(2, 3)` returns 0.833. Edge cases: 0.0 → 0, 1.0 → last bucket.

### [STORY] 8.2.4: Matrix Lens — Card Rendering in Cells
* **Target:** `src/components/Lenses/MatrixCard.tsx`
* **Directive:** Compact card: type icon, type label, title, first property value. Left-border accent matching nord type color. Cards stack vertically within cells. Scroll within cell if overflow.
* **Ref:** `05_spatial.md` §5
* **AC:** Cards render in correct cells. Each card shows type badge + title. Cell with 5+ cards scrolls vertically.

### [STORY] 8.2.5: Matrix Lens — Drag-to-Reassign (Bidirectional Sync)
* **Target:** `MatrixView.tsx`
* **Directive:** Dragging a card from one cell to another updates the underlying distance value to the median of the target bucket. E.g., dragging from "To Do" to "Done" sets `distance_x` to 0.833 (for 3 columns). Returning to Canvas lens: physics engine repositions the nord accordingly.
* **Ref:** `05_spatial.md` §5
* **AC:** Drag card from column 0 to column 2. Switch to Canvas lens. Nord has physically moved further from its connected partner.

### [STORY] 8.2.6: Matrix Lens — Cell Density Heatmap
* **Target:** `MatrixView.css`
* **Directive:** At Meso/Macro zoom: cells display background tint proportional to count. More nords = darker background. Empty cells are very light. Heatmap uses HSL with varying lightness.
* **Ref:** `05_spatial.md` §5
* **AC:** Cell with 10 nords visibly darker than cell with 1. Empty cells are near-white.

### [STORY] 8.2.7: Matrix Lens — Mobile Infinite Panning
* **Target:** `MatrixView.css`
* **Directive:** Sticky row/column headers. Horizontal `overflow-x: scroll` for column overflow (5+ columns). Touch-slide gestures. No pinch-to-zoom in matrix — scroll only.
* **Ref:** `05_spatial.md` §5 (mobile infinite panning)
* **AC:** At 375px width with 6 columns: horizontal scroll reveals off-screen columns. Row headers remain fixed.

### [STORY] 8.2.8: Matrix Lens — Axis Pivoting
* **Target:** `MatrixView.tsx`
* **Directive:** User can swap X and Y axes, or select entirely different connection types. On change, cards animate to new positions (The Reveal — deferred to Animation epic, instant cut acceptable initially).
* **Ref:** `05_spatial.md` §5
* **AC:** Swapping Column type from "Progress" to "Priority" re-sorts all cards into new columns correctly.

### [STORY] 8.2.9: Cross-Palette Highlighting
* **Target:** `src/hooks/useCrossPaletteHighlight.ts`
* **Directive:** Selecting a Nord on canvas highlights its connected Line Types in the Connections Palette. Selecting a Line Type in palette highlights all connected Nords, dimming the rest.
* **Ref:** `05_spatial.md` §2.1
* **AC:** Clicking a nord: its connection types glow in the palette sidebar. Clicking a type in palette: connected nords highlight, others dim.
