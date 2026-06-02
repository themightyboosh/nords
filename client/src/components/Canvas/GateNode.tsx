/**
 * GateNode — A small circle node that sits between DAG columns
 * to visually indicate AND/OR/XOR join logic.
 *
 * Edges from prerequisite goals → GateNode → target goal.
 * Non-interactive, non-draggable.
 */

import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps, Node } from '@xyflow/react';

interface GateNodeData {
  gateType: 'ALL' | 'OR' | 'XOR';
  [key: string]: unknown;
}

export type GateNodeType = Node<GateNodeData, 'gateNode'>;

export const GateNode = memo(({ data }: NodeProps<GateNodeType>) => {
  const cls = `goal-gate-node goal-gate-node--${data.gateType.toLowerCase()}`;
  return (
    <div className={cls}>
      <Handle
        type="target"
        position={Position.Left}
        className="goal-gate-handle"
      />
      <span className="goal-gate-node__label">{data.gateType}</span>
      <Handle
        type="source"
        position={Position.Right}
        className="goal-gate-handle"
      />
    </div>
  );
});

export default GateNode;
