/**
 * GoalNode — Circle node for the Goal Canvas.
 *
 * Goals are circles (Nords are rectangles). This is the visual distinction
 * between the Goal Canvas and the Nord Canvas.
 *
 * Shows: Lucide icon + name + accent color ring.
 * Badges: END (terminates), Entry (no prerequisite).
 */

import React, { memo } from 'react';
import type { NodeProps, Node } from '@xyflow/react';
import { Handle, Position } from '@xyflow/react';
import { resolveIcon } from '../../utils/iconRegistry';
import { StopCircle } from 'lucide-react';

export interface GoalNodeData {
  goalId: string;
  name: string;
  icon: string;
  accentColor: string;
  terminates: boolean;
  isEntry: boolean;
  isSelected: boolean;
  exclusionGroup: string | null;
  [key: string]: unknown;
}

export type GoalNodeType = Node<GoalNodeData, 'goalNode'>;

export const GoalNode = memo(({ data }: NodeProps<GoalNodeData>) => {
  const GoalIcon = resolveIcon(data.icon);

  return (
    <div
      className={`goal-node ${data.isSelected ? 'goal-node--selected' : ''} ${data.terminates ? 'goal-node--end' : ''} ${data.isEntry ? 'goal-node--entry' : ''}`}
      style={{
        '--goal-accent': data.accentColor || '#6366f1',
      } as React.CSSProperties}
    >
      <Handle type="target" position={Position.Left} className="goal-node__handle" />
      <Handle type="source" position={Position.Right} className="goal-node__handle" />

      <div className="goal-node__circle">
        <GoalIcon size={22} strokeWidth={1.6} />
      </div>
      <span className="goal-node__label">{data.name || 'Untitled'}</span>

      {/* Badges */}
      {data.terminates && (
        <span className="goal-node__badge goal-node__badge--end">
          <StopCircle size={8} /> END
        </span>
      )}
      {data.exclusionGroup && (
        <span className="goal-node__badge goal-node__badge--excl">
          {data.exclusionGroup}
        </span>
      )}
    </div>
  );
});

export default GoalNode;
