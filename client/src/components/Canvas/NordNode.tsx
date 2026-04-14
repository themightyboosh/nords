/**
 * NordNode.tsx — ReactFlow node wrapper for NordCard.
 *
 * Adds canvas-specific concerns on top of the shared NordCard:
 *   - ReactFlow Handles (drop target + border drag sources)
 *   - Zoom-aware text counter-scaling
 *   - Comment badge with inverse-scale
 *
 * Visual rendering is delegated entirely to NordCard.
 */

import React, { memo } from 'react';
import { Handle, Position, useStore } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { MessageSquare } from 'lucide-react';
import { NordCard } from '../shared/NordCard';
import './CanvasEngine.css';

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
  const zoom = useStore((s) => s.transform[2]);
  const inverseScale = Math.min(0.65, 100 / (zoom * 100));
  const textScale = zoom < 0.6 ? Math.min(2.5, 0.6 / zoom) : 1;
  const isGhosted = data.isGhosted === true;

  return (
    <div style={{ width: `${CARD_WIDTH}px`, position: 'relative' }}>
      {/* DROP TARGET — covers entire card so releasing anywhere connects */}
      <Handle type="target" position={Position.Top} id="target" className="nords-node__handle--full" isConnectable={isConnectable} />

      {/* DRAG SOURCE — thin border strips so dragging starts from card edge */}
      <Handle type="source" position={Position.Top} id="s-top" className="nords-node__handle--border" isConnectable={isConnectable} />
      <Handle type="source" position={Position.Bottom} id="s-bottom" className="nords-node__handle--border" isConnectable={isConnectable} />
      <Handle type="source" position={Position.Left} id="s-left" className="nords-node__handle--border" isConnectable={isConnectable} />
      <Handle type="source" position={Position.Right} id="s-right" className="nords-node__handle--border" isConnectable={isConnectable} />

      <NordCard
        title={data.title}
        typeName={data.type}
        typeColor={data.typeColor}
        typeIcon={data.typeIcon}
        properties={data.properties}
        isSelected={selected}
        isGhosted={isGhosted}
        style={{ width: `${CARD_WIDTH}px` }}
        data-testid={`nord-node-${id}`}
      />

      {/* Comment badge — canvas-only, inverse-scaled at low zoom */}
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
