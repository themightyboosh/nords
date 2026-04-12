# [EPIC] 10: Snapshots, History & Export

**Objective:** Implement immutable snapshot keyframes, temporal playback with tweened transitions, snapshot diffing, and full project export for RAG contexts.
**Invariant:** Snapshots are immutable. Schema drift between snapshot and live canvas must be detected and handled gracefully.
**Tech:** PostgreSQL JSONB, React, requestAnimationFrame
**Ref:** `02_data_model_and_physics.md` §2.2-2.6, `04_ui.md` §1.14

---

## [FEATURE] 10.1: Snapshot Capture & Storage

### [STORY] 10.1.1: Take Snapshot (Dock Button)
* **Target:** `src/hooks/useSnapshot.ts`
* **Directive:** "Snapshot" dock button (available in all 3 lenses) captures current state. Opens naming dialog: name (required), description (optional markdown). On confirm, serializes full graph state (all nords with positions + properties, all connections with distances, all type schemas) to JSONB and POSTs to snapshots API. Toast confirmation.
* **Ref:** `02_data_model.md` §2.2, `04_ui.md` §1.14
* **AC:** Click Snapshot → enter name → save. Snapshot appears in Project Settings → Snapshots list.

### [STORY] 10.1.2: Snapshot Serialization Format
* **Target:** `src/utils/snapshotSerializer.ts`
* **Directive:** Export `serializeSnapshot(nords, connections, types)` returning JSONB: `{ version: 1, timestamp, nords: [{id, type_id, title, position_x, position_y, scale, properties}], connections: [{id, type_id, source, target, direction, distance_x, distance_y}], nord_types: [...], connection_types: [...] }`.
* **AC:** Unit test: serialize → deserialize round-trip produces identical data. All float values maintain 6 decimal precision.

---

## [FEATURE] 10.2: Snapshot Viewer & Management

### [STORY] 10.2.1: Snapshots List (Project Settings)
* **Target:** `src/components/ProjectSettings/SnapshotsSection.tsx`
* **Directive:** Within Project Settings, "Snapshots" section shows chronological list. Each row: name, timestamp, description preview (truncated), action buttons: Load, Export JSON, Delete (with confirmation). "Animate Through" button at top.
* **Ref:** `04_ui.md` §1.14, `02_data_model.md` §2.4
* **AC:** List renders all snapshots. Clicking Load replaces canvas state with snapshot data. Delete removes snapshot after confirmation.

### [STORY] 10.2.2: Load Snapshot (State Restoration)
* **Target:** `useSnapshot.ts`
* **Directive:** Loading a snapshot replaces current canvas with snapshot data using a 1.5s tweened transition (all nords animate to snapshot positions). Detect schema drift: if snapshot references a type that no longer exists, prompt user to re-activate or strip. After load, canvas is in "snapshot preview" mode (read-only badge visible).
* **Ref:** `02_data_model.md` §2.3 (Snap Restoration Protocol)
* **AC:** Load snapshot → nords animate to snapshot positions. Missing type triggers drift dialog. Canvas shows "Viewing Snapshot: [name]" badge.

### [STORY] 10.2.3: Animate Through All Snapshots
* **Target:** `src/hooks/useSnapshotPlayer.ts`
* **Directive:** Sequential playback: for each snapshot chronologically, tween nords to that snapshot's positions (1.5s per transition + 300ms dwell). Playback controls: Play/Pause, Next, Previous, progress bar. Current snapshot name displayed.
* **Ref:** `02_data_model.md` §2.4
* **AC:** Clicking "Animate Through" plays sequence. Nords physically glide between snapshots. Pause freezes mid-transition.

---

## [FEATURE] 10.3: Snapshot Diffing

### [STORY] 10.3.1: Split-Screen Diff Mode
* **Target:** `src/components/Snapshots/SnapshotDiff.tsx`
* **Directive:** Select two snapshots. Render side-by-side canvases with synchronized pan and zoom. Color-coding: Green nodes = added since left snapshot, Red = removed, unchanged shown normally.
* **Ref:** `02_data_model.md` §2.6
* **AC:** Comparing snapshot A and B: new nodes in B highlighted green. Deleted nodes highlighted red.

### [STORY] 10.3.2: Delta Summary Panel
* **Target:** `SnapshotDiff.tsx`
* **Directive:** Sidebar listing all changes in plain text: "API Integration moved from 0.2 to 0.8 on Blocker scale", "Task 'Login Page' added", "Connection 'Blocks' between X and Y removed". Clickable entries focus the canvas on that entity.
* **Ref:** `02_data_model.md` §2.6
* **AC:** Delta summary lists all additions, removals, and distance changes between two snapshots.

---

## [FEATURE] 10.4: Full Export

### [STORY] 10.4.1: RAG Context Export (Markdown / JSON / YAML)
* **Target:** `src/components/ProjectSettings/ExportSection.tsx`
* **Directive:** Export entire project as structured document. Includes: project metadata, all nords with full properties, all connections with distances and stage labels, graph topology (Mermaid), coordinates, comments, snapshot metadata. Format selection: Markdown (LLM-optimized), JSON, YAML. Token count estimate displayed. Copy-to-clipboard and Download buttons.
* **Ref:** `02_data_model.md` §2.5, `04_ui.md` §1.14
* **AC:** JSON export contains all nords, connections, types. Markdown export is human-readable with Mermaid graph topology section. Token estimate displays.

### [STORY] 10.4.2: Mermaid Graph Topology Generator
* **Target:** `src/utils/mermaidExporter.ts`
* **Directive:** Traverse all nords and connections. Output valid `mermaid.js` graph definition: `graph LR; NodeA["Title"] -->|"Blocks (0.7)"| NodeB["Title"]`. Handle special characters in titles (escape brackets).
* **Ref:** `03_mcp_and_ai_protocols.md`
* **AC:** Generated Mermaid string passes Mermaid parser validation. All nodes and connections represented.

### [STORY] 10.4.3: Export Snapshot as JSON File
* **Target:** `SnapshotsSection.tsx`
* **Directive:** Per-snapshot "Export JSON" button triggers browser download of the snapshot JSONB payload as `{project-name}-{snapshot-name}.json`.
* **AC:** Clicking Export downloads valid JSON file. File can be parsed with `JSON.parse()` without errors.
