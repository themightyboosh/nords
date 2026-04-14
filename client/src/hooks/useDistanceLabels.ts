/**
 * useDistanceLabels — Resolves spatial distances to human-readable stage labels.
 *
 * For each edge in the React Flow store, computes the normalized distance
 * between its source and target nodes, then resolves it to the nearest
 * stage label defined on the connection type.
 *
 * Usage:
 *   const { getEdgeLabel } = useDistanceLabels();
 *   const label = getEdgeLabel(edgeId); // "Critical" | null
 *
 * Performance:
 *   - Only recomputes when nodes or edges change
 *   - Uses the type registry for label definitions (memoized)
 *   - O(E) per recompute where E = edge count
 */

import { useMemo } from 'react';
import { useStore } from '@xyflow/react';
import { useTypeRegistryContext } from '../context/TypeRegistryContext';
import { resolveStageLabel } from '../utils/stageLabels';
import type { StageLabel } from './useProjectGraph';

interface EdgeLabelResult {
  label: string | null;
  distance: number;
}

export function useDistanceLabels() {
  const { connectionTypes } = useTypeRegistryContext();

  // Build a lookup: typeId → StageLabel[]
  const typeLabelMap = useMemo(() => {
    const map = new Map<string, StageLabel[]>();
    for (const ct of connectionTypes) {
      if (ct.xStageLabels.length > 0) {
        map.set(ct.id, ct.xStageLabels);
      }
    }
    return map;
  }, [connectionTypes]);

  // Subscribe to node positions and edge data
  const edgeLabelMap = useStore((s) => {
    const result = new Map<string, EdgeLabelResult>();

    for (const [edgeId, edge] of s.edgeLookup) {
      const typeId = (edge.data as any)?._typeId;
      if (!typeId) continue;

      const labels = typeLabelMap.get(typeId);
      if (!labels || labels.length === 0) {
        result.set(edgeId, { label: null, distance: 0 });
        continue;
      }

      // Get the stored distance from edge data (already normalized 0-1)
      const distanceX = (edge.data as any)?._distanceX ?? 0.5;

      const resolved = resolveStageLabel(distanceX, labels);
      result.set(edgeId, { label: resolved, distance: distanceX });
    }

    return result;
  });

  const getEdgeLabel = (edgeId: string): string | null => {
    return edgeLabelMap.get(edgeId)?.label ?? null;
  };

  const getEdgeDistance = (edgeId: string): number => {
    return edgeLabelMap.get(edgeId)?.distance ?? 0;
  };

  return { getEdgeLabel, getEdgeDistance, edgeLabelMap };
}
