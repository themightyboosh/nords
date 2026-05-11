/**
 * computePersonaScores — Per-node relevance scoring for the Persona Lens.
 *
 * SCORING MODEL:
 *   Each connection contributes its type's persona weight to both endpoints.
 *   Node score = average persona-weight across all connections.
 *   Unset type weights default to 0.
 *
 *   score range: -100 to +100, normalized to [-1, +1]
 *
 * LAYOUT MODEL (direct score → radius mapping):
 *   +1.0 (score +100) → innerRadius  (closest to center avatar)
 *    0.0 (score 0)    → neutralRadius (green circle perimeter)
 *   -1.0 (score -100) → outerRadius  (red circle perimeter)
 *
 *   Nodes at similar scores form "orbits" distributed evenly around
 *   the circumference. If an orbit has too many nodes, the radius
 *   expands and subsequent orbits shift outward to maintain gaps.
 */

import type { Connection } from '../hooks/useProjectGraph';

export interface PersonaNodeScore {
  /** Normalized score: -1.0 to +1.0 */
  score: number;
  /** Rank 0.0 (lowest score) → 1.0 (highest score) */
  rank: number;
}

export interface RadialLayoutResult {
  positions: Map<string, { x: number; y: number }>;
  /** Red zone radius — outermost boundary, where score -100 sits */
  maxRadius: number;
  /** Green zone radius — where score 0 sits */
  neutralRadius: number;
}

/**
 * Score every node by averaging the persona weights of its connections.
 * Unset weights default to 0.
 */
export function computePersonaScores(
  connections: Connection[],
  weights: Map<string, number>,
  _totalCategories: number,
): Map<string, PersonaNodeScore> {
  const sums = new Map<string, number>();
  const counts = new Map<string, number>();

  for (const conn of connections) {
    const w = weights.get(conn.type_id) ?? 0; // unset = 0
    for (const nid of [conn.source_nord_id, conn.target_nord_id]) {
      sums.set(nid, (sums.get(nid) ?? 0) + w);
      counts.set(nid, (counts.get(nid) ?? 0) + 1);
    }
  }

  const entries: Array<{ id: string; score: number }> = [];
  for (const [id, s] of sums) {
    const avg = s / (counts.get(id) || 1);          // [-100, +100]
    const norm = Math.max(-1, Math.min(1, avg / 100)); // [-1, +1]
    entries.push({ id, score: norm });
  }

  entries.sort((a, b) => a.score - b.score);
  const n = entries.length;
  const result = new Map<string, PersonaNodeScore>();
  for (let i = 0; i < n; i++) {
    result.set(entries[i].id, {
      score: entries[i].score,
      rank: n > 1 ? i / (n - 1) : 0.5,
    });
  }
  return result;
}

/**
 * Place nodes radially: score maps directly to orbit radius.
 *
 * Algorithm:
 *  1. Group nodes into orbit bands by score (band width ≈ 0.15).
 *  2. Compute an ideal radius per band via linear interpolation
 *     from score to [innerRadius, outerRadius].
 *  3. Walk bands from highest score → lowest, ensuring each orbit
 *     is large enough for its node count and separated from the
 *     previous orbit by at least `bandGap`.
 *  4. Distribute nodes evenly around each orbit.
 *  5. Derive zone circle radii from the actual layout.
 */
export function computeRadialPositions(
  scores: Map<string, PersonaNodeScore>,
  _avgPos: Map<string, { x: number; y: number }>,
  center: { x: number; y: number },
  cardWidth = 270,
  cardHeight = 120,
): RadialLayoutResult {
  const total = scores.size;
  if (total === 0) return { positions: new Map(), maxRadius: 0, neutralRadius: 0 };

  // ── constants ──
  const innerRadius = 200;                   // avatar clearance
  const arcSpacing  = cardWidth + 30;        // gap between card centers on arc
  const bandGap     = cardHeight + 40;       // min radial gap between orbits
  const BAND_W      = 0.15;                  // score width per band (~15 pts)

  // ── 1. bucket nodes into orbit bands ──
  const bandMap = new Map<number, string[]>();
  for (const [id, { score }] of scores) {
    const key = Math.round(score / BAND_W) * BAND_W;
    if (!bandMap.has(key)) bandMap.set(key, []);
    bandMap.get(key)!.push(id);
  }

  // Sort bands high→low (center→edge)
  const bands = [...bandMap.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([score, ids]) => ({ score, ids }));

  // ── 2. compute ideal span ──
  // Span must be large enough that the largest band fits at its ideal radius
  // and all bands have room between them.
  const minSpanForBands = bands.length * bandGap;
  const span = Math.max(800, minSpanForBands, total * 14);
  const outerIdeal = innerRadius + span;

  // Ideal score→radius: +1→innerRadius, 0→mid, -1→outerIdeal
  const idealRadius = (s: number) => innerRadius + ((1 - s) / 2) * span;

  // ── 3. walk bands, assign actual orbit radii ──
  let prevR = 0;                             // track last used radius
  const orbitRadii: number[] = [];           // actual radius per band

  for (let b = 0; b < bands.length; b++) {
    const { score, ids } = bands[b];
    const fitR   = (ids.length * arcSpacing) / (2 * Math.PI);
    const ideal  = idealRadius(score);
    const minR   = prevR > 0 ? prevR + bandGap : innerRadius;
    const actual = Math.max(ideal, fitR, minR);
    orbitRadii.push(actual);
    prevR = actual;
  }

  // ── 4. place nodes ──
  const positions = new Map<string, { x: number; y: number }>();
  const halfW = cardWidth / 2;
  const halfH = cardHeight / 2;

  for (let b = 0; b < bands.length; b++) {
    const { ids } = bands[b];
    const r = orbitRadii[b];
    const slotAngle = (2 * Math.PI) / ids.length;
    const offset = b * 0.4;                  // deterministic angular jitter

    for (let j = 0; j < ids.length; j++) {
      const a = offset + j * slotAngle;
      positions.set(ids[j], {
        x: center.x + r * Math.cos(a) - halfW,
        y: center.y + r * Math.sin(a) - halfH,
      });
    }
  }

  // ── 5. derive zone radii ──
  const lastR = orbitRadii[orbitRadii.length - 1] || innerRadius;
  const diag  = Math.sqrt(cardWidth ** 2 + cardHeight ** 2);
  const maxRadius = lastR + diag / 2 + 50;  // red circle edge

  // Green circle: interpolate where score=0 falls among the actual orbits
  let neutralRadius: number;
  const allPositive = bands.every(b => b.score > 0);
  const allNegative = bands.every(b => b.score <= 0);

  if (allPositive) {
    neutralRadius = maxRadius;               // everything positive → green covers all
  } else if (allNegative) {
    neutralRadius = innerRadius * 0.6;       // everything negative → tiny green
  } else {
    // Find the boundary where score crosses 0
    let found = false;
    for (let i = 0; i < bands.length - 1; i++) {
      if (bands[i].score >= 0 && bands[i + 1].score < 0) {
        const s1 = bands[i].score, s2 = bands[i + 1].score;
        const r1 = orbitRadii[i], r2 = orbitRadii[i + 1];
        const t = (0 - s1) / (s2 - s1);
        neutralRadius = r1 + t * (r2 - r1);
        found = true;
        break;
      }
    }
    if (!found) neutralRadius = (innerRadius + lastR) / 2;
  }

  return { positions, maxRadius, neutralRadius: neutralRadius! };
}
