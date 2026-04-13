import React, { useMemo } from 'react';
import { EdgeLabelRenderer, useStore } from '@xyflow/react';

interface ConnectionLabelProps {
  x: number;
  y: number;
  angleDeg: number;
  direction: 'to' | 'from' | 'none';
  type: string;
  color: string;
}

export function ConnectionLabel({ x, y, angleDeg, direction, type, color }: ConnectionLabelProps) {
  const zoom = useStore((s) => s.transform[2]);
  // Unified text scaling — same formula as NordNode textScale
  // Below 60% zoom: counter-scale up (capped at 2.5×)
  // Above 60% zoom: gentle inverse scale 0.5–0.8
  const inverseScale = zoom < 0.6
    ? Math.min(2.5, 0.6 / zoom)
    : Math.min(0.8, Math.max(0.5, 1 / zoom));

  // Random offset so each label shines at a different time
  const shineOffset = useMemo(() => Math.random() * 5, []);

  const dirClass = direction === 'to'
    ? 'nords-connection-label--arrow-right'
    : direction === 'from'
    ? 'nords-connection-label--arrow-left'
    : '';

  return (
    <EdgeLabelRenderer>
      <div
        className={`nords-connection-label ${dirClass}`}
        style={{
          position: 'absolute',
          transform: `translate(-50%, -50%) translate(${x}px, ${y}px) rotate(${angleDeg}deg) scale(${inverseScale})`,
          backgroundColor: color,
          '--shine-offset': shineOffset,
          // Everything inside EdgeLabelRenderer has pointer-events: none by default,
          // if we want it clickable we need pointerEvents: 'all'
        } as React.CSSProperties}
      >
        <span className="nords-connection-label__type">{type}</span>
      </div>
    </EdgeLabelRenderer>
  );
}
