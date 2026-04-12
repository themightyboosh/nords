# Nords Matrix View — Design Document

## What Is the Matrix?

The Matrix is Nords' structured "Kanban-meets-pivot-table" lens. It takes the free-form spatial canvas and projects it into a **two-dimensional grid** where:

- **Columns** = discrete stages along a connection type's **X-distance** (0.0 → 1.0)
- **Rows (Swimlanes)** = discrete stages along a connection type's **Y-distance** (0.0 → 1.0)
- **Cards** = individual nords placed into cells based on their connection distances

The core invariant is preserved: **position encodes meaning.** The Matrix doesn't create new data — it quantizes existing continuous distance values into discrete buckets.

---

## How Columns Are Derived

### Source: Connection Type → X Stage Labels

Every connection type can define `x_stage_labels` — an ordered array of strings that partition the 0.0–1.0 X-distance axis into equal buckets.

```
Connection Type: "Blocks"
x_stage_labels: ["To Do", "In Progress", "Done"]

0.0          0.33         0.66          1.0
 ├────────────┼────────────┼────────────┤
 │   To Do    │ In Progress│    Done    │
 bucket 0      bucket 1      bucket 2
```

### Mapping Algorithm: `distanceToBucket()`

```typescript
function distanceToBucket(value: number, numLabels: number): number {
  if (numLabels <= 0) return 0;
  const bucketWidth = 1.0 / numLabels;
  const bucket = Math.floor(value / bucketWidth);
  return Math.min(bucket, numLabels - 1); // clamp edge case: value === 1.0
}

// distanceToBucket(0.00, 3) → 0 ("To Do")
// distanceToBucket(0.50, 3) → 1 ("In Progress")
// distanceToBucket(0.99, 3) → 2 ("Done")
// distanceToBucket(1.00, 3) → 2 ("Done")  ← clamped
```

### What the User Sees

| To Do (0) | In Progress (1) | Done (2) |
|-----------|-----------------|----------|
| Card A ← distance_x: 0.15 | Card B ← distance_x: 0.50 | Card C ← distance_x: 0.88 |

---

## How Swimlanes Are Derived

### Source: Connection Type → Y Stage Labels

Same mechanism, orthogonal axis. If the connection type defines `y_stage_labels`, those become horizontal swimlane rows.

```
Connection Type: "Blocks"
y_stage_labels: ["Low", "Medium", "High"]
```

### The Grid

```
             │   To Do    │ In Progress │    Done    │
─────────────┼────────────┼─────────────┼────────────┤
   Low       │            │  [Card B]   │            │
─────────────┼────────────┼─────────────┼────────────┤
   Medium    │  [Card A]  │             │  [Card C]  │
─────────────┼────────────┼─────────────┼────────────┤
   High      │            │             │            │
─────────────┴────────────┴─────────────┴────────────┘
```

### Fallback: No Y-Axis = Flat Kanban

If no `y_stage_labels` are defined (or the user hasn't selected a Y-axis), the Matrix operates in **single-row Kanban mode** — just columns, no swimlanes. This is the default, simplest view.

---

## Viewing Multiple Nord Types

### The Problem
A project can have many Nord types (Task, Person, Service, Bug...). Not all types participate in every connection type. Showing everything creates noise.

### The Solution: Active Connection Type + Type Filter

1. **User selects a Connection Type** (e.g., "Blocks") from a dropdown in the Matrix header
2. The Matrix shows **only nords that have at least one connection of that type**
3. An optional **Type Filter** toggle lets the user show/hide specific Nord types within the active view
4. Nords with **no connections** of the active type go into an **"Unconnected"** overflow column on the far right

### Card Appearance per Type

Each card displays:
- **Type accent color** as a left-border stripe
- **Type icon** (Lucide) in the card header
- **Title** (always visible)
- **First 2–3 visible properties** defined in the Nord type's `visible_properties` setting (as defined in Manage Types)

Different Nord types are visually distinguishable by their accent color and icon, even when mixed in the same cell.

---

## What Happens When a Card Is Moved

### Column-to-Column Drag (X-axis)

When a card is dragged from one column to another, its underlying `distance_x` value is updated to the **median** of the target bucket:

```typescript
function bucketToMedianDistance(bucketIndex: number, numLabels: number): number {
  const bucketWidth = 1.0 / numLabels;
  return (bucketIndex * bucketWidth) + (bucketWidth / 2);
}

// bucketToMedianDistance(0, 3) → 0.167 (middle of "To Do")
// bucketToMedianDistance(1, 3) → 0.500 (middle of "In Progress")
// bucketToMedianDistance(2, 3) → 0.833 (middle of "Done")
```

**This is a real data mutation.** The connection's `distance_x` is updated via `PUT /api/connections/:id`. When the user switches back to Canvas view, the physics engine repositions the nord based on this new distance — the card will have moved.

### Swimlane-to-Swimlane Drag (Y-axis)

Same mechanism on the Y-axis. Dragging a card from "Low" to "High" updates `distance_y` to the median of the "High" bucket.

### Within-Cell Sort Order

Cards within the same cell are sorted by:
1. **Updated timestamp** (most recently modified on top)
2. Optionally, a **sort property** the user selects from a dropdown (e.g., sort by "Priority" or "Due Date")

Drag-and-drop within a cell only changes visual order — it does **not** alter any distance values. If we want persistent sort order within cells, we would add a `matrix_sort_order INT` column to nords in a future sprint. For now, timestamp-based is sufficient.

---

## What Gets Selected (Matrix Header Controls)

The Matrix header bar provides these controls:

| Control | What It Does | Data Source |
|---------|-------------|-------------|
| **Connection Type Dropdown** | Selects which connection type drives the grid | `GET /api/projects/:id/graph` → `connection_types[]` |
| **X-Axis Label** | Shows current X-axis stage labels as column headers | `connection_types[selected].x_stage_labels` |
| **Y-Axis Toggle** | Enables/disables swimlanes | `connection_types[selected].y_stage_labels` |
| **Type Filter** | Show/hide specific Nord types | `nord_types[]` (multi-select checkboxes) |
| **Sort By** | Property to sort cards within cells | Properties from the `properties_schema` of visible Nord types |
| **Save View** | Saves the current configuration | New `matrix_views` table or localStorage |

---

## View Persistence (Saved Views)

Matrix configurations should be savable and remembered. A saved view stores:

```typescript
interface MatrixView {
  id: string;
  project_id: string;
  name: string;                           // "Sprint Board", "Team Capacity"
  connection_type_id: string;             // Which connection type drives the grid
  y_axis_enabled: boolean;                // Whether swimlanes are on
  visible_nord_type_ids: string[];        // Which Nord types are shown
  sort_property: string | null;           // Property key for within-cell sorting
  sort_direction: 'asc' | 'desc';
  created_by: string;
  created_at: string;
}
```

**For MVP:** Store in `localStorage` per project. Keyed as `nords_matrix_views_{projectId}`.

**For V2:** New `matrix_views` table in PostgreSQL, synced across devices.

The last-used view is remembered and auto-loaded when the user switches to Matrix lens.

---

## Design Inspiration & Differentiation

### What Others Do

| Product | Approach | Our Advantage |
|---------|----------|---------------|
| **Notion Board** | Group by any Select property, sub-group by another | We use continuous 0.0–1.0 distances, not just discrete enum values. Moving a card actually changes its spatial position on the canvas. |
| **Linear Board** | Fixed Status column, swimlanes by assignee/project | We support arbitrary connection types as axes — not just "Status." Any relationship becomes a Kanban dimension. |
| **Jira Board** | Columns from workflow statuses, swimlanes from JQL | We don't have fixed workflows. Each connection type defines its own stage progression, making the system domain-agnostic. |
| **Airtable Kanban** | Group by Single Select field | Our stages are driven by connection distances, not standalone fields. Moving a card changes a relationship, not just a property. |

### What Makes Nords Unique

The Matrix is not just a Kanban board — it's a **spatial pivot table**:

1. **The grid is derived from relationships, not properties.** A card's column isn't determined by its own "Status" field — it's determined by its *distance* from another card along a specific connection type.

2. **Two semantic axes from one connection type.** A single "Blocks" connection can drive both columns (X stages: lifecycle) and rows (Y stages: priority), creating a true 2D data space.

3. **Bidirectional sync with the canvas.** Moving a card in the Matrix physically moves it on the Canvas. The Matrix isn't a separate view — it's a different *projection* of the same spatial data.

4. **Drop-down properties render in cards.** If a Nord type has Select properties (e.g., "Priority: High/Medium/Low"), those render as colored badges on the Matrix card, giving additional context without needing a separate swimlane.

---

## Data Flow Summary

```
┌──────────────────────────────────────────────────────────────────┐
│                        Matrix Lens                               │
│                                                                  │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐     │
│  │ Connection    │     │ x_stage_     │     │ y_stage_     │     │
│  │ Type Selector │────▶│ labels       │────▶│ labels       │     │
│  └──────────────┘     │ → Columns    │     │ → Swimlanes  │     │
│                        └──────────────┘     └──────────────┘     │
│                              │                     │              │
│                              ▼                     ▼              │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  For each Nord with a connection of the active type:        │ │
│  │                                                             │ │
│  │  column = distanceToBucket(connection.distance_x, numX)     │ │
│  │  row    = distanceToBucket(connection.distance_y, numY)     │ │
│  │                                                             │ │
│  │  Place card at cell [row, column]                           │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                              │                                    │
│                              ▼                                    │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  On drag card from cell [r1,c1] to [r2,c2]:                │ │
│  │                                                             │ │
│  │  connection.distance_x = bucketToMedianDistance(c2, numX)   │ │
│  │  connection.distance_y = bucketToMedianDistance(r2, numY)   │ │
│  │                                                             │ │
│  │  PUT /api/connections/:id { distance_x, distance_y }        │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                              │                                    │
│                              ▼                                    │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  Switch to Canvas Lens:                                     │ │
│  │  Physics engine reads updated distances → repositions nords │ │
│  │  The Reveal animation plays as cards fly to new positions   │ │
│  └─────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

---

## Edge Cases & Rules

| Scenario | Behavior |
|----------|----------|
| **Nord has no connections of active type** | Placed in "Unconnected" overflow column (rightmost) |
| **Nord has multiple connections of same type** | Uses the connection with the lowest `distance_x` (closest/first relationship) |
| **Connection type has no X stages** | Matrix cannot render — show prompt: "Add stage labels to this connection type" |
| **Connection type has X but no Y stages** | Flat Kanban (single row, multiple columns) |
| **Empty cell** | Render with subtle dashed border, accepts drops |
| **Card dragged to "Unconnected"** | Soft-deletes the connection (removes the relationship) |
| **Card dragged FROM "Unconnected" to a cell** | Creates a new connection with median distance of target bucket |
| **Nord type filter hides all types** | Show empty state: "No Nord types selected" |
