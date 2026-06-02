/**
 * StepBadgeNode — A lightweight ReactFlow node that renders a
 * floating "Step N" badge above each column in the GoalCanvas DAG.
 * Non-interactive, non-selectable, acts purely as a visual label.
 */

import React, { memo } from 'react';
import type { NodeProps, Node } from '@xyflow/react';

interface StepBadgeData {
  step: number;
  label: string;
  [key: string]: unknown;
}

export type StepBadgeNodeType = Node<StepBadgeData, 'stepBadge'>;

export const StepBadgeNode = memo(({ data }: NodeProps<StepBadgeNodeType>) => {
  return (
    <div className="goal-step-badge">
      <span className="goal-step-badge__label">{data.label}</span>
    </div>
  );
});

export default StepBadgeNode;
