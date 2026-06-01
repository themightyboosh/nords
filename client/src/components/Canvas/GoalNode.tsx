/**
 * GoalNode — ReactFlow node wrapper using the shared NordCard.
 *
 * Mirrors the NordNode pattern exactly: wraps NordCard with
 * ReactFlow Handles for edge drawing. The card renders identically
 * to nord cards — same CSS, same visual language.
 *
 * Goal name goes in the header (type label slot).
 * Card body shows collected variables if any.
 */

import React, { memo } from 'react';
import type { NodeProps, Node } from '@xyflow/react';
import { Handle, Position } from '@xyflow/react';
import { resolveIcon } from '../../utils/iconRegistry';
import { NordCard } from '../shared/NordCard';
import './GoalNode.css';

export interface GoalNodeData {
  goalId: string;
  name: string;
  icon: string;
  accentColor: string;
  endType: 'reset' | 'continue' | null;
  prerequisiteGate: 'all' | 'any';
  forkType: 'parallel' | 'exclusive';
  isRoot: boolean;
  isSelected: boolean;
  /** Variable binding names from collections */
  collectionItems: string[];
  [key: string]: unknown;
}

export type GoalNodeType = Node<GoalNodeData, 'goalNode'>;

const CARD_WIDTH = 240;

export const GoalNode = memo(({ id, data, selected, isConnectable }: NodeProps<GoalNodeType>) => {
  const GoalIcon = resolveIcon(data.icon);
  const accentColor = data.accentColor || '#6366f1';

  // Build properties from property bindings
  const properties: { key: string; value: string; color?: string }[] = [];

  // Gate/fork badges
  if (data.prerequisiteGate === 'any') {
    properties.push({ key: 'Gate', value: 'OR (any prereq)', color: '#818cf8' });
  }
  if (data.forkType === 'exclusive') {
    properties.push({ key: 'Fork', value: '◇ Exclusive', color: '#f59e0b' });
  }

  // Property bindings
  const bindings = (data.collectionItems || []).slice(0, 3);
  for (const name of bindings) {
    properties.push({ key: 'Collects', value: name });
  }

  // End-type as a subtle indicator
  let endLabel = '';
  if (data.endType === 'reset') endLabel = '⏹ Ends → Reset';
  else if (data.endType === 'continue') endLabel = '↻ Ends → Continue';

  return (
    <div style={{ width: `${CARD_WIDTH}px`, position: 'relative' }}>
      {/* DROP TARGET — covers entire card so releasing anywhere connects */}
      <Handle type="target" position={Position.Left} id="target" className="nords-node__handle--full" isConnectable={isConnectable} />

      {/* DRAG SOURCES — border strips so dragging starts from card edge */}
      <Handle type="source" position={Position.Right} id="s-right" className="nords-node__handle--border" isConnectable={isConnectable} />
      <Handle type="source" position={Position.Top} id="s-top" className="nords-node__handle--border" isConnectable={isConnectable} />
      <Handle type="source" position={Position.Bottom} id="s-bottom" className="nords-node__handle--border" isConnectable={isConnectable} />
      <Handle type="source" position={Position.Left} id="s-left" className="nords-node__handle--border" isConnectable={isConnectable} />

      <NordCard
        title={endLabel || (properties.length > 0 ? '' : '')}
        typeName={data.name || 'Untitled Goal'}
        typeColor={accentColor}
        typeIcon={GoalIcon}
        properties={properties}
        isSelected={selected || data.isSelected}
        style={{ width: `${CARD_WIDTH}px` }}
        data-testid={`goal-node-${id}`}
      />
    </div>
  );
});

export default GoalNode;
