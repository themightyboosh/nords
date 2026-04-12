import React from 'react';
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
  const inverseScale = Math.min(0.65, 100 / (zoom * 100));

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
          // Everything inside EdgeLabelRenderer has pointer-events: none by default,
          // if we want it clickable we need pointerEvents: 'all'
        }}
      >
        <span className="nords-connection-label__type">{type}</span>
      </div>
    </EdgeLabelRenderer>
  );
}
