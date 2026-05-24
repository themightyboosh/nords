/**
 * GoalCanvas — Interactive DAG canvas for goals (Goals lens).
 *
 * Goals = circles. Edges = directed connections (parent → child).
 * Users draw edges by dragging from one circle handle to another.
 * When a goal completes, sibling branches are structurally excluded.
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
  addEdge,
  type Node,
  type Edge,
  type Connection,
  type OnConnect,
} from '@xyflow/react';
import { GoalNode, type GoalNodeData } from './GoalNode';
import ZoomControls from './ZoomControls';
import type { Goal, GoalEdge } from '../../hooks/useGoals';
import './GoalNode.css';

const goalNodeTypes = {
  goalNode: GoalNode,
};

interface GoalCanvasProps {
  goals: Goal[];
  goalEdges: GoalEdge[];
  selectedGoalId: string | null;
  onGoalClick: (goalId: string) => void;
  onEdgeCreate: (sourceId: string, targetId: string) => void;
  onEdgeDelete: (edgeId: string) => void;
}

/**
 * Layout goals using the DAG edge structure.
 * Roots (no incoming edges) on the left, children to the right.
 * Branches fan out vertically.
 */
function computeGoalLayout(
  goals: Goal[],
  edges: GoalEdge[]
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  const explicit = goals.filter(g => !g.is_implicit);

  if (explicit.length === 0) return positions;

  // Build adjacency
  const childrenOf = new Map<string, string[]>();
  const hasParent = new Set<string>();
  for (const e of edges) {
    const list = childrenOf.get(e.source_goal_id) || [];
    list.push(e.target_goal_id);
    childrenOf.set(e.source_goal_id, list);
    hasParent.add(e.target_goal_id);
  }

  // Roots = no incoming edges
  const roots = explicit.filter(g => !hasParent.has(g.id));
  const placed = new Set<string>();

  const COL_WIDTH = 200;
  const ROW_HEIGHT = 150;
  let globalRow = 0;

  // BFS from each root
  for (const root of roots) {
    const queue: Array<{ id: string; col: number }> = [{ id: root.id, col: 0 }];
    let localRowStart = globalRow;

    while (queue.length > 0) {
      const { id, col } = queue.shift()!;
      if (placed.has(id)) continue;

      positions.set(id, { x: col * COL_WIDTH, y: globalRow * ROW_HEIGHT });
      placed.add(id);

      const children = (childrenOf.get(id) || []).filter(c => !placed.has(c));
      if (children.length > 0) {
        // First child continues on same row
        queue.push({ id: children[0], col: col + 1 });
        // Additional children get new rows (branching)
        for (let i = 1; i < children.length; i++) {
          globalRow++;
          queue.push({ id: children[i], col: col + 1 });
        }
      }
    }

    globalRow++;
  }

  // Place orphans (no edges at all) — spread horizontally
  let orphanCol = 0;
  for (const g of explicit) {
    if (!placed.has(g.id)) {
      positions.set(g.id, { x: orphanCol * COL_WIDTH, y: globalRow * ROW_HEIGHT });
      placed.add(g.id);
      orphanCol++;
    }
  }

  return positions;
}

function GoalCanvasInner({
  goals,
  goalEdges,
  selectedGoalId,
  onGoalClick,
  onEdgeCreate,
  onEdgeDelete,
}: GoalCanvasProps) {
  const explicit = useMemo(() => goals.filter(g => !g.is_implicit), [goals]);
  const layout = useMemo(() => computeGoalLayout(goals, goalEdges), [goals, goalEdges]);

  // Compute which goals are roots (no incoming edges)
  const rootSet = useMemo(() => {
    const hasParent = new Set(goalEdges.map(e => e.target_goal_id));
    return new Set(explicit.filter(g => !hasParent.has(g.id)).map(g => g.id));
  }, [explicit, goalEdges]);

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
          endType: g.end_type,
          isRoot: rootSet.has(g.id),
          isSelected: g.id === selectedGoalId,
        },
      };
    });
  }, [explicit, layout, selectedGoalId, rootSet]);

  // Build ReactFlow edges from goal_edges
  const initialEdges: Edge[] = useMemo(() => {
    return goalEdges.map(ge => {
      const sourceGoal = goals.find(g => g.id === ge.source_goal_id);
      return {
        id: ge.id,  // Use the DB edge ID so we can delete it
        source: ge.source_goal_id,
        target: ge.target_goal_id,
        type: 'default',
        animated: true,
        style: {
          stroke: sourceGoal?.accent_color || '#6366f1',
          strokeWidth: 2,
          opacity: 0.6,
        },
        markerEnd: {
          type: 'arrowclosed' as const,
          color: sourceGoal?.accent_color || '#6366f1',
        },
      };
    });
  }, [goalEdges, goals]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState(initialEdges);
  const { fitView } = useReactFlow();

  // Sync when data changes
  useEffect(() => { setNodes(initialNodes); }, [initialNodes, setNodes]);
  useEffect(() => { setRfEdges(initialEdges); }, [initialEdges, setRfEdges]);

  // Fit view on mount
  useEffect(() => {
    setTimeout(() => fitView({ padding: 0.3, duration: 300 }), 100);
  }, [fitView, goals.length, goalEdges.length]);

  // ── Interactive edge drawing ──
  const handleConnect: OnConnect = useCallback((connection: Connection) => {
    if (connection.source && connection.target && connection.source !== connection.target) {
      // Persist to DB
      onEdgeCreate(connection.source, connection.target);
      // Optimistically add to ReactFlow
      setRfEdges(eds => addEdge({
        ...connection,
        animated: true,
        style: { stroke: '#6366f1', strokeWidth: 2, opacity: 0.6 },
        markerEnd: { type: 'arrowclosed' as const, color: '#6366f1' },
      }, eds));
    }
  }, [onEdgeCreate, setRfEdges]);

  // ── Edge deletion (click edge → backspace/delete) ──
  const handleEdgeClick = useCallback((_: React.MouseEvent, edge: Edge) => {
    // We'll use the edge ID which matches the DB edge ID
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Backspace' || e.key === 'Delete') {
        onEdgeDelete(edge.id);
        setRfEdges(eds => eds.filter(e => e.id !== edge.id));
        window.removeEventListener('keydown', handleKeyDown);
      }
    };
    window.addEventListener('keydown', handleKeyDown, { once: true });
    // Auto-remove listener after 5 seconds
    setTimeout(() => window.removeEventListener('keydown', handleKeyDown), 5000);
  }, [onEdgeDelete, setRfEdges]);

  const handleNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    onGoalClick(node.id);
  }, [onGoalClick]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={rfEdges}
      nodeTypes={goalNodeTypes}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={handleNodeClick}
      onConnect={handleConnect}
      onEdgeClick={handleEdgeClick}
      fitView
      fitViewOptions={{ padding: 0.3 }}
      minZoom={0.3}
      maxZoom={2}
      proOptions={{ hideAttribution: true }}
      className="goal-canvas"
      connectionLineStyle={{ stroke: '#6366f1', strokeWidth: 2, opacity: 0.5 }}
    >
      <Background variant={BackgroundVariant.Dots} gap={10} size={1} color="rgba(0, 160, 180, 0.35)" />
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
