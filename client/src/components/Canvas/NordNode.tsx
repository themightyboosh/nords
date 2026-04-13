import React, { memo } from 'react';
import { Handle, Position, useStore } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { MessageSquare } from 'lucide-react';
import './CanvasEngine.css'; // Relies on shared CSS

// Fixed card width — all nords are the same size
const CARD_WIDTH = 225;

interface NordNodeData {
  title: string;
  type: string;
  typeIcon: React.ElementType;
  typeColor: string;
  commentCount?: number;
  isGhosted?: boolean;
  properties: Array<{ key: string; value: string; color?: string }>;
}

export const NordNode = memo(({ id, data, selected, isConnectable }: NodeProps<NordNodeData>) => {
  // Read current zoom for counter-scaling text at low zoom
  const zoom = useStore((s) => s.transform[2]);
  const inverseScale = Math.min(0.65, 100 / (zoom * 100));

  // Unified text counter-scaling: below 60% zoom, scale ALL text up to stay readable
  // At zoom 0.6 → textScale = 1.0, at zoom 0.3 → textScale = 2.0
  // Capped at 2.5× to prevent absurdly large text at extreme zoom-out
  const textScale = zoom < 0.6 ? Math.min(2.5, 0.6 / zoom) : 1;

  const Icon = data.typeIcon;
  const visibleProps = data.properties.slice(0, 3);
  const hiddenCount = Math.max(0, data.properties.length - 3);
  const isGhosted = data.isGhosted === true;

  const containerClasses = [
    'nords-node',
    selected ? 'is-selected' : '',
    isGhosted ? 'nords-node--ghosted' : ''
  ].filter(Boolean).join(' ');

  return (
    <div
      className={containerClasses}
      style={{
        width: `${CARD_WIDTH}px`,
        backgroundColor: `color-mix(in srgb, ${data.typeColor || '#fff'} 10%, var(--nords-color-bg-surface))`,
        borderColor: `color-mix(in srgb, ${data.typeColor || '#fff'} 20%, var(--nords-color-border-default))`,
      }}
      data-testid={`nord-node-${id}`}
    >
      {/* Invisible handles — centered, cover full card for easy connection drop targets.
       * Both source and target on same node so connections work in any direction. */}
      <Handle type="target" position={Position.Top} id="target" className="nords-node__handle--full" isConnectable={isConnectable} />
      <Handle type="source" position={Position.Bottom} id="source" className="nords-node__handle--full" isConnectable={isConnectable} />

      {/* All text content — counter-scales uniformly below 60% zoom */}
      <div
        className="nords-node__titlebar"
        style={textScale > 1 ? { transform: `scale(${textScale})`, transformOrigin: 'top left' } : undefined}
      >
        <div className="nords-node__header">
          {Icon && <Icon size={14} strokeWidth={2} color={data.typeColor} />}
          <span className="nords-node__type-label" style={{ color: data.typeColor }}>
            {data.type}
          </span>
        </div>
      </div>

      {/* Title — also counter-scales */}
      <h3
        className="nords-node__title"
        style={textScale > 1 ? { transform: `scale(${textScale})`, transformOrigin: 'top left' } : undefined}
      >{data.title}</h3>

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

      {/* Footer */}
      <div className="nords-node__footer">
        {hiddenCount > 0 && (
          <span className="nords-node__more">+{hiddenCount} more</span>
        )}
      </div>

      {/* Comment badge */}
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
