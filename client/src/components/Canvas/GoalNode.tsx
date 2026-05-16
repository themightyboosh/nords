/**
 * GoalNode — Circle node for the Goal Canvas.
 *
 * Goals are circles (Nords are rectangles). This is the visual distinction
 * between the Goal Canvas and the Nord Canvas.
 *
 * Shows: Lucide icon + name + accent color ring.
 * Badges: 🔴 RESET (end_type=reset), 🟡 CONTINUE (end_type=continue), ⚡ ROOT (no incoming edges).
 *
 * Handles: source (right) and target (left) for edge drawing.
 */

import React, { memo } from 'react';
import type { NodeProps, Node } from '@xyflow/react';
import { Handle, Position } from '@xyflow/react';
import { resolveIcon } from '../../utils/iconRegistry';
import { StopCircle, RefreshCw } from 'lucide-react';

export interface GoalNodeData {
  goalId: string;
  name: string;
  icon: string;
  accentColor: string;
  endType: 'reset' | 'continue' | null;
  isRoot: boolean;
  isSelected: boolean;
  [key: string]: unknown;
}

export type GoalNodeType = Node<GoalNodeData, 'goalNode'>;

export const GoalNode = memo(({ data }: NodeProps<GoalNodeData>) => {
  const GoalIcon = resolveIcon(data.icon);

  const classList = [
    'goal-node',
    data.isSelected && 'goal-node--selected',
    data.endType && 'goal-node--end',
    data.isRoot && 'goal-node--root',
  ].filter(Boolean).join(' ');

  return (
    <div
      className={classList}
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

      {/* End-type badges */}
      {data.endType === 'reset' && (
        <span className="goal-node__badge goal-node__badge--reset">
          <StopCircle size={8} /> RESET
        </span>
      )}
      {data.endType === 'continue' && (
        <span className="goal-node__badge goal-node__badge--continue">
          <RefreshCw size={8} /> CONTINUE
        </span>
      )}
    </div>
  );
});

export default GoalNode;
