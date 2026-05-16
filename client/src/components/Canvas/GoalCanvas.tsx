/**
 * GoalCanvas — Spatial canvas for goals (Goals lens).
 *
 * Renders goals as circles on a ReactFlow canvas.
 * Prerequisites = directed edges between goals.
 * Exclusion groups = shared visual grouping.
 *
 * Clicking a goal circle fires onGoalClick → opens the GoalDetailDrawer.
 */

import React, { useMemo, useCallback, useEffect } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Node,
  type Edge,
} from '@xyflow/react';
import { GoalNode, type GoalNodeData } from './GoalNode';
import ZoomControls from './ZoomControls';
import type { Goal } from '../../hooks/useGoals';
import './GoalNode.css';

const goalNodeTypes = {
  goalNode: GoalNode,
};

interface GoalCanvasProps {
  goals: Goal[];
  selectedGoalId: string | null;
  onGoalClick: (goalId: string) => void;
}

/**
 * Lay out goals in a horizontal flow pattern:
 * - Entry goals on the left
 * - Gated goals to the right of their prerequisite
 * - Free-floating goals spread below
 */
function computeGoalLayout(goals: Goal[]): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  const explicit = goals.filter(g => !g.is_implicit);

  // Build children map
  const childrenOf = new Map<string, Goal[]>();
  for (const g of explicit) {
    if (g.requires_goal_id) {
      const list = childrenOf.get(g.requires_goal_id) || [];
      list.push(g);
      childrenOf.set(g.requires_goal_id, list);
    }
  }

  // Roots (entry points)
  const roots = explicit.filter(g => !g.requires_goal_id);
  const placed = new Set<string>();

  const COL_WIDTH = 180;
  const ROW_HEIGHT = 140;

  // Place chains starting from each root
  let chainRow = 0;
  for (const root of roots) {
    let col = 0;
    let current: Goal | undefined = root;
    while (current && !placed.has(current.id)) {
      positions.set(current.id, { x: col * COL_WIDTH, y: chainRow * ROW_HEIGHT });
      placed.add(current.id);
      col++;
      const children = childrenOf.get(current.id) || [];
      // Follow the first child in the chain
      current = children.find(c => !placed.has(c.id));
      // Place any extra children on offset rows
      for (let i = 1; i < children.length; i++) {
        if (!placed.has(children[i].id)) {
          chainRow++;
          positions.set(children[i].id, { x: col * COL_WIDTH, y: chainRow * ROW_HEIGHT });
          placed.add(children[i].id);
        }
      }
    }
    chainRow++;
  }

  // Place any orphans that weren't in a chain
  let orphanCol = 0;
  for (const g of explicit) {
    if (!placed.has(g.id)) {
      positions.set(g.id, { x: orphanCol * COL_WIDTH, y: chainRow * ROW_HEIGHT });
      placed.add(g.id);
      orphanCol++;
    }
  }

  return positions;
}

function GoalCanvasInner({ goals, selectedGoalId, onGoalClick }: GoalCanvasProps) {
  const explicit = useMemo(() => goals.filter(g => !g.is_implicit), [goals]);
  const layout = useMemo(() => computeGoalLayout(goals), [goals]);

  // Build nodes
  const initialNodes: Node<GoalNodeData>[] = useMemo(() => {
    return explicit.map(g => {
      const pos = layout.get(g.id) || { x: 0, y: 0 };
      return {
        id: g.id,
        type: 'goalNode',
        position: pos,
        data: {
          goalId: g.id,
          name: g.name,
          icon: g.icon,
          accentColor: g.accent_color || '#6366f1',
          terminates: g.terminates,
          isEntry: !g.requires_goal_id,
          isSelected: g.id === selectedGoalId,
          exclusionGroup: g.exclusion_group,
        },
      };
    });
  }, [explicit, layout, selectedGoalId]);

  // Build edges (prerequisite links)
  const initialEdges: Edge[] = useMemo(() => {
    return explicit
      .filter(g => g.requires_goal_id)
      .map(g => ({
        id: `prereq-${g.requires_goal_id}-${g.id}`,
        source: g.requires_goal_id!,
        target: g.id,
        type: 'default',
        animated: true,
        style: {
          stroke: g.accent_color || '#6366f1',
          strokeWidth: 2,
          opacity: 0.6,
        },
        markerEnd: {
          type: 'arrowclosed' as const,
          color: g.accent_color || '#6366f1',
        },
      }));
  }, [explicit]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);
  const { fitView } = useReactFlow();

  // Sync nodes when goals change
  useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes, setNodes]);

  // Fit view on mount
  useEffect(() => {
    setTimeout(() => fitView({ padding: 0.3, duration: 300 }), 100);
  }, [fitView, goals.length]);

  const handleNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    onGoalClick(node.id);
  }, [onGoalClick]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={goalNodeTypes}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={handleNodeClick}
      fitView
      fitViewOptions={{ padding: 0.3 }}
      minZoom={0.3}
      maxZoom={2}
      proOptions={{ hideAttribution: true }}
      className="goal-canvas"
    >
      <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="var(--nords-color-grid-dot, rgba(255,255,255,0.04))" />
      <ZoomControls />
    </ReactFlow>
  );
}

/** GoalCanvas wraps in its own ReactFlowProvider to isolate from the main canvas. */
export function GoalCanvas(props: GoalCanvasProps) {
  return (
    <ReactFlowProvider>
      <GoalCanvasInner {...props} />
    </ReactFlowProvider>
  );
}

export default GoalCanvas;
