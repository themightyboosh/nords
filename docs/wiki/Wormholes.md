# Wormholes

> Cross-project Connections that let teams feel each other's gravitational pull — same typed semantics, same distance logic, but reaching across project boundaries.

---

## Overview

Wormholes are **cross-project Connections** that establish typed, distance-aware relationships between Nords living in different projects. They use the same ConnectionType system as local connections — type, `distance_x`, stages, direction, and properties — but they reach across project boundaries.

When a Marketing team drags a dependent deadline outward on their canvas, the Engineering team sees the edge of *their* canvas stretch. A cross-project connection exerting gravitational pull from another project. The remote Nord appears locally as a translucent "Ghost Nord" — visible, linked, but clearly belonging to another project.

Wormholes make cross-team dependencies visible, queryable, and reactive. Instead of learning about a slipped timeline in a status meeting three weeks later, the affected team sees the tension shift in real time on their own canvas.

---

## The Problem

- **Projects are islands.** Current project tools silo work into isolated containers. There's no native way to express that a Nord in Project A depends on or blocks a Nord in Project B.
- **Cross-team dependencies are invisible.** When one team's timeline shifts, the affected teams don't know until it's too late — usually surfaced through manual escalation, status meetings, or surprise.
- **Hierarchy filters information upward.** Executives get summarized views; operational teams get local views. Nobody sees the real-time tension between two teams' work at the level where it actually matters.
- **Portfolio-level reasoning requires context switching.** Understanding how strategic goals connect to execution across teams means jumping between projects, mentally stitching together relationships that should be explicit in the data.

---

## User Stories

- **As a program manager,** I want to create a connection between a Marketing launch milestone and an Engineering release date so both teams see the dependency and feel the tension when either side's timeline shifts.
- **As an engineering lead,** I want to see Ghost Nords from the Design team's project on my canvas so I know which design deliverables my implementation Nords are waiting on.
- **As an AI agent,** I want to traverse wormhole connections across projects so I can reason about cross-team dependencies and surface blockers that span project boundaries.
- **As a product strategist,** I want to link strategic goals in a portfolio project to execution milestones in individual team projects so I can see how ground-level progress maps to high-level objectives.
- **As a project admin,** I want wormhole creation to require write access to both projects so no one can unilaterally create cross-project dependencies without the other team's consent.

---

## Key Capabilities

| Capability | Description |
|------------|-------------|
| **Same connection semantics** | Wormholes use the standard ConnectionType system — they have types, `distance_x`, stages, direction, and properties. They're connections that happen to cross project boundaries, not a separate construct. |
| **Ghost Nords** | The remote-side Nord appears on the local canvas as a translucent card showing title, type icon, and the connection. Clicking opens a read-only preview or navigates to the source project. |
| **Permission-gated creation** | Creating a wormhole requires write access to *both* projects. Viewing a wormhole only requires read access to the local project. |
| **Tension propagation** | When a remote Nord's properties change (e.g., a deadline moves), the wormhole connection can update its `distance_x`, triggering The Reveal animation showing the "pull" from the other project. |
| **MCP traversal** | `nords_get_connections` returns wormhole connections with a `cross_project: true` flag and the remote project/nord IDs. AI agents can traverse and reason across projects. |
| **Bidirectional visibility** | Both sides of a wormhole see the Ghost Nord and the connection. Changes propagate in both directions — neither side has a privileged view. |
| **Workspace-scoped discovery** | Wormhole endpoints are discoverable within a Workspace, preventing accidental cross-organization linking. |

---

## Key Interactions

### Architecture

```
┌─────────────────────┐                    ┌─────────────────────┐
│   Project A         │                    │   Project B         │
│                     │                    │                     │
│   ┌─────┐           │    Wormhole        │           ┌─────┐  │
│   │Nord │───────────┼────────────────────┼──────────▶│Nord │  │
│   │ A1  │           │  (ConnectionType,  │           │ B3  │  │
│   └─────┘           │   distance_x,      │           └─────┘  │
│                     │   direction)        │                     │
│          ┌ ─ ─ ─ ┐  │                    │  ┌ ─ ─ ─ ┐         │
│          │Ghost  │  │                    │  │Ghost  │         │
│          │ B3   │  │                    │  │ A1   │         │
│          └ ─ ─ ─ ┘  │                    │  └ ─ ─ ─ ┘         │
└─────────────────────┘                    └─────────────────────┘
```

- **Solid cards** are local Nords owned by the project.
- **Dashed cards** are Ghost Nords — translucent representations of the remote-side Nord.

### Creating a Wormhole

1. Right-click a local Nord and select **"Connect to External Nord…"**
2. A project picker appears showing all Workspace projects where you have write access
3. Browse or search the target project's Nords
4. Select the target Nord and choose a **ConnectionType** from either project's dictionary
5. Set the initial **direction** and **`distance_x`** value
6. The wormhole appears on both canvases — the remote Nord appears as a Ghost on each side

### Ghost Nord Interactions

| Action | Behavior |
|--------|----------|
| **Hover** | Tooltip shows project name, Nord title, type, and last-updated timestamp |
| **Click** | Opens a read-only DetailDrawer preview with the remote Nord's properties |
| **Double-click** | Navigates to the source project, centering on the Nord |
| **Drag** | Ghost Nords can be repositioned on the local canvas (position is local-only) |
| **Connect** | You cannot create local connections to a Ghost Nord — it's a portal, not a local entity |

### Permission Model

| Action | Required Access |
|--------|----------------|
| **Create wormhole** | Write access to both Project A and Project B |
| **View wormhole** | Read access to the local project (Ghost Nord shows limited detail) |
| **Delete wormhole** | Write access to the project that initiated the wormhole |
| **Modify `distance_x`** | Write access to the project owning the connection |

### Tension Propagation

```
┌───────────────────┐     Property change      ┌──────────────────────┐
│ Remote Nord B3    │ ─────────────────────────▶│ Wormhole Connection  │
│ (deadline moves)  │     triggers update       │ distance_x recalcs   │
└───────────────────┘                           └──────────┬───────────┘
                                                           │
                                                           ▼
                                                ┌──────────────────────┐
                                                │ Local Canvas         │
                                                │ The Reveal animates  │
                                                │ Ghost B3 shifts      │
                                                └──────────────────────┘
```

When a remote Nord's bound properties change, the wormhole connection recalculates its `distance_x`. The local canvas responds with The Reveal — the physics-based animation that makes spatial changes visceral. Teams *feel* the other project's timeline shift.

---

## Technical Notes

- Wormhole connections are stored with `cross_project: true`, along with both local and remote project/nord IDs. The local project stores the connection; the remote project resolves Ghost Nord details at render time.
- Ghost Nords are not stored in the local project's database — they are fetched on-demand from the remote project via an internal API, with caching for performance.
- MCP tool `nords_get_connections` includes wormhole connections with the `cross_project` flag and remote identifiers, enabling AI agents to traverse across projects.
- Tension propagation uses a lightweight event subscription between projects. Property changes on a wormhole-connected Nord emit an event that the linked project consumes to update the local `distance_x`.
- **Depends on:** [[Roadmap#workspace-folders|Workspace Folders]] (Phase 3 — provides organizational context for cross-project discovery and access control).
