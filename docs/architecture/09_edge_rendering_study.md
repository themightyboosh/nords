# Edge Rendering & Line Routing Study

> **Purpose:** Research document analyzing strategies for drawing, routing, and maintaining persistent connection lines between Nords on an infinite spatial canvas. This study evaluates prior art, algorithms, and implementation options to guide the production rendering engine.

---

## 1. The Problem

Nords are rectangular cards placed on an infinite 2D canvas. **Lines** (connections) are SVG/Canvas edges drawn between pairs of Nords representing typed semantic relationships (Blocks, Depends, Relates, Assigned, etc.).

### Hard Requirements

| Constraint | Description |
|:---|:---|
| **Persistent attachment** | Lines must remain visually connected to Nords when Nords are dragged, resized, collapsed, or expanded. |
| **Edge anchoring** | Lines must terminate at the **perimeter** of a Nord card, not its center. The anchor point must adapt to the card's current bounding box. |
| **Directional arrows** | Lines carry directional arrowheads showing data flow (A → B). The arrowhead must be correctly oriented at the edge intersection. |
| **Labels** | Each line displays a connection type label (e.g., BLOCKS, DEPENDS) along the midpoint. Labels must be readable regardless of zoom level. |
| **Performance at scale** | Target: 200+ Nords with an average of 2–4 connections each (~400–800 edges) rendered at 60fps during drag interactions. |
| **Resize responsiveness** | When a Nord is resized (user drags the corner handle), all attached lines must re-anchor to the new perimeter in real-time. |
| **The Distance Invariant** | Connection semantic values (0.0-1.0) dictate physical canvas distance. The line drawn between Nords must visually honor this pure Euclidean distance rather than obfuscating it. |

---

## 2. Prior Art: How Others Solve This

### 2.1 draw.io (diagrams.net)
- **Approach:** Advanced graph layout engine with orthogonal, polyline, and curved routing.
- **Anchor system:** Fixed ports (8 cardinal points) OR floating connectors that auto-select the closest edge.
- **Routing algorithm:** Grid-based A* pathfinding for orthogonal routing with obstacle avoidance.
- **Takeaway:** Gold standard for formal diagramming, but overly rigid for a spatial canvas where organic curves feel more natural.

### 2.2 Miro
- **Approach:** Smart orthogonal routing optimized for whiteboard speed.
- **Anchor system:** Floating connectors recalculate on every frame during drag.
- **Routing algorithm:** Simplified path search prioritizing minimal bends over optimal shortest-path.
- **Takeaway:** Good balance of "smart enough" routing with real-time collaborative performance. Their engine prioritizes latency over routing perfection.

### 2.3 Figma
- **Approach:** Manual connectors with simple straight/elbow paths. Minimal automatic routing.
- **Anchor system:** User manually attaches lines to specific edge points.
- **Takeaway:** Connections are secondary to Figma's design focus. Not a strong reference for our graph-first product.

### 2.4 React Flow
- **Approach:** The dominant React library for node-based graph UIs.
- **Edge types:** Bezier (default), Straight, Step, SmoothStep.
- **Anchor system:** Source/target "handles" placed on node borders. Position updates are batched via internal state management.
- **Routing:** No built-in obstacle avoidance. Community library `@tisoap/react-flow-smart-edge` adds A*-based routing around nodes.
- **Takeaway:** Most likely candidate for Nords' production engine. Native handle system solves 90% of the anchor problem. Custom edges give full SVG path control.

### 2.5 D3-force
- **Approach:** Physics simulation for force-directed graph layouts.
- **Edge handling:** Edges are simple SVG lines or paths recalculated each simulation tick.
- **Takeaway:** Excellent for "gravity well" exploratory layouts (Phase 3), but insufficient for normal canvas mode where Nords have user-defined positions.

---

## 3. The Anchor Point Problem

### 3.1 Center-to-Center (Current Mock)
Our current mock draws lines from `(card.x + width/2, card.y + height/2)` to the target's center. This causes:
- ❌ Lines disappearing under card bodies
- ❌ Arrows hidden beneath the card border
- ❌ No perimeter intersection calculation

### 3.2 Line-Rectangle Border Intersection (Recommended)

The correct approach calculates where the center-to-center line **intersects the card's bounding rectangle**.

#### Algorithm
Given two cards A and B:
- `A` is centered at `(cx₁, cy₁)` with half-dimensions `(w₁, h₁)`
- `B` is centered at `(cx₂, cy₂)` with half-dimensions `(w₂, h₂)`
- Direction vector: `(dx, dy) = (cx₂ - cx₁, cy₂ - cy₁)`

**For Card A's exit point:**

```
if |dy/dx| < h₁/w₁:
    // Line exits via left or right edge
    x = cx₁ + (dx > 0 ? w₁ : -w₁)
    y = cy₁ + dy * (w₁ / |dx|)
else:
    // Line exits via top or bottom edge
    x = cx₁ + dx * (h₁ / |dy|)
    y = cy₁ + (dy > 0 ? h₁ : -h₁)
```

Apply the same for Card B's entry point (with inverted direction).

#### Rounded Corners
Since Nords have `border-radius`, the intersection should optionally account for corner arcs. An easy approximation: inset the intersection point by the border-radius value when the hit lands near a corner quadrant.

### 3.3 Fixed Port System (React Flow Model)

React Flow uses **handles** — fixed attachment points placed at specific positions on a node:

```
type HandlePosition = 'top' | 'right' | 'bottom' | 'left';
```

The edge always connects from the source handle to the target handle. When a node is dragged, the handle coordinates update automatically because they are DOM elements positioned relative to the node.

**Pros:**
- No geometry math needed — the browser handles position tracking
- Predictable visual appearance
- Easy to implement directional semantics (e.g., output on right, input on left)

**Cons:**
- Unnatural for a freeform spatial canvas where any side should be connectable
- Lines may cross the card body if source/target are on the same side

### 3.4 Dynamic Port Selection (Hybrid — Recommended for Nords)

Combine both approaches:
1. Compute the angle from source center to target center
2. Select the closest of 4 (or 8) port positions based on angle
3. Use that port as the connection point

This gives the visual cleanliness of fixed ports with the adaptive behavior of floating connectors.

```typescript
function getNearestPort(
  sourceRect: DOMRect,
  targetCenter: { x: number; y: number }
): { x: number; y: number } {
  const cx = sourceRect.x + sourceRect.width / 2;
  const cy = sourceRect.y + sourceRect.height / 2;
  const angle = Math.atan2(targetCenter.y - cy, targetCenter.x - cx);

  // 4 cardinal ports
  const ports = [
    { x: cx + sourceRect.width / 2, y: cy },        // right
    { x: cx, y: cy + sourceRect.height / 2 },        // bottom
    { x: cx - sourceRect.width / 2, y: cy },          // left
    { x: cx, y: cy - sourceRect.height / 2 },         // top
  ];

  // Select nearest by angle
  const portAngles = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
  let best = 0;
  let minDiff = Infinity;
  portAngles.forEach((pa, i) => {
    const diff = Math.abs(
      Math.atan2(Math.sin(angle - pa), Math.cos(angle - pa))
    );
    if (diff < minDiff) { minDiff = diff; best = i; }
  });

  return ports[best];
}
```

---

## 4. Edge Path Strategies

### 4.1 Straight Lines
`<line x1 y1 x2 y2>` or `<path d="M x1 y1 L x2 y2">`

**Pros:** Simplest, fastest, lowest visual noise.
**Cons:** Lines cross card bodies, poor readability with many connections, no obstacle avoidance.

### 4.2 Quadratic Bézier Curves
`<path d="M x1 y1 Q cx cy x2 y2">`

Control point placed at the midpoint with a perpendicular offset:
```
midX = (x1 + x2) / 2
midY = (y1 + y2) / 2
offset = 30  // perpendicular offset
control = (midX - offset * sin(angle), midY + offset * cos(angle))
```

**Pros:** Organic feel, curves naturally avoid crossing cards.
**Cons:** Only one control point—less flexibility for complex routing.

### 4.3 Cubic Bézier Curves (React Flow Default)
`<path d="M x1 y1 C cx1 cy1 cx2 cy2 x2 y2">`

Two control points extend outward from the source/target ports:
```
cp1 = (x1 + offset, y1)   // extends right from source
cp2 = (x2 - offset, y2)   // extends left towards target
```

**Pros:** Beautiful curves, industry standard, excellent arrowhead orientation.
**Cons:** Can create loops or strange shapes when source and target are close.

### 4.4 Orthogonal (Step) Routing
`<path d="M x1 y1 H midX V y2 H x2">`

Lines consist of only horizontal and vertical segments with right-angle bends.

**Pros:** Clean, engineering-diagram feel, great for flowcharts.
**Cons:** Visually rigid for a creative spatial tool, can create cluttered routing with many connections.

### 4.5 Smart Routing with Pathfinding
Uses A* or visibility-graph algorithms to compute paths avoiding obstacles.

**Pros:** Eliminates visual clutter, professional output.
**Cons:** Computationally expensive (~O(n²) per edge). **Crucially**, adding artificial bends and detours completely breaks Nords' core physical invariant where line length implies semantic distance. 

---

## 5. Front-End Code Review & The Distance Paradigm

Upon reviewing `CanvasMock.tsx` and the core architecture documents (`02_data_model_and_physics.md`, `08_property_types_reference.md`), a profound realization emerges regarding Nords' connection system:

### The "Distance Matters" Invariant
In Nords, vertical and horizontal proximity encode precise semantic values (X/Y Data from 0.0 to 1.0). Therefore, the Euclidean distance between two Nords *is* the data. **Any routing algorithm that routes around other Nords (orthogonal, A*, obstacle-avoidance) is fundamentally wrong for this product.** A line that dramatically bends around an obstacle creates a visually much longer path, confusing the brain's intuitive reading of the relationship's tension and distance.

### We Must Use Bézier Math
Instead of pathfinding, we must use pure Bézier math. The direct line of sight between two objects is the only true representation of their connection. 
- A straight line represents the purest, shortest distance.
- A **Quadratic Bézier** (with a single control point offset perpendicularly) flawlessly solves the "parallel connection" problem (Ribboning) without altering the perceived anchor-to-anchor distance.
- The control point offset simply arcs outward relative to the distance, creating a "tension" bow.

### Evaluating the Current Mock Approach (`CanvasMock.tsx`)
Currently, the mock implements a custom `<svg>` layer absolutely positioned over the canvas, using `clipToCardEdge` math to find the intersection of the border, and `getRibbonOffset` to calculate a perpendicular displacement for a Quadratic Bézier (`Q cpX cpY x2 y2`).

**Verdict: The mock's mathematical approach is conceptually perfect.**
It calculates pure intersection points and pure arcs. However, managing this state manually across hundreds of nodes during high-octane physics drags will overwhelm React's render cycle. 

**Production Recommendation:** 
We *should* migrate to React Flow for node management, but we must **reject React Flow's default edge types**. We will build a Custom Edge component in React Flow that exactly replicates our current mock's `clipToCardEdge` and Quadratic Ribboning math. This gives us the performance backbone of React Flow's internal `ResizeObserver` and transform engine, while preserving the mathematical purity of our direct distance-based arches.

---

## 6. Recommendation for Nords

### Phase 1 (V1 Launch)

| Decision | Choice | Rationale |
|:---|:---|:---|
| **Rendering engine** | React Flow | High-performance node tracking while allowing 100% custom SVG edge logic |
| **Anchor strategy** | Line-Rectangle Intersection (`clipToCardEdge`) | Retain the mock's exact center-to-perimeter vector intersection. Floating fixed ports distort the true distance vector. |
| **Edge path** | Quadratic Bézier curves | Direct point-to-point physical connection. Control points offset perpendicularly for ribboning. NO routing around obstacles. |
| **Arrow rendering** | SVG `<marker>` with capped scale | Already implemented in mock; scale cap prevents visual noise |
| **Label rendering** | Positioned at Bézier midpoint with `inverseScale` cap at 0.65 | Already proven in mock |

### Phase 2 Enhancements

| Enhancement | Description |
|:---|:---|
| **Edge bundling** | When multiple edges connect the same pair of Nords, bundle them into a single visual path with a combined label |
| **Geometric Tension** | The perpendicular bow/arc of the Bézier curve could be algorithmically tightened or slackened based on semantic dissonance between the Nords. |
| **Curve tension control** | Let users adjust Bézier curvature via the Line Detail Drawer spectrum slider |

### Phase 3 Enhancements

| Enhancement | Description |
|:---|:---|
| **Animated flow particles** | Tiny dots flowing along edges to show directionality and activity |
| **Edge heatmap** | Color edges by semantic distance or stage value |
| **3D edge projection** | Billboard edges in 3D mode via Three.js `Line2` with depth-aware z-ordering |

---

## 7. Implementation Sketch

### 6.1 Custom Edge Component (React Flow)

```tsx
import { BaseEdge, type EdgeProps } from '@xyflow/react';

function NordsEdge({
  id, sourceX, sourceY, targetX, targetY, data
}: EdgeProps) {
  
  // 1. Calculate intersection with node boundaries (clipToCardEdge math)
  // 2. Calculate midpoints and perpendicular offset for Ribboning
  // 3. Generate path string
  
  const midX = (sourceX + targetX) / 2;
  const midY = (sourceY + targetY) / 2;
  
  // Example mock math imported from context
  const offset = data.ribbonOffset || 0;
  const dx = targetX - sourceX;
  const dy = targetY - sourceY;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const cpX = midX + (-dy / len) * offset;
  const cpY = midY + (dx / len) * offset;
  
  const pathD = offset === 0
    ? `M ${sourceX} ${sourceY} L ${targetX} ${targetY}`
    : `M ${sourceX} ${sourceY} Q ${cpX} ${cpY} ${targetX} ${targetY}`;

  return (
    <>
      <BaseEdge
        id={id}
        path={pathD}
        style={{ stroke: data.color, strokeWidth: 1.5 }}
        markerEnd={`url(#arrow-${data.type})`}
      />
      <foreignObject
        x={midX - 30} y={midY - 10}
        width={60} height={20}
        className="nords-edge-label"
      >
        <span>{data.label}</span>
      </foreignObject>
    </>
  );
}
```

### 7.2 Resize-Responsive Anchoring

React Flow handles this natively through its node measurement system:
1. Each Nord is a `<NodeComponent>` with a `ResizeObserver`
2. When the ResizeObserver fires, React Flow updates internal dimensions
3. All connected edges automatically recalculate source/target coordinates
4. No manual geometry math needed

### 6.3 Performance Budget

| Metric | Target | Strategy |
|:---|:---|:---|
| Edge render time | <2ms per edge | SVG path caching, avoid re-render on unrelated state changes |
| Drag FPS | 60fps with 200 nodes | React Flow's internal batching + `requestAnimationFrame` throttle |
| Edge count limit | 800 visible edges | Beyond this, enable Level-of-Detail: hide edges when zoomed out past threshold |
| Label rendering | Semantic zoom visibility | Labels hidden below 40% zoom, shown above |

---

## 8. Open Questions

> [!IMPORTANT]
> These decisions should be finalized during the production architecture spike.

1. **Should we support user-draggable waypoints on edges?** (draw.io allows this; adds significant complexity)
2. **Should edge color encode semantic distance stage, or remain fixed per connection type?** (Phase 1 vs Phase 2 question)
3. **Do we need edge collision detection?** (Prevents edges from overlapping cards they're not connected to — expensive)
4. **Should Nords have exactly 4 ports (TRBL) or 8 (TRBL + corners)?** Or remain dynamically continuous via vector math? The vector math provides the truest representation of distance.

---

## 9. References

| Source | URL |
|:---|:---|
| React Flow Docs — Custom Edges | https://reactflow.dev/api-reference/components/base-edge |
| Smart Edge (A* routing) | https://github.com/tisoap/react-flow-smart-edge |
| D3-force simulation | https://d3js.org/d3-force |
| ELK layout engine | https://www.eclipse.org/elk/ |
| Line-Rectangle intersection math | StackOverflow — canonical answer |
| draw.io edge routing internals | diagrams.net open source (mxGraph) |
