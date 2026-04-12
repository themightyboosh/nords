/**
 * EuclideanEdge.tsx — Custom edge renderer with spring-physics "Reason Wiggle."
 *
 * The Bézier control point is driven by a 1D spring-mass-damper system.
 * When source or target positions change rapidly (during drag, spring settle,
 * or programmatic relocation), the control point lags behind, oscillates,
 * and settles at the geometric equilibrium — producing the tactile "cable
 * wiggle" effect made famous by Propellerhead Reason.
 *
 * Physics constants are tuned for subtlety: the wiggle resolves within
 * ~400ms and never overshoots more than 15% of the line length.
 */

import React, { useRef, useEffect, useState } from 'react';
import { useStore } from '@xyflow/react';
import type { EdgeProps } from '@xyflow/react';
import { ConnectionLabel } from './ConnectionLabel';
import './CanvasEngine.css';

// ── Spring Physics Constants ──
const STIFFNESS = 0.12;   // How tightly the control point snaps to target
const DAMPING   = 0.78;   // Friction — lower = more oscillation
const THRESHOLD = 0.3;    // Stop animating when velocity drops below this

interface SpringState {
  x: number;
  y: number;
  vx: number;
  vy: number;
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
}: EdgeProps) {
  // O(1) re-renders: select ribbon config
  const ribbonConfig = useStore((s) => {
    const pairKey = [source, target].sort().join('-');
    const siblings = s.edges.filter(e => [e.source, e.target].sort().join('-') === pairKey);
    const sibIdx = siblings.findIndex(e => e.id === id);
    return { count: siblings.length, index: sibIdx };
  }, (a, b) => a.count === b.count && a.index === b.index);
  
  // ── Geometry ──
  const dx = targetX - sourceX;
  const dy = targetY - sourceY;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;

  // Ribbon offset computation
  const spread = 40;
  const totalWidth = (ribbonConfig.count - 1) * spread;
  const offset = ribbonConfig.count > 1 ? (ribbonConfig.index * spread) - (totalWidth / 2) : 0;
  
  const perpX = (-dy / len) * offset;
  const perpY = (dx / len) * offset;

  const midX = (sourceX + targetX) / 2;
  const midY = (sourceY + targetY) / 2;

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
    ? `M ${sourceX} ${sourceY} L ${targetX} ${targetY}`
    : `M ${sourceX} ${sourceY} Q ${cpPos.x} ${cpPos.y} ${targetX} ${targetY}`;

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
  const connectionClass = isGhosted ? 'nords-connection--ghost' : 'nords-connection--active';

  return (
    <>
      <path
        d={pathD}
        className={connectionClass}
        stroke={data?.color as string || '#000'}
        fill="none"
        style={style}
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
