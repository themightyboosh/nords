/**
 * computePersonaScores — Per-node relevance scoring for the Persona Lens.
 *
 * For each node, sums the persona's category weights across ALL connection
 * types that link to that node. Normalizes by the theoretical max
 * (numCategories × 100) so every node gets a score in [-1.0, +1.0].
 *
 * Visual mapping (radial heatmap):
 *   +1.0 → green background, closest to center
 *    0.0 → yellow background, middle ring
 *   -1.0 → red background, outermost ring
 */

import type { Connection } from '../hooks/useProjectGraph';

export interface PersonaNodeScore {
  /** Normalized score: -1.0 to +1.0 */
  score: number;
  /** Heatmap background color: green → yellow → red */
  heatColor: string;
  /** Rank 0.0 (lowest score) → 1.0 (highest score), for radial positioning */
  rank: number;
}

/**
 * Compute persona relevance scores for all nodes in the graph.
 *
 * @param connections All connections in the project
 * @param weights Map of connectionTypeId → weight (-100 to +100) from persona
 * @param totalCategories Total number of connection categories (for normalization)
 * @returns Map of nordId → PersonaNodeScore
 */
export function computePersonaScores(
  connections: Connection[],
  weights: Map<string, number>,
  totalCategories: number
): Map<string, PersonaNodeScore> {
  // Theoretical max = totalCategories × 100
  const theoreticalMax = Math.max(totalCategories * 100, 1); // avoid /0

  // Step 1: Accumulate raw scores per node
  // For each connection, BOTH source and target get the weight of that category
  const rawScores = new Map<string, number>();

  for (const conn of connections) {
    const w = weights.get(conn.type_id) ?? 0;
    // Even zero-weight connections contribute to the score (they don't change it,
    // but the node needs to appear in the result set)
    rawScores.set(conn.source_nord_id, (rawScores.get(conn.source_nord_id) ?? 0) + w);
    rawScores.set(conn.target_nord_id, (rawScores.get(conn.target_nord_id) ?? 0) + w);
  }

  // Step 2: Normalize scores and compute percentile ranks
  const entries = [...rawScores.entries()].map(([id, raw]) => {
    const clamped = Math.max(-theoreticalMax, Math.min(theoreticalMax, raw));
    const normalized = clamped / theoreticalMax;  // -1..+1
    return { id, normalized };
  });

  // Sort ascending by score so rank 0 = lowest, rank 1 = highest
  entries.sort((a, b) => a.normalized - b.normalized);

  const result = new Map<string, PersonaNodeScore>();
  const count = entries.length;

  for (let i = 0; i < count; i++) {
    const { id, normalized } = entries[i];
    const rank = count > 1 ? i / (count - 1) : 0.5;

    result.set(id, {
      score: normalized,
      heatColor: scoreToHeatColor(normalized),
      rank,
    });
  }

  return result;
}

/**
 * Convert a normalized score (-1..+1) to a heatmap color.
 *
 * Uses HSL interpolation through the warm spectrum:
 *   +1.0 → HSL(142, 71%, 45%) — green
 *    0.0 → HSL(48, 96%, 53%)  — gold/yellow
 *   -1.0 → HSL(0, 84%, 60%)   — red
 *
 * The midpoint is gold (not lime) to give better visual separation.
 */
export function scoreToHeatColor(normalized: number): string {
  // Map -1..+1 to 0..1 for interpolation
  const t = (normalized + 1) / 2; // 0 = red, 0.5 = yellow, 1.0 = green

  // Piecewise HSL interpolation for a clean green→yellow→red gradient
  let h: number, s: number, l: number;

  if (t >= 0.5) {
    // Yellow → Green (t: 0.5 → 1.0)
    const p = (t - 0.5) * 2; // 0..1
    h = 48 + p * (142 - 48);   // 48 → 142
    s = 96 - p * (96 - 71);    // 96% → 71%
    l = 53 - p * (53 - 45);    // 53% → 45%
  } else {
    // Red → Yellow (t: 0.0 → 0.5)
    const p = t * 2; // 0..1
    h = 0 + p * 48;            // 0 → 48
    s = 84 + p * (96 - 84);    // 84% → 96%
    l = 60 - p * (60 - 53);    // 60% → 53%
  }

  return `hsl(${Math.round(h)}, ${Math.round(s)}%, ${Math.round(l)}%)`;
}

/**
 * Compute radial positions for the persona heatmap.
 *
 * Places nodes in a radial layout around a center point:
 *   - Highest-scored nodes are closest to center
 *   - Lowest-scored nodes are furthest from center
 *   - Uses golden angle distribution for even spacing
 *   - Averaged "All Lines" positions inform angular placement for spatial continuity
 *
 * @param scores Per-node scores from computePersonaScores
 * @param averagedPositions Current averaged positions (for angular hints)
 * @param center Center point (persona avatar position)
 * @param minRadius Inner ring radius (highest score nodes)
 * @param maxRadius Outer ring radius (lowest score nodes)
 */
export function computeRadialPositions(
  scores: Map<string, PersonaNodeScore>,
  averagedPositions: Map<string, { x: number; y: number }>,
  center: { x: number; y: number },
  minRadius: number = 200,
  maxRadius: number = 900,
): Map<string, { x: number; y: number }> {
  // Sort nodes by score descending (highest first → closest to center)
  const sorted = [...scores.entries()].sort((a, b) => b[1].score - a[1].score);

  // Compute centroid of averaged positions for angular reference
  let cx = 0, cy = 0, count = 0;
  for (const pos of averagedPositions.values()) {
    cx += pos.x;
    cy += pos.y;
    count++;
  }
  if (count > 0) { cx /= count; cy /= count; }

  const result = new Map<string, { x: number; y: number }>();
  const goldenAngle = Math.PI * (3 - Math.sqrt(5)); // ~137.5° — optimal packing

  for (let i = 0; i < sorted.length; i++) {
    const [nodeId, nodeScore] = sorted[i];

    // Radius: lerp from min → max based on inverse rank
    // rank 1.0 (highest) → minRadius, rank 0.0 (lowest) → maxRadius
    const radius = minRadius + (1 - nodeScore.rank) * (maxRadius - minRadius);

    // Angle: use golden angle distribution for even coverage,
    // but bias by the node's original angular position for spatial continuity
    const avgPos = averagedPositions.get(nodeId);
    let baseAngle: number;

    if (avgPos) {
      // Use original angle as a starting hint, but offset by golden angle per rank
      const originalAngle = Math.atan2(avgPos.y - cy, avgPos.x - cx);
      baseAngle = originalAngle + (i * goldenAngle * 0.3); // gentle spiral from original angle
    } else {
      baseAngle = i * goldenAngle;
    }

    result.set(nodeId, {
      x: center.x + radius * Math.cos(baseAngle),
      y: center.y + radius * Math.sin(baseAngle),
    });
  }

  return result;
}
