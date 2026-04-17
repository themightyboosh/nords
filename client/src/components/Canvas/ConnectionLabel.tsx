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
  const zoom = useStore((s) => s.transform[2]);
  // Unified text scaling — same formula as NordNode textScale
  const inverseScale = zoom < 0.6
    ? Math.min(2.5, 0.6 / zoom)
    : Math.min(0.8, Math.max(0.5, 1 / zoom));

  // Drag-isolation: fade edges not connected to the dragged node
  const isDragFaded = useStore((s) => {
    let draggedId: string | null = null;
    for (const [, node] of s.nodeLookup) {
      if (node.dragging) { draggedId = node.id; break; }
    }
    if (!draggedId) return false;
    const edge = s.edgeLookup.get(edgeId);
    if (!edge) return true;
    return edge.source !== draggedId && edge.target !== draggedId;
  });

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
        className={`nords-connection-label ${dirClass}`}
        data-edge-id={edgeId}
        style={{
          position: 'absolute',
          transform: `translate(-50%, -50%) translate(${x}px, ${y}px) rotate(${angleDeg}deg) scale(${inverseScale})`,
          backgroundColor: color,
          opacity: isDragFaded ? 0.15 : 1,
          transition: 'opacity 0.2s ease',
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
