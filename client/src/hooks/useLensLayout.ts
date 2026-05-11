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
 * - "Persona Lens" computes WEIGHTED positions using signed displacement from
 *   the centroid. Positive weights attract; negative weights repel.
 *
 * Animation: cubic ease-in-out over 350ms via requestAnimationFrame.
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
 * @param personaWeights - Optional persona category weights for persona lens mode
 */
export function useLensLayout(
  activeTypeId: string | null,
  relevanceNodes: { id: string; position: { x: number; y: number } }[],
  personaWeights?: Map<string, number> | null
) {
  const reactFlow = useReactFlow();
  const rafRef = useRef<number>(0);
  const prevTypeRef = useRef<string | null | undefined>(undefined);
  const prevPersonaWeightsRef = useRef<string>('');

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

  /**
   * Compute persona-weighted positions using signed displacement from centroid.
   *
   * Math:
   *   C(n) = Σ P_i(n) / |T|                           — unweighted centroid
   *   D(n) = Σ (w_i/100 × (P_i(n) - C(n))) / |T|     — signed displacement
   *   Final(n) = C(n) + D(n)
   *
   * Positive weights attract toward that type's layout.
   * Negative weights repel away from that type's layout.
   * Zero weights = neutral = same as All Lines.
   */
  const computePersonaPositions = useCallback((
    weights: Map<string, number>  // connectionTypeId → weight (-100..+100)
  ): PositionMap => {
    // Pre-populate: ensure all types with weights have cached positions
    for (const typeId of weights.keys()) {
      if (!typeCacheRef.current.has(typeId)) {
        typeCacheRef.current.set(typeId, computeTypePositions(typeId));
      }
    }

    // Also ensure any existing cached types are included
    const allTypeIds = new Set([...typeCacheRef.current.keys(), ...weights.keys()]);

    const allNodeIds = new Set<string>();
    for (const posMap of typeCacheRef.current.values()) {
      for (const nodeId of posMap.keys()) allNodeIds.add(nodeId);
    }
    for (const nodeId of relevanceMapRef.current.keys()) allNodeIds.add(nodeId);

    const result = new Map<string, { x: number; y: number }>();
    const typeIds = [...allTypeIds].filter(id => typeCacheRef.current.has(id));

    for (const nodeId of allNodeIds) {
      // Collect positions from all types that have this node
      const typePositions: { typeId: string; x: number; y: number }[] = [];
      for (const typeId of typeIds) {
        const pos = typeCacheRef.current.get(typeId)?.get(nodeId);
        if (pos) typePositions.push({ typeId, ...pos });
      }

      if (typePositions.length === 0) {
        // No type positions → fall back to DB relevance position
        const rel = relevanceMapRef.current.get(nodeId);
        if (rel) result.set(nodeId, { x: rel.x, y: rel.y });
        continue;
      }

      // Step 1: Unweighted centroid
      const cx = typePositions.reduce((s, p) => s + p.x, 0) / typePositions.length;
      const cy = typePositions.reduce((s, p) => s + p.y, 0) / typePositions.length;

      // Step 2: Signed displacement from centroid
      let dx = 0, dy = 0;
      for (const tp of typePositions) {
        const w = (weights.get(tp.typeId) ?? 0) / 100;  // normalize to -1..+1
        dx += w * (tp.x - cx);
        dy += w * (tp.y - cy);
      }
      dx /= typePositions.length;
      dy /= typePositions.length;

      // Clamp displacement to prevent extreme layouts (2× centroid spread)
      const maxDisplacement = 500;
      const mag = Math.sqrt(dx * dx + dy * dy);
      if (mag > maxDisplacement) {
        const scale = maxDisplacement / mag;
        dx *= scale;
        dy *= scale;
      }

      // Step 3: Final position
      result.set(nodeId, { x: cx + dx, y: cy + dy });
    }

    return result;
  }, [computeTypePositions]);

  // ── Animate to persona-weighted positions when weights change ──
  const animateToPositions = useCallback((targetPositions: PositionMap) => {
    const currentNodes = reactFlow.getNodes();
    if (currentNodes.length === 0) return;

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

    // Viewport check: only animate nodes near the visible area
    const { x: vpX, y: vpY, zoom: vpZoom } = reactFlow.getViewport();
    const vpWidth = (window.innerWidth || 1200) / vpZoom;
    const vpHeight = (window.innerHeight || 800) / vpZoom;
    const vpLeft = -vpX / vpZoom;
    const vpTop = -vpY / vpZoom;
    const margin = 500;

    const visibleTargets = new Map<string, PositionTarget>();
    const instantTargets = new Map<string, PositionTarget>();

    for (const [id, target] of targets) {
      const inViewport = (
        (target.fromX > vpLeft - margin && target.fromX < vpLeft + vpWidth + margin &&
         target.fromY > vpTop - margin && target.fromY < vpTop + vpHeight + margin) ||
        (target.toX > vpLeft - margin && target.toX < vpLeft + vpWidth + margin &&
         target.toY > vpTop - margin && target.toY < vpTop + vpHeight + margin)
      );
      if (inViewport) {
        visibleTargets.set(id, target);
      } else {
        instantTargets.set(id, target);
      }
    }

    // Jump off-screen nodes instantly
    if (instantTargets.size > 0) {
      reactFlow.setNodes(nds =>
        nds.map(n => {
          const target = instantTargets.get(n.id);
          if (!target) return n;
          return { ...n, position: { x: target.toX, y: target.toY } };
        })
      );
    }

    // Animate visible nodes
    if (visibleTargets.size === 0) return;

    cancelAnimationFrame(rafRef.current);
    const startTime = performance.now();

    function animate() {
      const elapsed = performance.now() - startTime;
      const t = Math.min(1, elapsed / ANIM_DURATION);
      const ease = t < 0.5
        ? 4 * t * t * t
        : 1 - Math.pow(-2 * t + 2, 3) / 2;

      reactFlow.setNodes(nds =>
        nds.map(n => {
          const target = visibleTargets.get(n.id);
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
  }, [reactFlow]);

  // ── Jump nodes to positions instantly (no animation — used during slider drag) ──
  const jumpToPositions = useCallback((targetPositions: PositionMap) => {
    cancelAnimationFrame(rafRef.current);
    reactFlow.setNodes(nds =>
      nds.map(n => {
        const to = targetPositions.get(n.id);
        if (!to) return n;
        return { ...n, position: { x: to.x, y: to.y } };
      })
    );
  }, [reactFlow]);

  // ── Connection type transition (existing behavior) ──
  useEffect(() => {
    // Skip persona mode — handled separately
    if (personaWeights) return;

    if (prevTypeRef.current === undefined) {
      prevTypeRef.current = activeTypeId;
      return;
    }
    if (prevTypeRef.current === activeTypeId) return;

    // Snapshot current positions into the PREVIOUS type's cache before switching
    snapshotCurrentPositions(prevTypeRef.current);
    prevTypeRef.current = activeTypeId;

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

    animateToPositions(targetPositions);
  }, [activeTypeId, personaWeights, reactFlow, snapshotCurrentPositions, computeAveragedPositions, computeTypePositions, animateToPositions]);

  // ── Persona weight transition ──
  // NOTE: Spatial displacement is disabled. Persona lens now uses
  // CSS opacity/grayscale via computePersonaScores (in CanvasEngine).
  // This avoids expensive position recomputation on every slider tick.
  // The computePersonaPositions function is retained for potential future use.
  useEffect(() => {
    if (!personaWeights) {
      prevPersonaWeightsRef.current = '';
    }
  }, [personaWeights]);

  return { saveNodePosition, computePersonaPositions, jumpToPositions, animateToPositions };
}
