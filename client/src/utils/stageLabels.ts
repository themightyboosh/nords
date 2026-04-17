/**
 * normalizeStageLabels — Converts legacy flat string arrays to positioned StageLabel objects.
 *
 * The DB may contain either:
 *   - Legacy: ["Low", "Medium", "High"]           → evenly distributed
 *   - Modern: [{ label: "Low", position: 0.2 }, ...] → pass through
 *
 * This normalizer ensures the UI always works with positioned objects.
 */

import type { StageLabel } from '../hooks/useProjectGraph';

export function normalizeStageLabels(raw: unknown): StageLabel[] {
  if (!Array.isArray(raw) || raw.length === 0) return [];

  // Already positioned objects
  if (typeof raw[0] === 'object' && raw[0] !== null && 'label' in raw[0] && 'position' in raw[0]) {
    return (raw as StageLabel[]).sort((a, b) => a.position - b.position);
  }

  // Legacy flat strings → distribute evenly across 0–1
  if (typeof raw[0] === 'string') {
    const strings = raw as string[];
    return strings.map((label, i) => ({
      label,
      position: strings.length === 1 ? 0.5 : i / (strings.length - 1),
    }));
  }

  return [];
}

/**
 * Resolve a 0–1 distance value to its nearest stage label.
 * Uses Voronoi midpoint boundaries between adjacent positions.
 */
export function resolveStageLabel(distance: number, labels: StageLabel[]): string | null {
  if (labels.length === 0) return null;
  if (labels.length === 1) return labels[0].label;

  const sorted = [...labels].sort((a, b) => a.position - b.position);

  for (let i = 0; i < sorted.length - 1; i++) {
    const boundary = (sorted[i].position + sorted[i + 1].position) / 2;
    if (distance <= boundary) return sorted[i].label;
  }

  return sorted[sorted.length - 1].label;
}

/**
 * Get the Voronoi [min, max] bounds for a column identified by its label.
 * The range extends from the midpoint between this label and its left neighbour
 * to the midpoint between this label and its right neighbour.
 * Edge columns extend to 0 or 1.
 */
export function getColumnBounds(label: string, labels: StageLabel[]): { min: number; max: number; center: number } {
  if (labels.length === 0) return { min: 0, max: 1, center: 0.5 };

  const sorted = [...labels].sort((a, b) => a.position - b.position);
  const idx = sorted.findIndex(l => l.label === label);
  if (idx === -1) return { min: 0, max: 1, center: 0.5 };

  const center = sorted[idx].position;
  const min = idx === 0
    ? 0
    : (sorted[idx - 1].position + center) / 2;
  const max = idx === sorted.length - 1
    ? 1
    : (center + sorted[idx + 1].position) / 2;

  return { min, max, center };
}
