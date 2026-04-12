# Nords Mock — Full Audit & Tech Readiness Review

## 1. Documentation Status

### README Update Required

The `docs/README.md` is **missing the new doc** (`08_property_types_reference.md`). The architecture section needs to reference it. Also, the Connection Type description in §1.13 of `04_ui_and_interactions.md` still references a single "Spectrum Stage Labels" field — it needs to reflect the **X/Y dual-axis stage** model.

### Stale Term Scan
| Term | Occurrences in docs/ | Status |
|------|---------------------|--------|
| `Nard` (old branding) | 0 | ✅ Clean |
| `Tether` (old term) | 0 | ✅ Clean |
| `Stepper` (old term) | 0 | ✅ Clean |

### Doc-to-Doc Cross-Consistency Issues

| Doc | Issue | Fix |
|-----|-------|-----|
| **README.md** | Missing `08_property_types_reference.md` reference | Add to architecture section |
| **04_ui §1.13** | "Spectrum Stage Labels field (comma-separated)" — should reference X and Y stage properties separately | Update to dual-axis model |
| **04_ui §1.3** | References "Structured Method (Drawer Linking)" with "+ Add Connection" button — not mocked | Add to mock backlog or doc as Phase 2 |
| **02_data §1.3** | "As with Nords, users can attach custom properties via the '+ Add Property' interface in the Line's Detail Drawer" — this contradicts the type-level-only rule | Clarify: "type-level" not "instance-level" |
| **02_data §1.2** | "By clicking '+ Add Property' on a Nord" — same contradiction | Update to reference Manage Types |

---

## 2. Mock vs. Documentation Validation Matrix

### Feature Coverage (04_ui_and_interactions.md)

| Section | Feature | Mocked? | Notes |
|---------|---------|---------|-------|
| §1.1 | Viewport Header (left/center/right) | ✅ | Logo, project name, avatars, theme, settings, notifications |
| §1.1 | Global Dock (3-way toggle) | ✅ | Canvas / Link / Matrix with contextual tools |
| §1.1 | Mobile responsive | ✅ | Hamburger header, segmented control dock |
| §1.2 | Double-click radial menu | ❌ | **Not mocked** — Phase 2 |
| §1.2 | Hover-focus graph isolation | ❌ | **Not mocked** — requires physics engine |
| §1.2 | Detail Drawer (Nord mode) | ✅ | Properties, Connections, Comments tabs; Markdown editor |
| §1.3 | Drag-to-connect (4 nodes) | ✅ | Connector nodes visible in Link mode |
| §1.3 | Drawer linking ("Add Connection") | ❌ | **Not mocked** |
| §1.4 | Card anatomy (collapsed) | ✅ | Type badge, title, 3 properties, scale handle, comment badge |
| §1.4 | Card tinting (color-mix) | ✅ | Background 10%, border 20% |
| §1.5 | Multi-select & bulk actions | ❌ | **Not mocked** — Phase 2 |
| §1.6 | Line directionality (arrows) | ✅ | Edge-clipped arrows with markers |
| §1.6 | Line Detail Drawer | ✅ | Direction toggle, spectrum distance, properties |
| §1.6 | Line spreading (ribboning) | ❌ | **Not mocked** — requires physics path routing |
| §1.6 | Line labels (angle-matched pills) | ✅ | Rotated labels at midpoint |
| §1.7 | HSL constrained color | ✅ | Theme system with 4 themes |
| §1.8 | Federated comments | ✅ | Flyout with filter/sort, entity linking |
| §1.9 | Drag distance info panel | ❌ | **Not mocked** — requires physics live updates |
| §1.10 | Zoom & pan controls | ✅ | Widget with +/-, %, fit-to-view |
| §1.11 | Touch/responsive | ✅ | CSS breakpoints, segmented control |
| §1.12 | Visibility cascade (ghost nords) | ✅ | 20% opacity ghosting in Link mode |
| §1.13 | Manage Types screen | ✅ | Nord Types + Connection Types tabs, property table |
| §1.14 | Project Settings screen | ✅ | 10 sections sidebar |
| §1.15 | Spectrum widget | ✅ | 1D bar with thumb |
| §1.8 | Comment badges on cards | ✅ | MessageSquare + count |
| A.1 | Transition requirements | ✅ | Documented, not implemented (by design) |

**Coverage: 19/24 (79%)** — The 5 missing items are all physics/interaction-dependent features appropriate for the tech build, not the static mock.

### Additional Mock Screens (Beyond doc)

| Screen | Status | Notes |
|--------|--------|-------|
| Empty State (zero nords) | ✅ | Hero + 3 action cards |
| Search Palette (⌘K) | ✅ | Recent, fuzzy search, quick actions |
| Project Dashboard | ✅ | Sidebar nav, project card grid |
| Snapshot History panel | ✅ | Take + History tabs |
| Markdown Editor | ✅ | Toolbar + preview toggle |

---

## 3. Code Review — Mock Codebase

### Codebase Stats
- **28 source files** (14 `.tsx`, 14 `.css`)
- **~8,160 lines** total
- **0 TypeScript errors** (`tsc --noEmit` clean)
- **Dependencies:** React 19.2, Lucide React 1.8 (icons only), Vite 8.0

### Architecture Assessment

**Strengths:**
- Clean component isolation — each feature lives in its own directory with co-located CSS
- Consistent BEM-like naming (`nords-{component}__{element}--{modifier}`)
- Theme system is well-structured (CSS custom properties, 4 themes, `data-theme` attribute)
- ZSS ordering is correct after the SVG z-index fix (cards < SVG < labels < connector nodes)
- Zero external runtime dependencies beyond React + Lucide — easy to audit

**Issues Found:**

| Severity | File | Issue | Recommendation |
|----------|------|-------|----------------|
| 🔴 **High** | `CanvasMock.tsx` | **860 lines, monolithic.** Contains mock data, geometry helpers, intersection math, zoom/pan state, SVG rendering, card rendering, label rendering, and 3 different view modes. | Split into: `CanvasData.ts` (mock data), `geometry.ts` (helpers), `ConnectionLayer.tsx` (SVG), `NordCard.tsx` (card component), `MatrixView.tsx` |
| 🔴 **High** | All components | **No state management.** All state lives in `App.tsx` and is prop-drilled 2–3 levels deep. Adding any feature (selection, undo, collaboration) requires threading more props. | Introduce Zustand or React Context for app-level state |
| 🟡 **Medium** | `App.tsx` | **10+ `useState` calls** at top level. State is getting unwieldy. | Group related state into named slices (e.g., `useUIState`, `useLensState`) |
| 🟡 **Medium** | `DetailDrawer.tsx` | Hardcoded mock data inline — no data layer separation | For production: pull from Zustand store |
| 🟡 **Medium** | `MarkdownEditor.tsx` | Regex-based markdown renderer — no syntax tree, no XSS protection | For production: replace with `marked` + `DOMPurify` |
| 🟢 **Low** | `SearchPalette.tsx` | Hardcoded mock data — fine for mock, needs real index for production | Use `fuse.js` for fuzzy search in production |
| 🟢 **Low** | Multiple CSS files | 1,800+ lines of CSS custom properties + component styles. Some redundancy. | Consider CSS Modules or a design token system |

### Missing Centralized Components

These are components that the mock should have but currently **inlines or hardcodes**:

| Component | Where It's Needed | Current Status | Recommendation |
|-----------|------------------|----------------|----------------|
| **IconSelector** | Manage Types (per-type), Project Settings (project icon) | ❌ **Not built** — doc §1.14 references "Icon Library" section | Build as a modal grid of Lucide icons with search/filter. Use `lucide-react` dynamic import. |
| **PropertyEditor** | Manage Types (add/edit property schema) | ❌ **Not built** — Manage Types shows a static table | Build as a row component with type dropdown, name input, validation config |
| **ColorPicker** | Manage Types (per-type color), Project Settings | ❌ **Not built** — colors are hardcoded | Build as an HSL picker with constrained L/S bands per §1.7 |
| **StageEditor** | Manage Types > Connection Types (X/Y stage labels) | ❌ **Not built** — doc §1.13 references configurable stages | Build as a sortable list with add/remove/rename + 0–1 position preview |
| **UserAvatarStack** | Viewport Header (member avatars) | ✅ **Partially** — avatar circles rendered inline | Extract into reusable `<AvatarStack members={[]} />` |
| **ConfirmDialog** | Project Settings (danger zone), Manage Types (delete) | ❌ **Not built** — no confirmation UX | Build as a generic modal with message + confirm/cancel |
| **ToastNotification** | After snapshot, delete, export actions | ❌ **Not built** | Build as a transient notification system |

---

## 4. Tech Build Readiness — Library & Framework Recommendations

### Current Stack (Mock)
| Layer | Technology | Verdict |
|-------|-----------|---------|
| Framework | React 19 + Vite 8 | ✅ Keep |
| Icons | Lucide React | ✅ Keep |
| Styling | Vanilla CSS + custom properties | 🟡 Adequate for mock, reconsider for production |
| State | `useState` prop-drilling | 🔴 Replace |
| Canvas | DOM-based (HTML/CSS cards in viewport) | 🟡 Evaluate |
| Connections | SVG overlaid on DOM | 🟡 Evaluate |
| Markdown | Regex renderer | 🔴 Replace |

### Recommended Production Libraries

| Category | Library | Why |
|----------|---------|-----|
| **State Management** | [Zustand](https://github.com/pmndrs/zustand) | Minimal API, no boilerplate, works with React 19 concurrent mode. Perfect for: nord positions, connections, selection, UI state, undo/redo (with `temporal` middleware). |
| **Canvas Rendering** | [React Flow](https://reactflow.dev/) **OR** [Pixi.js](https://pixijs.com/) + React wrapper | React Flow gives you node+edge graph out of the box (draggable nodes, connection handles, minimap, zoom/pan). Pixi.js is WebGL for 500+ node performance. **Decision depends on §A.3 threshold — 200 nodes = DOM, 500+ = WebGL.** |
| **Markdown** | [`marked`](https://github.com/markedjs/marked) + [`DOMPurify`](https://github.com/cure53/DOMPurify) | Production-grade parsing + XSS protection. ~10KB total. |
| **Fuzzy Search** | [`fuse.js`](https://fusejs.io/) | Client-side fuzzy search for ⌘K palette. 4KB gzipped. |
| **Physics** | [`d3-force`](https://github.com/d3/d3-force) | Force-directed layout for connection distance equilibrium. Battle-tested. Can run in WebWorker for off-main-thread compute (per §A.3). |
| **Animation** | [`framer-motion`](https://www.framer.com/motion/) | "The Reveal" transition (Matrix ↔ Canvas), drawer slides, toast animations. `AnimatePresence` for mount/unmount animations. Layout animations for card reflow. |
| **Drag/Resize** | [`@dnd-kit/core`](https://dndkit.com/) | Drag-to-reorder in Matrix, drag nords on canvas, drag connection handles. Keyboard accessible. |
| **CRDT / Multiplayer** | [`Yjs`](https://yjs.dev/) + WebSocket provider | Real-time collaboration, conflict-free editing. Per §2.1, the soft-locking model maps directly to Yjs awareness protocol. |
| **CSS** | Vanilla CSS (**keep**) or [CSS Modules](https://github.com/css-modules/css-modules) | Avoid Tailwind — the design system relies on custom properties and BEM-like naming which are already well-structured. CSS Modules add scoping without changing the approach. |
| **Notifications** | [`sonner`](https://sonner.emilkowal.dev/) | Lightweight toast system. 4KB. |

### Rendering Strategy Decision

> [!IMPORTANT]
> **DOM vs Canvas vs WebGL — The Critical Choice**

| Approach | Pros | Cons | Best For |
|----------|------|------|----------|
| **DOM (current)** | Rich styling (CSS), accessibility, text selection, existing tooling | Performance degrades at 300+ nodes, no custom hit testing | ≤200 nords |
| **HTML + SVG (hybrid)** | Cards remain DOM for rich content, connections are SVG for path rendering | Two coordinate systems to sync | Current mock approach — reasonable to 300 |
| **React Flow** | Purpose-built for node graphs, handles zoom/pan/connections natively, minimap, supports custom nodes | Opinionated — may fight custom physics | Best balance of effort vs capability |
| **Canvas/WebGL (Pixi.js)** | 60fps at 1000+ nodes, GPU compositing | Lose CSS styling, accessibility, text rendering complexity | ≥500 nords |

**Recommendation:** Start with **React Flow** for the initial build. It provides the node+edge graph primitives out of the box, handles zoom/pan natively, supports custom node renderers (so your existing card designs transfer), and has a well-documented edge system with connection handles. If performance becomes a bottleneck at scale, the node renderer can be migrated to Canvas.

---

## 5. Actions Required

### Immediate (Update Docs Now)
1. Update `docs/README.md` — add `08_property_types_reference.md` to architecture section
2. Update `04_ui §1.13` — reflect X/Y dual-axis stage model for connection types
3. Fix `02_data §1.2 + §1.3` — clarify properties are type-level only (not instance-level "Add Property")

### Before Tech Build Starts
4. Build **IconSelector** component (reusable modal)
5. Build **PropertyEditor** component (reusable row)
6. Build **ColorPicker** component (HSL constrained)
7. Build **StageEditor** component (sortable 0–1 waypoints)
8. Extract **NordCard** from CanvasMock into standalone component
9. Extract **ConnectionLayer** SVG rendering into standalone component

### Tech Build — Dependency Installation Order
```bash
# Core
npm i zustand          # State management
npm i reactflow        # Or: npm i @xyflow/react (v12+)

# Content
npm i marked dompurify @types/dompurify
npm i fuse.js

# Animation & Interaction
npm i framer-motion
npm i @dnd-kit/core @dnd-kit/sortable

# Real-time (Phase 2)
npm i yjs y-websocket

# Polish
npm i sonner           # Toast notifications
```
