# [EPIC] 7: Detail Drawer & Entity Editing

**Objective:** Build the right-slide Detail Drawer for editing Nords and Connections, including tabbed interface, markdown editor, property forms, and inline connection management.
**Invariant:** Property schemas cannot be added/removed from the Drawer — only values changed. Schema changes go through Manage Types.
**Tech:** React, Vanilla CSS, Markdown editor
**Mock Ref:** `client-alt/Drawer/DetailDrawer.tsx` (15KB), `MarkdownEditor/`

---

## [FEATURE] 7.1: Drawer Shell

### [STORY] 7.1.1: Drawer — Open/Close Mechanics
* **Target:** `src/components/Drawer/DetailDrawer.tsx`, `DetailDrawer.css`
* **Directive:** Right-side slide-over panel. Opens with 250ms ease-out animation. Canvas remains visible on left (drawer overlays ~400px on right). Close button (X) in top-right. Click-outside closes. Opens on double-click of a Nord or Connection. Supports two modes: "Nord Mode" and "Line Mode" based on entity type.
* **Ref:** `client-alt/Drawer/DetailDrawer.tsx`, `04_ui.md` §1.2
* **AC:** Double-clicking a nord opens drawer sliding from right. Clicking X or outside closes with animation.

### [STORY] 7.1.2: Drawer — Mobile Bottom Sheet
* **Target:** `DetailDrawer.css`
* **Directive:** Below 768px, drawer transforms from right-slide to bottom-sheet covering lower 70%. Drag handle at top for swipe-to-dismiss. Content scrolls vertically.
* **Ref:** `04_ui.md` §1.11
* **AC:** At 375px viewport, drawer appears from bottom. Swipe down dismisses.

---

## [FEATURE] 7.2: Nord Mode Drawer

### [STORY] 7.2.1: Drawer — Header (Type Badge, Title, Close)
* **Target:** `DetailDrawer.tsx`
* **Directive:** Top of drawer: type icon + type label badge (colored), editable title field (inline edit on click), close button. Title updates on blur, persists to DB.
* **AC:** Clicking title makes it editable. Typing new title and pressing Enter/blur saves it. Canvas card title updates simultaneously.

### [STORY] 7.2.2: Drawer — Properties Tab
* **Target:** `src/components/Drawer/PropertiesTab.tsx`
* **Directive:** Form rendering all type-defined properties as editable fields: Select → dropdown, Multi-Select → tag input, Number → number input, Date → date picker, Boolean → checkbox, URL → text input with "open" link, User → member dropdown. Read-only for properties the user can't edit (role-based). Scale property shows Spectrum 1D widget inline.
* **Ref:** `04_ui.md` §1.4 (Expanded State), `08_property_types_reference.md`
* **AC:** Each property type renders correct input widget. Changing a value persists immediately (debounced 500ms). Scale change updates card width on canvas.

### [STORY] 7.2.3: Drawer — Description Tab (Markdown Editor)
* **Target:** `src/components/Drawer/DescriptionTab.tsx`
* **Directive:** Full markdown editor for nord description. Port from `client-alt/MarkdownEditor/`. Supports: headings, bold/italic, lists, code blocks, links. Toolbar with formatting buttons. Preview mode toggle. Autosaves on 1s debounce.
* **Ref:** `client-alt/MarkdownEditor/`, `02_data_model.md` §1.2
* **AC:** Typing markdown renders live preview. Formatting buttons wrap selected text. Content persists on blur.

### [STORY] 7.2.4: Drawer — Connections Tab
* **Target:** `src/components/Drawer/ConnectionsTab.tsx`
* **Directive:** List of all connections for this nord. Each row shows: connection type badge (colored), direction arrow, target/source nord name, Spectrum 1D inline slider for distance, stage label. "Add Connection" button: select type → type target nord name → auto-creates connection. Structured Method as per spec.
* **Ref:** `04_ui.md` §1.3 (Structured Method), §1.6
* **AC:** Connection list shows all links. Dragging spectrum slider updates distance in real-time. Adding a connection by name creates it on canvas.

### [STORY] 7.2.5: Drawer — Comments Tab
* **Target:** `src/components/Drawer/CommentsTab.tsx`
* **Directive:** Threaded conversation for this specific nord. Shows existing comments with author avatar, name, timestamp, body. Reply button nests threads. @mention support with autocomplete. Resolve/unresolve toggle per comment.
* **Ref:** `04_ui.md` §1.8, §2.4
* **AC:** Posting a comment adds it to the thread. Replying nests under parent. @mention shows user autocomplete. Resolved comments are dimmed.

---

## [FEATURE] 7.3: Line Mode Drawer

### [STORY] 7.3.1: Drawer — Line Mode Header & Direction Toggle
* **Target:** `DetailDrawer.tsx`
* **Directive:** When opened for a connection: shows line type badge (colored), source nord → target nord names, direction toggle (A→B | A←B | None). Toggling direction updates arrow rendering on canvas immediately.
* **Ref:** `04_ui.md` §1.6
* **AC:** Toggle direction from "forward" to "reverse": arrow flips on canvas. Setting "none" removes arrow.

### [STORY] 7.3.2: Drawer — Line Properties & Distance
* **Target:** `DetailDrawer.tsx`
* **Directive:** Shows: Spectrum 1D widget for X distance, Spectrum 1D widget for Y distance (if dual-axis configured), stage label dropdown (changes distance via bidirectional sync), line-specific custom properties, description field. **Arrow ↔ Spectrum rule:** If direction is "none" and type has spectrum, distance field is grayed out (read-only).
* **Ref:** `04_ui.md` §1.6, `02_data_model.md` §1.3
* **AC:** With direction "none": spectrum slider is disabled/grayed. Setting direction to "forward" enables it. Changing stage dropdown repositions nords.

### [STORY] 7.3.3: Drawer — Per-Connection Comments
* **Target:** `DetailDrawer.tsx`
* **Directive:** Same threaded comment UI as Nord mode, but scoped to this specific connection. Comment badge on edge updates count.
* **Ref:** `04_ui.md` §2.4
* **AC:** Adding a comment to a connection increments the edge's comment badge.

---

## [FEATURE] 7.4: Undo System

### [STORY] 7.4.1: Fluid Undo/Redo (Cmd+Z / Cmd+Shift+Z)
* **Target:** `src/hooks/useUndoRedo.ts`
* **Directive:** Track action history: node moves, property changes, connection create/delete, type changes. `Cmd+Z` reverts last action. For node position changes, animate the revert (300ms ease-out) instead of snapping. Max 50 undo steps.
* **Ref:** `02_data_model.md` §1.6 (Fluid Undo)
* **AC:** Move a node → Cmd+Z → node smoothly animates back. Delete a connection → Cmd+Z → connection reappears. Cmd+Shift+Z redoes.
