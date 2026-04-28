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
  /** Ref forwarded to the label div for direct DOM position updates during animation */
  labelRef?: React.RefObject<HTMLDivElement>;
}

export const ConnectionLabel = React.memo(function ConnectionLabel({
  x, y, angleDeg, direction, type, color, edgeId, isDimmed,
  resolvedLabel, labelRef,
}: ConnectionLabelProps) {
  // Zoom level — throttled via equality fn (only re-render on tier change)
  const zoomTier = useStore(
    (s) => {
      const z = s.transform[2];
      // Quantize to reduce re-renders: 3 tiers instead of continuous
      if (z >= 0.6) return 'full';
      if (z >= 0.35) return 'mid';
      return 'small';
    },
    (a, b) => a === b,
  );

  const inverseScale = zoomTier === 'full' ? 0.75
    : zoomTier === 'mid' ? 1.2
    : 2.0;

  const dirClass = direction === 'to'
    ? 'nords-connection-label--arrow-right'
    : direction === 'from'
    ? 'nords-connection-label--arrow-left'
    : direction === 'both'
    ? 'nords-connection-label--arrow-both'
    : '';

  return (
    <EdgeLabelRenderer>
      <div
        ref={labelRef}
        className={`nords-connection-label ${dirClass}`}
        data-edge-id={edgeId}
        data-angle={angleDeg}
        data-invscale={inverseScale}
        style={{
          position: 'absolute',
          transform: `translate(-50%, -50%) translate(${x}px, ${y}px) rotate(${angleDeg}deg) scale(${inverseScale})`,
          backgroundColor: color,
          zIndex: isDimmed ? 0 : 10,
        } as React.CSSProperties}
      >
        {/* Priority: composite label > type name */}
        {resolvedLabel ? (
          <span className="nords-connection-label__resolved">{resolvedLabel}</span>
        ) : (
          <span className="nords-connection-label__type">{type}</span>
        )}
      </div>
    </EdgeLabelRenderer>
  );
});
