# Board View

> Dynamic kanban boards generated from any relationship type — drag cards between columns to advance their status, and switch dimensions to see the same data organized by any relationship.

---

## Overview

Board View transforms any relationship type in your graph into a **kanban-style column layout.** Instead of maintaining a separate board tool with its own data, Nords generates boards dynamically from the stage labels defined on any Connection Type. The result: a familiar, drag-and-drop workflow view that's always in sync with the canvas, the AI session, and every other lens in the system.

The key insight is that boards aren't a separate feature — they're a *perspective* on the same graph. Switching from "Status" to "Priority" doesn't change the data, it reshapes the view.

Board View also supports a **Matrix View** — a dual-axis mode where columns map to X-distance stages and rows map to Y-distance stages of the same Connection Type. This turns the board into a **spatial pivot table**: two semantic dimensions from a single relationship type.

---

## The Problem

- **Separate board tools fragment the picture.** Teams maintain kanban boards in one tool, the relational context in another, and AI context in yet another. Updating status in the board doesn't update the graph, the priority view, or the AI's understanding. Each tool holds a partial truth.
- **Switching tools means switching context.** Moving between a graph canvas and a board application breaks flow. Worse, the board's columns and the canvas's spatial relationships are disconnected — changes in one don't propagate to the other. Teams end up maintaining two sources of truth that drift apart.
- **Boards are locked to one dimension.** Traditional kanban tools show cards in a single column layout (usually "status"). Seeing the same items organized by priority, ownership, or any other dimension requires building a separate board from scratch — or switching to a different tool entirely.

---

## User Stories

- **As a team lead,** I want to see all tasks organized by status columns (Backlog → In Progress → Done) so I can track workflow at a glance.
- **As a product owner,** I want to switch the board from "Status" to "Priority" to see the same items organized by urgency instead of workflow stage.
- **As an individual contributor,** I want to drag a card from one column to the next to update its progress without opening a detail panel.
- **As a stakeholder,** I want to filter the board to only show features related to my initiative, so I'm not distracted by unrelated work.
- **As a manager,** I want to switch the board to "Ownership" to see which team member is responsible for which items.

---

## Key Capabilities

| Capability | Description |
|------------|-------------|
| **Dynamic column generation** | Columns are auto-generated from the stage labels defined on a Connection Type (e.g., `Backlog → To Do → In Progress → Review → Done`). No manual board setup required. |
| **Drag-to-advance** | Dragging a card between columns updates the underlying relationship value (`distance_x`) in real time — across every view simultaneously. |
| **Switchable dimensions** | A dropdown lets you choose which Connection Type drives the board. See the same nords organized by Status, Priority, Ownership, Sprint, or any custom relationship. |
| **Dual-axis Matrix View** | When a Connection Type defines both X and Y stage properties, the board renders as a grid — columns from `distance_x` stages, rows from `distance_y` stages. A true spatial pivot table. |
| **Unconnected overflow column** | Nords with no connection of the active type automatically appear in an "Unconnected" overflow column, so nothing falls through the cracks. |
| **Filtering** | Filter cards by Nord Type, property values, or connected nodes to focus the board on a specific slice of the graph. |
| **Consistent cards** | Cards render the same rich component as the [[Spatial Canvas]] — type badge, key properties, and connection indicators. |
| **Real-time sync** | Moving a card in Board View updates the canvas, persona lens, goal status, and any active AI session instantly. |

---

## Key Interactions

### Switching the Board Dimension
1. Open the **dimension selector** dropdown at the top of the board
2. Choose a Connection Type (e.g., "Status," "Priority," "Assigned To")
3. The board re-renders with columns generated from the selected type's stage labels
4. Cards reposition based on their `distance_x` value for that connection

### Advancing a Card
1. Grab a card in any column
2. Drag it to the target column
3. The card's `distance_x` for that Connection Type updates immediately
4. All other views reflect the change in real time

### How Stages Work

Each Connection Type can define **stage labels** mapped to `distance_x` breakpoints:

| Stage | `distance_x` Range |
|-------|-------------------|
| Backlog | 0.0 – 0.19 |
| To Do | 0.2 – 0.39 |
| In Progress | 0.4 – 0.59 |
| Review | 0.6 – 0.79 |
| Done | 0.8 – 1.0 |

Moving a card to "In Progress" sets its `distance_x` to the midpoint of that range (e.g., `0.5`).

---

## The Y-Axis & Dual-Axis Matrix

Connections support **two independent spatial axes**, each with its own stage property:

| Axis | Distance | Stage Property | Drives |
|------|----------|----------------|--------|
| **Horizontal (X)** | `distance_x` (0.0–1.0) | e.g., `Status` → `To Do / In Progress / Done` | Board **columns** |
| **Vertical (Y)** | `distance_y` (0.0–1.0) | e.g., `Priority` → `Low / Medium / High` | Matrix **rows** |

When a Connection Type defines both X and Y stage properties, Board View renders as a **Matrix** — a structured grid where:

```
               ┌──────────────┬──────────────┬──────────────┐
               │   Stage 0    │   Stage 1    │   Stage 2    │
               │   (To Do)    │(In Progress) │   (Done)     │
    ┌──────────┼──────────────┼──────────────┼──────────────┤
    │   High   │  [Nord 1]    │              │  [Nord 3]    │
    ├──────────┼──────────────┼──────────────┼──────────────┤
    │  Medium  │              │  [Nord 2]    │              │
    ├──────────┼──────────────┼──────────────┼──────────────┤
    │   Low    │  [Nord 4]    │  [Nord 5]    │              │
    └──────────┴──────────────┴──────────────┴──────────────┘
```

- **Columns** = X stage labels of the active Connection Type
- **Rows** = Y stage labels of the same Connection Type
- **Cell placement** = each Nord's `distance_x` determines its column; `distance_y` determines its row
- **No Y stages defined?** Rows default to target nords (grouped by what each nord connects to)

### The Spatial Bridge

The Matrix preserves the canvas's core invariant: **position encodes meaning.**

- Horizontal position (column) = stage progression (where is this in its lifecycle?)
- Vertical position (row) = relational grouping (what priority, what category?)
- Card width (if type has scale enabled) = spectrum value (same as canvas)

When switching from Matrix → Canvas, cards animate back to their saved x/y coordinates. This is the "Wow" transition — structured data flying back into spatial positions.

---

## Unconnected Overflow

Not every Nord has a connection of the currently active type. Rather than hiding these nords (and losing visibility), Board View places them in an **Unconnected** overflow column at the far right of the board.

This ensures:
- No data is silently hidden when switching dimensions
- Users can spot nords that haven't been classified under the active relationship type
- Drag-and-drop from the overflow column into a stage column creates the connection automatically

---

## Technical Notes

- Stage labels and `distance_x` / `distance_y` breakpoints are defined in the Connection Type schema — fully user-configurable.
- Board View shares the same card component as the [[Spatial Canvas]] for visual consistency.
- Drag-and-drop uses the same real-time update pipeline as property edits — changes propagate to the database, other views, and active [[MCP Integration]] sessions.
- Columns are rendered dynamically; no board-specific data structures are stored.
- Matrix View is activated automatically when the active Connection Type has both X and Y stage properties defined.
- The animated transition between Matrix and Canvas uses the same physics tweening as the [[Spatial Canvas]] snapshot player (1.5s easing).
