import React from 'react';
import { BaseEdge, getBezierPath, getStraightPath, useStore } from '@xyflow/react';
import type { EdgeProps, Edge } from '@xyflow/react';
import { ConnectionLabel } from './ConnectionLabel';
import './CanvasEngine.css';



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
  // O(1) re-renders: we select a primitive string representing our ribbon position.
  // The component will only re-render if its sibling count or relative index changes.
  const ribbonConfig = useStore((s) => {
    const pairKey = [source, target].sort().join('-');
    const siblings = s.edges.filter(e => [e.source, e.target].sort().join('-') === pairKey);
    const sibIdx = siblings.findIndex(e => e.id === id);
    return { count: siblings.length, index: sibIdx };
  }, (a, b) => a.count === b.count && a.index === b.index);
  
  // Custom geometry calculation for the line between nodes
  const dx = targetX - sourceX;
  const dy = targetY - sourceY;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;

  // Ribbon offset computation
  const spread = 40; // Perpendicular distance in px
  const totalWidth = (ribbonConfig.count - 1) * spread;
  const offset = ribbonConfig.count > 1 ? (ribbonConfig.index * spread) - (totalWidth / 2) : 0;
  
  const perpX = (-dy / len) * offset;
  const perpY = (dx / len) * offset;

  const midX = (sourceX + targetX) / 2;
  const midY = (sourceY + targetY) / 2;

  // Control point for quadratic Bézier (when offset !== 0)
  const cpX = midX + perpX * 2;
  const cpY = midY + perpY * 2;

  const pathD = offset === 0
    ? `M ${sourceX} ${sourceY} L ${targetX} ${targetY}`
    : `M ${sourceX} ${sourceY} Q ${cpX} ${cpY} ${targetX} ${targetY}`;

  // Stagger labels along the line axis
  const sibIdx = ribbonConfig.index;
  const siblingsLength = ribbonConfig.count;
  const stagger = siblingsLength > 1 ? (sibIdx - (siblingsLength - 1) / 2) * 20 : 0;
  const staggerX = (dx / len) * stagger;
  const staggerY = (dy / len) * stagger;

  // Final midpoint position for the label
  const labelX = midX + perpX + staggerX;
  const labelY = midY + perpY + staggerY;

  // Angle of the line for the label text — corrected so text never renders upside-down
  let angleDeg = Math.atan2(dy, dx) * (180 / Math.PI);
  let flipped = false;
  if (angleDeg > 90) { angleDeg -= 180; flipped = true; }
  if (angleDeg < -90) { angleDeg += 180; flipped = true; }

  // Flip the visual direction if the label rotated
  let visualDirection = (data?.direction as string) || 'none';
  if (flipped && visualDirection !== 'none') {
    visualDirection = visualDirection === 'to' ? 'from' : 'to';
  }

  // Styles
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
      
      {/* Label Box rendering - ghosted edges do not get labels unless hovered, 
          but for now we show all non-ghost. Link lens will handle context hiding via CSS later */}
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
