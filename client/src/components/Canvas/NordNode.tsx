/**
 * NordNode.tsx — ReactFlow node wrapper for NordCard.
 *
 * Adds canvas-specific concerns on top of the shared NordCard:
 *   - ReactFlow Handles (drop target + border drag sources)
 *   - Comment badge with inverse-scale
 *
 * Visual rendering is delegated entirely to NordCard.
 *
 * PERF: Zoom subscription is only active when comment badge is rendered.
 * All other rendering is zoom-independent (CSS handles zoom tier styling).
 */

import React, { memo } from 'react';
import { Handle, Position, useStore } from '@xyflow/react';
import type { NodeProps, Node } from '@xyflow/react';
import { MessageSquare } from 'lucide-react';
import { NordCard } from '../shared/NordCard';
import './CanvasEngine.css';

const CARD_WIDTH = 270;

interface NordNodeData {
  title: string;
  type: string;
  typeIcon: React.ElementType;
  typeColor: string;
  commentCount?: number;
  isGhosted?: boolean;
  properties: Array<{ key: string; value: string; color?: string }>;
}

export type NordNodeType = Node<NordNodeData, 'nordNode'>;

export const NordNode = memo(({ id, data, selected, isConnectable }: NodeProps<NordNodeType>) => {
  const isGhosted = data.isGhosted === true;
  const hasComments = (data.commentCount || 0) > 0 && !isGhosted;

  // Only subscribe to zoom when comment badge is visible (avoids 91 subscriptions
  // firing on every zoom/pan when no comments exist)
  const inverseScale = useStore(
    (s) => {
      if (!hasComments) return 1;
      const zoom = s.transform[2];
      return Math.min(0.65, 100 / (zoom * 100));
    },
    (a, b) => a === b,
  );

  return (
    <div
      style={{
        width: `${CARD_WIDTH}px`,
        position: 'relative',
      }}
    >
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
      {hasComments && (
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
