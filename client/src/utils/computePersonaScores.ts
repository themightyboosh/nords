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
  /** Contrast-safe text color for the heatmap background */
  textColor: string;
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
    const { bg, text } = scoreToHeatColors(normalized);

    result.set(id, {
      score: normalized,
      heatColor: bg,
      textColor: text,
      rank,
    });
  }

  return result;
}

/**
 * Convert a normalized score (-1..+1) to heatmap background + contrast text color.
 *
 * Background: green → yellow → red (HSL interpolation)
 * Text: dark on light backgrounds, light on dark backgrounds
 *
 * Uses relative luminance to decide text contrast:
 *   luminance > 0.45 → dark text (#1a1a2e)
 *   luminance ≤ 0.45 → light text (#fff)
 */
export function scoreToHeatColors(normalized: number): { bg: string; text: string } {
  const t = (normalized + 1) / 2; // 0 = red, 0.5 = yellow, 1.0 = green

  let h: number, s: number, l: number;

  if (t >= 0.5) {
    // Yellow → Green
    const p = (t - 0.5) * 2;
    h = 48 + p * (142 - 48);
    s = 96 - p * (96 - 71);
    l = 53 - p * (53 - 45);
  } else {
    // Red → Yellow
    const p = t * 2;
    h = 0 + p * 48;
    s = 84 + p * (96 - 84);
    l = 60 - p * (60 - 53);
  }

  const bg = `hsl(${Math.round(h)}, ${Math.round(s)}%, ${Math.round(l)}%)`;

  // Compute relative luminance from HSL to pick text color
  const luminance = hslToRelativeLuminance(h, s, l);
  const text = luminance > 0.35 ? '#1a1a2e' : '#ffffff';

  return { bg, text };
}

/**
 * Convert HSL to relative luminance (0-1).
 * Uses sRGB → linear → WCAG luminance formula.
 */
function hslToRelativeLuminance(h: number, s: number, l: number): number {
  // HSL → RGB
  const sNorm = s / 100;
  const lNorm = l / 100;
  const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lNorm - c / 2;

  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }

  r += m; g += m; b += m;

  // sRGB → linear
  const toLinear = (v: number) => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/**
 * Compute radial positions using concentric rings.
 *
 * Strategy:
 *   1. Sort nodes by score descending (best → worst)
 *   2. Assign to concentric rings, each ring holding more nodes than the last
 *   3. Within each ring, distribute nodes evenly by angle
 *   4. First ring starts at an angular offset for visual variety
 *
 * Ring capacity follows: ring 0 = 1, ring 1 = 6, ring 2 = 12, ring 3 = 18...
 * This creates a natural density gradient: high-value nodes are uncrowded,
 * low-value nodes share space in wider rings.
 */
export function computeRadialPositions(
  scores: Map<string, PersonaNodeScore>,
  _averagedPositions: Map<string, { x: number; y: number }>,
  center: { x: number; y: number },
  minRadius: number = 250,
  maxRadius: number = 1000,
): Map<string, { x: number; y: number }> {
  const sorted = [...scores.entries()].sort((a, b) => b[1].score - a[1].score);
  const totalNodes = sorted.length;
  if (totalNodes === 0) return new Map();

  // Build ring capacities: [1, 6, 12, 18, 24, ...]
  // First ring is special (1 node, closest to center)
  const ringCapacities: number[] = [];
  let placed = 0;
  let ringIdx = 0;

  while (placed < totalNodes) {
    const capacity = ringIdx === 0 ? 1 : ringIdx * 6;
    ringCapacities.push(Math.min(capacity, totalNodes - placed));
    placed += capacity;
    ringIdx++;
  }

  const totalRings = ringCapacities.length;
  const result = new Map<string, { x: number; y: number }>();
  let nodeIdx = 0;

  for (let ring = 0; ring < totalRings; ring++) {
    const nodesInRing = ringCapacities[ring];

    // Radius: lerp between min and max based on ring position
    const ringT = totalRings > 1 ? ring / (totalRings - 1) : 0;
    const radius = minRadius + ringT * (maxRadius - minRadius);

    // Angular offset per ring — stagger rings so nodes don't align radially
    const ringOffset = ring * 0.4;

    for (let j = 0; j < nodesInRing; j++) {
      if (nodeIdx >= sorted.length) break;
      const [nodeId] = sorted[nodeIdx];

      // Even angular distribution within the ring
      const angle = ringOffset + (j / nodesInRing) * Math.PI * 2;

      result.set(nodeId, {
        x: center.x + radius * Math.cos(angle),
        y: center.y + radius * Math.sin(angle),
      });

      nodeIdx++;
    }
  }

  return result;
}
