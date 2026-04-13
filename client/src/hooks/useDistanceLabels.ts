/**
 * useDistanceLabels — Computes resolved stage labels for connections.
 *
 * When a connection type is active in the lens, this hook:
 * 1. Computes the bounding rect of all connected nords for that type
 * 2. Normalizes each connection's distance within the bounding rect (0.0–1.0)
 * 3. Resolves the normalized distance to the nearest stage label
 *
 * The result is a Map<edgeId, { normalizedX, normalizedY, labelX, labelY }>.
 *
 * Supports both spectrum (1D) and quadrant (2D) modes.
 */

import { useMemo } from 'react';
import { useStore } from '@xyflow/react';

interface DistanceLabelResult {
  /** Normalized distance 0–1 on X axis */
  normalizedX: number;
  /** Normalized distance 0–1 on Y axis */
  normalizedY: number;
  /** Resolved X-axis stage label (or null if no labels defined) */
  labelX: string | null;
  /** Resolved Y-axis stage label (or null if no labels/not quadrant) */
  labelY: string | null;
  /** Combined display string */
  displayLabel: string;
}

interface UseDistanceLabelsOptions {
  /** Connection type ID to compute for */
  activeTypeId: string | null;
  /** Measurement mode of the active type */
  mode: 'spectrum' | 'quadrant' | 'none';
  /** Stage labels for X axis */
  xLabels: string[];
  /** Stage labels for Y axis (quadrant only) */
  yLabels: string[];
}

export function useDistanceLabels({
  activeTypeId,
  mode,
  xLabels,
  yLabels,
}: UseDistanceLabelsOptions): Map<string, DistanceLabelResult> {
  // Subscribe to all edges + node positions reactively
  const edges = useStore((s) => s.edges);
  const nodeLookup = useStore((s) => s.nodeLookup);

  return useMemo(() => {
    const results = new Map<string, DistanceLabelResult>();
    
    if (!activeTypeId || mode === 'none') return results;

    // Filter edges belonging to this connection type
    const typeEdges = edges.filter(e => (e.data as any)?._typeId === activeTypeId);
    if (typeEdges.length === 0) return results;

    // Collect all involved node positions (centers)
    const nodePositions = new Map<string, { cx: number; cy: number }>();
    for (const edge of typeEdges) {
      for (const nodeId of [edge.source, edge.target]) {
        if (nodePositions.has(nodeId)) continue;
        const node = nodeLookup.get(nodeId);
        if (!node) continue;
        const w = node.measured?.width ?? 200;
        const h = node.measured?.height ?? 60;
        nodePositions.set(nodeId, {
          cx: (node.position?.x ?? 0) + w / 2,
          cy: (node.position?.y ?? 0) + h / 2,
        });
      }
    }

    // Compute bounding rectangle of all involved nodes
    const allPositions = Array.from(nodePositions.values());
    if (allPositions.length < 2) return results;

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of allPositions) {
      if (p.cx < minX) minX = p.cx;
      if (p.cx > maxX) maxX = p.cx;
      if (p.cy < minY) minY = p.cy;
      if (p.cy > maxY) maxY = p.cy;
    }

    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;

    // Compute normalized distance for each edge
    for (const edge of typeEdges) {
      const srcPos = nodePositions.get(edge.source);
      const tgtPos = nodePositions.get(edge.target);
      if (!srcPos || !tgtPos) continue;

      let normalizedX: number;
      let normalizedY: number;

      if (mode === 'spectrum') {
        // 1D: Euclidean distance normalized within bounding rect diagonal
        const dx = tgtPos.cx - srcPos.cx;
        const dy = tgtPos.cy - srcPos.cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxDist = Math.sqrt(rangeX * rangeX + rangeY * rangeY);
        normalizedX = maxDist > 0 ? dist / maxDist : 0;
        normalizedY = 0;
      } else {
        // 2D quadrant: independent X/Y deltas
        normalizedX = Math.abs(tgtPos.cx - srcPos.cx) / rangeX;
        normalizedY = Math.abs(tgtPos.cy - srcPos.cy) / rangeY;
      }

      // Resolve to nearest stage label
      const labelX = resolveLabel(normalizedX, xLabels);
      const labelY = mode === 'quadrant' ? resolveLabel(normalizedY, yLabels) : null;

      // Build display string
      let displayLabel = '';
      if (labelX) {
        displayLabel = labelX;
        if (labelY) displayLabel += ` / ${labelY}`;
      }

      results.set(edge.id, { normalizedX, normalizedY, labelX, labelY, displayLabel });
    }

    return results;
  }, [activeTypeId, mode, xLabels, yLabels, edges, nodeLookup]);
}

/**
 * Resolve a 0–1 normalized value to the nearest stage label.
 * Labels are evenly distributed across the 0–1 range.
 */
function resolveLabel(value: number, labels: string[]): string | null {
  if (!labels || labels.length === 0) return null;
  if (labels.length === 1) return labels[0];

  // Evenly space labels across 0–1 range
  const index = Math.round(value * (labels.length - 1));
  return labels[Math.max(0, Math.min(labels.length - 1, index))];
}
