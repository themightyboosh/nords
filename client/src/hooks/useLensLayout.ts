/**
 * useLensLayout — Animates nodes between connection-type-specific layouts.
 *
 * POSITION MODEL:
 * - Node positions are COMPUTED, never manually dragged.
 * - The DB-stored position_x/position_y = "relevance" positions
 *   (equalized/averaged distances across ALL connection types).
 * - "All Lines (Relevance)" view shows these DB positions.
 * - Selecting a specific connection type computes a layout from
 *   that type's distance_x/distance_y values and animates to it.
 * - Switching back to All Lines animates back to the relevance positions.
 *
 * Animation: cubic ease-out over 400ms via requestAnimationFrame.
 */

import { useEffect, useRef } from 'react';
import { useReactFlow, useStore, type Edge } from '@xyflow/react';

const ANIM_DURATION = 400; // ms

interface PositionTarget {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
}

/**
 * @param activeTypeId - Currently selected connection type, or null for All Lines
 * @param relevanceNodes - The React Flow nodes with DB-stored relevance positions
 */
export function useLensLayout(
  activeTypeId: string | null,
  relevanceNodes: { id: string; position: { x: number; y: number } }[]
) {
  const reactFlow = useReactFlow();
  // Safe store access — returns empty array if store isn't initialized yet
  const edges = useStore((s) => s.edges ?? [], (a, b) => a === b) as Edge[];
  const rafRef = useRef<number>(0);
  const prevTypeRef = useRef<string | null | undefined>(undefined); // undefined = first render
  // Cache the relevance (DB) positions — stable reference keyed by node ID
  const relevanceMapRef = useRef<Map<string, { x: number; y: number }>>(new Map());

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

  useEffect(() => {
    // Skip first render (nodes need to mount first)
    if (prevTypeRef.current === undefined) {
      prevTypeRef.current = activeTypeId;
      return;
    }
    // Skip if type didn't change
    if (prevTypeRef.current === activeTypeId) return;
    prevTypeRef.current = activeTypeId;

    const currentNodes = reactFlow.getNodes();
    if (currentNodes.length === 0) return;

    let targets: Map<string, PositionTarget>;

    if (!activeTypeId) {
      // ── "All Lines (Relevance)" — animate back to DB positions ──
      targets = new Map();
      for (const n of currentNodes) {
        const rel = relevanceMapRef.current.get(n.id);
        if (rel && (Math.abs(n.position.x - rel.x) > 1 || Math.abs(n.position.y - rel.y) > 1)) {
          targets.set(n.id, {
            fromX: n.position.x, fromY: n.position.y,
            toX: rel.x, toY: rel.y,
          });
        }
      }
    } else {
      // ── Specific connection type — compute layout from its distances ──
      const typeEdges = edges.filter(e => (e.data as any)?._typeId === activeTypeId);
      if (typeEdges.length === 0) return;

      // Start from relevance positions as the base
      const nodeMap = new Map(currentNodes.map(n => [n.id, n]));
      const adjustments = new Map<string, { dx: number; dy: number; count: number }>();

      for (const edge of typeEdges) {
        const distX = (edge.data as any)?._distanceX ?? 0.5;
        const distY = (edge.data as any)?._distanceY ?? 0.5;
        const srcNode = nodeMap.get(edge.source);
        const tgtNode = nodeMap.get(edge.target);
        if (!srcNode || !tgtNode) continue;

        // Get relevance (baseline) positions
        const srcRel = relevanceMapRef.current.get(edge.source) || srcNode.position;
        const tgtRel = relevanceMapRef.current.get(edge.target) || tgtNode.position;

        // Direction vector from source to target in relevance space
        const relDx = tgtRel.x - srcRel.x;
        const relDy = tgtRel.y - srcRel.y;
        const relDist = Math.sqrt(relDx * relDx + relDy * relDy) || 1;

        // Target distance for this connection type (0–1 → 150–700px range)
        const targetDist = 150 + distX * 550;
        const scale = targetDist / relDist;

        // How much to shift each node from its relevance position
        const shiftX = (relDx * scale - relDx) / 2;
        const shiftY = (relDy * scale - relDy) / 2;

        // Accumulate: source pulls inward, target pushes outward
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

      // Build target positions = relevance + averaged adjustment
      targets = new Map();
      for (const n of currentNodes) {
        const rel = relevanceMapRef.current.get(n.id) || n.position;
        const adj = adjustments.get(n.id);
        const toX = rel.x + (adj ? Math.max(-250, Math.min(250, adj.dx / adj.count)) : 0);
        const toY = rel.y + (adj ? Math.max(-250, Math.min(250, adj.dy / adj.count)) : 0);

        if (Math.abs(n.position.x - toX) > 1 || Math.abs(n.position.y - toY) > 1) {
          targets.set(n.id, {
            fromX: n.position.x, fromY: n.position.y,
            toX, toY,
          });
        }
      }
    }

    if (targets.size === 0) return;

    // ── Animate with cubic ease-out ──
    cancelAnimationFrame(rafRef.current);
    const startTime = performance.now();

    function animate() {
      const elapsed = performance.now() - startTime;
      const t = Math.min(1, elapsed / ANIM_DURATION);
      const ease = 1 - Math.pow(1 - t, 3); // cubic ease-out

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
  }, [activeTypeId, edges, reactFlow]);
}
