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

  // ── Geometry ──
  const dx = tx - sx;
  const dy = ty - sy;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;

  // Ribbon offset computation
  const spread = 40;
  const totalWidth = (ribbonConfig.count - 1) * spread;
  const offset = ribbonConfig.count > 1 ? (ribbonConfig.index * spread) - (totalWidth / 2) : 0;

  const perpX = (-dy / len) * offset;
  const perpY = (dx / len) * offset;

  const midX = (sx + tx) / 2;
  const midY = (sy + ty) / 2;

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
  const [cpPos, setCpPos] = useState({ x: targetCpX, y: targetCpY });

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
        setCpPos({ x: targetCpX, y: targetCpY });
        isAnimating = false;
        return;
      }

      setCpPos({ x: spring.x, y: spring.y });

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

  // ── Path Construction ──
  const pathD = offset === 0 && Math.abs(cpPos.x - midX) < 2 && Math.abs(cpPos.y - midY) < 2
    ? `M ${sx} ${sy} L ${tx} ${ty}`
    : `M ${sx} ${sy} Q ${cpPos.x} ${cpPos.y} ${tx} ${ty}`;

  // ── Label Positioning ──
  const stagger = ribbonConfig.count > 1 
    ? (ribbonConfig.index - (ribbonConfig.count - 1) / 2) * 20 
    : 0;
  const staggerX = (dx / len) * stagger;
  const staggerY = (dy / len) * stagger;

  const labelX = midX + perpX + staggerX;
  const labelY = midY + perpY + staggerY;

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
        />
      )}
    </>
  );
}
