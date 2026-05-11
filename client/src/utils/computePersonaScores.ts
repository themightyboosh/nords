/**
 * computePersonaScores — Per-node relevance scoring for the Persona Lens.
 *
 * SCORING MODEL (connection-profile weighted average):
 *
 *   For each node, we look at ALL its connections and weight each one
 *   by the persona's preference for that connection type. The node's
 *   final score is the average persona-weight across all its connections.
 *
 *   score(node) = Σ weight(conn.type) / count(connections)
 *
 *   This means a node with 5 "Blocks" connections (+100 each) and
 *   1 "Depends" connection (-100) scores:
 *     (5×100 + 1×(-100)) / 6 = +66.7 → near center
 *
 *   A node with only "Depends" connections scores:
 *     -100 → outer rim
 *
 *   This is a connection-profile-weighted average: the more connections
 *   of a liked type a node has, the closer it sits to center.
 *
 * Position mapping:
 *   +100 → closest to center (persona loves this node's connections)
 *      0 → middle ring (neutral mix)
 *   -100 → outermost ring (persona dislikes this node's connections)
 */

import type { Connection } from '../hooks/useProjectGraph';

export interface PersonaNodeScore {
  /** Normalized score: -1.0 to +1.0 */
  score: number;
  /** Rank 0.0 (lowest score) → 1.0 (highest score), for radial positioning */
  rank: number;
}

/** Layout result from computeRadialPositions */
export interface RadialLayoutResult {
  /** Per-node positions (top-left coords, ReactFlow convention) */
  positions: Map<string, { x: number; y: number }>;
  /** Radius of the outermost ring — red zone boundary (all nodes fit inside) */
  maxRadius: number;
  /** Radius where score ≈ 0 — green zone boundary (positive-bias nodes inside) */
  neutralRadius: number;
}

/**
 * Compute persona relevance scores for all nodes in the graph.
 *
 * Each CONNECTION contributes its type's persona weight to both endpoints.
 * The node score = average weight across all its connections.
 * This means nodes dominated by liked connection types score high.
 */
export function computePersonaScores(
  connections: Connection[],
  weights: Map<string, number>,
  _totalCategories: number  // kept for API compat
): Map<string, PersonaNodeScore> {

  // Accumulate: sum of weights and connection count per node
  const nodeWeightSum = new Map<string, number>();
  const nodeConnCount = new Map<string, number>();

  for (const conn of connections) {
    const w = weights.get(conn.type_id) ?? 0;

    // Source node
    nodeWeightSum.set(conn.source_nord_id, (nodeWeightSum.get(conn.source_nord_id) ?? 0) + w);
    nodeConnCount.set(conn.source_nord_id, (nodeConnCount.get(conn.source_nord_id) ?? 0) + 1);

    // Target node
    nodeWeightSum.set(conn.target_nord_id, (nodeWeightSum.get(conn.target_nord_id) ?? 0) + w);
    nodeConnCount.set(conn.target_nord_id, (nodeConnCount.get(conn.target_nord_id) ?? 0) + 1);
  }

  // Score each node: average weight per connection, normalized to [-1, +1]
  const entries: Array<{ id: string; score: number }> = [];
  for (const [nodeId, weightSum] of nodeWeightSum) {
    const count = nodeConnCount.get(nodeId) || 1;
    const avgWeight = weightSum / count;  // range: [-100, +100]
    const normalized = Math.max(-1, Math.min(1, avgWeight / 100));
    entries.push({ id: nodeId, score: normalized });
  }

  entries.sort((a, b) => a.score - b.score);

  const result = new Map<string, PersonaNodeScore>();
  const total = entries.length;

  for (let i = 0; i < total; i++) {
    const { id, score } = entries[i];
    const rank = total > 1 ? i / (total - 1) : 0.5;
    result.set(id, { score, rank });
  }

  return result;
}

/**
 * Compute radial positions using concentric rings.
 *
 * Nodes are sorted by score (highest = closest to center) and distributed
 * into expanding concentric rings. Ring radius is determined dynamically
 * to prevent card overlap.
 *
 * Also computes zone radii for the bias indicator circles:
 *  - maxRadius:     outermost ring + padding (red zone)
 *  - neutralRadius: ring where score transitions from positive to negative (green zone)
 */
export function computeRadialPositions(
  scores: Map<string, PersonaNodeScore>,
  _averagedPositions: Map<string, { x: number; y: number }>,
  center: { x: number; y: number },
  cardWidth: number = 270,
  cardHeight: number = 120,
): RadialLayoutResult {
  const sorted = [...scores.entries()].sort((a, b) => b[1].score - a[1].score);
  const totalNodes = sorted.length;
  if (totalNodes === 0) {
    return { positions: new Map(), maxRadius: 0, neutralRadius: 0 };
  }

  // Fixed ring spacing — enough to clear card height + breathing room
  const ringSpacing = cardHeight + 80; // 200px between rings
  const innerRadius = 250; // first ring radius (clears 120px avatar + padding)

  // Build rings: each ring holds progressively more nodes
  const ringCapacities: number[] = [];
  let placed = 0;
  let ringIdx = 0;

  while (placed < totalNodes) {
    const cap = 6 + ringIdx * 4; // 6, 10, 14, 18, 22, ...
    ringCapacities.push(Math.min(cap, totalNodes - placed));
    placed += cap;
    ringIdx++;
  }

  const positions = new Map<string, { x: number; y: number }>();
  let nodeIdx = 0;
  const halfW = cardWidth / 2;
  const halfH = cardHeight / 2;

  // Minimum arc spacing between card centers
  const arcSpacing = cardWidth * 0.8;

  let prevRadius = 0;

  const ringRadii: number[] = [];
  let neutralRingIdx = -1;
  let foundNeutral = false;

  for (let ring = 0; ring < ringCapacities.length; ring++) {
    const nodesInRing = ringCapacities[ring];

    const fitRadius = (nodesInRing * arcSpacing) / (2 * Math.PI);
    const minRadius = prevRadius + ringSpacing;
    const radius = Math.max(fitRadius, minRadius, innerRadius);
    prevRadius = radius;
    ringRadii.push(radius);

    const slotAngle = (2 * Math.PI) / nodesInRing;
    const ringOffset = ring % 2 === 0 ? 0 : slotAngle / 2;

    for (let j = 0; j < nodesInRing; j++) {
      if (nodeIdx >= sorted.length) break;
      const [nodeId, nodeScore] = sorted[nodeIdx];

      if (!foundNeutral && nodeScore.score <= 0) {
        neutralRingIdx = ring;
        foundNeutral = true;
      }

      const angle = ringOffset + j * slotAngle;

      positions.set(nodeId, {
        x: center.x + radius * Math.cos(angle) - halfW,
        y: center.y + radius * Math.sin(angle) - halfH,
      });

      nodeIdx++;
    }
  }

  const lastRingRadius = ringRadii[ringRadii.length - 1] || innerRadius;
  const cardDiag = Math.sqrt(cardWidth * cardWidth + cardHeight * cardHeight);
  const maxRadius = lastRingRadius + cardDiag / 2 + 40;

  let neutralRadius: number;
  if (!foundNeutral) {
    neutralRadius = maxRadius;
  } else if (neutralRingIdx === 0) {
    neutralRadius = innerRadius * 0.5;
  } else {
    const prevRing = ringRadii[neutralRingIdx - 1];
    const nextRing = ringRadii[neutralRingIdx];
    neutralRadius = (prevRing + nextRing) / 2;
  }

  return { positions, maxRadius, neutralRadius };
}
