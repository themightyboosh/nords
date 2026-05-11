/**
 * computePersonaScores — Per-node relevance scoring for the Persona Lens.
 *
 * For each node, sums the persona's category weights across ALL connection
 * types that link to that node. Normalizes by the theoretical max
 * (numCategories × 100) so every node gets a score in [-1.0, +1.0].
 *
 * Visual mapping:
 *   +1.0 → 100% opacity, full color  (most relevant)
 *    0.0 → 50% opacity, color/gray boundary
 *   -1.0 → 50% opacity, full grayscale (least relevant)
 */

import type { Connection } from '../hooks/useProjectGraph';

export interface PersonaNodeScore {
  /** Normalized score: -1.0 to +1.0 */
  score: number;
  /** CSS opacity: 0.5 to 1.0 */
  opacity: number;
  /** CSS grayscale filter: 0 (colored) or 1 (gray) */
  grayscale: number;
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
  // A node that participates in every category at +100 would score totalCategories × 100
  const theoreticalMax = Math.max(totalCategories * 100, 1); // avoid /0

  // Step 1: Accumulate raw scores per node
  // For each connection, BOTH source and target get the weight of that category
  const rawScores = new Map<string, number>();

  for (const conn of connections) {
    const w = weights.get(conn.type_id) ?? 0;
    if (w === 0) continue; // neutral categories don't affect score

    rawScores.set(conn.source_nord_id, (rawScores.get(conn.source_nord_id) ?? 0) + w);
    rawScores.set(conn.target_nord_id, (rawScores.get(conn.target_nord_id) ?? 0) + w);
  }

  // Step 2: Normalize and compute visual properties
  const result = new Map<string, PersonaNodeScore>();

  for (const [nordId, rawScore] of rawScores.entries()) {
    // Clamp to theoretical range and normalize to -1..+1
    const clamped = Math.max(-theoreticalMax, Math.min(theoreticalMax, rawScore));
    const normalized = clamped / theoreticalMax;

    result.set(nordId, scoreToVisuals(normalized));
  }

  return result;
}

/**
 * Convert a normalized score (-1..+1) to visual properties.
 *
 * Positive (0 → +1): colored, opacity 50% → 100%
 * Negative (-1 → 0): grayscale, opacity 50% → 100%
 *
 * The zero crossing creates a clear visual break:
 *   colored at 50% opacity  ←→  gray at 100% opacity
 */
export function scoreToVisuals(normalized: number): PersonaNodeScore {
  if (normalized >= 0) {
    return {
      score: normalized,
      opacity: 0.5 + 0.5 * normalized,  // 0.5 → 1.0
      grayscale: 0,                       // full color
    };
  } else {
    return {
      score: normalized,
      opacity: 0.5 + 0.5 * Math.abs(normalized),  // 0.5 → 1.0
      grayscale: 1,                                 // full gray
    };
  }
}
