# Nords Matrix View — Deep Design Document

## 1. What Is the Matrix? (The Spatial Projection Paradigm)

Traditional project management tools treat Kanban boards as the ultimate source of truth: a task *is* in "To Do", and moving it changes its status property. 

Nords flips this paradigm. In Nords, the **spatial canvas and its continuous distances (0.0 → 1.0) are the source of truth.** The Matrix is merely a lens—a discrete, mathematical *projection* of that continuous space into a two-dimensional grid. It is the "Kanban-meets-pivot-table" view.

- **Columns (X-Axis)** = discrete ranges of a connection's **X-distance** (e.g., 0.0 → 0.33 = "To Do").
- **Rows/Swimlanes (Y-Axis)** = discrete ranges of a connection's **Y-distance**.
- **Cards** = individual Nords projected into cells based on their connection topology.

By decoupling the *presentation* (Matrix) from the *data model* (Spatial Graph), Nords allows for infinitely flexible pivot tables that adapt to the relationships between nodes, not just their hardcoded properties.

---

## 2. Advanced Derivation: The Anatomy of a Cell

### Static Boundaries vs. Fuzzy Boundaries
In standard Kanban, a card belongs to one column definitively. Because Nords operates on a continuous 0.0-1.0 distance scale, a connection might have `distance_x: 0.333`, placing it exactly on the boundary between bucket 0 and bucket 1.

**Innovation—Liminal States:** The Matrix will visually represent uncertainty or transition. Cards that sit within 5% of a bucket boundary will subtly bleed over the visual cell divider, or exhibit a "liminal glow," indicating they are in a state of transition between stages.

### Target-Centric Matrices (The Dependency View)
Instead of static connection stage labels driving both axes, the Matrix can dynamically pivot based on **Graph Topology**. 

Instead of `Rows = Y-Stage Labels`, Nords can configure `Rows = Target Nords`. 
- **Example:** You select the "Blocks" connection type. The X-axis becomes the distance buckets (Immediate, Near, Far). The Y-axis (rows) becomes the actual **Epic Nords** that are being blocked.
- **Result:** A dynamic topological matrix showing exactly which micro-tasks are blocking which macro-epics, sorted by spatial severity.

---

## 3. Semantic Zooming: Macro, Meso, and Micro Matrices

The Matrix is not a flat web element; it inherits the zooming capabilities of the Canvas.

### Macro Scale (Heatmap Topology)
At high zoom out levels, individual cards fade away. The Matrix transforms into a **Data Density Heatmap**. Cells dynamically tint their background HSL lightness relative to the count of nodes inside them. This instantly communicates workflow bottlenecks (e.g., a dark red "QA" column means the pipeline is clogged).

### Meso Scale (Traditional Kanban)
The standard zoom level. Cards render with:
- **Type accent color** as a left border stripe.
- **Lucide Icon** indicating the Nord Type.
- **Title and Visible Properties** defined by the Nord's schema.
Cards are sorted within the cell initially by `updated_at` (newest on top).

### Micro Scale (The Intra-Cell Canvas)
**Innovation—Force-Directed Packing:** In Jira or Trello, a column with 50 cards becomes an unmanageable vertical scrollbox. In the Nords Matrix, zooming *into* a specific cell expands it into a bounded micro-canvas. Instead of a vertical list, the cards utilize **d3-force boundary collision packing**, organically clustering as circles/small cards within the cell's physical boundaries. This preserves the "spatial" DNA even inside structured views.

---

## 4. Drag-to-Reassign: Bi-directional Spatial Sync

When a card is dragged from one column to another, it is making a profound change to the graph's spatial physics.

### The Algorithm: `bucketToMedianDistance()`
```typescript
function bucketToMedianDistance(bucketIndex: number, numLabels: number): number {
  const bucketWidth = 1.0 / numLabels;
  return (bucketIndex * bucketWidth) + (bucketWidth / 2);
}
```
Dragging a card to a new column updates the underlying connection's `distance_x` to the median of the target bucket. (e.g., dropping in Bucket 1 of 3 sets distance to `0.500`).

### The Reveal Animation (Epic 12 Integration)
This is a real database mutation. Because Matrix and Canvas share a unified spatial engine, switching back from Matrix to Canvas Lens triggers **The Reveal**. The physics engine reads the updated distance values, and the user watches the nodes physically fly across the Canvas to resolve the new spring-force equilibrium dictated by their Kanban move.

---

## 5. View Configurations & AI Capabilities

### Saved Matrix Views
Matrix configurations are saved persistently, allowing teams to create bespoke dashboards for different ceremonies:
- *View A:* "Sprint Board" (X: Blocks distance, Y: Priority distance).
- *View B:* "Team Capacity" (X: Assigned To [Category string pivot], Y: Lifecycle status).

### Epic 15 Innovation: AI-Driven Dynamic Bucketing
If a user views a connection type in the Matrix that possesses **no defined stage labels**, the Matrix invokes the AI Agent to perform **K-Means Clustering** on the 1D or 2D distance arrays. The AI automatically discovers natural spatial clusters in the graph, auto-generates semantic column headers based on node properties inside those clusters, and instantiates a dynamic Kanban board on the fly.

---

## 6. Competitive Differentiation Summary

| Product | Approach | The Nords Advantage |
|---------|----------|---------------------|
| **Notion** | Group by discrete Select properties | **Topology over Typology.** We map distances and relationships, not isolated enum states. |
| **Linear** | Fixed "Status" workflows | **Domain-Agnostic Axes.** Any relationship type (Blocks, Belongs To, Influences) can be pivoted into a 2D axis. |
| **Miro** | Free-form spatial, manual grids | **Bidirectional Physics.** Matrix is procedurally generated from Canvas math. Moving a Kanban card actually mathematically repositions the sticky note on the canvas. |

## 7. Data Flow Summary

```text
┌──────────────────────────────────────────────────────────────────┐
│                        Matrix Lens                               │
│                                                                  │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐      │
│  │ Connection   │     │ x_stage_     │     │ y_stage_     │      │
│  │ Type Selector│────▶│ labels       │────▶│ labels (or   │      │
│  └──────────────┘     │              │     │ Target Nords)│      │
│                       └──────────────┘     └──────────────┘      │
│                              │                     │             │
│                              ▼                     ▼             │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  For each Nord with a connection of the active type:        │ │
│  │  cell_x = distanceToBucket(connection.distance_x, numX)     │ │
│  │  cell_y = distanceToBucket(connection.distance_y, numY)     │ │
│  │                                                             │ │
│  │  Liminal check: if distance % bucketWidth < 0.05 → Glow     │ │
│  │  Place card at cell [cell_y, cell_x] with d3 intra-packing  │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                              │                                   │
│                              ▼                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  On drag card from cell [r1,c1] to [r2,c2]:                 │ │
│  │  conn.distance_x = bucketToMedianDistance(c2, numX)         │ │
│  │  PUT /api/connections/:id { distance_x, distance_y }        │ │
│  └─────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```
