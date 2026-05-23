# Spatial Canvas

> The primary workspace — an infinite, freeform graph canvas where every card is a live data object and every line is a typed, directional relationship.

---

## Overview

The Spatial Canvas is where users build and explore their knowledge graph visually. Think of it as an infinite whiteboard where every sticky note is a structured, schema-backed data object and every line drawn between them is a typed, directional relationship with real meaning.

This is the default view when opening a project, and the surface where most graph-building happens. Users drag cards onto the canvas, draw connections between them, and spatially organize their domain — no code, no query language, no configuration files.

The canvas enforces a core invariant: **Distance is Data.** Physical proximity between nords is not decorative — it is the stored value. When you drag two cards closer together, you are writing data. When an AI reads the graph, it reads those distances as structured, normalized values. The canvas is simultaneously a human-friendly visual workspace and a machine-readable spatial database.

---

## The Problem

- **Flat tools kill structure.** Spreadsheets, documents, and task lists capture items, but they discard the relationships between them. When you rearrange rows in a spreadsheet, nothing changes structurally. When you rearrange cards on this canvas, you're changing the data.
- **Whiteboards give AI nothing to read.** Visual tools like Miro let you draw connections, but those connections carry no typed, queryable meaning. An AI looking at a Miro board sees shapes and lines — not a traversable graph with semantic distances. The visual structure exists only for human eyes.
- **Signal decays when structure isn't captured.** Teams spend hours aligning on relationships, dependencies, and priorities in meetings and workshops — then record the output as flat notes. The spatial and relational context evaporates. By the time anyone revisits, the structure that mattered most is gone.

---

## User Stories

- **As a project manager,** I want to lay out features, dependencies, and team members on a visual canvas so I can see the full picture of my project at a glance.
- **As a new team member,** I want to zoom out and see the high-level structure of a project, then zoom into a specific area to understand the details.
- **As a knowledge architect,** I want to drag cards and draw connections between them without writing any code, so I can model complex domains visually.
- **As a designer,** I want to spatially group related concepts together so the layout itself communicates structure and meaning.
- **As an executive,** I want to zoom out to the macro level and see the overall topology of a project without being overwhelmed by detail.

---

## Key Capabilities

| Capability | Description |
|------------|-------------|
| **Card-based nodes** | Every node renders as a rich card showing its type, name, and key properties. Cards are the primary unit of interaction — click to inspect, double-click to edit. |
| **Typed edges** | Connections are styled by type — solid, dashed, or dotted lines with directional arrows — making relationship semantics visible at a glance. |
| **Semantic zoom** | Three zoom tiers (`macro` → `meso` → `micro`) progressively reveal detail. Zoomed out, you see clusters and topology. Zoomed in, you see full property sheets and inline editing. |
| **Drag-to-connect** | Draw new connections by dragging from one card's handle to another. The connection type is selected from a contextual menu. |
| **Spatial persistence** | Card positions are saved. Your layout is your organization — it carries meaning and is preserved across sessions. |
| **Distance = Data** | Physical distance between connected nords maps to a continuous `0.0–1.0` value. Dragging cards closer or further apart writes structured data — readable by AI, queryable by the system, and translated into human-readable [[Board View]] stage labels via the Semantic Stage. |
| **Multi-select & bulk actions** | Select multiple cards to move, delete, or batch-edit properties. |
| **Keyboard shortcuts** | Power-user shortcuts for common actions: create, connect, delete, search, zoom. |

---

## The Distance = Data Paradigm

In the Nords ecosystem, there is no separation between visual proximity and relationship data. Physical distance *is* the data.

- **Per-Line-Type Normalization.** Each Connection Type maintains its own independent `0.0–1.0` scale. The `1.0` maximum distance is bound to a hard system variable (2,500 physical pixels at 100% zoom). If users drag linked nords beyond 2,500px, the line visually stretches but the semantic distance peaks at `1.0` — preventing an outlier from squashing all other values.
- **Bi-Directional Sync.** Dragging nords on the canvas recalculates the `distance_x` value in real time (Visual → Data). Selecting a stage label from a dropdown immediately repositions the nords on the canvas to match the new value (Data → Visual). See [[Board View]] for the column-based equivalent.
- **Euclidean Purity.** Lines are direct geometric paths — no edge-routing around other nodes. Artificial length added to dodge visual obstacles would obscure the mathematical reality of the relationship. Lines render as straight segments or simple quad-Bézier arcs for ribboning.
- **Dynamic Updating.** If a user physically drags a Nord, the underlying `0.0–1.0` value of all its connected lines recalculates continuously. "Dragging meaning" updates the database in real time.

---

## Nord Card Specs

All nords render using a uniform card component shared across every view ([[Board View]], [[Persona Lens]], [[Goals]]):

| Property | Value |
|----------|-------|
| **Base width** | 225px (uniform — no per-card scaling) |
| **Visual differentiation** | Type-specific accent colors, icons, and property content — not physical size |
| **Collapsed view** | Shows up to 3 visible properties (configurable per Nord Type) |
| **Expanded view** | Full property sheet with inline editing (at micro zoom) |
| **Connection handles** | Appear on hover — drag to initiate a new connection |

---

## The Physics Engine

The canvas operates on a continuous physics simulation (force-directed graph). This is what keeps spatial relationships consistent when nords have many-to-many connections in 2D space.

| Mechanic | Behavior |
|----------|----------|
| **Spring mechanics** | Lines act as springs holding the `0.0–1.0` tension between connected nords. Each connection pulls its endpoints toward its target distance. |
| **Auto-equilibrium** | If a user forces a Nord into a position that conflicts with its other active lines, connected nords "pull" or "relax" to balance the tension across all connections. |
| **Z-index collision avoidance** | In dense clusters, localized repulsion fields prevent nords from achieving 100% overlap. Z-index is dynamically sorted by structural weight. |
| **Fluid undo (`⌘Z`)** | Pressing Undo fluidly rewinds the displacement animation to prevent jarring the user's spatial mental model. |
| **Zero-gravity** | If a Nord has no connections — or its only active lines are toggled invisible — it is unmoored. It floats at its absolute resting X/Y coordinates, unaffected by the physics simulation. |

---

## Key Interactions

### Creating a Nord
1. Click the **+** button in the toolbar, or right-click the canvas and select "New Nord"
2. Choose a Nord Type from the type picker (e.g., Feature, Bug, Person)
3. A new card appears at the cursor position, ready for naming and property entry

### Drawing a Connection
1. Hover over a card to reveal connection handles
2. Drag from a handle to another card
3. A contextual menu appears — select the Connection Type (e.g., "Blocks," "Assigned To," "Depends On")
4. The typed edge renders with the appropriate visual style

### Navigating with Semantic Zoom
| Zoom Tier | What You See |
|-----------|-------------|
| **Macro** | Card labels and cluster shapes only — the bird's-eye topology |
| **Meso** | Card names, types, and key properties — the working level |
| **Micro** | Full property sheets, inline editing, connection metadata — deep detail |

---

## Technical Notes

- Built on **React Flow v12** with custom node and edge renderers.
- Layout positions are stored per-node in the database; no automatic layout algorithm is imposed — spatial arrangement is intentional and user-controlled.
- The force-directed physics simulation runs client-side for real-time responsiveness. When an AI agent updates a `0.0–1.0` connection value via [[MCP Integration]], the physics engine animates the canvas live on the user's screen.
- Zoom tier thresholds are configurable per project.
- Card components are shared across all views (Board, Persona Lens, Goal Map) for visual consistency.
- Pan, zoom, and selection use React Flow's built-in interaction model with custom gesture overrides.
- Maximum canvas distance for `1.0` normalization: 2,500px at 100% zoom.
