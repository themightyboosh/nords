import React from 'react';
import { EdgeLabelRenderer, useStore } from '@xyflow/react';

interface ConnectionLabelProps {
  x: number;
  y: number;
  angleDeg: number;
  direction: 'to' | 'from' | 'both' | 'none';
  type: string;
  color: string;
  edgeId: string;
  isDimmed?: boolean;
  /** Composite label: verb + stage value(s), or verb + preposition, or null */
  resolvedLabel?: string | null;
}

export const ConnectionLabel = React.memo(function ConnectionLabel({
  x, y, angleDeg, direction, type, color, edgeId, isDimmed,
  resolvedLabel,
}: ConnectionLabelProps) {
  // Zoom level — quantized to 3 tiers to reduce re-renders
  const inverseScale = useStore(
    (s) => {
      const z = s.transform[2];
      if (z >= 0.6) return 0.75;
      if (z >= 0.35) return 1.2;
      return 2.0;
    },
    (a, b) => a === b,
  );

  return (
    <EdgeLabelRenderer>
      <div
        className="nords-connection-label"
        data-edge-id={edgeId}
        style={{
          position: 'absolute',
          transform: `translate(-50%, -50%) translate(${x}px, ${y}px) rotate(${angleDeg}deg) scale(${inverseScale})`,
          backgroundColor: color,
          zIndex: isDimmed ? 0 : 10,
        } as React.CSSProperties}
      >
        {resolvedLabel ? (
          <span className="nords-connection-label__resolved">{resolvedLabel}</span>
        ) : (
          <span className="nords-connection-label__type">{type}</span>
        )}
      </div>
    </EdgeLabelRenderer>
  );
});
