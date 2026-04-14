/**
 * useLensLayout — Per-connection-type position persistence with animated transitions.
 *
 * POSITION MODEL:
 * - Each connection type has its OWN set of node positions, cached client-side.
 * - When a user drags a node while viewing a connection type, that position
 *   is saved for that type.
 * - Switching connection types animates to the cached positions for that type.
 *   If no cache exists yet, positions are computed from distance values.
 * - "All Lines (Relevance)" computes AVERAGED positions across all cached types.
 *   If no types have cached positions, the DB positions are used.
 *
 * Animation: cubic ease-in over 200ms via requestAnimationFrame.
 */

import { useEffect, useRef, useCallback } from 'react';
import { useReactFlow } from '@xyflow/react';

const ANIM_DURATION = 350; // ms — enough for the ease-out tail to land softly

interface PositionTarget {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
}

type PositionMap = Map<string, { x: number; y: number }>;

/**
 * @param activeTypeId - Currently selected connection type, or null for All Lines
 * @param relevanceNodes - The React Flow nodes with DB-stored relevance positions
 */
export function useLensLayout(
  activeTypeId: string | null,
  relevanceNodes: { id: string; position: { x: number; y: number } }[]
) {
  const reactFlow = useReactFlow();
  const rafRef = useRef<number>(0);
  const prevTypeRef = useRef<string | null | undefined>(undefined);

  // Per-type position cache: typeId → Map<nodeId, {x, y}>
  const typeCacheRef = useRef<Map<string, PositionMap>>(new Map());

  // DB relevance positions as fallback
  const relevanceMapRef = useRef<PositionMap>(new Map());

  // Update relevance map when source data changes
  useEffect(() => {
    if (relevanceNodes.length > 0) {
      const m = new Map<string, { x: number; y: number }>();
      for (const n of relevanceNodes) {
        m.set(n.id, { x: n.position.x, y: n.position.y });
      }
      relevanceMapRef.current = m;
    }
  }, [relevanceNodes]);

  // Save the current node positions into the active type's cache
  const snapshotCurrentPositions = useCallback((typeId: string | null) => {
    if (!typeId) return; // Don't cache "All Lines" — it's computed
    const currentNodes = reactFlow.getNodes();
    const posMap = new Map<string, { x: number; y: number }>();
    for (const n of currentNodes) {
      posMap.set(n.id, { x: n.position.x, y: n.position.y });
    }
    typeCacheRef.current.set(typeId, posMap);
  }, [reactFlow]);

  // Called from CanvasEngine on drag stop — saves node position to active type's cache
  const saveNodePosition = useCallback((nodeId: string, x: number, y: number, typeId: string | null) => {
    if (!typeId) return;
    let posMap = typeCacheRef.current.get(typeId);
    if (!posMap) {
      posMap = new Map();
      typeCacheRef.current.set(typeId, posMap);
    }
    posMap.set(nodeId, { x, y });
  }, []);

  // Compute averaged positions across ALL cached types for "All Lines"
  const computeAveragedPositions = useCallback((): PositionMap => {
    const allNodeIds = new Set<string>();
    for (const posMap of typeCacheRef.current.values()) {
      for (const nodeId of posMap.keys()) allNodeIds.add(nodeId);
    }
    // Also include relevance nodes
    for (const nodeId of relevanceMapRef.current.keys()) allNodeIds.add(nodeId);

    const typeCount = typeCacheRef.current.size;
    const averaged = new Map<string, { x: number; y: number }>();

    for (const nodeId of allNodeIds) {
      let sumX = 0, sumY = 0, count = 0;

      // Average across all cached type positions
      for (const posMap of typeCacheRef.current.values()) {
        const pos = posMap.get(nodeId);
        if (pos) {
          sumX += pos.x;
          sumY += pos.y;
          count++;
        }
      }

      if (count > 0 && typeCount > 0) {
        averaged.set(nodeId, { x: sumX / count, y: sumY / count });
      } else {
        // Fall back to DB relevance position
        const rel = relevanceMapRef.current.get(nodeId);
        if (rel) averaged.set(nodeId, { x: rel.x, y: rel.y });
      }
    }

    return averaged;
  }, []);

  // Compute initial positions for a connection type from distance values
  const computeTypePositions = useCallback((typeId: string): PositionMap => {
    const currentNodes = reactFlow.getNodes();
    const currentEdges = reactFlow.getEdges();
    const nodeMap = new Map(currentNodes.map(n => [n.id, n]));
    const typeEdges = currentEdges.filter(e => (e.data as any)?._typeId === typeId);
    const adjustments = new Map<string, { dx: number; dy: number; count: number }>();

    for (const edge of typeEdges) {
      const distX = (edge.data as any)?._distanceX ?? 0.5;
      const srcNode = nodeMap.get(edge.source);
      const tgtNode = nodeMap.get(edge.target);
      if (!srcNode || !tgtNode) continue;

      const srcRel = relevanceMapRef.current.get(edge.source) || srcNode.position;
      const tgtRel = relevanceMapRef.current.get(edge.target) || tgtNode.position;

      const relDx = tgtRel.x - srcRel.x;
      const relDy = tgtRel.y - srcRel.y;
      const relDist = Math.sqrt(relDx * relDx + relDy * relDy) || 1;

      const targetDist = 150 + distX * 550;
      const scale = targetDist / relDist;
      const shiftX = (relDx * scale - relDx) / 2;
      const shiftY = (relDy * scale - relDy) / 2;

      const srcAdj = adjustments.get(edge.source) || { dx: 0, dy: 0, count: 0 };
      srcAdj.dx -= shiftX;
      srcAdj.dy -= shiftY;
      srcAdj.count++;
      adjustments.set(edge.source, srcAdj);

      const tgtAdj = adjustments.get(edge.target) || { dx: 0, dy: 0, count: 0 };
      tgtAdj.dx += shiftX;
      tgtAdj.dy += shiftY;
      tgtAdj.count++;
      adjustments.set(edge.target, tgtAdj);
    }

    const positions = new Map<string, { x: number; y: number }>();
    for (const n of currentNodes) {
      const rel = relevanceMapRef.current.get(n.id) || n.position;
      const adj = adjustments.get(n.id);
      positions.set(n.id, {
        x: rel.x + (adj ? Math.max(-250, Math.min(250, adj.dx / adj.count)) : 0),
        y: rel.y + (adj ? Math.max(-250, Math.min(250, adj.dy / adj.count)) : 0),
      });
    }

    return positions;
  }, [reactFlow]);

  useEffect(() => {
    if (prevTypeRef.current === undefined) {
      prevTypeRef.current = activeTypeId;
      return;
    }
    if (prevTypeRef.current === activeTypeId) return;

    // Snapshot current positions into the PREVIOUS type's cache before switching
    snapshotCurrentPositions(prevTypeRef.current);
    prevTypeRef.current = activeTypeId;

    const currentNodes = reactFlow.getNodes();
    if (currentNodes.length === 0) return;

    // Determine target positions
    let targetPositions: PositionMap;

    if (!activeTypeId) {
      // "All Lines (Relevance)" — averaged across all types
      targetPositions = computeAveragedPositions();
    } else {
      // Check cache first
      const cached = typeCacheRef.current.get(activeTypeId);
      if (cached && cached.size > 0) {
        targetPositions = cached;
      } else {
        // Compute from distance values and cache
        targetPositions = computeTypePositions(activeTypeId);
        typeCacheRef.current.set(activeTypeId, targetPositions);
      }
    }

    // Build animation targets
    const targets = new Map<string, PositionTarget>();
    for (const n of currentNodes) {
      const to = targetPositions.get(n.id);
      if (!to) continue;
      if (Math.abs(n.position.x - to.x) > 1 || Math.abs(n.position.y - to.y) > 1) {
        targets.set(n.id, {
          fromX: n.position.x, fromY: n.position.y,
          toX: to.x, toY: to.y,
        });
      }
    }

    if (targets.size === 0) return;

    // Animate
    cancelAnimationFrame(rafRef.current);
    const startTime = performance.now();

    function animate() {
      const elapsed = performance.now() - startTime;
      const t = Math.min(1, elapsed / ANIM_DURATION);
      // Ease-in-out: smooth start AND smooth landing (matches spring feel)
      const ease = t < 0.5
        ? 4 * t * t * t
        : 1 - Math.pow(-2 * t + 2, 3) / 2;

      reactFlow.setNodes(nds =>
        nds.map(n => {
          const target = targets.get(n.id);
          if (!target) return n;
          return {
            ...n,
            position: {
              x: target.fromX + (target.toX - target.fromX) * ease,
              y: target.fromY + (target.toY - target.fromY) * ease,
            },
          };
        })
      );

      if (t < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    }

    rafRef.current = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(rafRef.current);
  }, [activeTypeId, reactFlow, snapshotCurrentPositions, computeAveragedPositions, computeTypePositions]);

  return { saveNodePosition };
}
