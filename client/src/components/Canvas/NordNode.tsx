import React, { memo } from 'react';
import { Handle, Position, useStore } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { Maximize2, MessageSquare } from 'lucide-react';
import './CanvasEngine.css'; // Relies on shared CSS

interface NordNodeData {
  title: string;
  type: string;
  typeIcon: React.ElementType;
  typeColor: string;
  size: number;
  hasScale: boolean;
  commentCount?: number;
  isGhosted?: boolean;
  properties: Array<{ key: string; value: string; color?: string }>;
}

export const NordNode = memo(({ id, data, selected }: NodeProps<NordNodeData>) => {
  // We use useStore to read current zoom to inverse-scale the comment badge and handles
  const zoom = useStore((s) => s.transform[2]);
  const inverseScale = Math.min(0.65, 100 / (zoom * 100));

  const Icon = data.typeIcon;
  const visibleProps = data.properties.slice(0, 3);
  const isGhosted = data.isGhosted === true;
  
  // Calculate width from size scale (0.0 - 1.0)
  // Per spec: 0.25x to 2.0x of 200px base
  // At 0.0 → 50px (0.25×200), at 1.0 → 400px (2.0×200)
  const baseSize = data.size ?? 0.5;
  const width = 200 * (0.25 + baseSize * 1.75);

  const containerClasses = [
    'nords-node',
    selected ? 'is-selected' : '',
    isGhosted ? 'nords-node--ghosted' : ''
  ].filter(Boolean).join(' ');

  return (
    <div
      className={containerClasses}
      style={{
        width: `${width}px`,
        backgroundColor: `color-mix(in srgb, ${data.typeColor || '#fff'} 10%, var(--nords-color-bg-surface))`,
        borderColor: `color-mix(in srgb, ${data.typeColor || '#fff'} 20%, var(--nords-color-border-default))`,
      }}
      data-testid={`nord-node-${id}`}
    >
      {/* 4 Connection Handles */}
      <Handle type="target" position={Position.Top} id="top" />
      <Handle type="source" position={Position.Bottom} id="bottom" />
      <Handle type="target" position={Position.Left} id="left" />
      <Handle type="source" position={Position.Right} id="right" />

      {/* Type badge */}
      <div className="nords-node__titlebar">
        <div className="nords-node__header">
          {Icon && <Icon size={14} strokeWidth={2} color={data.typeColor} />}
          <span className="nords-node__type-label" style={{ color: data.typeColor }}>
            {data.type}
          </span>
        </div>
      </div>

      {/* Title */}
      <h3 className="nords-node__title">{data.title}</h3>

      {/* Properties */}
      {visibleProps.length > 0 && (
        <div className="nords-node__props">
          {visibleProps.map((p) => (
            <div key={p.key} className="nords-node__prop">
              <span className="nords-node__prop-key">{p.key}</span>
              <span
                className="nords-node__prop-value"
                style={p.color ? { color: p.color } : undefined}
              >
                {p.value}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Footer / Overflow */}
      <div className="nords-node__footer">
        {data.properties.length > 3 && (
          <span className="nords-node__more">+{data.properties.length - 3} more</span>
        )}
      </div>

      {/* Resize handle */}
      {data.hasScale && (
        <div 
          className="nords-node__resize-handle" 
          title={`Scale: ${Math.round(baseSize * 175 + 25)}%`}
          // We'd add custom drag logic here in Epic 5 
        >
          <Maximize2 size={14} strokeWidth={2} />
        </div>
      )}

      {/* Comment badge (absolute positioned relative to node boundaries) */}
      {(data.commentCount || 0) > 0 && !isGhosted && (
        <div
          className="nords-comment-badge"
          style={{
            right: '-10px',
            top: '-15px',
            position: 'absolute',
            transform: `scale(${inverseScale})`,
            transformOrigin: 'bottom left'
          }}
          title={`${data.commentCount} comment${data.commentCount !== 1 ? 's' : ''}`}
        >
          <MessageSquare size={14} strokeWidth={1.5} />
          <span className="nords-comment-badge__count">{data.commentCount}</span>
        </div>
      )}
    </div>
  );
});

export default NordNode;
