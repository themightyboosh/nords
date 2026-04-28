/**
 * EuclideanEdge.tsx — Custom edge renderer with spring-physics "Reason Wiggle."
 *
 * Lines connect to the nearest point on each card's bounding rectangle,
 * not to fixed handle positions. The Bézier control point is driven by
 * a 1D spring-mass-damper system for the tactile cable-wiggle effect.
 *
 * PERFORMANCE MODEL (v3):
 *   - Spring animation runs in a rAF loop and mutates the DOM directly
 *     via ref.setAttribute('d', ...) — zero React re-renders during animation.
 *   - Label position is also updated via direct DOM style mutation during
 *     animation; React state is synced only when the spring settles.
 *   - Off-canvas guard: animation is paused for edges fully outside the
 *     visible viewport, resuming when they scroll back in.
 *   - Node positions are extracted via a custom equality selector that
 *     only triggers re-render when actual coordinates change (not on
 *     unrelated node metadata updates).
 *
 * Physics tuned for 2x pronounced wiggle — resolves within ~600ms.
 */

import React, { useRef, useEffect, useMemo, useCallback } from 'react';
import { useStore } from '@xyflow/react';
import type { EdgeProps, Edge } from '@xyflow/react';
import { ConnectionLabel } from './ConnectionLabel';
import { useTypeRegistryContext } from '../../context/TypeRegistryContext';
import { resolveStageLabel } from '../../utils/stageLabels';
import type { NordEdgeData } from '../../types/canvas';
import './CanvasEngine.css';

// ── Memoized edge selector factory ──
// During drag, only node positions change — the edges array reference stays the same.
// By caching the last edges ref, we skip the expensive .filter() entirely (O(1) vs O(N)).
function useCachedEdgeSelector<T>(
  selector: (edges: Edge[]) => T,
  equalityFn: (a: T, b: T) => boolean,
): T {
  const cacheRef = useRef<{ edgesRef: Edge[] | null; result: T | null }>({ edgesRef: null, result: null });
  return useStore((s) => {
    if (s.edges === cacheRef.current.edgesRef && cacheRef.current.result !== null) {
      return cacheRef.current.result;
    }
    const result = selector(s.edges);
    cacheRef.current = { edgesRef: s.edges, result };
    return result;
  }, equalityFn);
}

// ── Spring Physics Constants ──
const STIFFNESS = 0.03;   // Very low snap → wide oscillation arcs
const DAMPING   = 0.65;   // Low friction → more bounces before settling
const THRESHOLD = 0.2;    // Lower threshold → animation runs longer

interface SpringState {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

// ── Position-only node selector ──
// Extracts only position + dimensions from a node lookup entry.
// Prevents re-renders when unrelated node data changes (selection, etc.)
interface NodeGeometry {
  x: number;
  y: number;
  w: number;
  h: number;
}

const EMPTY_GEO: NodeGeometry = { x: 0, y: 0, w: 200, h: 60 };

function useNodeGeometry(nodeId: string): NodeGeometry {
  return useStore(
    (s) => {
      const node = s.nodeLookup.get(nodeId);
      if (!node) return EMPTY_GEO;
      return {
        x: node.position?.x ?? 0,
        y: node.position?.y ?? 0,
        w: node.measured?.width ?? 200,
        h: node.measured?.height ?? 60,
      };
    },
    (a, b) => a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h
  );
}

/**
 * Compute where a line from center-to-center intersects the bounding
 * rectangle of a node. Returns the intersection point on the rect edge.
 */
function rectIntersection(
  cx: number, cy: number,
  tx: number, ty: number,
  w: number, h: number
): { x: number; y: number } {
  const dx = tx - cx;
  const dy = ty - cy;
  if (dx === 0 && dy === 0) return { x: cx, y: cy };

  const halfW = w / 2;
  const halfH = h / 2;

  const scaleX = dx !== 0 ? halfW / Math.abs(dx) : Infinity;
  const scaleY = dy !== 0 ? halfH / Math.abs(dy) : Infinity;
  const scale = Math.min(scaleX, scaleY);

  return {
    x: cx + dx * scale,
    y: cy + dy * scale,
  };
}

/**
 * Build SVG path string for the edge's current state.
 * Pure function — no side effects, used from both React render and rAF loop.
 */
function buildPathD(
  sx: number, sy: number, tx: number, ty: number,
  centerX: number, centerY: number,
  perpUnitX: number, perpUnitY: number,
  dx: number, dy: number, len: number,
  offset: number,
  srcSplayOffset: number, tgtSplayOffset: number,
  speed: number
): string {
  const midX = (sx + tx) / 2;
  const midY = (sy + ty) / 2;
  const hasSplay = Math.abs(srcSplayOffset) >= 1 || Math.abs(tgtSplayOffset) >= 1;
  const springAtRest = Math.abs(centerX - midX) < 2 && Math.abs(centerY - midY) < 2 && speed < 0.5;
  const isFullyAtRest = offset === 0 && springAtRest && !hasSplay;

  if (isFullyAtRest) {
    return `M ${sx} ${sy} L ${tx} ${ty}`;
  }

  if (springAtRest && hasSplay && offset === 0) {
    const cp1x = sx + dx * 0.08 + perpUnitX * srcSplayOffset;
    const cp1y = sy + dy * 0.08 + perpUnitY * srcSplayOffset;
    const cp4x = sx + dx * 0.92 - perpUnitX * tgtSplayOffset;
    const cp4y = sy + dy * 0.92 - perpUnitY * tgtSplayOffset;
    return `M ${sx} ${sy} C ${cp1x} ${cp1y}, ${cp4x} ${cp4y}, ${tx} ${ty}`;
  }

  const waveAmp = Math.min(35, speed * 2.5);
  const cp1x = sx + dx * 0.08 + perpUnitX * (waveAmp * 0.3 + srcSplayOffset);
  const cp1y = sy + dy * 0.08 + perpUnitY * (waveAmp * 0.3 + srcSplayOffset);
  const cp2x = (sx + centerX) / 2 + perpUnitX * waveAmp;
  const cp2y = (sy + centerY) / 2 + perpUnitY * waveAmp;
  const cp3x = (centerX + tx) / 2 - perpUnitX * waveAmp;
  const cp3y = (centerY + ty) / 2 - perpUnitY * waveAmp;
  const cp4x = sx + dx * 0.92 - perpUnitX * (waveAmp * 0.3 + tgtSplayOffset);
  const cp4y = sy + dy * 0.92 - perpUnitY * (waveAmp * 0.3 + tgtSplayOffset);

  return `M ${sx} ${sy} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${centerX} ${centerY} C ${cp3x} ${cp3y}, ${cp4x} ${cp4y}, ${tx} ${ty}`;
}


const EuclideanEdgeInner = React.memo(function EuclideanEdge({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  style,
  data,
  markerEnd,
  markerStart,
}: EdgeProps) {
  // ── Typed edge data ──
  const edgeData = data as NordEdgeData | undefined;

  // Read node geometry from React Flow store — position-only selector
  // prevents re-renders when unrelated node metadata changes
  const sourceGeo = useNodeGeometry(source);
  const targetGeo = useNodeGeometry(target);

  // ── Resolve distance to stage labels ──
  const { connectionTypes } = useTypeRegistryContext();
  const resolvedLabel = useMemo(() => {
    if (!edgeData?._typeId || edgeData._distanceX == null) return null;
    const ct = connectionTypes.find(c => c.id === edgeData._typeId);
    if (!ct || ct.xStageLabels.length === 0) return null;
    return resolveStageLabel(edgeData._distanceX, ct.xStageLabels);
  }, [edgeData?._typeId, edgeData?._distanceX, connectionTypes]);

  const resolvedYLabel = useMemo(() => {
    if (!edgeData?._typeId || edgeData._distanceY == null) return null;
    const ct = connectionTypes.find(c => c.id === edgeData._typeId);
    if (!ct || ct.yStageLabels.length === 0) return null;
    return resolveStageLabel(edgeData._distanceY, ct.yStageLabels);
  }, [edgeData?._typeId, edgeData?._distanceY, connectionTypes]);

  // ── Composite label: verb + measurement (spectrum or grid) ──
  // Priority: composite (verb + stage) > verb+preposition > type name
  const compositeLabel = useMemo(() => {
    const verb = edgeData?._verb;
    const preps = edgeData?._prepositions as { forward: string; reverse: string; both: string } | undefined;
    const dir = edgeData?.direction;
    const hasX = resolvedLabel != null;
    const hasY = resolvedYLabel != null;

    // Build relationship verb phrase (verb + preposition)
    let verbPhrase: string | null = null;
    if (verb) {
      if (dir === 'to') verbPhrase = `${verb} ${preps?.forward ?? 'from'}`;
      else if (dir === 'from') verbPhrase = `${verb} ${preps?.reverse ?? 'to'}`;
      else if (dir === 'both') verbPhrase = `${verb} ${preps?.both ?? 'together'}`;
      else verbPhrase = 'related';
    }

    if (hasX && hasY) {
      // Grid mode: verb + x / y
      const position = `${resolvedLabel} / ${resolvedYLabel}`;
      return verb ? `${verb} ${position}` : position;
    }
    if (hasX) {
      // Spectrum mode: verb + stage-label
      return verb ? `${verb} ${resolvedLabel}` : resolvedLabel;
    }
    // No measurement — fall through to verb phrase or type name
    return verbPhrase;
  }, [resolvedLabel, resolvedYLabel, edgeData?._verb, edgeData?._prepositions, edgeData?.direction]);

  // Node centers (React Flow positions are top-left, add half dimensions)
  const sCx = sourceGeo.x + sourceGeo.w / 2;
  const sCy = sourceGeo.y + sourceGeo.h / 2;
  const tCx = targetGeo.x + targetGeo.w / 2;
  const tCy = targetGeo.y + targetGeo.h / 2;

  // Compute intersection of center-to-center line with each card's bounding rect
  const srcPt = rectIntersection(sCx, sCy, tCx, tCy, sourceGeo.w, sourceGeo.h);
  const tgtPt = rectIntersection(tCx, tCy, sCx, sCy, targetGeo.w, targetGeo.h);

  const sx = srcPt.x;
  const sy = srcPt.y;
  const tx = tgtPt.x;
  const ty = tgtPt.y;

  // ── Ribbon config: cached — skips filter when only node positions change ──
  const ribbonConfig = useCachedEdgeSelector(
    (edges) => {
      const pairKey = [source, target].sort().join('-');
      const siblings = edges.filter(e => [e.source, e.target].sort().join('-') === pairKey);
      const sibIdx = siblings.findIndex(e => e.id === id);
      return { count: siblings.length, index: sibIdx };
    },
    (a, b) => a.count === b.count && a.index === b.index
  );

  // ── Node Degree Splay: cached ──
  const sourceSplay = useCachedEdgeSelector(
    (edges) => {
      const conns = edges.filter(e => e.source === source || e.target === source);
      const idx = conns.findIndex(e => e.id === id);
      return { degree: conns.length, index: idx };
    },
    (a, b) => a.degree === b.degree && a.index === b.index
  );

  const targetSplay = useCachedEdgeSelector(
    (edges) => {
      const conns = edges.filter(e => e.source === target || e.target === target);
      const idx = conns.findIndex(e => e.id === id);
      return { degree: conns.length, index: idx };
    },
    (a, b) => a.degree === b.degree && a.index === b.index
  );

  // ── Geometry ──
  const dx = tx - sx;
  const dy = ty - sy;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;

  const perpUnitX = -dy / len;
  const perpUnitY = dx / len;

  // Ribbon offset computation
  const spread = 40;
  const totalWidth = (ribbonConfig.count - 1) * spread;
  const offset = ribbonConfig.count > 1 ? (ribbonConfig.index * spread) - (totalWidth / 2) : 0;

  const perpX = (-dy / len) * offset;
  const perpY = (dx / len) * offset;

  const midX = (sx + tx) / 2;
  const midY = (sy + ty) / 2;

  // Degree splay
  const SPLAY_PX = 8;
  const srcSplayOffset = sourceSplay.degree > 1
    ? (sourceSplay.index - (sourceSplay.degree - 1) / 2) * SPLAY_PX
    : 0;
  const tgtSplayOffset = targetSplay.degree > 1
    ? (targetSplay.index - (targetSplay.degree - 1) / 2) * SPLAY_PX
    : 0;

  // Target control point (where the spring wants to rest)
  const targetCpX = midX + perpX * 2;
  const targetCpY = midY + perpY * 2;

  // ── DOM refs for direct mutation during animation ──
  const basePathRef = useRef<SVGPathElement>(null);
  const activePathRef = useRef<SVGPathElement>(null);
  const hitAreaRef = useRef<SVGPathElement>(null);
  const springRef = useRef<SpringState>({ x: targetCpX, y: targetCpY, vx: 0, vy: 0 });
  const rafRef = useRef<number>(0);
  // Label position: updated via direct DOM mutation during animation,
  // React state synced only at rest to avoid per-frame re-renders.
  const labelPosRef = useRef({ x: midX, y: midY });
  const labelElRef = useRef<HTMLDivElement>(null);
  const [labelPos, setLabelPos] = React.useState({ x: midX, y: midY });

  // ── Off-canvas guard ──
  // Check if edge midpoint is within the visible viewport (with generous margin)
  const isVisible = useStore((s) => {
    const [vpX, vpY, vpZoom] = s.transform;
    const vpWidth = (s.width || 1200) / vpZoom;
    const vpHeight = (s.height || 800) / vpZoom;
    const vpLeft = -vpX / vpZoom;
    const vpTop = -vpY / vpZoom;
    const margin = 400; // generous margin to start animation before visible
    const mx = (sx + tx) / 2;
    const my = (sy + ty) / 2;
    return (
      mx > vpLeft - margin && mx < vpLeft + vpWidth + margin &&
      my > vpTop - margin && my < vpTop + vpHeight + margin
    );
  }, (a, b) => a === b);

  // Update all path refs in one shot (called from rAF loop — no React re-render)
  const updatePaths = useCallback((pathD: string) => {
    if (basePathRef.current) basePathRef.current.setAttribute('d', pathD);
    if (activePathRef.current) activePathRef.current.setAttribute('d', pathD);
    if (hitAreaRef.current) hitAreaRef.current.setAttribute('d', pathD);
  }, []);

  // Update label position via direct DOM mutation (no React re-render)
  const updateLabelDOM = useCallback((lx: number, ly: number) => {
    const el = labelElRef.current;
    if (!el) return;
    // The label uses translate(-50%, -50%) for centering, then translate(x, y) for positioning.
    // We need to find the existing rotation and scale to preserve them.
    // Since the angle and scale don't change during animation, we can just rebuild
    // the full transform with the new position values.
    // This is cheaper than a React re-render cycle.
    el.style.transform = `translate(-50%, -50%) translate(${lx}px, ${ly}px) rotate(${el.dataset.angle || 0}deg) scale(${el.dataset.invscale || 1})`;
  }, []);

  useEffect(() => {
    const spring = springRef.current;
    let isAnimating = true;

    const animate = () => {
      // Spring force toward target
      const forceX = (targetCpX - spring.x) * STIFFNESS;
      const forceY = (targetCpY - spring.y) * STIFFNESS;

      spring.vx = (spring.vx + forceX) * DAMPING;
      spring.vy = (spring.vy + forceY) * DAMPING;

      spring.x += spring.vx;
      spring.y += spring.vy;

      const speed = Math.abs(spring.vx) + Math.abs(spring.vy);
      const distToTarget = Math.abs(spring.x - targetCpX) + Math.abs(spring.y - targetCpY);

      // Build path and update DOM directly — NO React re-render
      const pathD = buildPathD(
        sx, sy, tx, ty,
        spring.x, spring.y,
        perpUnitX, perpUnitY,
        dx, dy, len,
        offset, srcSplayOffset, tgtSplayOffset,
        speed
      );
      updatePaths(pathD);

      // Update label position ref + DOM directly (no React re-render)
      const stagger = ribbonConfig.count > 1
        ? (ribbonConfig.index - (ribbonConfig.count - 1) / 2) * 20
        : 0;
      labelPosRef.current = {
        x: spring.x + (dx / len) * stagger,
        y: spring.y + (dy / len) * stagger,
      };
      updateLabelDOM(labelPosRef.current.x, labelPosRef.current.y);

      if (speed < THRESHOLD && distToTarget < 1) {
        spring.vx = 0;
        spring.vy = 0;
        // Final sync: update React state once at rest for label positioning
        setLabelPos({ ...labelPosRef.current });
        isAnimating = false;
        return;
      }

      if (isAnimating) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    // Only animate if visible (off-canvas guard)
    if (isVisible) {
      rafRef.current = requestAnimationFrame(animate);
    } else {
      // Jump to target instantly for off-canvas edges
      spring.x = targetCpX;
      spring.y = targetCpY;
      spring.vx = 0;
      spring.vy = 0;
      const pathD = buildPathD(
        sx, sy, tx, ty,
        targetCpX, targetCpY,
        perpUnitX, perpUnitY,
        dx, dy, len,
        offset, srcSplayOffset, tgtSplayOffset,
        0
      );
      updatePaths(pathD);
      const lx = targetCpX + (dx / len) * (ribbonConfig.count > 1 ? (ribbonConfig.index - (ribbonConfig.count - 1) / 2) * 20 : 0);
      const ly = targetCpY + (dy / len) * (ribbonConfig.count > 1 ? (ribbonConfig.index - (ribbonConfig.count - 1) / 2) * 20 : 0);
      setLabelPos({ x: lx, y: ly });
    }

    return () => {
      isAnimating = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, [targetCpX, targetCpY, isVisible, sx, sy, tx, ty, perpUnitX, perpUnitY, dx, dy, len, offset, srcSplayOffset, tgtSplayOffset, ribbonConfig, updatePaths, updateLabelDOM]);

  // ── Initial path for SSR / first render ──
  const initialPathD = useMemo(() => buildPathD(
    sx, sy, tx, ty,
    targetCpX, targetCpY,
    perpUnitX, perpUnitY,
    dx, dy, len,
    offset, srcSplayOffset, tgtSplayOffset,
    0
  ), [sx, sy, tx, ty, targetCpX, targetCpY, perpUnitX, perpUnitY, dx, dy, len, offset, srcSplayOffset, tgtSplayOffset]);

  // ── Label Angle ──
  let angleDeg = Math.atan2(dy, dx) * (180 / Math.PI);
  let flipped = false;
  if (angleDeg > 90) { angleDeg -= 180; flipped = true; }
  if (angleDeg < -90) { angleDeg += 180; flipped = true; }

  let visualDirection = edgeData?.direction || 'none';
  if (flipped && visualDirection !== 'none') {
    visualDirection = visualDirection === 'to' ? 'from' : 'to';
  }

  // ── Styles ──
  const isGhosted = edgeData?.ghost === true;
  const isDimmed = edgeData?.dimmed === true;
  const direction = edgeData?.direction || 'none';

  const directionClass = direction === 'to' ? 'nords-connection--march-forward'
    : direction === 'from' ? 'nords-connection--march-reverse'
    : direction === 'both' ? 'nords-connection--march-both'
    : '';

  // ── Custom Arrowheads ──
  const arrowSize = 10;
  const originalColor = edgeData?.color || '#000';
  const edgeColor = isDimmed ? '#555' : originalColor;
  const showEndArrow = direction === 'to' || direction === 'both';
  const showStartArrow = direction === 'from' || direction === 'both';

  const endAngle = Math.atan2(ty - sy, tx - sx);
  const endArrowPoints = showEndArrow ? [
    [tx, ty],
    [tx - arrowSize * Math.cos(endAngle - Math.PI / 6), ty - arrowSize * Math.sin(endAngle - Math.PI / 6)],
    [tx - arrowSize * Math.cos(endAngle + Math.PI / 6), ty - arrowSize * Math.sin(endAngle + Math.PI / 6)],
  ].map(p => p.join(',')).join(' ') : null;

  const startAngle = Math.atan2(sy - ty, sx - tx);
  const startArrowPoints = showStartArrow ? [
    [sx, sy],
    [sx - arrowSize * Math.cos(startAngle - Math.PI / 6), sy - arrowSize * Math.sin(startAngle - Math.PI / 6)],
    [sx - arrowSize * Math.cos(startAngle + Math.PI / 6), sy - arrowSize * Math.sin(startAngle + Math.PI / 6)],
  ].map(p => p.join(',')).join(' ') : null;

  // Drag-to-detach: mousedown anywhere on the line detaches from closest endpoint
  const onHitAreaMouseDown = React.useCallback((e: React.MouseEvent<SVGPathElement>) => {
    if (e.button !== 0) return;
    const edgeGroup = (e.currentTarget as SVGElement).closest('.react-flow__edge');
    if (!edgeGroup) return;
    const svg = edgeGroup.closest('svg');
    if (!svg) return;
    const pt = (svg as SVGSVGElement).createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const ctm = (svg as SVGSVGElement).getScreenCTM();
    if (!ctm) return;
    const svgPt = pt.matrixTransform(ctm.inverse());

    const distToSource = Math.hypot(svgPt.x - sx, svgPt.y - sy);
    const distToTarget = Math.hypot(svgPt.x - tx, svgPt.y - ty);
    const handleType = distToSource < distToTarget ? 'source' : 'target';

    const updater = edgeGroup.querySelector(`.react-flow__edgeupdater-${handleType}`);
    if (updater) {
      e.stopPropagation();
      e.preventDefault();
      const syntheticEvent = new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
        clientX: e.clientX,
        clientY: e.clientY,
        button: 0,
      });
      updater.dispatchEvent(syntheticEvent);
    }
  }, [sx, sy, tx, ty]);

  return (
    <>
      {/* Base path — solid at 50% opacity (visible in dash gaps) */}
      {!isGhosted && (
        <path
          ref={basePathRef}
          d={initialPathD}
          className="nords-connection--base"
          stroke={edgeColor}
          fill="none"
        />
      )}
      {/* Top path — dashed, direction-aware marching animation */}
      <path
        ref={activePathRef}
        d={initialPathD}
        className={isGhosted ? 'nords-connection--ghost' : `nords-connection--active ${directionClass}`}
        stroke={edgeColor}
        fill="none"
        style={style}
      />
      {/* Custom arrowheads */}
      {!isGhosted && endArrowPoints && (
        <polygon points={endArrowPoints} fill={edgeColor} />
      )}
      {!isGhosted && startArrowPoints && (
        <polygon points={startArrowPoints} fill={edgeColor} />
      )}
      {/* Invisible fat hit-area */}
      <path
        ref={hitAreaRef}
        d={initialPathD}
        stroke="transparent"
        strokeWidth="30"
        fill="none"
        className="nords-connection--hitarea"
        style={{ pointerEvents: 'stroke', cursor: 'grab' }}
        onMouseDown={onHitAreaMouseDown}
      />
      
      {/* Label */}
      {!isGhosted && (
        <ConnectionLabel
          x={labelPos.x}
          y={labelPos.y}
          angleDeg={angleDeg}
          direction={visualDirection as any}
          type={edgeData?.type || ''}
          color={isDimmed ? '#666' : (edgeData?.color || '#888')}
          edgeId={id}
          isDimmed={isDimmed}
          resolvedLabel={compositeLabel}
          labelRef={labelElRef}
        />
      )}
    </>
  );
});

export { EuclideanEdgeInner as EuclideanEdge };
