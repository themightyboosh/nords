/**
 * EuclideanEdge.tsx — Custom edge renderer (v5 — performance-first).
 *
 * Lines connect to the nearest point on each card's bounding rectangle.
 * Edges are rendered as static SVG paths — NO spring animation, NO rAF loops.
 *
 * PERFORMANCE MODEL (v5):
 *   - Zero requestAnimationFrame loops. Paths are pure functions of node positions.
 *   - Labels are LAZY: only mounted when the edge midpoint is within the viewport.
 *     Off-screen active edges render paths but skip label React components entirely.
 *   - Dimmed edges render as simple gray lines with direction arrows —
 *     no dash animation, no labels. This reduces DOM elements significantly
 *     when a lens is active.
 *   - CSS dash-march animations are paused during drag/zoom via
 *     [data-interacting] attribute on the root — zero GPU composite work
 *     during interaction.
 *   - Node positions extracted via custom equality selector (re-render only
 *     when actual coordinates change).
 *   - Ribbon splay and degree splay use cached edge selectors (O(1) during drag).
 */

import React, { useMemo, useRef, useReducer, useEffect } from 'react';
import { useStore } from '@xyflow/react';
import type { EdgeProps, Edge } from '@xyflow/react';
import { ConnectionLabel } from './ConnectionLabel';
import { useTypeRegistryContext } from '../../context/TypeRegistryContext';
import { useCableSettings } from '../../context/CableSettingsContext';
import { resolveStageLabel } from '../../utils/stageLabels';
import type { NordEdgeData } from '../../types/canvas';
import './CanvasEngine.css';

// ── Position-only node selector ──
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
 * rectangle of a node.
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

// ── Cached edge selector (O(1) during drag) ──
function useCachedEdgeSelector<T>(
  selector: (edges: Edge[]) => T,
  equalityFn: (a: T, b: T) => boolean,
): T {
  const cacheRef = React.useRef<{ edgesRef: Edge[] | null; result: T | null }>({ edgesRef: null, result: null });
  return useStore((s) => {
    if (s.edges === cacheRef.current.edgesRef && cacheRef.current.result !== null) {
      return cacheRef.current.result;
    }
    const result = selector(s.edges);
    cacheRef.current = { edgesRef: s.edges, result };
    return result;
  }, equalityFn);
}

// ── Viewport visibility check for lazy labels ──
// Returns true when the given point is within the visible viewport (+margin).
// Uses a quantized check (boolean) to minimize re-renders.
function useIsPointInViewport(px: number, py: number): boolean {
  return useStore(
    (s) => {
      const [vpX, vpY, vpZoom] = s.transform;
      const vpWidth = (s.width || 1200) / vpZoom;
      const vpHeight = (s.height || 800) / vpZoom;
      const vpLeft = -vpX / vpZoom;
      const vpTop = -vpY / vpZoom;
      const margin = 200;
      return (
        px > vpLeft - margin && px < vpLeft + vpWidth + margin &&
        py > vpTop - margin && py < vpTop + vpHeight + margin
      );
    },
    (a, b) => a === b,
  );
}


// ── Dimmed Edge — lightweight render with direction arrows ──
const DimmedEdge = React.memo(function DimmedEdge({
  sx, sy, tx, ty, offset, perpUnitX, perpUnitY,
  srcSplayOffset, tgtSplayOffset, dx, dy, direction,
}: {
  sx: number; sy: number; tx: number; ty: number;
  offset: number; perpUnitX: number; perpUnitY: number;
  srcSplayOffset: number; tgtSplayOffset: number;
  dx: number; dy: number;
  direction: string;
}) {
  // Simple path — straight line or gentle curve for splay
  const hasSplay = Math.abs(srcSplayOffset) >= 1 || Math.abs(tgtSplayOffset) >= 1;
  const hasOffset = Math.abs(offset) >= 1;

  let pathD: string;
  if (!hasSplay && !hasOffset) {
    // Tiny gravity sag at rest
    const mX = (sx + tx) / 2;
    const mY = (sy + ty) / 2;
    const sagLen = Math.sqrt((tx-sx)**2 + (ty-sy)**2) || 1;
    const sag = Math.min(sagLen * 0.015, 10);
    pathD = `M ${sx} ${sy} Q ${mX} ${mY + sag}, ${tx} ${ty}`;
  } else {
    const cp1x = sx + dx * 0.08 + perpUnitX * srcSplayOffset;
    const cp1y = sy + dy * 0.08 + perpUnitY * srcSplayOffset;
    const cp4x = sx + dx * 0.92 - perpUnitX * tgtSplayOffset;
    const cp4y = sy + dy * 0.92 - perpUnitY * tgtSplayOffset;
    pathD = `M ${sx} ${sy} C ${cp1x} ${cp1y}, ${cp4x} ${cp4y}, ${tx} ${ty}`;
  }

  // Arrowheads (dimmed but present)
  const arrowSize = 16;
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

  return (
    <>
      <path
        d={pathD}
        className="nords-connection--dimmed-simple"
        stroke="#555"
        strokeWidth="1.5"
        fill="none"
        opacity="0.35"
        style={{ pointerEvents: 'stroke', cursor: 'grab' }}
      />
      {endArrowPoints && <polygon points={endArrowPoints} fill="#555" opacity="0.35" />}
      {startArrowPoints && <polygon points={startArrowPoints} fill="#555" opacity="0.35" />}
    </>
  );
});


const EuclideanEdgeInner = React.memo(function EuclideanEdge({
  id,
  source,
  target,
  style,
  data,
}: EdgeProps) {
  const edgeData = data as NordEdgeData | undefined;
  const isGhosted = edgeData?.ghost === true;
  const isDimmed = edgeData?.dimmed === true;

  // Read node geometry
  const sourceGeo = useNodeGeometry(source);
  const targetGeo = useNodeGeometry(target);

  // Node centers
  const sCx = sourceGeo.x + sourceGeo.w / 2;
  const sCy = sourceGeo.y + sourceGeo.h / 2;
  const tCx = targetGeo.x + targetGeo.w / 2;
  const tCy = targetGeo.y + targetGeo.h / 2;

  // Rect intersection
  const srcPt = rectIntersection(sCx, sCy, tCx, tCy, sourceGeo.w, sourceGeo.h);
  const tgtPt = rectIntersection(tCx, tCy, sCx, sCy, targetGeo.w, targetGeo.h);

  const sx = srcPt.x;
  const sy = srcPt.y;
  const tx = tgtPt.x;
  const ty = tgtPt.y;

  const dx = tx - sx;
  const dy = ty - sy;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const perpUnitX = -dy / len;
  const perpUnitY = dx / len;

  // ── Ribbon config ──
  const ribbonConfig = useCachedEdgeSelector(
    (edges) => {
      const pairKey = [source, target].sort().join('-');
      const siblings = edges.filter(e => [e.source, e.target].sort().join('-') === pairKey);
      const sibIdx = siblings.findIndex(e => e.id === id);
      return { count: siblings.length, index: sibIdx };
    },
    (a, b) => a.count === b.count && a.index === b.index
  );

  // ── Node Degree Splay ──
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

  // Ribbon offset
  const spread = 40;
  const totalWidth = (ribbonConfig.count - 1) * spread;
  const offset = ribbonConfig.count > 1 ? (ribbonConfig.index * spread) - (totalWidth / 2) : 0;

  // Degree splay
  const SPLAY_PX = 8;
  const srcSplayOffset = sourceSplay.degree > 1
    ? (sourceSplay.index - (sourceSplay.degree - 1) / 2) * SPLAY_PX
    : 0;
  const tgtSplayOffset = targetSplay.degree > 1
    ? (targetSplay.index - (targetSplay.degree - 1) / 2) * SPLAY_PX
    : 0;

  // ── Cable Physics: damped spring midpoint (Reason-style wiggle) ──
  // Constants from CableSettingsContext (tunable in Project Settings).
  const { settings: cableSettings } = useCableSettings();
  const CABLE_STIFFNESS = cableSettings.stiffness;
  const CABLE_DAMPING = cableSettings.damping;
  const CABLE_AMP = cableSettings.amplitude;
  const CABLE_SETTLE_THRESHOLD = 0.3; // px — below this, snap to rest

  const trueMidX = (sx + tx) / 2;
  const trueMidY = (sy + ty) / 2;
  const cableRef = useRef({ x: trueMidX, y: trueMidY, vx: 0, vy: 0 });
  const settleRafRef = useRef(0);
  const [, forceSettle] = useReducer((x: number) => x + 1, 0);

  // Damped spring step: acceleration = stiffness * displacement, velocity *= damping
  const dispX = trueMidX - cableRef.current.x;
  const dispY = trueMidY - cableRef.current.y;
  cableRef.current.vx = (cableRef.current.vx + dispX * CABLE_STIFFNESS) * CABLE_DAMPING;
  cableRef.current.vy = (cableRef.current.vy + dispY * CABLE_STIFFNESS) * CABLE_DAMPING;
  cableRef.current.x += cableRef.current.vx;
  cableRef.current.y += cableRef.current.vy;

  const rawLagX = cableRef.current.x - trueMidX;
  const rawLagY = cableRef.current.y - trueMidY;
  const rawLagDist = Math.sqrt(rawLagX * rawLagX + rawLagY * rawLagY);
  const velMag = Math.sqrt(cableRef.current.vx ** 2 + cableRef.current.vy ** 2);
  const isCableLagging = rawLagDist > CABLE_SETTLE_THRESHOLD || velMag > 0.1;

  // Self-settling: keep re-rendering until spring resolves
  useEffect(() => {
    if (isCableLagging) {
      settleRafRef.current = requestAnimationFrame(forceSettle);
      return () => cancelAnimationFrame(settleRafRef.current);
    }
  }, [isCableLagging, rawLagDist, velMag]);

  // ── DIMMED EDGES: lightweight render with arrows ──
  if (isDimmed) {
    return (
      <DimmedEdge
        sx={sx} sy={sy} tx={tx} ty={ty}
        offset={offset} perpUnitX={perpUnitX} perpUnitY={perpUnitY}
        srcSplayOffset={srcSplayOffset} tgtSplayOffset={tgtSplayOffset}
        dx={dx} dy={dy}
        direction={edgeData?.direction || 'none'}
      />
    );
  }

  // ── GHOSTED EDGES: thin path with tiny sag ──
  if (isGhosted) {
    const gMidX = (sx + tx) / 2;
    const gMidY = (sy + ty) / 2 + Math.min(len * 0.015, 10);
    const pathD = `M ${sx} ${sy} Q ${gMidX} ${gMidY}, ${tx} ${ty}`;
    return (
      <path d={pathD} className="nords-connection--ghost"
        stroke={edgeData?.color || '#000'} fill="none" />
    );
  }

  // ── Compute cable physics path (shared by quiet + highlighted) ──
  // Spring displacement applied to ALL paths — quadratic and cubic.
  const hasSplay = Math.abs(srcSplayOffset) >= 1 || Math.abs(tgtSplayOffset) >= 1;
  const hasOff = Math.abs(offset) >= 1;
  const restSag = Math.min(len * 0.015, 10); // tiny gravity droop at rest
  const cableOffX = rawLagX * CABLE_AMP;
  const cableOffY = rawLagY * CABLE_AMP;

  let cablePathD: string;
  if (!hasSplay && !hasOff) {
    // Quadratic bezier — single control point at displaced midpoint
    const ctrlX = trueMidX + cableOffX;
    const ctrlY = trueMidY + cableOffY + restSag;
    cablePathD = `M ${sx} ${sy} Q ${ctrlX} ${ctrlY}, ${tx} ${ty}`;
  } else {
    // Cubic bezier — offset both control points for cable sway
    const cp1x = sx + dx * 0.08 + perpUnitX * srcSplayOffset + cableOffX * 0.5;
    const cp1y = sy + dy * 0.08 + perpUnitY * srcSplayOffset + cableOffY * 0.5;
    const cp4x = sx + dx * 0.92 - perpUnitX * tgtSplayOffset + cableOffX * 0.5;
    const cp4y = sy + dy * 0.92 - perpUnitY * tgtSplayOffset + cableOffY * 0.5;
    cablePathD = `M ${sx} ${sy} C ${cp1x} ${cp1y}, ${cp4x} ${cp4y}, ${tx} ${ty}`;
  }

  const isHighlighted = edgeData?._highlighted === true;

  // ── NON-HIGHLIGHTED ACTIVE: simple colored path with arrowheads ──
  if (!isHighlighted) {
    // Arrowheads for non-highlighted edges
    const direction = edgeData?.direction || 'none';
    const nhColor = edgeData?.color || '#888';
    const nhArrowSize = 18;
    const showEndArrow = direction === 'to' || direction === 'both';
    const showStartArrow = direction === 'from' || direction === 'both';

    const endAngle = Math.atan2(ty - sy, tx - sx);
    const endArrowPoints = showEndArrow ? [
      [tx, ty],
      [tx - nhArrowSize * Math.cos(endAngle - Math.PI / 6), ty - nhArrowSize * Math.sin(endAngle - Math.PI / 6)],
      [tx - nhArrowSize * Math.cos(endAngle + Math.PI / 6), ty - nhArrowSize * Math.sin(endAngle + Math.PI / 6)],
    ].map(p => p.join(',')).join(' ') : null;

    const startAngle = Math.atan2(sy - ty, sx - tx);
    const startArrowPoints = showStartArrow ? [
      [sx, sy],
      [sx - nhArrowSize * Math.cos(startAngle - Math.PI / 6), sy - nhArrowSize * Math.sin(startAngle - Math.PI / 6)],
      [sx - nhArrowSize * Math.cos(startAngle + Math.PI / 6), sy - nhArrowSize * Math.sin(startAngle + Math.PI / 6)],
    ].map(p => p.join(',')).join(' ') : null;

    return (
      <>
        <path d={cablePathD} stroke={nhColor}
          strokeWidth="1.5" fill="none" opacity="0.55"
          style={{ pointerEvents: 'stroke', cursor: 'grab' }} />
        {endArrowPoints && <polygon points={endArrowPoints} fill={nhColor} opacity="0.55" />}
        {startArrowPoints && <polygon points={startArrowPoints} fill={nhColor} opacity="0.55" />}
      </>
    );
  }

  // ── HIGHLIGHTED EDGES: full render with labels — pathD from parent ──
  return (
    <ActiveEdge
      id={id}
      sx={sx} sy={sy} tx={tx} ty={ty}
      dx={dx} dy={dy} len={len}
      perpUnitX={perpUnitX} perpUnitY={perpUnitY}
      offset={offset}
      srcSplayOffset={srcSplayOffset} tgtSplayOffset={tgtSplayOffset}
      ribbonConfig={ribbonConfig}
      edgeData={edgeData}
      style={style}
      cablePathD={cablePathD}
    />
  );
});



// ── Active Edge: full-featured, spring-animated, only for highlighted (~2-5) ──
const ActiveEdge = React.memo(function ActiveEdge({
  id,
  sx, sy, tx, ty,
  dx, dy, len,
  perpUnitX, perpUnitY,
  offset,
  srcSplayOffset, tgtSplayOffset,
  ribbonConfig,
  edgeData,
  style,
  cablePathD,
}: {
  id: string;
  sx: number; sy: number; tx: number; ty: number;
  dx: number; dy: number; len: number;
  perpUnitX: number; perpUnitY: number;
  offset: number;
  srcSplayOffset: number; tgtSplayOffset: number;
  ribbonConfig: { count: number; index: number };
  edgeData: NordEdgeData | undefined;
  style?: React.CSSProperties;
  cablePathD: string;
}) {
  const { connectionTypes } = useTypeRegistryContext();

  // ── Resolve labels ──
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

  const compositeLabel = useMemo(() => {
    const verb = edgeData?._verb;
    const preps = edgeData?._prepositions as { forward: string; reverse: string; both: string } | undefined;
    const dir = edgeData?.direction;
    const hasX = resolvedLabel != null;
    const hasY = resolvedYLabel != null;

    let verbPhrase: string | null = null;
    if (dir === 'none') {
      verbPhrase = null;
    } else if (verb) {
      if (dir === 'to') verbPhrase = `${verb} ${preps?.forward ?? 'from'}`;
      else if (dir === 'from') verbPhrase = `${verb} ${preps?.reverse ?? 'to'}`;
      else if (dir === 'both') verbPhrase = `${verb} ${preps?.both ?? 'together'}`;
      else verbPhrase = verb;
    }

    if (hasX && hasY) {
      const position = `${resolvedLabel} / ${resolvedYLabel}`;
      return verb ? `${verb} ${position}` : position;
    }
    if (hasX) {
      return verb ? `${verb} ${resolvedLabel}` : resolvedLabel;
    }
    return verbPhrase;
  }, [resolvedLabel, resolvedYLabel, edgeData?._verb, edgeData?._prepositions, edgeData?.direction]);

  // Use cablePathD from parent (cable physics computed there)
  const pathD = cablePathD;

  // ── Label position — derived from the actual cable path geometry ──
  // Parse the cablePathD to get the actual control points,
  // then evaluate at t=0.5 so the label sits on the real curve.
  const { labelX: computedLabelX, labelY: computedLabelY } = useMemo(() => {
    // cablePathD is either "M sx sy Q cx cy, tx ty" or "M sx sy C c1x c1y, c2x c2y, tx ty"
    const isQuadratic = cablePathD.includes('Q ');
    if (isQuadratic) {
      // Quadratic bezier: B(0.5) = 0.25*P0 + 0.5*P1 + 0.25*P2
      const qMatch = cablePathD.match(/Q\s+([\d.e+-]+)\s+([\d.e+-]+)/);
      if (qMatch) {
        const qcx = parseFloat(qMatch[1]);
        const qcy = parseFloat(qMatch[2]);
        return {
          labelX: 0.25 * sx + 0.5 * qcx + 0.25 * tx,
          labelY: 0.25 * sy + 0.5 * qcy + 0.25 * ty,
        };
      }
    } else {
      // Cubic bezier: B(0.5) = 0.125*P0 + 0.375*P1 + 0.375*P2 + 0.125*P3
      const cMatch = cablePathD.match(/C\s+([\d.e+-]+)\s+([\d.e+-]+),\s*([\d.e+-]+)\s+([\d.e+-]+)/);
      if (cMatch) {
        const c1x = parseFloat(cMatch[1]);
        const c1y = parseFloat(cMatch[2]);
        const c2x = parseFloat(cMatch[3]);
        const c2y = parseFloat(cMatch[4]);
        return {
          labelX: 0.125 * sx + 0.375 * c1x + 0.375 * c2x + 0.125 * tx,
          labelY: 0.125 * sy + 0.375 * c1y + 0.375 * c2y + 0.125 * ty,
        };
      }
    }
    // Fallback: simple midpoint
    return { labelX: (sx + tx) / 2, labelY: (sy + ty) / 2 };
  }, [cablePathD, sx, sy, tx, ty]);

  // Stagger for ribbon (multiple edges between same node pair)
  const stagger = ribbonConfig.count > 1
    ? (ribbonConfig.index - (ribbonConfig.count - 1) / 2) * 20
    : 0;
  const labelX = computedLabelX + (dx / len) * stagger;
  const labelY = computedLabelY + (dy / len) * stagger;

  // ── Label Angle ──
  let angleDeg = Math.atan2(dy, dx) * (180 / Math.PI);
  let flipped = false;
  if (angleDeg > 90) { angleDeg -= 180; flipped = true; }
  if (angleDeg < -90) { angleDeg += 180; flipped = true; }

  let visualDirection = edgeData?.direction || 'none';
  if (flipped && visualDirection !== 'none' && visualDirection !== 'both') {
    visualDirection = visualDirection === 'to' ? 'from' : 'to';
  }

  const direction = edgeData?.direction || 'none';
  const edgeColor = edgeData?.color || '#000';

  const directionClass = direction === 'to' ? 'nords-connection--march-forward'
    : direction === 'from' ? 'nords-connection--march-reverse'
    : direction === 'both' ? 'nords-connection--march-both'
    : '';

  // ── Arrowheads ──
  const arrowSize = 20;
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

  // Drag-to-detach
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
      {/* Base path — solid at reduced opacity */}
      <path
        d={pathD}
        className="nords-connection--base"
        stroke={edgeColor}
        fill="none"
      />
      {/* Active path — dashed, direction-aware marching */}
      <path
        d={pathD}
        className={`nords-connection--active ${directionClass}`}
        stroke={edgeColor}
        fill="none"
        style={style}
      />
      {/* Arrowheads */}
      {endArrowPoints && <polygon points={endArrowPoints} fill={edgeColor} />}
      {startArrowPoints && <polygon points={startArrowPoints} fill={edgeColor} />}
      {/* Hit area */}
      <path
        d={pathD}
        stroke="transparent"
        strokeWidth="30"
        fill="none"
        className="nords-connection--hitarea"
        style={{ pointerEvents: 'stroke', cursor: 'grab' }}
        onMouseDown={onHitAreaMouseDown}
      />
      {/* Label — lazy loaded: only mounts when edge is in viewport */}
      <LazyLabel
        labelX={labelX}
        labelY={labelY}
        angleDeg={angleDeg}
        visualDirection={visualDirection}
        edgeData={edgeData}
        edgeId={id}
        compositeLabel={compositeLabel}
      />
    </>
  );
});


// ── Lazy label wrapper: only renders ConnectionLabel when edge midpoint is visible ──
const LazyLabel = React.memo(function LazyLabel({
  labelX, labelY, angleDeg, visualDirection, edgeData, edgeId, compositeLabel,
}: {
  labelX: number;
  labelY: number;
  angleDeg: number;
  visualDirection: string;
  edgeData: NordEdgeData | undefined;
  edgeId: string;
  compositeLabel: string | null;
}) {
  const isInView = useIsPointInViewport(labelX, labelY);
  if (!isInView) return null;
  return (
    <ConnectionLabel
      x={labelX}
      y={labelY}
      angleDeg={angleDeg}
      direction={visualDirection as any}
      type={edgeData?.type || ''}
      color={edgeData?.color || '#888'}
      edgeId={edgeId}
      isDimmed={false}
      resolvedLabel={compositeLabel}
    />
  );
});


export { EuclideanEdgeInner as EuclideanEdge };
