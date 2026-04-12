# [EPIC] 11: Comments, Search & UX Polish

**Objective:** Implement the federated comments system, CMD+K spotlight search, elastic zones, and all remaining UX interactions.
**Tech:** React, Fuse.js (fuzzy search), CSS
**Ref:** `04_ui.md` §1.8, §1.2, `05_spatial.md` §3-4

---

## [FEATURE] 11.1: Federated Comments Panel

### [STORY] 11.1.1: Comments Panel — Shell & Trigger
* **Target:** `src/components/Comments/CommentsPanel.tsx`, `CommentsPanel.css`
* **Directive:** Dock "Comments" button (all 3 lenses) opens a slide-up flyout panel from dock. Full-width on mobile, 400px wide panel on desktop anchored to bottom-right. Shows all comments across the project in unified timeline.
* **Ref:** `04_ui.md` §1.8
* **AC:** Clicking Comments in dock opens panel. Panel shows all project comments. Closing dismisses with animation.

### [STORY] 11.1.2: Comments Panel — Filters & Sorting
* **Target:** `CommentsPanel.tsx`
* **Directive:** Filter tabs: All, General, Nord Comments, Connection Comments. Sort dropdown: Newest, Oldest, Most Replies, Unresolved Only. Filters apply instantly to comment list.
* **Ref:** `04_ui.md` §1.8
* **AC:** Filtering by "Nord Comments" hides all general and connection comments. Sorting by "Unresolved" shows only `resolved: false`.

### [STORY] 11.1.3: Comments Panel — Entity Highlighting
* **Target:** `CommentsPanel.tsx`
* **Directive:** Each comment shows entity badge (Nord name or Connection type). Clicking a comment triggers Camera Fly-To the associated entity on canvas. Entity pulses briefly with accent color for 2s.
* **Ref:** `04_ui.md` §1.8
* **AC:** Clicking a comment for "Task: API Integration" pans canvas to that node and pulses it.

### [STORY] 11.1.4: Comment Badges on Entities
* **Target:** `NordNode.tsx`, `EuclideanEdge.tsx`
* **Directive:** Nords with comments show small badge (MessageSquare icon + count) positioned top-right outside card. Connections with comments show badge at edge midpoint. Clicking badge opens entity-scoped comment thread.
* **Ref:** `04_ui.md` §1.8
* **AC:** Nord with 3 comments shows badge "3". Clicking opens thread. Adding a comment increments badge.

### [STORY] 11.1.5: General Comments (Project-Level)
* **Target:** `CommentsPanel.tsx`
* **Directive:** "New General Comment" button creates comments not attached to any entity. Appear at top of federated view with distinct "General" badge. Function like Confluence page-level comments.
* **Ref:** `04_ui.md` §1.8
* **AC:** Creating a general comment: appears in panel with "General" badge. Not associated with any node or edge.

---

## [FEATURE] 11.2: Search (CMD+K Spotlight)

### [STORY] 11.2.1: Search Palette — Shell & Keyboard Trigger
* **Target:** `src/components/Search/SearchPalette.tsx`, `SearchPalette.css`
* **Directive:** `CMD+K` opens centered modal with search input. Full-screen overlay (dimmed background). Fuzzy search across all nords (titles + property values), connection types, and commands. Results grouped: "Nords", "Types", "Actions". ESC or click-outside closes.
* **Ref:** `client-alt/SearchPalette/SearchPalette.tsx` (6KB), `05_spatial.md` §3
* **AC:** CMD+K opens palette. Typing "API" shows matching nords. Selecting a result triggers Camera Fly-To.

### [STORY] 11.2.2: Search — Fuzzy Matching with Fuse.js
* **Target:** `src/hooks/useSearch.ts`
* **Directive:** Index all nords (title, description, property values) and connection types (name). Use Fuse.js for fuzzy matching with threshold 0.3. Results sorted by relevance score. Debounce input by 150ms.
* **AC:** Searching "intgrtion" (typo) still finds "API Integration". Results appear within 150ms of typing.

### [STORY] 11.2.3: Search — Camera Fly-To on Select
* **Target:** `SearchPalette.tsx`
* **Directive:** Selecting a search result: close palette, pan+zoom to center on that node, apply 2s focus pulse (accent color glow). If in Matrix lens, highlight the card's cell.
* **AC:** Selecting "API Integration" from search: canvas smoothly pans and zooms to that node. Pulse animation plays.

---

## [FEATURE] 11.3: Elastic Zones & Interactions

### [STORY] 11.3.1: Elastic Zones (Convex Hull Clustering)
* **Target:** `src/components/Canvas/ElasticZone.tsx`
* **Directive:** User can create an Elastic Zone: named, colored, translucent bounding area (Convex Hull algorithm) wrapping a group of nords. Zone dynamically morphs as nords move (physics engine repositions). Zone has Name (editable) and Description (rich text) for AI/human context.
* **Ref:** `05_spatial.md` §4
* **AC:** Creating a zone around 5 nords: convex hull wraps them. Moving a nord: zone boundary updates. Zone name visible as label.

### [STORY] 11.3.2: Touch Interface — Mobile Gesture Mapping
* **Target:** `src/hooks/useTouchGestures.ts`
* **Directive:** 1-finger drag (empty space) = pan. 2-finger pinch/spread = zoom. 1-finger drag (on nord) = move. Single-tap = hover-focus replacement. Double-tap = detail drawer. Connector handles scale to 44x44pt on touch. Lasso tool explicit toggle button.
* **Ref:** `04_ui.md` §1.11
* **AC:** On iPad: pinch zooms, single-finger pans, tapping a nord focuses it. Double-tap opens drawer.

### [STORY] 11.3.3: Notification System (In-App)
* **Target:** `src/components/Layout/Notifications.tsx`
* **Directive:** Bell icon in header. Badge with unread count. Clicking opens dropdown of recent notifications: @mentions, snapshot completions, shared project invites. Each notification clickable (navigates to context).
* **Ref:** `04_ui.md` §1.1, §2.4
* **AC:** @mention in comment → notification badge increments. Clicking notification opens comment thread.

### [STORY] 11.3.4: Permissions & Role-Based UI Boundaries
* **Target:** `src/hooks/usePermissions.ts`
* **Directive:** Based on user role (Admin/Editor/Commenter/Viewer): hide/show mutation buttons, disable drag, disable property editing. Commenter: can comment but not edit. Viewer: explore only (pan, zoom, toggle lenses, expand drawers). Public view-only links = Viewer role.
* **Ref:** `04_ui.md` §2.3
* **AC:** Viewer role: drag disabled, add buttons hidden. Commenter: can post comments but property inputs are disabled.
