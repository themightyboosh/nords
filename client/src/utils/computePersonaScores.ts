/**
 * Persona Lens — Scoring & Radial Layout
 *
 * SCORING:  Sum the persona weight of each UNIQUE connection type touching
 *           a node, then normalize the raw sums across all nodes to [-1,+1].
 *
 * LAYOUT:   Category rings (one per unique weight level) as concentric
 *           background circles, colored green→blue→red. Nodes placed at
 *           radii proportional to their normalized score.
 */

import type { Connection } from '../hooks/useProjectGraph';

// ── Public types ──

export interface PersonaNodeScore {
  score: number;   // normalized [-1, +1]
  rank: number;    // 0 (lowest) → 1 (highest)
}

export interface CategoryRing {
  labels: string[];    // category name(s) sharing this ring
  weight: number;      // persona weight for this ring
  radius: number;      // outer radius of the filled circle
  color: string;       // CSS background color (semi-transparent)
  showBorder: boolean; // true for the ring closest to weight=0
}

export interface RadialLayoutResult {
  positions: Map<string, { x: number; y: number }>;
  maxRadius: number;
  neutralRadius: number;
  rings: CategoryRing[];
}

export interface CategoryInfo {
  name: string;
  weight: number;
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

  // Normalize to [-1, +1]
  let minRaw = Infinity, maxRaw = -Infinity;
  for (const v of rawScores.values()) {
    if (v < minRaw) minRaw = v;
    if (v > maxRaw) maxRaw = v;
  }
  const range = maxRaw - minRaw || 1;

  const result = new Map<string, PersonaNodeScore>();
  const entries: Array<{ id: string; score: number }> = [];

  for (const [id, raw] of rawScores) {
    const norm = ((raw - minRaw) / range) * 2 - 1;   // [-1, +1]
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

// ── Color helpers ──

/** Map a persona weight to a color: +100→green, 0→blue, -100→red */
function weightToColor(weight: number, alpha = 0.2): string {
  let hue: number;
  if (weight >= 0) {
    // green (140°) → blue (220°)
    hue = 140 + ((100 - weight) / 100) * 80;
  } else {
    // blue (220°) → red (360°)
    hue = 220 + ((-weight) / 100) * 140;
  }
  return `hsla(${Math.round(hue)}, 45%, 22%, ${alpha})`;
}

// ── Radial layout ──

export function computeRadialPositions(
  scores: Map<string, PersonaNodeScore>,
  categories: CategoryInfo[],
  center: { x: number; y: number },
  cardWidth = 270,
  cardHeight = 120,
): RadialLayoutResult {
  const total = scores.size;
  if (total === 0) {
    return { positions: new Map(), maxRadius: 0, neutralRadius: 0, rings: [] };
  }

  // ── Layout constants ──
  const innerRadius = 200;
  const arcSpacing  = cardWidth + 30;
  const bandGap     = cardHeight + 40;
  const BAND_W      = 0.15;

  // ── Build category rings ──
  // Group categories by weight (merge same-bias), sort high→low
  const weightGroups = new Map<number, string[]>();
  for (const c of categories) {
    const w = c.weight;
    if (!weightGroups.has(w)) weightGroups.set(w, []);
    weightGroups.get(w)!.push(c.name);
  }
  const sortedWeights = [...weightGroups.keys()].sort((a, b) => b - a); // high first
  const ringCount = sortedWeights.length || 1;

  // Radial span: enough for all orbit bands + breathing room
  const minSpanForBands = Math.max(8, total) * bandGap * 0.3;
  const span = Math.max(600, minSpanForBands);
  const outerRadius = innerRadius + span;

  // Build ring definitions — equidistant, from inner to outer
  // Each ring's radius = its outer boundary (filled circle from center)
  const ringStep = span / ringCount;
  const rings: CategoryRing[] = [];

  // Find which ring is closest to weight=0 for the border
  const closestToZeroIdx = sortedWeights.length > 0
    ? sortedWeights.reduce((best, w, i) =>
        Math.abs(w) < Math.abs(sortedWeights[best]) ? i : best, 0)
    : -1;

  for (let i = 0; i < ringCount; i++) {
    const w = sortedWeights[i];
    const labels = weightGroups.get(w) || [];
    // Ring i=0 is innermost (highest weight), i=ringCount-1 is outermost
    const radius = innerRadius + ringStep * (i + 1);
    rings.push({
      labels,
      weight: w,
      radius,
      color: weightToColor(w, 0.18),
      showBorder: i === closestToZeroIdx,
    });
  }

  // ── Score → target radius ──
  // +1 → innerRadius, -1 → outerRadius (linear)
  const scoreToRadius = (s: number): number => {
    const t = (1 - s) / 2;   // 0 at +1, 0.5 at 0, 1.0 at -1
    return innerRadius + t * span;
  };

  // Neutral radius (where score=0 maps)
  const neutralRadius = scoreToRadius(0);

  // ── Group nodes into orbit bands ──
  const bandMap = new Map<number, string[]>();
  for (const [id, { score }] of scores) {
    const key = Math.round(score / BAND_W) * BAND_W;
    if (!bandMap.has(key)) bandMap.set(key, []);
    bandMap.get(key)!.push(id);
  }

  const bands = [...bandMap.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([score, ids]) => ({ score, ids }));

  // ── Assign orbit radii ──
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

  // ── Max radius ──
  const lastR = orbitRadii.length > 0 ? orbitRadii[orbitRadii.length - 1] : outerRadius;
  const diag = Math.sqrt(cardWidth ** 2 + cardHeight ** 2);
  const maxRadius = Math.max(lastR, outerRadius) + diag / 2 + 50;

  return { positions, maxRadius, neutralRadius, rings };
}
