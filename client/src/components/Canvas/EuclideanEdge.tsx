/**
 * EuclideanEdge.tsx — Custom edge renderer with spring-physics "Reason Wiggle."
 *
 * Lines connect to the nearest point on each card's bounding rectangle,
 * not to fixed handle positions. The Bézier control point is driven by
 * a 1D spring-mass-damper system for the tactile cable-wiggle effect.
 *
 * Physics tuned for 2x pronounced wiggle — resolves within ~600ms.
 */

import React, { useRef, useEffect, useState } from 'react';
import { useStore } from '@xyflow/react';
import type { EdgeProps } from '@xyflow/react';
import { ConnectionLabel } from './ConnectionLabel';
import './CanvasEngine.css';

// ── Spring Physics Constants (more pronounced, longer-lasting) ──
const STIFFNESS = 0.03;   // Very low snap → wide oscillation arcs
const DAMPING   = 0.65;   // Low friction → more bounces before settling
const THRESHOLD = 0.2;    // Lower threshold → animation runs longer

interface SpringState {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

/**
 * Compute where a line from center-to-center intersects the bounding
 * rectangle of a node. Returns the intersection point on the rect edge.
 */
function rectIntersection(
  cx: number, cy: number,  // center of THIS node
  tx: number, ty: number,  // center of OTHER node (line target direction)
  w: number, h: number     // width and height of THIS node
): { x: number; y: number } {
  const dx = tx - cx;
  const dy = ty - cy;
  if (dx === 0 && dy === 0) return { x: cx, y: cy };

  const halfW = w / 2;
  const halfH = h / 2;

  // Scale factor to reach rectangle edge
  const scaleX = dx !== 0 ? halfW / Math.abs(dx) : Infinity;
  const scaleY = dy !== 0 ? halfH / Math.abs(dy) : Infinity;
  const scale = Math.min(scaleX, scaleY);

  return {
    x: cx + dx * scale,
    y: cy + dy * scale,
  };
}

export function EuclideanEdge({
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
  // Read node dimensions from React Flow store for bounding-rect computation
  const sourceNode = useStore((s) => s.nodeLookup.get(source));
  const targetNode = useStore((s) => s.nodeLookup.get(target));

  // Node centers (React Flow positions are top-left, add half dimensions)
  const sW = sourceNode?.measured?.width ?? 200;
  const sH = sourceNode?.measured?.height ?? 60;
  const tW = targetNode?.measured?.width ?? 200;
  const tH = targetNode?.measured?.height ?? 60;

  const sCx = (sourceNode?.position?.x ?? 0) + sW / 2;
  const sCy = (sourceNode?.position?.y ?? 0) + sH / 2;
  const tCx = (targetNode?.position?.x ?? 0) + tW / 2;
  const tCy = (targetNode?.position?.y ?? 0) + tH / 2;

  // Compute intersection of center-to-center line with each card's bounding rect
  const srcPt = rectIntersection(sCx, sCy, tCx, tCy, sW, sH);
  const tgtPt = rectIntersection(tCx, tCy, sCx, sCy, tW, tH);

  // Effective source/target for drawing
  const sx = srcPt.x;
  const sy = srcPt.y;
  const tx = tgtPt.x;
  const ty = tgtPt.y;

  // O(1) re-renders: select ribbon config for parallel edges
  const ribbonConfig = useStore((s) => {
    const pairKey = [source, target].sort().join('-');
    const siblings = s.edges.filter(e => [e.source, e.target].sort().join('-') === pairKey);
    const sibIdx = siblings.findIndex(e => e.id === id);
    return { count: siblings.length, index: sibIdx };
  }, (a, b) => a.count === b.count && a.index === b.index);

  // ── Node Degree Splay ──
  // Compute each node's total connection count and this edge's index among them.
  // Used to fan out Bézier control points at heavily-connected nodes.
  const sourceSplay = useStore((s) => {
    const conns = s.edges.filter(e => e.source === source || e.target === source);
    const idx = conns.findIndex(e => e.id === id);
    return { degree: conns.length, index: idx };
  }, (a, b) => a.degree === b.degree && a.index === b.index);

  const targetSplay = useStore((s) => {
    const conns = s.edges.filter(e => e.source === target || e.target === target);
    const idx = conns.findIndex(e => e.id === id);
    return { degree: conns.length, index: idx };
  }, (a, b) => a.degree === b.degree && a.index === b.index);

  // ── Geometry ──
  const dx = tx - sx;
  const dy = ty - sy;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;

  // Perpendicular unit vector
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

  // Degree splay: fan-out offset at each endpoint (±6px per connection, centered)
  const SPLAY_PX = 6;
  const srcSplayOffset = sourceSplay.degree > 1
    ? (sourceSplay.index - (sourceSplay.degree - 1) / 2) * SPLAY_PX
    : 0;
  const tgtSplayOffset = targetSplay.degree > 1
    ? (targetSplay.index - (targetSplay.degree - 1) / 2) * SPLAY_PX
    : 0;

  // Target control point (where the spring wants to rest)
  const targetCpX = midX + perpX * 2;
  const targetCpY = midY + perpY * 2;

  // ── Spring Physics ──
  const springRef = useRef<SpringState>({
    x: targetCpX,
    y: targetCpY,
    vx: 0,
    vy: 0,
  });
  const rafRef = useRef<number>(0);
  const [cpPos, setCpPos] = useState({ x: targetCpX, y: targetCpY, vx: 0, vy: 0 });

  useEffect(() => {
    // When target changes, start the spring animation
    const spring = springRef.current;
    let isAnimating = true;

    const animate = () => {
      // Spring force toward target
      const forceX = (targetCpX - spring.x) * STIFFNESS;
      const forceY = (targetCpY - spring.y) * STIFFNESS;

      // Apply force with damping
      spring.vx = (spring.vx + forceX) * DAMPING;
      spring.vy = (spring.vy + forceY) * DAMPING;

      // Update position
      spring.x += spring.vx;
      spring.y += spring.vy;

      // Check if settled
      const speed = Math.abs(spring.vx) + Math.abs(spring.vy);
      const distToTarget = Math.abs(spring.x - targetCpX) + Math.abs(spring.y - targetCpY);

      if (speed < THRESHOLD && distToTarget < 1) {
        // Snap to final position
        spring.x = targetCpX;
        spring.y = targetCpY;
        spring.vx = 0;
        spring.vy = 0;
        setCpPos({ x: targetCpX, y: targetCpY, vx: 0, vy: 0 });
        isAnimating = false;
        return;
      }

      setCpPos({ x: spring.x, y: spring.y, vx: spring.vx, vy: spring.vy });

      if (isAnimating) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      isAnimating = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, [targetCpX, targetCpY]);

  // ── Path Construction (Dual Cubic Bézier — label-anchored center + edge splay) ──
  // Path splits into two segments meeting at the spring-animated center point.
  // Source → CP1 → [CENTER/LABEL] → CP2 → Target
  // CP1 hugs the source edge, CP4 hugs the target edge — splay fans out AT the card border.
  const speed = Math.abs(cpPos.vx) + Math.abs(cpPos.vy);
  const springAtRest = Math.abs(cpPos.x - midX) < 2 && Math.abs(cpPos.y - midY) < 2 && speed < 0.5;
  const hasSplay = Math.abs(srcSplayOffset) >= 1 || Math.abs(tgtSplayOffset) >= 1;
  const isFullyAtRest = offset === 0 && springAtRest && !hasSplay;

  // Center junction point — this is where the label anchors
  const centerX = cpPos.x;
  const centerY = cpPos.y;

  let pathD: string;
  if (isFullyAtRest) {
    // No splay, no ribbon, no spring motion — straight line
    pathD = `M ${sx} ${sy} L ${tx} ${ty}`;
  } else if (springAtRest && hasSplay && offset === 0) {
    // Spring settled but has splay — curve departs card edge at an angle
    // CP1 at 8% from source (right at card border), CP2 at 92% (right at target border)
    const cp1x = sx + dx * 0.08 + perpUnitX * srcSplayOffset;
    const cp1y = sy + dy * 0.08 + perpUnitY * srcSplayOffset;
    const cp4x = sx + dx * 0.92 - perpUnitX * tgtSplayOffset;
    const cp4y = sy + dy * 0.92 - perpUnitY * tgtSplayOffset;
    pathD = `M ${sx} ${sy} C ${cp1x} ${cp1y}, ${cp4x} ${cp4y}, ${tx} ${ty}`;
  } else {
    // Wave amplitude from spring velocity (clamped)
    const waveAmp = Math.min(35, speed * 2.5);

    // First half: Source → Center
    // CP1 at 8% from source — splay fans out right at the card edge
    const cp1x = sx + dx * 0.08 + perpUnitX * (waveAmp * 0.3 + srcSplayOffset);
    const cp1y = sy + dy * 0.08 + perpUnitY * (waveAmp * 0.3 + srcSplayOffset);

    // CP2: midpoint of source→center, displaced by wave
    // Computing relative to center ensures G1 tangent continuity at the junction
    const cp2x = (sx + centerX) / 2 + perpUnitX * waveAmp;
    const cp2y = (sy + centerY) / 2 + perpUnitY * waveAmp;

    // Second half: Center → Target
    // CP3: midpoint of center→target, displaced by opposite wave (creates the S)
    const cp3x = (centerX + tx) / 2 - perpUnitX * waveAmp;
    const cp3y = (centerY + ty) / 2 - perpUnitY * waveAmp;

    // CP4 at 92% — splay fans in right at the target card edge
    const cp4x = sx + dx * 0.92 - perpUnitX * (waveAmp * 0.3 + tgtSplayOffset);
    const cp4y = sy + dy * 0.92 - perpUnitY * (waveAmp * 0.3 + tgtSplayOffset);

    pathD = `M ${sx} ${sy} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${centerX} ${centerY} C ${cp3x} ${cp3y}, ${cp4x} ${cp4y}, ${tx} ${ty}`;
  }

  // ── Label Positioning (anchored to spring center) ──
  const stagger = ribbonConfig.count > 1 
    ? (ribbonConfig.index - (ribbonConfig.count - 1) / 2) * 20 
    : 0;
  const staggerX = (dx / len) * stagger;
  const staggerY = (dy / len) * stagger;

  const labelX = centerX + staggerX;
  const labelY = centerY + staggerY;

  // ── Label Angle ──
  let angleDeg = Math.atan2(dy, dx) * (180 / Math.PI);
  let flipped = false;
  if (angleDeg > 90) { angleDeg -= 180; flipped = true; }
  if (angleDeg < -90) { angleDeg += 180; flipped = true; }

  let visualDirection = (data?.direction as string) || 'none';
  if (flipped && visualDirection !== 'none') {
    visualDirection = visualDirection === 'to' ? 'from' : 'to';
  }

  // ── Styles ──
  const isGhosted = data?.ghost === true;
  const direction = (data?.direction as string) || 'none';

  // Direction-aware CSS classes for marching ants
  const directionClass = direction === 'to' ? 'nords-connection--march-forward'
    : direction === 'from' ? 'nords-connection--march-reverse'
    : direction === 'both' ? 'nords-connection--march-both'
    : ''; /* 'none' = static */

  return (
    <>
      {/* Base path — solid at 50% opacity (visible in dash gaps) */}
      {!isGhosted && (
        <path
          d={pathD}
          className="nords-connection--base"
          stroke={data?.color as string || '#000'}
          fill="none"
        />
      )}
      {/* Top path — dashed, direction-aware marching animation */}
      <path
        d={pathD}
        className={isGhosted ? 'nords-connection--ghost' : `nords-connection--active ${directionClass}`}
        stroke={data?.color as string || '#000'}
        fill="none"
        style={style}
        markerEnd={markerEnd}
        markerStart={markerStart}
      />
      {/* Invisible fat hit-area for click detection */}
      <path
        d={pathD}
        stroke="transparent"
        strokeWidth="15"
        fill="none"
        style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
      />
      
      {/* Label */}
      {!isGhosted && (
        <ConnectionLabel
          x={labelX}
          y={labelY}
          angleDeg={angleDeg}
          direction={visualDirection as any}
          type={data?.type as string}
          color={data?.color as string}
          edgeId={id}
        />
      )}
    </>
  );
}
