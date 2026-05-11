/**
 * computePersonaScores — Per-node relevance scoring for the Persona Lens.
 *
 * For each node, sums the persona's category weights across ALL connection
 * types that link to that node. Normalizes by the theoretical max
 * (numCategories × 100) so every node gets a score in [-1.0, +1.0].
 *
 * Position mapping:
 *   +1.0 → closest to center (highest bias)
 *    0.0 → middle ring (neutral)
 *   -1.0 → outermost ring (lowest / negative bias)
 */

import type { Connection } from '../hooks/useProjectGraph';

export interface PersonaNodeScore {
  /** Normalized score: -1.0 to +1.0 */
  score: number;
  /** Rank 0.0 (lowest score) → 1.0 (highest score), for radial positioning */
  rank: number;
}

/**
 * Compute persona relevance scores for all nodes in the graph.
 */
export function computePersonaScores(
  connections: Connection[],
  weights: Map<string, number>,
  totalCategories: number
): Map<string, PersonaNodeScore> {
  const theoreticalMax = Math.max(totalCategories * 100, 1);

  // Accumulate raw scores per node
  const rawScores = new Map<string, number>();
  for (const conn of connections) {
    const w = weights.get(conn.type_id) ?? 0;
    rawScores.set(conn.source_nord_id, (rawScores.get(conn.source_nord_id) ?? 0) + w);
    rawScores.set(conn.target_nord_id, (rawScores.get(conn.target_nord_id) ?? 0) + w);
  }

  // Normalize and rank
  const entries = [...rawScores.entries()].map(([id, raw]) => {
    const clamped = Math.max(-theoreticalMax, Math.min(theoreticalMax, raw));
    const normalized = clamped / theoreticalMax;
    return { id, normalized };
  });

  entries.sort((a, b) => a.normalized - b.normalized);

  const result = new Map<string, PersonaNodeScore>();
  const count = entries.length;

  for (let i = 0; i < count; i++) {
    const { id, normalized } = entries[i];
    const rank = count > 1 ? i / (count - 1) : 0.5;
    result.set(id, { score: normalized, rank });
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
 * Card positions are returned as top-left coordinates (ReactFlow convention).
 * The card's visual center is at (x + cardW/2, y + cardH/2).
 */
export function computeRadialPositions(
  scores: Map<string, PersonaNodeScore>,
  _averagedPositions: Map<string, { x: number; y: number }>,
  center: { x: number; y: number },
  cardWidth: number = 270,
  cardHeight: number = 120,
): Map<string, { x: number; y: number }> {
  const sorted = [...scores.entries()].sort((a, b) => b[1].score - a[1].score);
  const totalNodes = sorted.length;
  if (totalNodes === 0) return new Map();

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

  const result = new Map<string, { x: number; y: number }>();
  let nodeIdx = 0;
  const halfW = cardWidth / 2;
  const halfH = cardHeight / 2;

  // Minimum arc spacing between card centers
  const arcSpacing = cardWidth * 0.8;

  let prevRadius = 0;

  for (let ring = 0; ring < ringCapacities.length; ring++) {
    const nodesInRing = ringCapacities[ring];

    // Radius: must fit all cards at arcSpacing apart around the circumference
    const fitRadius = (nodesInRing * arcSpacing) / (2 * Math.PI);
    // Also enforce minimum gap from previous ring
    const minRadius = prevRadius + ringSpacing;
    const radius = Math.max(fitRadius, minRadius, innerRadius);
    prevRadius = radius;

    // Stagger every other ring by half a slot to prevent radial alignment
    const slotAngle = (2 * Math.PI) / nodesInRing;
    const ringOffset = ring % 2 === 0 ? 0 : slotAngle / 2;

    for (let j = 0; j < nodesInRing; j++) {
      if (nodeIdx >= sorted.length) break;
      const [nodeId] = sorted[nodeIdx];

      const angle = ringOffset + j * slotAngle;

      // Position is the top-left corner of the card (ReactFlow convention)
      result.set(nodeId, {
        x: center.x + radius * Math.cos(angle) - halfW,
        y: center.y + radius * Math.sin(angle) - halfH,
      });

      nodeIdx++;
    }
  }

  return result;
}
