import os
import zipfile

out_dir = "docs/stories"
os.makedirs(out_dir, exist_ok=True)

files = {}

files["00_master_index.md"] = """# Nords Backlog: Master Index

This directory contains the AI-optimized, test-driven execution backlog for the Nords Spatial Engine.
As defined in `11_ai_optimized_agile_schemas.md`, all stories are structured with deterministic boundaries and computable validation criteria.

## Sequence Order
1. [`01_sprint_zero.md`](./01_sprint_zero.md): DevOps, Emulator, and Environment Provisioning.
2. [`02_spatial_engine.md`](./02_spatial_engine.md): Custom React Flow port, Euclidean geometry invariants.
3. [`03_crdt_multiplayer.md`](./03_crdt_multiplayer.md): Yjs WebSocket connections and concurrency rules.
4. [`04_data_persistence.md`](./04_data_persistence.md): PostgreSQL JSONB wrappers and Firebase interactions.
5. [`05_matrix_lenses.md`](./05_matrix_lenses.md): The Dual-Axis Spatial Pivot Table mapping constraint.
6. [`06_polish_and_auth.md`](./06_polish_and_auth.md): Tweening transitions, Identity validations.
7. [`07_mcp_ai_integration.md`](./07_mcp_ai_integration.md): Context server protocols for LLM connections.
"""

files["01_sprint_zero.md"] = """# [EPIC] Sprint 0: Devops & Environment Foundation

**Objective:** Bootstrap the offline testing harness and local cloud emulators to prevent drift.
**Invariants:** All CI must pass locally before upstreaming.

## [FEATURE] 0.1: Emulators & Test Runners
* **Impact Zone:** `.firebaserc`, `package.json`, `playwright.config.ts`
* **Dependencies:** None

### [STORY] 0.1.1: Configure Firebase Local Emulators
* **Target:** `firebase.json`
* **Directive:** Bind Auth and Firestore local emulators to `127.0.0.1` explicitly. No remote db hooks on dev.
* **Acceptance Criteria:** `npm run emulators:start` exits cleanly within 10s.

### [STORY] 0.1.2: Playwright E2E Harness
* **Target:** `playwright.config.ts`
* **Directive:** Scaffold headless chromium testing for visual layout testing.
* **Acceptance Criteria:** `npx playwright test` succeeds with 0 baseline regressions.
"""

files["02_spatial_engine.md"] = """# [EPIC] 1: The Core Spatial Engine

**Objective:** Refactor `client-alt` mock into the production environment utilizing strict React Flow architectures.
**Invariants:** All distance math must remain strictly Euclidean.

## [FEATURE] 1.1: Engine Scaffold & Rendering
* **Impact Zone:** `src/components/Canvas/Engine.tsx`

### [STORY] 1.1.1: Refactor GlobalDock & Base Canvas
* **Target:** `src/components/Layout/GlobalDock.tsx`
* **Directive:** Port the exact DOM structure and Vanilla CSS from `client-alt` matching the 2-tier mobile safe area standard.
* **Acceptance Criteria:** E2E visual regression equals `client-alt` layout.

### [STORY] 1.1.2: Disable Native Pathfinding
* **Target:** `src/components/Canvas/Engine.tsx`
* **Directive:** Disable all generic routing algorithms provided by React Flow natively to prevent curve wrapping.
* **Acceptance Criteria:** `npm run test` against `CanvasEdge.spec.ts` yields purely Euclidean line calculations.

## [FEATURE] 1.2: Geometric Edge Math
* **Impact Zone:** `src/components/Canvas/CustomEdge.tsx`

### [STORY] 1.2.1: Implement Quadratic Bézier Hooks
* **Target:** `CustomEdge.tsx`
* **Directive:** Create custom edge interpolator drawing absolute lines from Center(NodeA) to Center(NodeB) calculating rectangular border intersection boundaries.
* **Acceptance Criteria:** Intersection delta > 0 on collision tests.
"""

files["03_crdt_multiplayer.md"] = """# [EPIC] 2: CRDT Multiplayer Backplane

**Objective:** Implement Yjs for conflict-free state resolution over WebSockets.
**Invariants:** State must not lock or tear across browser tabs.

## [FEATURE] 2.1: Context Providers
* **Impact Zone:** `src/context/YjsContext.tsx`

### [STORY] 2.1.1: Bind Yjs to React Context
* **Target:** `YjsContext.tsx`
* **Directive:** Implement Ydoc wrapper syncing array variables containing Nodes and Edges instead of using useState arrays.
* **Acceptance Criteria:** `npm test -- YjsContext.spec.ts` proves variable parity across mock instances.
"""

files["04_data_persistence.md"] = """# [EPIC] 3: Data Persistence Layer

**Objective:** Persist Yjs document state fragments robustly to PostgreSQL via Cloud SQL.
**Invariants:** Must utilize Cloud Run pooling to prevent socket exhaustion.

## [FEATURE] 3.1: Postgres JSONB Schema
* **Impact Zone:** `db/migrations/001_init.sql`

### [STORY] 3.1.1: Define Graph Storage Row
* **Target:** `001_init.sql`
* **Directive:** Tables for Workspace, Nords, Edges structured for rapid arbitrary metadata lookup natively utilizing PG JSONB formats.
* **Acceptance Criteria:** Script successfully applies schema without warnings on local Postgres server.
"""

files["05_matrix_lenses.md"] = """# [EPIC] 4: Matrix Lenses & Pivot Geometry

**Objective:** Convert semantic connection stages into spatial Kanban constraints.
**Invariants:** The 0.0-1.0 distance factor remains the singular source of truth.

## [FEATURE] 4.1: Spatial Matrix Rendering
* **Impact Zone:** `src/components/Matrix/MatrixView.tsx`

### [STORY] 4.1.1: X-Axis Stage Parser
* **Target:** `MatrixHelpers.ts`
* **Directive:** Project float distances into quantized columns (e.g. 0.0-0.33 -> To Do, 0.34-0.66 -> Doing).
* **Acceptance Criteria:** Jest unit test proves accurate bucketing on 100 randomized floats.

### [STORY] 4.1.2: Infinite Panning
* **Target:** `MatrixView.tsx`
* **Directive:** Lock Row/Column headers and enable touch-slide horizontal overflow for 5+ column graphs.
* **Acceptance Criteria:** Playwright intercepts `overflow-x: scroll` attribute safely bounding window limits.
"""

files["06_polish_and_auth.md"] = """# [EPIC] 5: Polish & Security

**Objective:** Inject "The Reveal" transitions and lock down database boundaries with JWT auth.
**Invariants:** Unauthenticated writes fail universally.

## [FEATURE] 5.1: Tweening Engine
* **Impact Zone:** `src/hooks/useTween.ts`

### [STORY] 5.1.1: 1.5s Canvas ↔ Matrix easing
* **Target:** `useTween.ts`
* **Directive:** Bind physical layouts to Bezier easing curves to prevent visual tearing when Nords snap into new positions.
* **Acceptance Criteria:** Hook returns fluid coordinate interpolation validated via mocked rAF (requestAnimationFrame).
"""

files["07_mcp_ai_integration.md"] = """# [EPIC] 6: AI MCP Integration Protocol

**Objective:** Structure the Dual-Payload (Mermaid + JSON) allowing standard LLMs to read/write graphs identically to human UI inputs.
**Invariants:** Webhook ingress must match native WebSocket commands structurally 1:1.

## [FEATURE] 6.1: Context Ingress Definition
* **Impact Zone:** `src/server/mcp.ts`

### [STORY] 6.1.1: Mermaid Exporter
* **Target:** `mcp.ts`
* **Directive:** Traverse Ydoc graph arrays and systematically spit out `mermaid.js` graph topology dynamically for AI context injection.
* **Acceptance Criteria:** Output passes standard Mermaid parser validations.
"""

print("Writing Markdown Files to docs/stories/ ...")
for fname, content in files.items():
    with open(os.path.join(out_dir, fname), "w") as f:
        f.write(content)
        
print("Zipping docs/stories/ directory...")
with zipfile.ZipFile("nords_stories.zip", "w", zipfile.ZIP_DEFLATED) as zf:
    for root, dirs, filenames in os.walk(out_dir):
        for fname in filenames:
            file_path = os.path.join(root, fname)
            zf.write(file_path, arcname=os.path.relpath(file_path, "docs/"))

print("DONE.")
