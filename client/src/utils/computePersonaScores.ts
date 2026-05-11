/**
 * computePersonaScores — Per-node relevance scoring for the Persona Lens.
 *
 * For each node, takes the AVERAGE of the persona's weights across the
 * connection types that actually touch that node. This means:
 *   - A node connected only via "Blocks" (+100) → score = +100
 *   - A node connected via "Blocks" (+100) and "Assigned" (-100) → score = 0
 *   - A node connected via all negative types → score ≈ -100
 *
 * The score is then normalized to [-1.0, +1.0] by dividing by 100.
 *
 * Position mapping:
 *   +1.0 → closest to center (highest bias — persona loves these)
 *    0.0 → middle ring (neutral)
 *   -1.0 → outermost ring (persona dislikes these)
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
 * Score = AVERAGE weight of the connection types touching this node.
 * Each connection type contributes at most once per node (deduplicated).
 */
export function computePersonaScores(
  connections: Connection[],
  weights: Map<string, number>,
  _totalCategories: number  // kept for API compat but not used for normalization
): Map<string, PersonaNodeScore> {

  // Track which connection types touch each node (deduplicated)
  const nodeTypes = new Map<string, Set<string>>();
  for (const conn of connections) {
    if (!nodeTypes.has(conn.source_nord_id)) nodeTypes.set(conn.source_nord_id, new Set());
    if (!nodeTypes.has(conn.target_nord_id)) nodeTypes.set(conn.target_nord_id, new Set());
    nodeTypes.get(conn.source_nord_id)!.add(conn.type_id);
    nodeTypes.get(conn.target_nord_id)!.add(conn.type_id);
  }

  // Score each node: AVERAGE of unique connection type weights
  const entries: Array<{ id: string; score: number }> = [];
  for (const [nodeId, typeIds] of nodeTypes) {
    let weightSum = 0;
    let typeCount = 0;
    for (const typeId of typeIds) {
      const w = weights.get(typeId);
      if (w !== undefined) {
        weightSum += w;
        typeCount++;
      }
    }
    // Average weight, normalized to [-1, +1]
    const avgWeight = typeCount > 0 ? weightSum / typeCount : 0;
    const normalized = Math.max(-1, Math.min(1, avgWeight / 100));
    entries.push({ id: nodeId, score: normalized });
  }

  entries.sort((a, b) => a.score - b.score);

  const result = new Map<string, PersonaNodeScore>();
  const count = entries.length;

  for (let i = 0; i < count; i++) {
    const { id, score } = entries[i];
    const rank = count > 1 ? i / (count - 1) : 0.5;
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

  // Track which ring each node lands on, and each ring's computed radius
  const ringRadii: number[] = [];
  // Track the ring index where score first drops ≤ 0 (transition to negative bias)
  let neutralRingIdx = -1;
  let foundNeutral = false;

  for (let ring = 0; ring < ringCapacities.length; ring++) {
    const nodesInRing = ringCapacities[ring];

    // Radius: must fit all cards at arcSpacing apart around the circumference
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

      // Detect the first node with score ≤ 0 to mark the neutral boundary
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
  // Pad the max radius to give breathing room beyond the last ring
  const cardDiag = Math.sqrt(cardWidth * cardWidth + cardHeight * cardHeight);
  const maxRadius = lastRingRadius + cardDiag / 2 + 40;

  // Green zone: extends to the ring BEFORE the first negative-score ring.
  // If all scores are positive, green = max. If all negative, green = tiny.
  let neutralRadius: number;
  if (!foundNeutral) {
    // All scores are positive — green covers everything
    neutralRadius = maxRadius;
  } else if (neutralRingIdx === 0) {
    // All scores are ≤ 0 — green is just the avatar clearance
    neutralRadius = innerRadius * 0.5;
  } else {
    // Midpoint between the last positive ring and the first negative ring
    const prevRing = ringRadii[neutralRingIdx - 1];
    const nextRing = ringRadii[neutralRingIdx];
    neutralRadius = (prevRing + nextRing) / 2;
  }

  return { positions, maxRadius, neutralRadius };
}
