/**
 * Persona Lens — Sum-based Scoring & Simple Radial Layout
 *
 * SCORING:  Sum the persona weight of each UNIQUE connection type touching
 *           a node, then normalize across all nodes to [-1,+1].
 *
 * LAYOUT:   Highest score → closest to center, lowest → outermost.
 *           Green circle = where raw sum 0 falls (the true neutral).
 *           Red circle = outermost boundary.
 */

import type { Connection } from '../hooks/useProjectGraph';

export interface PersonaNodeScore {
  score: number;   // normalized [-1, +1]
  rank: number;
}

export interface RadialLayoutResult {
  positions: Map<string, { x: number; y: number }>;
  maxRadius: number;
  /** Radius where raw-sum=0 maps — the true neutral boundary */
  neutralRadius: number;
}

// ── Scoring ──

export function computePersonaScores(
  connections: Connection[],
  weights: Map<string, number>,
  _totalCategories: number,
): Map<string, PersonaNodeScore> {
  // Collect unique connection types per node
  const nodeTypes = new Map<string, Set<string>>();
  for (const conn of connections) {
    for (const nid of [conn.source_nord_id, conn.target_nord_id]) {
      if (!nodeTypes.has(nid)) nodeTypes.set(nid, new Set());
      nodeTypes.get(nid)!.add(conn.type_id);
    }
  }

  // Raw score = SUM of unique type weights
  const rawScores = new Map<string, number>();
  for (const [nid, typeIds] of nodeTypes) {
    let sum = 0;
    for (const tid of typeIds) sum += weights.get(tid) ?? 0;
    rawScores.set(nid, sum);
  }

  // Find min/max for normalization
  let minRaw = Infinity, maxRaw = -Infinity;
  for (const v of rawScores.values()) {
    if (v < minRaw) minRaw = v;
    if (v > maxRaw) maxRaw = v;
  }
  const range = maxRaw - minRaw || 1;

  // Normalize to [-1, +1]
  const result = new Map<string, PersonaNodeScore>();
  const entries: Array<{ id: string; score: number }> = [];
  for (const [id, raw] of rawScores) {
    const norm = ((raw - minRaw) / range) * 2 - 1;
    entries.push({ id, score: norm });
  }

  entries.sort((a, b) => a.score - b.score);
  const n = entries.length;
  for (let i = 0; i < n; i++) {
    result.set(entries[i].id, {
      score: entries[i].score,
      rank: n > 1 ? i / (n - 1) : 0.5,
    });
  }

  return result;
}

/**
 * Where does raw-sum = 0 fall in the normalized [-1, +1] range?
 * Returns the normalized score that corresponds to a raw sum of 0.
 */
export function computeNeutralScore(
  connections: Connection[],
  weights: Map<string, number>,
): number {
  // Recompute min/max (lightweight — just sums)
  const nodeTypes = new Map<string, Set<string>>();
  for (const conn of connections) {
    for (const nid of [conn.source_nord_id, conn.target_nord_id]) {
      if (!nodeTypes.has(nid)) nodeTypes.set(nid, new Set());
      nodeTypes.get(nid)!.add(conn.type_id);
    }
  }
  let minRaw = Infinity, maxRaw = -Infinity;
  for (const [, typeIds] of nodeTypes) {
    let sum = 0;
    for (const tid of typeIds) sum += weights.get(tid) ?? 0;
    if (sum < minRaw) minRaw = sum;
    if (sum > maxRaw) maxRaw = sum;
  }
  const range = maxRaw - minRaw || 1;
  // Where does raw=0 normalize to?
  return ((0 - minRaw) / range) * 2 - 1;  // [-1, +1]
}

// ── Radial layout ──

export function computeRadialPositions(
  scores: Map<string, PersonaNodeScore>,
  neutralScore: number,
  center: { x: number; y: number },
  cardWidth = 270,
  cardHeight = 120,
): RadialLayoutResult {
  const total = scores.size;
  if (total === 0) return { positions: new Map(), maxRadius: 0, neutralRadius: 0 };

  const innerRadius = 200;
  const arcSpacing  = cardWidth + 20;
  const bandGap     = cardHeight + 20;   // tighter spacing
  const BAND_W      = 0.15;

  // ── Group nodes into orbit bands by score ──
  const bandMap = new Map<number, string[]>();
  for (const [id, { score }] of scores) {
    const key = Math.round(score / BAND_W) * BAND_W;
    if (!bandMap.has(key)) bandMap.set(key, []);
    bandMap.get(key)!.push(id);
  }

  const bands = [...bandMap.entries()]
    .sort((a, b) => b[0] - a[0])       // highest score first (center)
    .map(([score, ids]) => ({ score, ids }));

  // ── Compute span — compact ──
  const span = Math.max(500, bands.length * bandGap);
  const outerRadius = innerRadius + span;

  // Score → ideal radius: +1 → innerRadius, -1 → outerRadius
  const scoreToRadius = (s: number) => innerRadius + ((1 - s) / 2) * span;

  // ── Assign orbit radii (walk outward) ──
  let prevR = 0;
  const orbitRadii: number[] = [];

  for (const band of bands) {
    const fitR  = (band.ids.length * arcSpacing) / (2 * Math.PI);
    const ideal = scoreToRadius(band.score);
    const minR  = prevR > 0 ? prevR + bandGap : innerRadius;
    const actual = Math.max(ideal, fitR, minR);
    orbitRadii.push(actual);
    prevR = actual;
  }

  // ── Place nodes ──
  const positions = new Map<string, { x: number; y: number }>();
  const halfW = cardWidth / 2;
  const halfH = cardHeight / 2;

  for (let b = 0; b < bands.length; b++) {
    const { ids } = bands[b];
    const r = orbitRadii[b];
    const slotAngle = (2 * Math.PI) / ids.length;
    const offset = b * 0.4;

    for (let j = 0; j < ids.length; j++) {
      const a = offset + j * slotAngle;
      positions.set(ids[j], {
        x: center.x + r * Math.cos(a) - halfW,
        y: center.y + r * Math.sin(a) - halfH,
      });
    }
  }

  // ── Zone radii ──
  const lastR = orbitRadii.length > 0 ? orbitRadii[orbitRadii.length - 1] : outerRadius;
  const diag = Math.sqrt(cardWidth ** 2 + cardHeight ** 2);
  const maxRadius = lastR + diag / 2 + 40;

  // Green circle = where neutralScore maps
  const neutralRadius = scoreToRadius(neutralScore);

  return { positions, maxRadius, neutralRadius };
}
