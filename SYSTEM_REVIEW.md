# Nords Spatial Engine -- System Review

**Date:** 2026-06-11
**Reviewer:** Claude Opus 4.6 (automated comprehensive analysis)
**Scope:** Full codebase review -- client/, server/, shared/, database schema, MCP implementation, design system

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Architecture Overview](#2-architecture-overview)
3. [Full Code Review](#3-full-code-review)
   - 3.1 [Server Package](#31-server-package)
   - 3.2 [Client Package](#32-client-package)
   - 3.3 [Shared Package](#33-shared-package)
   - 3.4 [Cross-Cutting Concerns](#34-cross-cutting-concerns)
4. [Design System Review](#4-design-system-review)
5. [MCP Server Review](#5-mcp-server-review)
6. [DBA Analysis](#6-dba-analysis)
7. [Risk Summary and Recommendations](#7-risk-summary-and-recommendations)

---

## 1. Executive Summary

Nords is a **spatial knowledge graph platform** that enables users to design typed node-edge graphs ("Nords" and "Connections"), then expose them to AI agents via the Model Context Protocol (MCP) and a built-in Gemini chat interface. The system supports personas, goal-oriented orchestration, test runners, session analytics, and a multi-lens visual workspace (Canvas, Board, Persona, Goals).

**Key Strengths:**
- Deeply thought-out domain model with a sophisticated graph engine
- Well-designed MCP integration with a 3-tier tool hierarchy (read-only / session / mutable)
- Comprehensive database schema with excellent use of PostgreSQL features (stored procedures, triggers, GIN indexes, pg_trgm fuzzy search)
- Clean separation between template data and session data -- critical for multi-user concurrent sessions
- Thoughtful soft-delete architecture with cascade triggers
- Good use of a shared package for cross-boundary type definitions

**Key Risks:**
- SQL injection vectors in the graph query route (`routes/graph.ts` lines 99, 103, 107, 122)
- Single-developer ownership patterns (`created_by` is the sole authorization model -- no team/role-based access)
- TypeScript version mismatch between client (6.x) and server (5.3.x)
- The `toolDispatch.ts` is a 700+ line monolith containing protocol generation, validation, navigation scoring, and tool dispatch
- No database connection pooling library (e.g., pgBouncer) -- the `pg.Pool` is configured for Cloud Run but max=20 may be insufficient under load
- Metering middleware (`metering.ts`) is not wired to real account resolution (dev placeholder only)

---

## 2. Architecture Overview

### Monorepo Structure

```
nords/
  client/          -- React 19 + Vite 8 SPA (canvas workspace)
  server/          -- Express 5 REST API + MCP stdio server
  shared/          -- @nords/shared -- cross-boundary types
  db/              -- Migration runner (root-level)
  scripts/         -- Dev/demo tooling
  server/migrations/  -- 42 SQL migration files
```

### Technology Stack

| Layer        | Technology                                   |
|-------------|----------------------------------------------|
| Frontend    | React 19, Vite 8, @xyflow/react, Lucide icons |
| Backend     | Express 5, Node.js (ESM), TypeScript          |
| Database    | PostgreSQL (Cloud SQL) with pg driver          |
| Auth        | Firebase Admin SDK + Firebase Client SDK       |
| AI/LLM     | Google Gemini (@google/genai), MCP SDK         |
| MCP         | @modelcontextprotocol/sdk 1.29.0 (stdio)      |
| Validation  | Zod 3.22                                       |
| Logging     | Winston                                        |
| API Docs    | swagger-jsdoc + swagger-ui-express             |
| Testing     | Vitest (unit), Playwright (e2e)                |
| Deploy      | Docker + Cloud Run + Firebase Hosting           |

### Data Flow

```
Browser (React SPA)
  |-- Firebase Auth (ID token)
  |-- REST API calls with Bearer token
  v
Express API (server/src/index.ts)
  |-- requireAuth middleware (Firebase Admin verifyIdToken)
  |-- resolveAccount middleware (metering)
  |-- requireProjectOwner middleware (ownership check)
  |-- Route handlers -> Repository functions -> PostgreSQL
  v
PostgreSQL (Cloud SQL)
  |-- Stored procedures (fn_load_project_graph, fn_batch_update_positions)
  |-- Triggers (soft-delete cascades, updated_at, snapshot immutability)
  v
MCP Server (server/src/mcp-server.ts) -- separate stdio process
  |-- Direct DB access (same connection pool pattern)
  |-- toolDispatch.ts -> repository functions
```

---

## 3. Full Code Review

### 3.1 Server Package

#### 3.1.1 Entry Point (`server/src/index.ts`)

**Strengths:**
- Clean middleware pipeline: CORS -> JSON parsing -> cookie parsing -> request logging -> auth -> metering -> route mounting
- Proper separation of public routes (register, share-chat) from authenticated routes
- Project-scoped ownership middleware applied once at `/api/projects/:id`
- Global error handler catches unhandled errors

**Issues:**

1. **CORS fallback is overly permissive** (line 42-51): The fallback allows 8 localhost ports. While logged, this would silently work in non-development environments if `CORS_ORIGIN` is unset and `NODE_ENV` is not exactly `'development'`.

2. **No rate limiting**: There is no rate limiting middleware. The metering middleware logs usage but does not enforce limits. This is a production concern for the API endpoints, especially the AI chat endpoints.

3. **No request body size enforcement beyond Express default**: While `express.json({ limit: '5mb' })` is set (line 56), individual routes handling file uploads or large payloads have no additional validation.

4. **No graceful shutdown handling**: The server calls `app.listen()` but does not handle `SIGTERM`/`SIGINT` for draining the connection pool and closing the HTTP server cleanly. This matters for Cloud Run deployments.

#### 3.1.2 Database Layer (`server/src/db.ts`)

**Strengths:**
- Clean pool configuration with appropriate Cloud Run settings
- Generic `query<T>` and `queryOne<T>` with performance logging
- Pool error handler exits the process (correct for serverless -- the container will restart)

**Issues:**

1. **`process.exit(-1)` on pool error** (line 19): While correct for serverless, this is aggressive. Consider logging more context and using `process.exit(1)` (standard non-zero) instead of `-1`.

2. **No statement timeout at the pool level**: While migration 025 sets a 30s `statement_timeout` at the database level, the pool itself does not set `statement_timeout` per connection. If a new database is provisioned without running all migrations, queries could run indefinitely.

3. **No connection validation**: The pool does not use a validation query (`query: 'SELECT 1'`). Stale connections from Cloud SQL proxy restarts could cause initial request failures.

#### 3.1.3 Route Layer

**Critical -- SQL Injection in `routes/graph.ts`**

Lines 99-123 of `server/src/routes/graph.ts` construct SQL queries by interpolating user-supplied property names directly into the query string:

```typescript
// Line 99: DIRECT STRING INTERPOLATION of user input
conditions.push(`n.properties->'${prop}' @> $${paramIdx}::jsonb`);
// Line 103:
conditions.push(`n.properties->>'${prop}' = $${paramIdx}`);
// Line 107:
conditions.push(`(n.properties->>'${prop}')::numeric ${op} $${paramIdx}`);
// Line 122:
orderClause = `ORDER BY n.properties->>'${sortProp.trim()}' ${sortDir.toUpperCase()}`;
```

The `prop` variable comes from `req.query.filter` parsing and the `sortProp` from `req.query.sort`. A malicious filter like `filter='; DROP TABLE nords; --` could execute arbitrary SQL. **This must be parameterized or use `pg-format` for identifier quoting.**

**Other Route Observations:**

- Routes use inline OpenAPI JSDoc annotations -- good for documentation but adds significant line noise
- Error handling is consistent: try/catch with specific Postgres error code handling (23503 FK, 23505 unique, 23514 check)
- The `graph.ts` route properly delegates to the `fn_load_project_graph` stored procedure for the hot path
- Batch position updates use `fn_batch_update_positions` -- correctly avoids N+1 queries

#### 3.1.4 Middleware

**`middleware/auth.ts`**
- Well-structured with three modes: production (Firebase verify), dev bypass (SKIP_AUTH), and passthrough (no Firebase config)
- Hardcoded dev user UID (line 39) -- acceptable for dev but should be documented
- `optionalAuth` variant is a good pattern for mixed auth endpoints

**`middleware/projectOwnership.ts`**
- Simple but effective: checks `project.created_by === dbUserId`
- **Limitation**: This is single-owner only. No support for team access, shared projects, or role-based permissions. The `org_members` table exists but is not used for authorization.
- Uses `(req as any).dbUserId` -- type-unsafe. Should extend the Express Request type.

**`middleware/metering.ts`**
- Fire-and-forget pattern is correct for metering (never blocks requests)
- Account resolution is a TODO -- currently returns a hardcoded dev UUID
- `query.catch()` silently swallows errors -- good for non-critical telemetry

**`middleware/validate.ts`** (exists but not reviewed in detail -- referenced by schemas)

#### 3.1.5 Repository Pattern

The server uses a clean repository pattern with files in `server/src/repositories/`:

```
accessTokens.ts, accounts.ts, boardPositions.ts, collectionGroups.ts,
connections.ts, goals.ts, mcpMessages.ts, mcpSessions.ts, nords.ts,
personas.ts, projects.ts, sessionAnalytics.ts, shareLinks.ts, types.ts,
variables.ts
```

**Strengths:**
- Clean separation of concerns
- Consistent `query<T>` / `queryOne<T>` usage throughout
- `mcpSessions.ts` is the most complex repository -- handles horizon computation, context versioning, and goal evaluation

**Issues:**
- `mcpSessions.ts` is very large (likely 1000+ lines based on the imports and exports) -- consider splitting into `horizonBuilder.ts`, `goalEngine.ts`, and `sessionState.ts`
- Some repositories use raw SQL strings while others use parameterized queries consistently -- the pattern is mostly good but not enforced

#### 3.1.6 Tool Dispatch (`server/src/lib/toolDispatch.ts`)

This is the **central nervous system** of the MCP integration. At 700+ lines it handles:

1. **Protocol Builder** (lines 38-231): Generates behavioral guidance JSON embedded in the `nords_get_briefing` response. This is how external LLMs (Gemini, Claude, GPT) receive instructions without needing a system prompt. Remarkably sophisticated -- handles three project modes (explore, collect, guided) with per-mode navigation rules, collection cadence, exchange styles, pacing velocity, and persona-specific guardrails.

2. **Variable Validation** (lines 232-350): Server-side type validation and normalization for collected data. Handles boolean fuzzy matching, select option matching, numeric parsing, date validation.

3. **Navigate Scoring** (lines 353-412): Hybrid scoring algorithm combining exact/prefix/substring title matching, neighbor bonus, persona bias, goal proximity, distance penalty, and recency bonus.

4. **Navigate Helper** (lines 418-515): Handles position updates, traversal logging, and self-contained response assembly. Fetches destination + fresh horizon in parallel (`Promise.all`).

5. **Tool Implementations** (lines 517+): The actual handler registry mapping tool names to implementations.

**Issues:**
- **Monolithic file**: Should be split into at least 3 files: `protocolBuilder.ts`, `variableValidation.ts`, and `toolHandlers.ts`
- The `buildProtocol` function is deeply nested with mode-specific branching -- consider a strategy/factory pattern
- Navigate scoring weights are hardcoded magic numbers (10, 5, 1, 3, 2, 3, 0.5, 1.5) -- should be named constants
- The protocol text is extremely long (thousands of characters per mode) -- this burns LLM context tokens

#### 3.1.7 Schemas (`server/src/schemas/`)

Uses Zod for request validation with `.describe()` annotations for OpenAPI documentation:

```
accounts.ts, graph.ts, index.ts, personas.ts, projects.ts, types.ts
```

Good patterns:
- `CreateNordSchema` with sensible defaults and range constraints
- `UpdateNordSchema` with all fields optional (partial update)
- Distance values constrained to `0.0-1.0` matching DB CHECK constraints
- `.describe()` on every field for auto-generated API docs

#### 3.1.8 Test Coverage

Server tests (`server/src/tests/`):
- `smoke.test.ts` -- basic API health check
- `projectScoping.test.ts` -- ownership/access tests
- `properties.test.ts` -- property validation
- `goalEngine.test.ts` -- goal completion logic
- `toolDispatch.test.ts` -- MCP tool routing
- `behavioralNudge.test.ts` -- pacing/nudge logic
- `horizon.test.ts` -- horizon computation

This is a reasonable test suite for the critical paths but missing coverage for:
- SQL injection in graph query route
- Connection cascade soft-delete triggers
- Snapshot immutability trigger
- Full MCP session lifecycle
- Variable validation edge cases

---

### 3.2 Client Package

#### 3.2.1 Application Architecture

The client follows a standard React SPA pattern with:
- **React Router v6** for routing
- **Firebase Auth** for authentication
- **Context Providers** for global state (Auth, Lens, TypeRegistry, BoardSettings)
- **Custom hooks** for data fetching and mutations
- **Component-per-feature** organization

**Component Hierarchy:**
```
App
  |-- AuthProvider
  |     |-- ProtectedRoute
  |     |     |-- ProjectDashboard (route: /)
  |     |     |-- WorkspaceShell (route: /project/:id)
  |     |           |-- LensProvider
  |     |           |-- TypeRegistryProvider
  |     |           |-- BoardSettingsProvider
  |     |           |-- WorkspaceContent
  |     |                 |-- ViewportHeader
  |     |                 |-- GlobalDock
  |     |                 |-- CanvasEngine
  |     |                 |-- DetailDrawer
  |     |                 |-- [Modal components]
  |-- ShareChat (route: /share/:token -- public, no auth)
```

#### 3.2.2 State Management Analysis

The application uses **no external state management library** (no Redux, Zustand, Jotai, etc.). Instead it relies on:

1. **React Context** for cross-tree state (4 providers)
2. **useState/useCallback/useMemo** in WorkspaceContent for feature state
3. **Custom hooks** for server data (useProjectGraph, useGoals, usePersonas, useVariables)

**Observation on `WorkspaceContent`** (`client/src/App.tsx`, lines 95-436):

This component manages **19 separate useState calls** (lines 96-118):
```typescript
const [isDrawerOpen, setIsDrawerOpen] = useState(false);
const [selectedEntity, setSelectedEntity] = useState(null);
const [manageTypesTab, setManageTypesTab] = useState(null);
const [personasOpen, setPersonasOpen] = useState(false);
const [goalsOpen, setGoalsOpen] = useState(false);
const [variablesOpen, setVariablesOpen] = useState(false);
const [settingsOpen, setSettingsOpen] = useState(false);
const [profileOpen, setProfileOpen] = useState(false);
const [previewOpen, setPreviewOpen] = useState(false);
const [testRunnerOpen, setTestRunnerOpen] = useState(false);
const [sessionsOpen, setSessionsOpen] = useState(false);
const [shareOpen, setShareOpen] = useState(false);
const [selectedGoalId, setSelectedGoalId] = useState(null);
const [personaDrawerOpen, setPersonaDrawerOpen] = useState(false);
const [projectName, setProjectName] = useState('Loading...');
const [projectIcon, setProjectIcon] = useState(null);
const [projectColor, setProjectColor] = useState(null);
const [projectMode, setProjectMode] = useState('explore');
const [graphOnly, setGraphOnly] = useState(false);
```

Many of these are boolean "panel open" states that could be collapsed into a single `activePanel: string | null` or `Set<string>` state. This component is approaching the complexity threshold where a state machine (XState) or reducer would improve maintainability.

#### 3.2.3 API Client (`client/src/api/client.ts`)

Clean fetch wrapper with:
- Automatic Firebase token injection
- `VITE_SKIP_AUTH` bypass for dev/demo
- Custom `ApiError` class with status codes
- Convenience methods: `api.get`, `api.post`, `api.put`, `api.delete`

**Issues:**
- No request retry logic
- No request deduplication for concurrent identical requests
- No cache invalidation strategy (SWR/React Query would help)
- `response.json()` is called without checking Content-Type header -- if the server returns non-JSON, this silently fails

#### 3.2.4 Custom Hooks

The hooks directory (`client/src/hooks/`) contains 25+ hooks:

**Data Hooks:**
- `useProjectGraph` -- fetches the full project graph via `fn_load_project_graph`
- `useGoals`, `usePersonas`, `useVariables` -- CRUD hooks for specific entities
- `useComments`, `useSnapshots`, `useCollectionGroups` -- supplementary data

**UI Hooks:**
- `useSemanticZoom` -- zoom-level-based detail toggling
- `useVisibilityCascade` -- type visibility propagation
- `useNodeSelection` -- multi-select with Shift/Cmd
- `useSpatialAnimations` -- animation frame management
- `useLensLayout` -- lens-mode-specific layout computation
- `useCanvasShortcuts` -- keyboard shortcuts
- `useBoardDragDrop` -- drag-and-drop for board view
- `useNodeDrag` -- single-node dragging

**Observation:** The hooks are well-decomposed and follow the custom hook pattern correctly. Each hook has a clear responsibility. Test coverage exists for `useNodeCountLimit`, `useSemanticZoom`, `useTypeVisibility`, and `useVisibilityCascade`.

#### 3.2.5 Canvas Engine (`client/src/components/Canvas/CanvasEngine.tsx`)

The canvas is built on **@xyflow/react** (formerly React Flow). Key components:

- `CanvasEngine` -- orchestrator that switches between Canvas, Board, Persona, and Goals lenses
- `NordNode` -- custom node renderer for graph cards
- `EuclideanEdge` -- custom edge renderer with distance labels
- `GoalCanvas` -- DAG visualization for the goals system
- `PersonaCenterNode` / `PersonaZoneNode` -- persona radial layout nodes
- `RadialMenu` -- right-click context menu for node creation
- `NodeContextMenu` -- context menu for existing nodes
- `ZoomControls` -- zoom in/out/fit controls

**Strengths:**
- Four distinct visualization modes (canvas, board, persona, goals) sharing the same engine
- Semantic zoom levels adjust node detail based on zoom level
- Persona mode computes radial positions from persona category weights
- Board mode maps connection distance_x to column positions with stage labels
- Group toolbar for multi-select operations

#### 3.2.6 Utility Functions

Key utility files:
- `graphToReactFlow.ts` -- transforms API graph data to ReactFlow nodes/edges
- `computePersonaScores.ts` -- calculates persona engagement scores and radial positions
- `boardRenormalize.ts` -- normalizes board positions when columns change
- `formulaEvaluator.ts` -- evaluates computed property formulas
- `color.ts` -- color manipulation (HSL, contrast calculation)
- `iconRegistry.ts` -- maps icon names to Lucide components
- `stageLabels.ts` -- resolves distance values to stage label strings

---

### 3.3 Shared Package

`shared/` contains two files:

#### `propertyTypes.ts`
Single source of truth for the property type system. Defines:
- 18 property types in `PROPERTY_TYPES` array
- Full metadata registry (`PROPERTY_TYPE_META`) with labels, groups, icons, and feature flags
- Legacy type normalization (`LEGACY_TYPE_MAP` for v1 compatibility)
- Helper functions: `needsOptions`, `getDisplayLabel`, `getCompatGroup`, `supportsDefault`
- `UI_PROPERTY_TYPES` (excludes system types from the UI picker)

This is well-designed -- adding a new property type requires changes in only 3 places (array, meta, and UI renderer).

#### `uiStringsDefaults.ts`
Default UI string values for white-labeling. Provides fallback text for configurable UI labels.

**Observation:** The shared package has no build step and is consumed as `workspace:*` -- this is appropriate for a monorepo but means TypeScript compilation depends on the consuming package's config.

---

### 3.4 Cross-Cutting Concerns

#### 3.4.1 TypeScript Version Mismatch

- Client: `typescript ~6.0.2` (cutting edge)
- Server: `typescript ~5.3.3` (over a year old)
- Root: `typescript ^6.0.2`

This mismatch means different TypeScript features and strictness levels apply to client vs. server code. The shared package is compiled by both -- it must be compatible with the lowest version (5.3.3).

#### 3.4.2 Package Manager Inconsistency

- Root `pnpm-workspace.yaml` references `pnpm`
- Server `package.json` scripts use `npx tsx` and `npx vitest` -- `npx` is an npm tool. Should use `pnpm exec` or `pnpm dlx` instead.
- Server has a `package-lock.json` (195KB) alongside the pnpm workspace -- this is likely a legacy artifact that should be removed.

#### 3.4.3 Error Handling

- Server: Consistent try/catch in route handlers with Postgres error code handling
- Client: `api.get().catch(() => {})` pattern in some places (lines 140, 280 in App.tsx) -- errors are silently swallowed rather than shown to the user
- MCP Server: Has error recovery guidance in the protocol but no client-side retry logic

#### 3.4.4 Logging

- Server uses Winston with structured JSON logging (good)
- Client uses a custom logger (`client/src/lib/logger.ts`)
- MCP server correctly routes all logs to stderr to avoid corrupting the stdio protocol

---

## 4. Design System Review

### 4.1 Theme Architecture

The design system uses **CSS Custom Properties** (CSS Variables) scoped to `[data-theme]` selectors:

```
client/src/styles/
  theme-obsidian.css       -- Dark mode (default)
  theme-obsidian-light.css -- Light mode
  theme-nebula.css         -- Deep space dark
  theme-vapor.css          -- Vaporwave/retro
  variables.css            -- Legacy bridge (TODO: delete)
  forms.css                -- Form element styles
```

Theme switching is handled via `document.documentElement.setAttribute('data-theme', theme)` in `App.tsx` (line 447), with the selection persisted to `localStorage`.

### 4.2 Token System

The Obsidian theme defines a comprehensive token system (106 lines):

**Typography Tokens:**
- `--nords-font-primary`: Inter
- `--nords-font-mono`: JetBrains Mono
- 7 weight levels (300-800)
- 7 size levels (11px-24px, with a dense 13px default)
- 3 line-height levels
- 3 letter-spacing levels

**Color Tokens:**
- 5 surface levels (deep -> canvas -> surface -> elevated -> hover)
- 3 border levels (subtle -> default -> strong)
- 4 text levels (primary -> secondary -> tertiary -> disabled)
- 1 accent color with dim and hover variants
- 4 semantic colors (success, warning, danger, info)
- Connection-specific colors (active, ghost)

**Spatial Tokens:**
- 4 shadow levels (sm, md, lg, glow)
- 5 border-radius levels (4px-100px)
- 6 spacing levels (4px-32px)
- Layout dimensions (header: 48px, dock: 52px, drawer: 380px)

**Glass Effect:**
- `--nords-glass-bg`: rgba backdrop
- `--nords-glass-blur`: 16px blur

### 4.3 Component Styling Approach

Components use **co-located CSS files**:
```
CanvasEngine.css, GoalNode.css, RadialMenu.css, ZoomControls.css,
DetailDrawer.css, GoalDetailDrawer.css, PersonaLensDrawer.css,
PropertyField.css, ChatMessage.css, ManageGoals.css, MatrixView.css,
ProjectDashboard.css, SessionExplorer.css, TestRunner.css, etc.
```

**Naming Convention:** Class names use a `nords-` prefix or component-specific prefixes (e.g., `.nord-card`, `.detail-drawer`, `.manage-types`). This is an informal BEM-like convention without strict enforcement.

**Observations:**

1. **No CSS Modules or CSS-in-JS**: Plain CSS with convention-based scoping. This works at the current scale but risks class name collisions as the codebase grows. No tree-shaking of unused styles.

2. **Consistent use of design tokens**: Components reference `var(--nords-color-*)`, `var(--nords-space-*)`, etc. throughout -- good adoption of the token system.

3. **The `.nords-glass` utility class** (in `index.css`) is used across multiple components for the glassmorphism effect.

4. **The `variables.css` bridge file** maps legacy variable names to theme tokens. The TODO comment says to delete it once all consumers migrate -- this cleanup is pending.

5. **No responsive breakpoints**: The application is designed for desktop/laptop viewports. No media queries for mobile layouts.

### 4.4 Component Library

The application does **not use a component library** (no Material UI, Radix, Shadcn, etc.). All components are custom-built:

**Shared Components** (`client/src/components/shared/`):
- `ColorIcon` -- colored icon wrapper
- `CustomSelect` -- styled dropdown
- `HueSlider` -- color hue picker
- `IconPicker` -- Lucide icon selector
- `NordCard` -- reusable card component
- `PersonaAvatar` -- DiceBear avatar renderer
- `PropertyTable` -- key-value property display

**Layout Components:**
- `ViewportHeader` -- top toolbar with project name, navigation, and actions
- `GlobalDock` -- bottom dock with lens mode switches and entity palette
- `FloatingPanel` -- reusable floating panel container

**Feature Components:**
Each feature has its own directory with a component + CSS file pair. The pattern is consistent.

### 4.5 Accessibility

- Focus-visible outlines are styled globally (`:focus-visible` in `index.css`)
- No ARIA labels observed in the canvas components
- No keyboard navigation for the graph canvas (mouse-dependent interaction)
- Color contrast ratios in the dark theme appear sufficient (light text on dark backgrounds) but have not been formally audited
- No screen reader support for graph visualization

### 4.6 Design System Recommendations

1. **Extract a component library**: Move shared components to a separate package or at minimum document the existing components as the design system
2. **Add responsive breakpoints**: Even if mobile is not a priority, tablet and small laptop viewports should be handled
3. **Consider CSS Modules**: To prevent class name collisions as the team grows
4. **Complete the variables.css migration**: The legacy bridge file should be eliminated
5. **Add ARIA labels**: Especially for the canvas, toolbar, and drawer interactions
6. **Formalize the icon system**: The `iconRegistry.ts` + Lucide approach is good but could be documented as part of the design system

---

## 5. MCP Server Review

### 5.1 Architecture

The MCP server (`server/src/mcp-server.ts`) is a **standalone stdio process** that exposes the Nords knowledge graph via the Model Context Protocol. It uses the `@modelcontextprotocol/sdk` (v1.29.0) with `StdioServerTransport`.

**Key Design Decisions:**

1. **Stdio transport**: All communication happens over stdin/stdout. Logs go to stderr via a dedicated Winston logger (line 49-53). This is correct -- stdout is reserved for MCP protocol messages.

2. **Separate process**: The MCP server is NOT a route on the Express API. It runs as its own process with direct database access. This is the correct architecture for MCP -- it needs long-lived connections and stateful sessions.

3. **Project-scoped**: Each MCP server instance serves a single project (via `PROJECT_ID` env var). Multiple projects require multiple server instances.

4. **Session management**: Sessions are created lazily via `ensureSession()` (line 92-106) and persist across tool calls. The session tracks position, traversals, and collected variables.

### 5.2 Tool Hierarchy

The MCP server exposes **20 tools** organized in 3 tiers:

**Tier 1 -- Read-Only (12 tools):**
| Tool | Purpose |
|------|---------|
| `nords_get_dictionary` | Full project ontology |
| `nords_get_horizon` | Current position + neighbors + suggestions |
| `nords_get_context` | Rich context (variables, schemas, persona) |
| `nords_list_all` | Lightweight nord directory |
| `nords_get_graph` | Full or neighborhood subgraph |
| `nords_get_nord` | Single nord with position update |
| `nords_query_nords` | Search by type/title |
| `nords_get_connections` | All connections for a nord |
| `nords_get_session_state` | Full session state dump |
| `nords_get_incomplete_nords` | Nords with missing required properties |
| `nords_get_goals` | Goal progress with variable bindings |
| `nords_get_briefing` | Cold-start composite (dict+horizon+goals+protocol) |
| `nords_get_analytics` | Aggregate session statistics |

**Tier 2 -- Session (5 tools):**
| Tool | Purpose |
|------|---------|
| `nords_navigate` | Move to a nord by name/type/ID |
| `nords_update_session_nord` | Save properties to session state |
| `nords_update_session_variables` | Save collected variable values |
| `nords_visit_nord` | Log a visit with before/after snapshots |
| `nords_switch_persona` | Change the active persona lens |

**Tier 3 -- Mutable (gated by `MCP_MUTABLE=true`):**
| Tool | Purpose |
|------|---------|
| `nords_create_nord` | Create a new nord |
| `nords_update_nord` | Update an existing nord |
| `nords_delete_nord` | Soft-delete a nord |
| `nords_create_connection` | Create a connection |
| `nords_update_connection` | Update connection properties |
| `nords_delete_connection` | Soft-delete a connection |
| `nords_reset_session` | Abandon and restart session |

### 5.3 Project Context Injection

The MCP server builds a project context string at startup (lines 60-86) that is injected into key tool descriptions:

```
[Project context -- Mode: collect. Nord types: Requirement, Risk, Test Case.
Connection types: verifies (verifies), mitigates (mitigates).
Personas: Priya Sharma, Marcus Cole]
```

This gives external LLMs zero-shot orientation from the tool descriptions alone -- they know the vocabulary before making any tool calls.

### 5.4 Resource: Project Overview

The server also exposes a single **MCP Resource** (lines 446-502) at `nords://projects/{id}/overview`. This returns a markdown-formatted project overview including all nords, connections, goals, and goal edges. This is useful for LLM context priming.

### 5.5 Dual LLM Integration

The Nords system supports **two LLM integration paths**:

1. **MCP Server** (`mcp-server.ts`): For external LLM clients (Claude Desktop, Cursor, etc.) via stdio
2. **Built-in Gemini Chat** (`routes/chat.ts` + `lib/geminiTools.ts`): Direct integration with Google Gemini for the in-app preview chat

Both paths share the same `toolDispatch.ts` backend -- the tool implementations are identical regardless of which LLM is calling them.

The `geminiTools.ts` file provides a parallel set of function declarations in Gemini's format (`FunctionDeclaration[]`) rather than MCP's format. It includes the same project context injection and mutable tool gating.

### 5.6 Protocol Builder Analysis

The protocol builder in `toolDispatch.ts` generates an elaborate behavioral guidance JSON that is returned as part of `nords_get_briefing`. This is the system that makes the AI behave correctly without needing a system prompt. Key sections:

- **Overview**: Mode-specific behavioral summary (explore/collect/guided)
- **Navigation**: Position awareness, traversal-first movement, directional semantics, verb usage, stage interpretation
- **Collection**: Per-mode data collection instructions with cadence targets
- **Exchange Style**: Per-persona conversational posture (free_form, bi_directional, interrogate)
- **Goal Events**: How to handle goal completion, activation, and cancellation
- **Error Recovery**: Graceful handling of tool errors, invalid variables, dead ends
- **Pacing**: Velocity-based pacing overrides (rushed vs. thorough)

**Strengths:**
- The protocol is self-contained -- no external system prompt needed
- Mode-specific rules are well-differentiated
- Exchange style cadence targets are quantified (saves_per_round, max_turns_without_save)
- Guardrails and mental models from the persona are surfaced as explicit rules

**Issues:**
- The protocol text is extremely verbose -- likely 4000-6000 tokens per briefing response. This consumes significant context window.
- The protocol is regenerated on every `nords_get_briefing` call -- could be cached per (project_id, persona_id, mode) tuple
- Some rules are contradictory between modes (explore says "don't push" but the tool frequency rule says "at least one tool call per turn")

### 5.7 MCP Recommendations

1. **Add tool-level access control**: Currently all tools are available to all sessions. Consider adding per-tool permission checks based on the session's `source_type` (chat, test, api, share).

2. **Implement prompt caching**: The protocol response should be cached and only rebuilt when project/persona configuration changes.

3. **Add health check tool**: An `nords_ping` tool that returns server status would help LLM clients detect connection issues.

4. **Consider SSE transport**: The stdio transport is fine for local MCP clients but a Server-Sent Events transport would enable remote/browser-based MCP clients.

5. **Tool description optimization**: Some tool descriptions are 500+ characters. Consider a two-tier description approach: short description for tool listing, long description available on demand.

---

## 6. DBA Analysis

### 6.1 Schema Overview

The database contains **~35 tables** organized across 42 migration files. The schema covers:

| Domain | Tables |
|--------|--------|
| Identity | `users`, `organizations`, `org_members`, `accounts` |
| Projects | `projects` |
| Graph Primitives | `nord_types`, `nords`, `connection_types`, `connections`, `nord_board_positions` |
| Personas | `personas`, `persona_mental_models`, `persona_category_weights`, `persona_goal_weights` |
| Goals | `goals`, `goal_edges`, `goal_variable_bindings`, `goal_relevant_nords`, `goal_relevant_nord_types` |
| Variables | `project_variables`, `collection_groups` |
| MCP Sessions | `mcp_sessions`, `mcp_session_nords`, `mcp_traversals`, `mcp_nord_visits`, `mcp_session_variables`, `mcp_session_goals`, `mcp_session_goal_events`, `mcp_session_events` |
| MCP Messages | `mcp_messages` |
| Collaboration | `snapshots`, `comments`, `share_links` |
| Testing | `test_scenarios`, `test_runs` |
| Billing | `usage_events`, `account_invoices` |
| Auth | `project_access_tokens`, `invite_keys` |
| System | `schema_migrations`, `ui_strings` |

### 6.2 Entity Relationship Analysis

#### Core Graph Model
```
projects 1--* nord_types 1--* nords
projects 1--* connection_types 1--* connections
nords *--1 nord_types
connections *--1 connection_types
connections *--1 nords (source_nord_id)
connections *--1 nords (target_nord_id)
```

This is a **typed property graph** implemented in relational tables. Types carry JSONB schemas; instances carry JSONB properties. The design is clean and well-normalized.

#### Session Model
```
projects 1--* mcp_sessions
mcp_sessions 1--* mcp_session_nords (per-session nord state)
mcp_sessions 1--* mcp_traversals (edge traversal log)
mcp_sessions 1--* mcp_nord_visits (node visit log)
mcp_sessions 1--* mcp_session_variables (collected data)
mcp_sessions 1--* mcp_session_goals (per-session goal state)
mcp_sessions 1--* mcp_session_goal_events (goal event audit)
mcp_sessions 1--* mcp_session_events (generic event log)
```

The **template/instance separation** is the most important architectural decision in the schema. Nords and connections are the *template* (design-time). MCP session tables are the *instance* (runtime). This allows 190K concurrent users to each have their own completion state without modifying the template.

#### Goal DAG
```
projects 1--* goals
goals *--* goals (via goal_edges -- DAG)
goals 1--* goal_variable_bindings *--1 project_variables
goals 1--* goal_relevant_nords *--1 nords
goals 1--* goal_relevant_nord_types *--1 nord_types
```

Goals form a **directed acyclic graph** via `goal_edges`. Each goal can bind to collection variables and relevant nords. The `prerequisite_gate` (all/any) and `fork_type` (parallel/exclusive) on goals enable sophisticated orchestration patterns.

### 6.3 Indexing Strategy

The schema has **40+ indexes** applied over the migration history. Analysis by category:

#### Hot Path Indexes (Critical)
```sql
-- Project graph loading (fn_load_project_graph)
idx_nords_project_active ON nords(project_id) WHERE deleted_at IS NULL
idx_connections_project_active ON connections(project_id) WHERE deleted_at IS NULL
idx_nord_types_project ON nord_types(project_id) WHERE deleted_at IS NULL
idx_connection_types_project ON connection_types(project_id) WHERE deleted_at IS NULL

-- Graph traversal (MCP navigation)
idx_connections_source ON connections(source_nord_id) WHERE deleted_at IS NULL
idx_connections_target ON connections(target_nord_id) WHERE deleted_at IS NULL
```

These are **partial indexes** (WHERE deleted_at IS NULL) -- correct for soft-delete workloads. They exclude deleted rows from the index, keeping it small and fast.

#### Search Indexes
```sql
-- Fuzzy text search (navigate, query)
idx_nords_title_trgm ON nords USING GIN(title gin_trgm_ops) WHERE deleted_at IS NULL
idx_nords_properties ON nords USING GIN(properties jsonb_path_ops)

-- Full-text search (migration 035)
-- Adds tsvector search capability
```

The **pg_trgm GIN index** enables fuzzy matching in the `fn_navigate_resolve` stored procedure. The JSONB GIN index enables arbitrary property filtering.

#### Session Indexes
```sql
idx_mcp_sessions_active ON mcp_sessions(project_id, status) WHERE status = 'active'
idx_mcp_session_nords_incomplete ON mcp_session_nords(session_id, complete) WHERE complete = FALSE
idx_mcp_traversals_session_target ON mcp_traversals(session_id, target_nord_id, traversed_at DESC)
```

The traversal covering index (migration 041) enables **Index-Only Scans** for the navigate recency query -- no heap access needed.

#### Missing Indexes (Potential Gaps)

1. **`connections(project_id, type_id)`**: The board view loads connections filtered by both project_id and type_id. A composite index would help.

2. **`mcp_messages(session_id, created_at)`**: Message retrieval for session replay likely benefits from this.

3. **`project_variables(project_id, sort_order)`**: Variable listing with ordering.

4. **`nords(project_id, type_id)` composite**: The `nords_query_nords` tool filters by both.

### 6.4 Stored Procedures and Triggers

#### Stored Procedures

| Procedure | Purpose | Performance Impact |
|-----------|---------|-------------------|
| `fn_load_project_graph(UUID)` | Assembles full graph as JSON | **Critical hot path** -- replaces 4+ network round trips with 1. Uses explicit column selection (migration 007 optimization). |
| `fn_batch_update_positions(JSONB)` | Bulk position update from drag-and-drop | Eliminates N UPDATE round trips |
| `fn_capture_snapshot(UUID, TEXT, TEXT, UUID)` | Atomic snapshot creation | Calls fn_load_project_graph internally |
| `fn_navigate_resolve(UUID, UUID, TEXT, TEXT)` | Hybrid search: ILIKE + fuzzy + recency | **Migration 041** -- reduces 3 round trips to 1 |
| `fn_fuzzy_suggest_nords(UUID, TEXT, INT)` | Standalone fuzzy search helper | Reusable for future tools |

#### Triggers

| Trigger | Table | Purpose |
|---------|-------|---------|
| `trg_snapshots_immutable` | snapshots | Prevents UPDATE -- snapshots are append-only |
| `trg_cascade_soft_delete_connections` | nords | Cascades soft-delete to connections when a nord is soft-deleted |
| `trg_cleanup_board_positions` | nords | Hard-deletes board positions when a nord is soft-deleted |
| `trg_cleanup_board_positions_by_type` | connection_types | Hard-deletes board positions when a connection type is soft-deleted |
| `trg_nords_updated_at` | nords | Auto-sets updated_at on UPDATE |
| `trg_projects_updated_at` | projects | Auto-sets updated_at on UPDATE |
| `trg_comments_updated_at` | comments | Auto-sets updated_at on UPDATE |

The trigger architecture is well-designed. The soft-delete cascade on nords is particularly important -- when a user deletes a node, all edges to/from it are automatically soft-deleted without application code.

### 6.5 Migration Pattern Analysis

Migrations are plain SQL files with numeric prefixes (001-042). They:
- Use `BEGIN`/`COMMIT` for transactionality
- Record themselves in `schema_migrations`
- Use `IF NOT EXISTS` / `IF EXISTS` for idempotency (mostly)
- Include inline comments explaining the "why"

**Observations:**

1. **Numbering conflicts**: There are two files numbered `011` -- `011_welcome_message.sql` and `011_accounts_billing.sql`. This could cause ordering issues.

2. **No down migrations**: There are no rollback scripts. This is acceptable for a young project but becomes risky as the schema stabilizes.

3. **Schema migrations table inconsistency**: Migration 001 uses `version TEXT`, but migration 009 uses `name TEXT` (`INSERT INTO schema_migrations (name)`). This suggests the schema_migrations table was altered at some point but not all migrations were updated.

4. **Data migrations mixed with schema migrations**: Migration 029 contains both DDL (CREATE TABLE) and DML (data migration from per-nord properties to global variables). These should ideally be separate for safety.

### 6.6 Data Model Design Assessment

#### Normalization Level

The schema is mostly in **3rd Normal Form (3NF)** with intentional denormalization:

- **JSONB properties**: Both `nords.properties` and `connections.properties` store arbitrary key-value data as JSONB. This is a **strategic denormalization** that enables dynamic schemas without ALTER TABLE. The property schemas are defined in the type tables (`nord_types.properties_schema`, `connection_types.properties_schema`) and validated at the application layer.

- **JSONB stage labels**: `connection_types.x_stage_labels` and `y_stage_labels` are JSONB arrays. These could be a separate table but the access pattern (always loaded with the type) makes JSONB appropriate.

- **JSONB guardrails and mental models**: `personas.guardrails` is JSONB while `persona_mental_models` is a separate table. The mental models table was likely split out because it needs independent CRUD.

#### Soft-Delete Architecture

Every entity table includes `deleted_at TIMESTAMPTZ`. Queries consistently filter `WHERE deleted_at IS NULL`. This is correct for an application that needs undo/restore capability, but it has implications:

1. **Index bloat**: Deleted rows remain in the table and are excluded only by partial indexes. For high-churn tables (connections, session tables), this could lead to table bloat.
2. **No vacuum policy**: There is no automated process to permanently remove soft-deleted rows older than a retention period.
3. **Unique constraints**: The original `uq_connection_type_source_target` unique constraint was converted to a partial unique index (migration 007) to allow re-creation of soft-deleted connections.

#### Referential Integrity

- `ON DELETE CASCADE` is used for parent-child relationships (project -> nords, session -> visits)
- `ON DELETE RESTRICT` is used for type references (nords -> nord_types) -- prevents deleting a type that has instances
- `ON DELETE SET NULL` is used for optional references (project.created_by -> users)
- The cascade strategy is correct and consistently applied

### 6.7 Performance Considerations

#### Query Patterns

1. **Full graph load**: `fn_load_project_graph` assembles everything in one round trip. For large projects (500+ nords), this could return a large JSON payload. The function does not support pagination.

2. **Horizon computation**: The `getSessionHorizonLean` function in `mcpSessions.ts` likely issues multiple queries (current nord, neighbors, goals, variables). This is the most frequently called function during MCP sessions.

3. **Navigate resolution**: `fn_navigate_resolve` (migration 041) is optimized with a covering index and two-phase search (ILIKE then fuzzy fallback). This is well-designed.

4. **Variable save + goal evaluation**: `nords_update_session_variables` triggers goal completion checks, which involve joining through `goal_variable_bindings` and `mcp_session_variables`. The query plan depends on index quality.

#### Connection Pool Sizing

The pool is configured with `max: 20` connections. For Cloud Run with auto-scaling, each container gets its own pool. With N containers, total connections = N * 20. Cloud SQL has connection limits (e.g., 100 for a small instance). This could be a bottleneck under load.

**Recommendation**: Use PgBouncer or Cloud SQL Proxy with connection pooling enabled. Alternatively, reduce `max` to 5-10 per container and rely on Cloud Run's scale-up.

#### Statement Timeout

Migration 025 sets `statement_timeout = '30s'` at the database level. This is a good safety net for runaway queries, but it applies to ALL connections including migrations and admin queries. Consider applying it per-role or per-connection instead.

### 6.8 DBA Recommendations

1. **Fix the SQL injection** in `routes/graph.ts` -- use `pg-format` for identifier quoting or a whitelist of allowed property names.

2. **Add composite indexes** for the board view (`connections(project_id, type_id)`) and query tool (`nords(project_id, type_id)`).

3. **Implement a soft-delete vacuum job**: Periodically hard-delete rows where `deleted_at < NOW() - INTERVAL '90 days'` for high-churn tables.

4. **Add connection pooling**: Deploy PgBouncer in front of Cloud SQL, or use Cloud SQL's built-in connection pooling.

5. **Separate data migrations**: Move DML statements (data transformations) out of schema migration files into separate scripts.

6. **Fix migration numbering**: Resolve the duplicate `011` migration files.

7. **Add a migrations table consistency check**: Ensure the `version` vs `name` column discrepancy is resolved.

8. **Consider partitioning** for `mcp_traversals` and `mcp_session_events` by `session_id` or time range -- these are append-only audit tables that will grow unboundedly.

9. **Add row-level security (RLS)** for multi-tenant isolation as the product matures.

10. **Monitor JSONB index performance**: The GIN index on `nords.properties` is powerful but can be expensive to maintain during bulk inserts. Monitor index bloat and consider `jsonb_ops` vs `jsonb_path_ops` based on query patterns.

---

## 7. Risk Summary and Recommendations

### Critical (Address Immediately)

| # | Issue | Location | Impact |
|---|-------|----------|--------|
| 1 | **SQL Injection** in graph query route | `server/src/routes/graph.ts:99-123` | Arbitrary SQL execution via filter/sort parameters |
| 2 | **No rate limiting** on API endpoints | `server/src/index.ts` | Denial of service, cost runaway on AI endpoints |

### High (Address Soon)

| # | Issue | Location | Impact |
|---|-------|----------|--------|
| 3 | TypeScript version mismatch (5.3 vs 6.0) | `server/package.json` vs `client/package.json` | Type incompatibilities in shared package |
| 4 | `toolDispatch.ts` monolith (700+ lines) | `server/src/lib/toolDispatch.ts` | Maintainability, testability |
| 5 | No graceful shutdown handling | `server/src/index.ts` | Connection pool leaks on Cloud Run container stop |
| 6 | Project ownership is single-user only | `middleware/projectOwnership.ts` | No team collaboration |
| 7 | `package-lock.json` in server directory | `server/package-lock.json` | Conflicts with pnpm workspace |
| 8 | Silent error swallowing in client | `client/src/App.tsx:140,280` | User unaware of failures |

### Medium (Plan for Next Sprint)

| # | Issue | Location | Impact |
|---|-------|----------|--------|
| 9 | No request retry/dedup in API client | `client/src/api/client.ts` | Poor UX on transient failures |
| 10 | WorkspaceContent has 19 useState calls | `client/src/App.tsx:96-118` | State management complexity |
| 11 | Migration numbering collision (two 011s) | `server/migrations/` | Migration ordering ambiguity |
| 12 | Metering not wired to real accounts | `middleware/metering.ts` | No billing data collection |
| 13 | No connection pool validation query | `server/src/db.ts` | Stale connections after proxy restart |
| 14 | Protocol text is 4000-6000 tokens per briefing | `server/src/lib/toolDispatch.ts` | LLM context window consumption |
| 15 | No ARIA labels in canvas components | `client/src/components/Canvas/` | Accessibility gap |

### Low (Technical Debt)

| # | Issue | Location | Impact |
|---|-------|----------|--------|
| 16 | `variables.css` legacy bridge not deleted | `client/src/styles/variables.css` | Dead code |
| 17 | No responsive breakpoints | `client/src/styles/` | Desktop-only |
| 18 | Server scripts use `npx` instead of `pnpm` | `server/package.json` | Package manager inconsistency |
| 19 | Navigate scoring magic numbers | `toolDispatch.ts:370-411` | Unmaintainable tuning |
| 20 | No soft-delete vacuum job | Database | Table bloat over time |
| 21 | `projectClone.ts` references deprecated `goal_properties` table | `server/src/services/projectClone.ts:171-184` | Clone may fail if table was dropped |

---

*End of System Review*
