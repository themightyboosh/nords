# Nards: UI, Tactile Interactions, & Multiplayer

## 1. User Interface & Tactile Interactions
The app utilizes tactile, point-and-click logic rather than keyboard-heavy power-user shortcuts context. It draws inspiration from FigJam, Trello, and Milanote. 

### 1.1 Macro Workspace Layout
The UI explicitly minimizes persistent sidebars to keep 95% of space aimed at the Spatial Canvas.
* **The Viewport Header:** A full-width top bar spanning the entire viewport. Contains:
  * *Left:* Nards logo + Project Switcher (folder icon, project name, snapshot state, chevron dropdown for switching projects and accessing project settings).
  * *Center:* Nards logo (larger, centered for brand identity).
  * *Right:* Notification bell (with unread badge), Activity pulse (off-screen change count), teammate avatars, theme toggle, project settings gear, and **User Account Menu** (avatar + chevron dropdown for profile, preferences, logout).
* **The Global Dock:** A floating, pill-shaped dock centered at the bottom of the screen. The dock contains a **3-way Lens Toggle** (Canvas / Link / Matrix) followed by a separator, then contextual tools that change based on the active lens:
  * *Canvas Lens:* Display ▾ (unified visibility toggles for Nard Types + Connection Types), Sticky (drag source), Add ▾ (creation grid for nards/connections + **Manage Types** button).
  * *Link Lens:* Relationship ▾ (active connection type selector with spectrum slider), Context toggle (show/hide unconnected nards at 20%), Connect (crosshair draw mode), Sticky.
  * *Matrix Lens:* Columns ▾ (connection type selector for X-axis), Rows (optional connection type for Y-axis), Sticky, Add ▾.

### 1.2 Tactile Interaction Design
* **Double-Click Radial Menu (Quick Spawn):** Double-clicking empty canvas summons a temporary, circular context menu. The wedges display the user's most recently used Nard Types, with a "More..." wedge that opens the full Nard Palette.
* **Hover-Focus (Graph Isolation):** Hovering over a Nard dims all non-connected Nards to 20% opacity, highlighting the active local graph path brightly.
* **The Detail Drawer:** Double-clicking a Nard opens a right-side "Detail Drawer" for editing Markdown description and fields, keeping the canvas visible on the left. The Drawer contains tabs for: **Properties** (metadata fields), **Connections** (list of all Tethers with inline Stepper controls), and **Comments** (threaded conversation with @mention support).

### 1.3 Establishing Connections (Drawing Tethers)
Two distinct, purely mouse-driven interactions accommodate different cognitive models:
* **The Spatial Method (Drag-to-Connect):** Selecting a Nard surfaces 4 translucent connector nodes on its edges. The user clicks and drags from a node to the target. Upon drop, a micro-menu prompts the user to select the Connection Type.
* **The Structured Method (Drawer Linking):** For dense clusters where drawing connections is visually cramped, the user opens the Detail Drawer, clicks "Add Connection", selects the Type dropdown, and types the target Nard's name. The system generates the physical math line implicitly.

### 1.4 Nard Card Anatomy & Typography
Card density relies strictly on "Collapsed" vs "Expanded" models to keep massive graphs readable. Each Nard is typed (Task, Bug, Person, Artifact, Milestone, Idea, Epic, Risk, etc.) with a unique icon and accent color.
* **Collapsed State (Canvas Default):**
  * *Title Bar:* Type icon (colored) + type label (uppercase) on the left.
  * *Scale Indicator:* A diagonal expand/contract arrow icon (`Maximize2`) anchored to the bottom-right corner of the card. The user drags this handle to resize the card from **25%** to **200%** of base width. The current scale value (e.g., `1.2×`) is shown in the Detail Drawer.
  * *Title:* Soft 40 character limit, 2-line clamp.
  * *Properties:* 2 configurable key:value property rows (e.g., "Status: Done", "Assignee: Daniel"). A "+N more" indicator shows when additional properties exist. **Properties cannot be added to individual instances** — they are defined at the type level via Manage Types (§1.13).
  * *Footer:* Spectrum component showing the Nard's relative scale value. Scale drives the card's rendered width (0.25x to 2.0x base).
  * *Card Tinting:* Card background is tinted 10% with the type's accent color via `color-mix()`. Border is tinted 20%.
* **Expanded State:** The Detail Drawer reveals the full, un-truncated markdown string and the entirety of Metadata fields in a form UI. Property **values** can be changed here, but properties cannot be added or removed (that requires Manage Types).

### 1.5 Multi-Select & Bulk Actions
When 2+ Nards are selected (via lasso or shift-click), a **Group Action Toolbar** appears above the selection:
* **Bulk Property Edit:** Change a shared metadata field (e.g., Status, Assignee) across all selected Nards simultaneously.
* **Rigid Group Drag:** Move the entire selection as a locked formation, preserving internal distances between selected Nards while the physics engine recalculates their external Tethers.
* **Bulk Connect:** Draw a single Tether from the group to a target Nard; the system creates individual lines from each selected Nard to the target.
* **Bulk Delete:** Remove all selected Nards and their associated Tethers.

### 1.6 Line Interaction & Graph Readability
* **Line Directionality Toggle:** Clicking any active line displays a floating micro-toolbar allowing the user to tap an Arrow icon, cycling A -> B, A <- B, A <-> B or none.
* **Line Spreading (Ribboning):** When two Nards share multiple distinct line types between them (e.g. "Depends On" AND "Assigned To" are both visible), the lines do not stack invisibly on top of each other. They bow outward sequentially like a ribbon cable, ensuring all parallel relationships remain mutually visible and selectable.
* **Line Label Positioning:** Semantic Stepper labels (e.g., "Blocks", "Loves") anchor at the midpoint of the line inside a small background pill colored to match the line type. **The label text angle matches the angle of its parent line** using CSS `rotate()`, ensuring labels read naturally along the line direction. Labels auto-correct angles beyond ±90° to remain readable. When multiple lines share the same pair of nards, labels stagger slightly along the line axis to avoid overlap. Labels are zoom-independent (inverse-scaled). Label text uses auto-contrasting color based on theme.
* **Line Intersections (Hops/Bridges):** Background/foreground optical parsing is preserved by giving overlapping lines "Line Hops" (a semi-circular visual jump or stroke-gap/halo) when routing so lines don't appear conjoined.

### 1.7 Accessible Color Strategy
* **HSL Constrained Locking:** Custom colors restrict Lightness/Saturation bands (pastel/dark mode matching) to remain strictly accessible. User controls Hue primarily.
* **Auto-Contrasting Text:** Changing a Nard to a deep/dark hue triggers the contrast-checking algorithm (WCAG standards), intelligently flipping Font and Icon colors to pure white automatically.

### 1.8 Canvas Annotations (Sticky Notes)
Not everything on the canvas should be a formal graph node. Sometimes a user needs to leave a note for themselves or their team.
* **Anchored Stickies:** Lightweight annotation indicators that **may anchor to either a Nard or a Line**. They are excluded from Snapshot data comparisons and ignored by AI topology tools.
* **Positioning:** Anchored stickies are placed **outside** the boundary of their parent element — never overlapping. For Nards: positioned at the top-right corner outside the card edge (calculated from card width + 8px offset). For Lines: positioned below the line midpoint, offset perpendicular to the line angle. Multiple stickies on the same anchor display a single icon with a **count badge** (e.g., red badge with "2", "3", etc.).
* **Visibility Inheritance:** An anchored sticky inherits the visibility state of its parent. If the parent Nard Type is hidden, all stickies anchored to those Nards disappear. If the parent Line Type is toggled invisible, stickies anchored to those Lines disappear.
* **Unanchored Stickies:** Stickies not anchored to any entity are displayed as a horizontal row of icon indicators flowing left-to-right at the top of the viewport. These can be **drag-anchored** to any Nard or Line by dragging them onto the target.
* **Visual Treatment:** Stickies are **always rendered as a small icon-only indicator** (22×22px sticky note icon) on the canvas — no text is ever shown inline. They are zoom-independent (inverse-scaled to maintain fixed size regardless of zoom level) and positioned relative to their anchor. The icon uses the sticky's accent color (default: amber/warning).
* **Click to Expand/Edit:** Clicking any sticky (anchored or unanchored) opens an inline markdown editor popover. Stickies support basic markdown: bold, italic, links, and lists. The editor dismisses on blur or Escape. Open stickies can be deleted or closed.
* **Dock Integration:** The Global Dock contains a Sticky drag-source button (neutral icon, matching other dock items). Dragging from this button creates a new unanchored sticky.
* **Use Cases:** "Don't reorganize this cluster until Thursday" (anchored to a Nard), "Sarah — review this relationship" (anchored to a Line), general project reminders (unanchored, top row).

### 1.9 Drag Distance Info Panel
When a user drags a Nard while exactly **one** Line Type is active (physics-participating), a transient info panel appears near the drag handle showing the live distance values.
* **Single-Line Active:** The panel displays the current distance value (0.0–1.0), the stepper label, and the Line Type name. The value updates in real-time as the Nard is dragged.
* **Multi-Line Display:** If the active Line Type connects the dragged Nard to multiple other Nards, the panel shows a compact stack of all affected connections with their live values.
* **Dismissal:** The panel disappears when the drag ends or when the user clicks away.
* **Read-Only When Locked:** If more than one Line Type is active, the Nard is spatially locked (per Constitutional Invariant #3). The info panel does not appear because no spatial editing is possible.

### 1.10 Zoom & Pan Controls
The canvas supports standard pan and zoom interactions with explicit UI affordances.
* **Zoom Range:** The viewport supports zoom levels from 25% (Macro topology view) to 200% (detail inspection). Default is 100%.
* **Zoom UI Widget:** A persistent, minimal zoom control widget anchored to the bottom-right of the canvas. Contains:
  * *Zoom-In (+) / Zoom-Out (-) buttons:* Discrete 10% step increments.
  * *Current Zoom Level Display:* A clickable percentage label (e.g. "100%") that resets to 100% on click.
  * *Fit-to-View button:* Auto-zooms and pans to fit all visible Nards within the viewport.
* **Zoom Scaling Behavior:**
  * *Canvas grid (dots and major lines):* Scales with the canvas.
  * *Nard cards:* Scale with the canvas.
  * *Line labels and sticky notes:* Do NOT scale — they remain at a fixed readable size regardless of zoom level.
* **Keyboard / Trackpad:**
  * *Scroll wheel / trackpad pinch:* Continuous zoom toward cursor position.
  * *Cmd+0:* Reset to 100%. *Cmd+= / Cmd+-:* Step zoom.
* **Pan:** Click-and-drag on empty canvas space, or use middle-mouse-button drag. Two-finger drag on trackpad.

### 1.11 Touch Interface & Responsive Gestures
The platform avoids desktop-first compromises to support tablets and mobile interactions flawlessly.
* **Resolution of "Hover":** Touchscreens use Single-Tap to replace Hover states (Triggering Focus & Isolate). Tapping empty canvas clears focus. Double-Tap triggers the Detail Drawer/Radial menu equivalent.
* **Touch-Sized Hit Targets:** Connector nodes scale to 44x44pt (Apple HIG standard minimum) upon Focus selection.
* **Navigation Gestures:**
  * *1-Finger Drag (Empty space):* Pans canvas.
  * *2-Finger Pinch/Spread:* Zoom control.
  * *1-Finger Drag (On Nard):* Moves Nard, locking the physics payload.
  * *Select/Lasso Tool toggle:* Explicit UI button toggles 1-Finger drag to act as bounding-box lasso generation.
* **Adaptive Layouts:**
  * *Global Dock:* On mobile/portrait, it abandons the bottom (to dodge OS home bars/keyboards) and snaps vertically to a side edge.
  * *Detail Drawer:* Degrades on mobile from Right-Slide-over into a swipeable Bottom Sheet covering the lower 70% of the screen.

### 1.12 Visibility Cascade Rules
When Nard Types and Connection Types have independent visibility toggles, boundary conditions arise at partial-visibility intersections.
* **Connection visible, connected Nard hidden:** The hidden Nard is rendered as a **ghost** (20% opacity, desaturated, non-interactive) so the visible connection doesn't terminate in empty space. This preserves spatial continuity.
* **Nard visible, connected Connection hidden:** The Nard renders normally. The hidden connection is not drawn. The nard stands alone without its connections.
* **Both hidden:** Nothing rendered. Complete removal from the canvas.
* **Both visible:** Full rendering — nard at full saturation, connection at full saturation with arrow and label.
* **Ghost Behavior:** Ghost nards share styling with Link mode's context ghosts (identical CSS class `nards-node--ghosted`). They cannot be clicked, dragged, or selected. They exist purely as spatial anchors.

### 1.13 Manage Types Screen
A full-screen modal accessed from the **Add ▾ → Manage Types** button in the dock. This is where the project's type schemas are defined.
* **Two tabs:** Nard Types | Connection Types.
* **Type List:** Sidebar listing all types with their icon/accent color. Includes a "+ New Type" button at the bottom.
* **Properties Table:** For the selected type, shows all properties in a reorderable table with columns: Name, Data Type, Values/Config, and Card Row (which determines the 2 properties shown in collapsed state).
* **+ Add Property:** Adds a new property to the selected type. The property immediately appears on all existing instances of that type (with a default/empty value).
* **Remove Property:** Deletes a property from the type schema. Confirms before removing, as this deletes the property data from ALL instances.
* **Connection-specific:** Connection types show a **Spectrum Stepper Labels** field (comma-separated) for quantizing the 0.0–1.0 distance into named buckets.
* **Common Properties:** All types inherit Title (string), Scale (spectrum_1d), Description (markdown), and Tags (tag[]).

### 1.14 Project Settings Screen
A full-screen modal accessed from the **gear icon** in the Viewport Header.
* **General:** Project name, description, default snapshot mode.
* **Members:** List of team members with role dropdowns (Admin, Editor, Commenter, Viewer). Invite button.
* **Permissions:** Role-based access control configuration.
* **Spectrum Config:** Global defaults for the Spectrum widget (§1.15). Preview for 1D and 2D variants.
* **Notifications:** Alert routing preferences.
* **Sharing:** Public view-only link management with copy-to-clipboard.
* **Danger Zone:** Project deletion with confirmation.

### 1.15 The Spectrum (Universal Value Widget)
The **Spectrum** is Nards' universal widget for expressing a normalized value on a 0.0–1.0 range. It appears wherever a continuous value needs visual representation.
* **Spectrum 1D (Single Axis):** A horizontal bar with a thumb indicator. Used for: connection distances, nard scale, progress, priority, capacity, allocation. Color inherits from the parent type's accent.
* **Spectrum 2D (Dual Axis):** An X×Y coordinate pad with a draggable dot. Used for dual-axis mapping (e.g., Urgency × Impact).
* **Stepper Labels:** Optional named labels that quantize the continuous value into discrete buckets (e.g., `["To Do", "Doing", "Done"]`). The bucket width is `1.0 / num_labels`. Values snap to the nearest bucket visually while maintaining continuous precision underneath.
* **Data Rule:** Per Invariant #1, the Spectrum is not decorative — it IS the data. Connection distance, nard scale, and spectrum_1d properties all use this widget as their primary read/write interface.

---

## 2. Real-Time Multiplayer & Permissions

### 2.1 Conflict Resolution
All users view the same real-world canvas state in a white-board implementation. Concurrent edits resolve efficiently without arbitrary rewrites due to physics engine limitations demanding rigid rulesets constraints.
* **Visual Presence (Cursors & Auras):** Humans and Agents retain distinct cursors. Selecting a Nard applies a colored "Aura" indicating focused access control deterrence.
* **Granular Soft-Locking:**
  * *Spatial Lock:* User A clicks/holds a Nard to drag. It Spatially Locks. User B's cursor slips off (cannot drag simultaneously).
  * *Metadata Open-Edit:* CRDTs (Conflict-free Replicated Data Types) allow User B to edit the Nard's markdown text or dropdown values simultaneously while User A drags it across the canvas.
* **Multiplayer Physics (The "Fixed Anchor" Rule):** If User A and User B grab linked Nards concurrently and pull in opposing directions, the system interprets the Nards as Fixed Anchors. Neither cursor breaks. Instead, the underlying 0.0 - 1.0 data relationship rapidly recalculates to mediate the combined tug-of-war distance explicitly.

### 2.2 Perspective Mode
Click on a teammate's avatar to see the graph weighted by their contributions. Nards they created glow. Lines they defined are bold. Everything else fades structurally. Instantly reveals visual blind spots and operational loads.

### 2.3 Permissions & Sharing Architecture
* **Roles:** Admin (Full access + scheme control), Edit (Create/Modify Nards and Lines), Comment (Read-only + spatial movement locked), View.
* **Public View-Only Links:** Secure, public URLs for any Project or specific Snapshot. No account required.
* **Interactive View-Only Mode:** View-Only restricts mutation but completely embraces exploration. Viewers are blocked from spawning nodes, altering metadata, and dragging Nards. However, they can fully pan, zoom, expand metadata cards, cycle the Temporal Player, and toggle Lenses locally to trigger the physics engine solely for their own device UI.
* **The AI / MCP Wedge:** View-Only links possess native hooks for MCP routing. External viewers can securely grant their Personal AI Agent read-only access to summarize and inspect the workspace securely via the shared link.

### 2.4 Comments & Threaded Conversations
Comments live inside the Detail Drawer under the **Comments** tab.
* **Per-Nard Threads:** Each Nard has its own threaded conversation. Users and AI agents can post comments, @mention teammates, and attach inline references to other Nards or Snapshots.
* **Per-Line Comments:** Clicking a Tether and selecting "Comment" from the micro-toolbar opens a lightweight popover thread anchored to that specific relationship.
* **Notification Routing:** @mentions generate in-app notifications and optional email/Slack webhook alerts.

### 2.5 Activity Feed (Canvas Heartbeat)
In multiplayer sessions, changes happening off-screen are invisible. The Viewport Header displays a subtle **Activity Pulse** indicator.
* **Passive State:** A small dot that gently pulses when teammates make changes outside the current viewport.
* **Click-to-Fly:** Clicking the pulse opens a compact activity log. Each entry is clickable, triggering a Camera Fly-To to the affected Nard or region.
* **AI Activity Distinction:** Changes made by AI agents are visually tagged with a bot icon in the feed, distinguishing autonomous mutations from human edits.
